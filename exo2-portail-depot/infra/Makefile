# Operations du serveur de production.
#
# Toutes les cibles s'executent depuis exo2-portail-depot/infra/.
# La stack locale, elle, se lance par ../install.sh — pas besoin de make.

COMPOSE     := docker compose -f docker-compose.prod.yml --env-file .env.prod
STAGING_OK  := .cert-staging-ok

# Charge .env.prod pour que les cibles puissent lire PUBLIC_DOMAIN et l'e-mail.
ifneq (,$(wildcard .env.prod))
include .env.prod
export
endif

.DEFAULT_GOAL := help
.PHONY: help secrets check-env up down restart logs ps pull deploy \
        verify-local cert-bootstrap cert-staging cert-prod cert-renew-dry-run \
        hsts-on backup

## ---------------------------------------------------------------------------
## Aide
## ---------------------------------------------------------------------------

help: ## Affiche cette aide
	@echo "Portail de depot — operations serveur"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) \
	  | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-22s\033[0m %s\n", $$1, $$2}'
	@echo ""
	@echo "Premier deploiement, dans l'ordre :"
	@echo "  1. cp .env.prod.example .env.prod  puis  make secrets  et remplir"
	@echo "  2. make cert-bootstrap"
	@echo "  3. make up"
	@echo "  4. make verify-local     <- AVANT tout appel a Let's Encrypt"
	@echo "  5. make cert-staging"
	@echo "  6. make cert-prod"
	@echo "  7. make hsts-on"

## ---------------------------------------------------------------------------
## Configuration
## ---------------------------------------------------------------------------

secrets: ## Genere des secrets aleatoires prets a coller dans .env.prod
	@echo "POSTGRES_PASSWORD=$$(openssl rand -base64 24 | tr -d '/+=' | head -c 32)"
	@echo "JWT_SECRET=$$(openssl rand -base64 48 | tr -d '/+=' | head -c 48)"
	@echo "DEPOSIT_JWT_SECRET=$$(openssl rand -base64 48 | tr -d '/+=' | head -c 48)"
	@echo "MINIO_ROOT_USER=portail-$$(openssl rand -hex 4)"
	@echo "MINIO_ROOT_PASSWORD=$$(openssl rand -base64 24 | tr -d '/+=' | head -c 32)"
	@echo "GRAFANA_ADMIN_PASSWORD=$$(openssl rand -base64 18 | tr -d '/+=' | head -c 24)"
	@echo ""
	@echo "# JWT_SECRET et DEPOSIT_JWT_SECRET doivent rester differents."

check-env: ## Verifie que .env.prod existe et ne contient plus de marqueur
	@test -f .env.prod || { \
	  echo "ERREUR : .env.prod absent."; \
	  echo "  cp .env.prod.example .env.prod  puis  make secrets"; \
	  exit 1; }
	@if grep -q 'REMPLACE_MOI' .env.prod; then \
	  echo "ERREUR : des marqueurs REMPLACE_MOI subsistent dans .env.prod :"; \
	  grep -n 'REMPLACE_MOI' .env.prod | sed 's/^/    /'; \
	  exit 1; \
	fi
	@test -n "$(PUBLIC_DOMAIN)" || { echo "ERREUR : PUBLIC_DOMAIN vide."; exit 1; }
	@echo "Configuration valide — domaine : $(PUBLIC_DOMAIN)"

## ---------------------------------------------------------------------------
## Cycle de vie
## ---------------------------------------------------------------------------

pull: check-env ## Tire les images publiees sur GHCR
	$(COMPOSE) pull

up: check-env ## Demarre la stack
	$(COMPOSE) up -d
	@echo "Stack demarree. Verifie avec : make verify-local"

down: ## Arrete la stack (les volumes sont conserves)
	$(COMPOSE) down

restart: ## Redemarre la stack
	$(COMPOSE) restart

ps: ## Etat des services
	$(COMPOSE) ps

logs: ## Suit les journaux (make logs S=backend pour un seul service)
	$(COMPOSE) logs -f --tail=100 $(S)

deploy: check-env pull up verify-local ## Deploiement complet : pull, up, verification
	@echo ""
	@echo "Deploiement termine — https://$(PUBLIC_DOMAIN)"
	@echo "Le certificat n'est PAS touche par cette cible (quota partage)."

## ---------------------------------------------------------------------------
## Verification locale
##
## L'enonce le dit : « en cas d'echec, verifie d'abord que ton service repond
## bien en local sur ton port ». Cette cible est ce premier reflexe, et elle
## conditionne tout ce qui suit.
## ---------------------------------------------------------------------------

verify-local: ## Verifie que les services repondent sur 127.0.0.1 (AVANT Let's Encrypt)
	@echo "-- Ports lies (doivent tous etre sur 127.0.0.1, jamais 0.0.0.0) --"
	@ss -ltnp 2>/dev/null | grep -E ':210[0-9][0-9]' || \
	  netstat -an 2>/dev/null | grep -E '\.210[0-9][0-9]' || \
	  echo "   (ss/netstat indisponible — verifie manuellement)"
	@echo ""
	@echo "-- HTTP  127.0.0.1:21000 --"
	@curl -sf -o /dev/null -w "   /healthz -> HTTP %{http_code}\n" http://127.0.0.1:21000/healthz \
	  || { echo "   ECHEC : l'edge ne repond pas en HTTP. Regarde 'make logs S=edge'."; exit 1; }
	@echo "-- HTTPS 127.0.0.1:21001 --"
	@curl -skf -o /dev/null -w "   /healthz -> HTTP %{http_code}\n" https://127.0.0.1:21001/healthz \
	  || { echo "   ECHEC : l'edge ne repond pas en HTTPS. Certificat absent ? 'make cert-bootstrap'."; exit 1; }
	@echo "-- Chemin ACME (ne doit PAS rediriger) --"
	@code=$$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:21000/.well-known/acme-challenge/sonde); \
	  if [ "$$code" = "301" ] || [ "$$code" = "302" ]; then \
	    echo "   ECHEC : le chemin ACME est redirige ($$code). Le renouvellement casserait."; exit 1; \
	  else echo "   /.well-known/acme-challenge/ -> HTTP $$code (404 attendu, pas de redirection)"; fi
	@echo "-- API a travers l'edge --"
	@curl -skf -o /dev/null -w "   /api/health -> HTTP %{http_code}\n" https://127.0.0.1:21001/api/health \
	  || echo "   ATTENTION : l'API ne repond pas encore (demarrage en cours ?)"
	@echo ""
	@echo "Tout repond en local. Le proxy frontal peut maintenant etre mis en cause."

