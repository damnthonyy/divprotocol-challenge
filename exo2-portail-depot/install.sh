#!/usr/bin/env bash
#
# Portail de depot de pieces — installation en une commande.
#
#   ./install.sh          Stack complete en local, construite depuis les sources.
#                         C'est le chemin par defaut : cloner le depot sur une
#                         machine vierge, lancer ceci, obtenir des URLs cliquables.
#
#   ./install.sh --prod   Deploiement sur le serveur : tire les images publiees,
#                         demarre la stack, verifie. Ne touche JAMAIS a Let's
#                         Encrypt — l'emission du certificat reste explicite,
#                         voir infra/Makefile.
#
# Toutes les etapes sont idempotentes : relancer ce script sur une stack deja en
# place ne casse rien et ne duplique rien.

set -euo pipefail

cd "$(dirname "$0")"

readonly INFRA_DIR="infra"
readonly LOCAL_COMPOSE="$INFRA_DIR/docker-compose.local.yml"
readonly PROD_COMPOSE="$INFRA_DIR/docker-compose.prod.yml"

MODE="local"
[[ "${1:-}" == "--prod" ]] && MODE="prod"

# --- Affichage ----------------------------------------------------------------

if [[ -t 1 ]]; then
  BOLD=$'\033[1m'; DIM=$'\033[2m'; GREEN=$'\033[32m'; RED=$'\033[31m'
  YELLOW=$'\033[33m'; CYAN=$'\033[36m'; RESET=$'\033[0m'
else
  BOLD=''; DIM=''; GREEN=''; RED=''; YELLOW=''; CYAN=''; RESET=''
fi

step()  { echo; echo "${BOLD}==> $*${RESET}"; }
info()  { echo "    $*"; }
ok()    { echo "    ${GREEN}OK${RESET}  $*"; }
warn()  { echo "    ${YELLOW}!${RESET}   $*"; }
fail()  { echo "    ${RED}ECHEC${RESET} $*" >&2; exit 1; }

# --- Prerequis ----------------------------------------------------------------

step "Verification des prerequis"

command -v docker >/dev/null 2>&1 \
  || fail "Docker est introuvable. Installe-le : https://docs.docker.com/get-docker/"

docker compose version >/dev/null 2>&1 \
  || fail "Le plugin 'docker compose' est introuvable (Docker Compose v2 requis)."

docker info >/dev/null 2>&1 \
  || fail "Le demon Docker ne repond pas. Est-il demarre ?"

ok "docker $(docker version --format '{{.Server.Version}}')"
ok "compose $(docker compose version --short)"

# --- Attente d'un service en bonne sante --------------------------------------
#
# `docker compose up --wait` existe, mais s'arrete au premier service sans
# healthcheck. On sonde explicitement ceux qui comptent, pour pouvoir dire
# lequel bloque plutot que d'echouer en bloc.

wait_healthy() {
  local compose_file="$1" service="$2" timeout="${3:-180}"
  local waited=0 status

  printf "    %s " "$service"
  while (( waited < timeout )); do
    status=$(docker compose -f "$compose_file" ps --format json "$service" 2>/dev/null \
      | python3 -c "
import json,sys
try:
    for line in sys.stdin:
        line = line.strip()
        if not line: continue
        d = json.loads(line)
        print(d.get('Health') or d.get('State') or 'unknown'); break
except Exception:
    print('unknown')
" 2>/dev/null || echo unknown)

    case "$status" in
      healthy|running) printf " ${GREEN}%s${RESET}\n" "$status"; return 0 ;;
      exited)          printf " ${RED}sorti${RESET}\n"; return 1 ;;
    esac

    printf "."
    sleep 3
    waited=$((waited + 3))
  done

  printf " ${RED}delai depasse${RESET}\n"
  return 1
}

# ==============================================================================
# Mode production
# ==============================================================================

if [[ "$MODE" == "prod" ]]; then
  step "Deploiement de production"

  [[ -f "$INFRA_DIR/.env.prod" ]] \
    || fail ".env.prod absent. Copie infra/.env.prod.example, puis 'make -C infra secrets'."

  if grep -q 'REMPLACE_MOI' "$INFRA_DIR/.env.prod"; then
    echo
    grep -n 'REMPLACE_MOI' "$INFRA_DIR/.env.prod" | sed 's/^/      /'
    fail "Des marqueurs REMPLACE_MOI subsistent dans infra/.env.prod."
  fi

  # shellcheck disable=SC1091
  set -a; source "$INFRA_DIR/.env.prod"; set +a
  ok "Configuration valide — domaine : ${PUBLIC_DOMAIN}"

  step "Recuperation des images publiees"
  docker compose -f "$PROD_COMPOSE" --env-file "$INFRA_DIR/.env.prod" pull
  ok "Images a jour (le serveur ne compile rien)"

  step "Demarrage de la stack"
  docker compose -f "$PROD_COMPOSE" --env-file "$INFRA_DIR/.env.prod" up -d

  step "Attente des services"
  wait_healthy "$PROD_COMPOSE" postgres 120 || fail "PostgreSQL n'est pas pret."
  wait_healthy "$PROD_COMPOSE" minio 120    || fail "Le stockage objet n'est pas pret."
  wait_healthy "$PROD_COMPOSE" backend 240  || fail "L'API n'est pas prete. 'make -C infra logs S=backend'"

  step "Verification locale"
  make -C "$INFRA_DIR" verify-local || warn "La verification locale a echoue — voir ci-dessus."

  echo
  echo "${BOLD}${GREEN}Stack de production demarree.${RESET}"
  echo
  echo "  Application   ${CYAN}https://${PUBLIC_DOMAIN}${RESET}"
  echo "  Grafana       ${DIM}ssh -N -L 3000:127.0.0.1:21002 <user>@<serveur>${RESET}"
  echo
  echo "${BOLD}Certificat TLS — deliberement non automatise${RESET}"
  echo "  Le quota Let's Encrypt (50 certificats / 7 jours) porte sur"
  echo "  rayan-drissi.com : il est ${BOLD}partage avec les autres candidats${RESET}."
  echo "  L'emission reste donc une decision explicite :"
  echo
  echo "      make -C infra cert-bootstrap   ${DIM}# si premier demarrage${RESET}"
  echo "      make -C infra verify-local"
  echo "      make -C infra cert-staging     ${DIM}# ne consomme aucun quota${RESET}"
  echo "      make -C infra cert-prod        ${DIM}# une seule fois${RESET}"
  echo "      make -C infra hsts-on          ${DIM}# une fois HTTPS confirme${RESET}"
  echo
  exit 0
fi

# ==============================================================================
# Mode local (defaut)
# ==============================================================================

step "Construction des images"
info "Premiere execution : compter quelques minutes."
docker compose -f "$LOCAL_COMPOSE" build
ok "Images construites"

step "Demarrage de la stack"
docker compose -f "$LOCAL_COMPOSE" up -d

step "Attente des services"
wait_healthy "$LOCAL_COMPOSE" postgres 120 || fail "PostgreSQL n'est pas pret."
wait_healthy "$LOCAL_COMPOSE" minio 120    || fail "Le stockage objet n'est pas pret."
# Les migrations et le seed tournent a l'entrypoint du backend : quand il est
# sain, la base est migree et le compte de demonstration existe.
wait_healthy "$LOCAL_COMPOSE" backend 300  || {
  echo
  docker compose -f "$LOCAL_COMPOSE" logs --tail=40 backend
  fail "L'API n'est pas prete."
}
wait_healthy "$LOCAL_COMPOSE" frontend 120 || fail "Le frontend n'est pas pret."

step "Verification du parcours"

api() { curl -sf -o /dev/null -w '%{http_code}' "$@"; }

code=$(api http://127.0.0.1:8080/healthz) && ok "Frontend       HTTP $code"
code=$(api http://127.0.0.1:8080/api/health) && ok "API            HTTP $code"

login=$(curl -sf -X POST http://127.0.0.1:8080/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"avocat@divprotocol.com","password":"demo1234"}' 2>/dev/null) \
  && ok "Connexion avocat et compte de demonstration" \
  || fail "La connexion echoue — le seed n'a pas tourne ?"

count=$(echo "$login" | python3 -c "import json,sys; json.load(sys.stdin)['accessToken']; print('ok')" 2>/dev/null) \
  || fail "Reponse de connexion inattendue."

curl -sf http://127.0.0.1:9090/-/ready >/dev/null 2>&1 \
  && ok "Prometheus" || warn "Prometheus ne repond pas encore"
curl -sf http://127.0.0.1:3001/api/health >/dev/null 2>&1 \
  && ok "Grafana" || warn "Grafana ne repond pas encore"

# --- Recapitulatif ------------------------------------------------------------

cat <<EOF

${BOLD}${GREEN}Le portail est demarre.${RESET}

  ${BOLD}Application${RESET}      ${CYAN}http://localhost:8080${RESET}
  ${BOLD}Mini UI kit${RESET}      ${CYAN}http://localhost:8080/kit${RESET}
  ${BOLD}Grafana${RESET}          ${CYAN}http://localhost:3001${RESET}      ${DIM}admin / admin${RESET}
  ${BOLD}Prometheus${RESET}       ${CYAN}http://localhost:9090${RESET}
  ${BOLD}Console MinIO${RESET}    ${CYAN}http://localhost:9001${RESET}      ${DIM}minioadmin / minioadmin${RESET}

  ${BOLD}Compte de demonstration${RESET}
    avocat@divprotocol.com / demo1234

  ${DIM}Trois demandes seedees couvrent les trois statuts : en attente,
  complete et expiree. Cree une demande pour obtenir un lien et un PIN,
  puis ouvre ce lien en navigation privee pour jouer le role du client.${RESET}

  ${DIM}Arreter :  docker compose -f ${LOCAL_COMPOSE} down${RESET}
  ${DIM}Journaux : docker compose -f ${LOCAL_COMPOSE} logs -f${RESET}

EOF