## ---------------------------------------------------------------------------
## Certificat
##
## Le quota Let's Encrypt est de 50 certificats par 7 jours et par domaine
## enregistre — rayan-drissi.com — donc PARTAGE avec tous les autres candidats.
## S'y ajoutent 5 echecs de validation par heure. D'ou la separation stricte
## entre l'essai (staging, quota distinct) et l'emission reelle.
## ---------------------------------------------------------------------------

cert-bootstrap: check-env ## Certificat auto-signe temporaire, pour que nginx demarre
	@# L'image certbot embarque deja openssl et monte le volume letsencrypt :
	@# inutile d'introduire une image supplementaire juste pour ca.
	$(COMPOSE) run --rm --no-deps \
	  -v "$$(pwd)/edge/bootstrap-cert.sh:/bootstrap.sh:ro" \
	  --entrypoint sh certbot /bootstrap.sh

cert-staging: check-env ## Essai Let's Encrypt en staging (ne consomme AUCUN quota)
	@echo "Essai en staging pour $(PUBLIC_DOMAIN)..."
	$(COMPOSE) run --rm --entrypoint certbot certbot certonly \
	  --webroot -w /var/www/certbot \
	  --staging \
	  -d "$(PUBLIC_DOMAIN)" \
	  --email "$(LETSENCRYPT_EMAIL)" \
	  --agree-tos --no-eff-email \
	  --non-interactive
	@touch $(STAGING_OK)
	@echo ""
	@echo "Staging reussi. La chaine complete fonctionne : routage par Host,"
	@echo "webroot accessible, droits corrects."
	@echo "Tu peux maintenant lancer : make cert-prod"

cert-prod: check-env ## Emet le VRAI certificat (exige un staging reussi au prealable)
	@test -f $(STAGING_OK) || { \
	  echo "REFUS : aucun essai en staging reussi."; \
	  echo ""; \
	  echo "  Le quota Let's Encrypt est de 50 certificats par semaine pour"; \
	  echo "  rayan-drissi.com, PARTAGE avec tous les autres candidats."; \
	  echo "  Une emission ratee ampute ce quota commun."; \
	  echo ""; \
	  echo "  Lance d'abord : make cert-staging"; \
	  exit 1; }
	@echo "Emission du certificat de production pour $(PUBLIC_DOMAIN)..."
	@echo "Le certificat de staging est remplace ( --force-renewal )."
	$(COMPOSE) run --rm --entrypoint certbot certbot certonly \
	  --webroot -w /var/www/certbot \
	  --force-renewal \
	  -d "$(PUBLIC_DOMAIN)" \
	  --email "$(LETSENCRYPT_EMAIL)" \
	  --agree-tos --no-eff-email \
	  --non-interactive
	$(COMPOSE) exec edge nginx -s reload
	@echo ""
	@echo "Certificat de production en place."
	@echo "Verifie : curl -I https://$(PUBLIC_DOMAIN)"
	@echo "Puis, une fois HTTPS confirme : make hsts-on"

cert-renew-dry-run: check-env ## Simule le renouvellement (le test qui compte pour dans 60 jours)
	$(COMPOSE) run --rm --entrypoint certbot certbot renew \
	  --webroot -w /var/www/certbot --dry-run

hsts-on: check-env ## Active HSTS — seulement une fois HTTPS confirme
	@grep -q '^HSTS_VALUE=.\+' .env.prod && { echo "HSTS deja actif."; exit 0; } || true
	@echo "Activation de HSTS. A ne faire QUE si https://$(PUBLIC_DOMAIN) repond correctement :"
	@echo "un navigateur ayant vu cet en-tete refusera tout retour en HTTP, meme pour reparer."
	@printf "Confirmer ? [oui/non] " && read answer && [ "$$answer" = "oui" ]
	@sed -i.bak 's|^HSTS_VALUE=.*|HSTS_VALUE=max-age=31536000; includeSubDomains|' .env.prod
	$(COMPOSE) up -d --force-recreate edge
	@echo "HSTS actif."

## ---------------------------------------------------------------------------
## Exploitation
## ---------------------------------------------------------------------------

backup: check-env ## Sauvegarde PostgreSQL dans ./backups/
	@mkdir -p backups
	@f="backups/portail-$$(date +%Y%m%d-%H%M%S).sql.gz"; \
	  $(COMPOSE) exec -T postgres pg_dump -U portail portail | gzip > "$$f"; \
	  echo "Sauvegarde ecrite : $$f"
