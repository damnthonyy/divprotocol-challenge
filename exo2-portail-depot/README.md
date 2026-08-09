# Portail de dépôt de pièces — DIV Protocol

Un avocat crée une demande de dépôt, génère un lien public expirable protégé par un code PIN,
et suit l'arrivée des pièces. Son client ouvre le lien sans compte, saisit le code, dépose ses
documents et voit sa progression.

**URL de production** : https://antoine-mahassadi.stage2-div.rayan-drissi.com

---

## Démarrer

Une seule commande, sur une machine vierge disposant de Docker :

```bash
git clone <ce-dépôt> && cd repo-root/exo2-portail-depot
./install.sh
```

Le script construit les images, démarre la stack, applique les migrations, joue le seed,
provisionne le bucket et Grafana, puis affiche les URLs. Toutes les étapes sont idempotentes :
relancer le script ne casse ni ne duplique rien.

| | |
| --- | --- |
| Application | http://localhost:8080 |
| Mini UI kit | http://localhost:8080/kit |
| Grafana | http://localhost:3001 — `admin` / `admin` |
| Prometheus | http://localhost:9090 |
| Console MinIO | http://localhost:9001 — `minioadmin` / `minioadmin` |

**Compte de démonstration** : `avocat@divprotocol.com` / `demo1234`

Le seed crée trois demandes couvrant les trois statuts (en attente, complète, expirée). Créer
une demande donne un lien et un PIN ; ouvrir ce lien en navigation privée joue le rôle du client.

---

## Architecture

```
Navigateur
    │  HTTPS
    ▼
edge (nginx)          termine TLS, seul point d'entrée
    ├── /api/  ──►    backend (NestJS)  ──►  PostgreSQL
    │                        └──────────►    MinIO (API S3)
    └── /      ──►    frontend (nginx + SPA)

prometheus ──► backend:/metrics        grafana ──► prometheus
```

Chaque service est un conteneur. En production, seul `edge` publie des ports — et uniquement
sur la loopback.

### Choix de la stack

| Décision | Pourquoi |
| --- | --- |
| **React + Vite en SPA** plutôt que Next.js | Le build est statique et servi par le nginx qui termine déjà TLS : aucun runtime Node en production, une surface de moins à opérer sur une machine partagée. Il n'y a pas de SEO à traiter — dashboard authentifié et lien privé. |
| **Prisma** plutôt que TypeORM | Migrations versionnées et seed en une commande, ce que l'entrypoint du conteneur doit enchaîner sans intervention pour rendre le déploiement one-click. Schéma lisible d'un coup d'œil. |
| **argon2** plutôt que bcrypt | Résistant au matériel dédié, pas de troncature à 72 octets. Utilisé pour les mots de passe **et** les codes PIN. |
| **axios** côté frontend | `fetch` n'expose pas la progression d'un **upload**, seulement celle d'un download. La barre de progression est une exigence du produit. |
| **zod des deux côtés** | Le frontend valide les réponses à l'exécution : un écart de contrat échoue dans la couche API, pas trois composants plus loin. |
| **Pas de Redis** | Le verrouillage des PIN vit en base, où il survit à un redémarrage. Un service de moins à opérer. |

### Le stockage objet, et pourquoi ce n'est pas anodin

L'énoncé impose « MinIO ou S3 **conteneurisé** ». AWS S3 étant un service managé, le choix réel
porte sur l'implémentation S3-compatible que l'on fait tourner.

**MinIO Community Edition n'est plus maintenu** : console admin retirée en mai 2025,
« maintenance mode » en décembre 2025, dépôt **archivé en avril 2026**. Le tag
`RELEASE.2025-09-07` est le dernier publié — il n'y aura pas de `latest` à suivre.

Deux conséquences assumées :

1. **L'image est épinglée sur ce tag**, jamais `:latest`.
2. **Le code cible l'API S3, pas MinIO.** `backend/src/storage/s3.service.ts` n'utilise que
   `@aws-sdk/client-s3` : aucun import, aucun appel, aucun nom de variable spécifique à MinIO.
   Basculer vers SeaweedFS, Garage ou un S3 souverain est un changement de variables
   d'environnement, pas une réécriture.

Le bucket est provisionné par script `mc` et non à la main : la console admin n'existe plus en
Community Edition, et `install.sh` doit fonctionner sans intervention.

**Au-delà de la contrainte d'exercice, c'est le bon choix produit.** Les pièces d'un cabinet
sont couvertes par le secret professionnel. Le CLOUD Act permet aux autorités américaines
d'accéder aux données détenues par une société de droit américain, y compris stockées en
Europe, et le CNB recommande des solutions souveraines. Un portail de dépôt pour avocats
adossé à un hyperscaler américain serait un mauvais choix, pas seulement techniquement.

---

## Modèle de données

```
Lawyer          id · email · passwordHash · name · cabinetName
DepositRequest  id · lawyerId · label · expectedFiles · pinHash · publicToken
                expiresAt · failedPinAttempts · lockedUntil · revokedAt
DepositFile     id · requestId · filename · size · mimeType · objectKey · checksum
AccessLog       id · requestId · event · ipAddress · userAgent · createdAt
```

**Le statut n'est pas une colonne.** `pending` / `complete` / `expired` est dérivé à la lecture
de `expiresAt`, du nombre de pièces et de `expectedFiles`
(`backend/src/domain/request-status.ts`). Une colonne dénormalisée mentirait dès qu'un lien
expire, puisque rien n'écrit en base à cet instant : il faudrait une tâche de fond, donc un
point de panne de plus. C'est aussi ce qui rend les transitions testables comme une fonction pure.

**Le PIN est haché** et n'est retourné **qu'une seule fois**, dans la réponse de
`POST /requests`. Il n'est plus relisible ensuite, ni en liste ni en détail.

**`publicToken` est aléatoire** (12 octets), distinct de l'identifiant interne : il circule par
courriel, il ne doit ni révéler l'ordre de création ni permettre d'énumérer les dossiers.

---

## Sécurité

- **Deux jetons distincts** — le JWT avocat (long, `localStorage`) et le jeton de dépôt anonyme
  (30 min, secret **et** audience différents, en mémoire côté client). Un déposant ne détient
  jamais un jeton qui ouvre autre chose que son propre dépôt, et la garde vérifie que le jeton
  correspond bien au lien appelé.
- **Pas d'énumération de comptes** — un argon2 est vérifié même quand l'adresse n'existe pas.
  Sans cela, l'écart de temps de réponse suffirait à découvrir qui a un compte.
- **Verrouillage des PIN en base** — 5 tentatives puis 15 minutes de blocage, qui survivent à
  un redémarrage et suivent le lien. La limitation de débit HTTP le complète sans le remplacer :
  elle se contourne en changeant d'adresse.
- **Vérification du contenu par signature binaire** — un `.exe` renommé en `.pdf` passe le
  contrôle d'extension et celui du type déclaré, tous deux fournis par le client. Seule la
  signature du contenu le trahit.
- **Rien sur le disque local** — les fichiers transitent en mémoire vers le stockage objet,
  jamais par `diskStorage`.
- **Non-root** — le conteneur backend tourne en utilisateur `node`.
- **En-têtes stricts** — CSP, `X-Frame-Options: DENY`, `nosniff`, HSTS une fois le certificat
  de production obtenu.
- **Journal d'audit** — ouvertures de lien, déverrouillages réussis et échoués, dépôts et
  rejets, avec adresse et agent.

---

## Tests

**Backend — 47 tests Jest**, concentrés sur le domaine, qui est volontairement pur (ni Prisma,
ni NestJS, ni HTTP) :

| Fichier | Couvre |
| --- | --- |
| `domain/request-status.spec.ts` | Expiration, transitions, priorité de l'expiration sur la complétude, révocation |
| `domain/pin-policy.spec.ts` | Décompte, verrouillage, refus du bon PIN pendant le blocage, remise à zéro |
| `domain/file-policy.spec.ts` | Taille, type déclaré, exécutable déguisé, assainissement des noms |

**Frontend — 35 tests Vitest** : composants du design system, `PinInput` (saisie, collage,
retour arrière), et le **chemin d'échec d'upload** avec son bouton « Réessayer ».

`KitPage` sert de smoke test du design system : il monte tous les composants d'un coup et
attrape les erreurs de contexte de slots, qui compilent mais cassent à l'exécution.

**CI** — lint, typecheck, tests et build pour les deux applications à chaque push.

---

## Observabilité

**Fait** : `/health` (vérifie la base **et** le stockage objet — une API qui répond alors que
le stockage est injoignable accepterait des dépôts qu'elle ne peut pas honorer), `/metrics` au
format Prometheus, logs JSON avec identifiant de corrélation et rédaction des secrets
(`Authorization`, `X-Deposit-Token`, mots de passe, PIN). Prometheus scrape le backend, Grafana
est provisionné sur cette source.

> **TODO — périmètre d'observabilité.**
> Le choix des métriques métier et des seuils d'alerte n'est pas encore fait, et cette section
> sera complétée. L'énoncé annonce ce point comme un critère de discrimination plutôt qu'une
> case à cocher : un TODO assumé vaut mieux qu'une liste de métriques importée d'un dashboard
> générique que je ne saurais pas défendre. Les pistes à instruire : taux d'échec des dépôts,
> latence du stockage objet, tentatives de PIN erronées par lien, saturation du bucket.

---

## Déploiement

Le serveur est partagé. Un proxy frontal occupe les ports 80 et 443 et relaie le trafic du
sous-domaine vers une plage de ports personnelle.

```
Internet
  │  http://<sous-domaine>
  └──► proxy :80   ── routage par en-tête Host ──►  127.0.0.1:21000  (edge, HTTP)
  │  https://<sous-domaine>
  └──► proxy :443  ── passthrough TLS par SNI  ──►  127.0.0.1:21001  (edge, HTTPS)
```

Le 443 est en **passthrough** : le proxy ne déchiffre rien, c'est notre nginx qui termine TLS
avec notre certificat.

| Port | Service |
| --- | --- |
| `127.0.0.1:21000` | edge HTTP — challenge ACME et redirection |
| `127.0.0.1:21001` | edge HTTPS — seul point d'entrée applicatif |
| `127.0.0.1:21002` | Grafana — tunnel SSH uniquement |
| `127.0.0.1:21003` | Prometheus — tunnel SSH uniquement |

`backend`, `frontend`, `postgres`, `minio` et `certbot` ne publient **aucun** port.

> Tous les `ports:` sont préfixés de `127.0.0.1:`. Sans ce préfixe, Docker lie `0.0.0.0` **et**
> écrit ses propres règles iptables qui court-circuitent ufw : le service serait joignable
> depuis tout Internet, sur une machine partagée.

### Mise en service

```bash
cp infra/.env.prod.example infra/.env.prod
make -C infra secrets          # génère des secrets solides, à coller
$EDITOR infra/.env.prod        # renseigner le domaine et les secrets

make -C infra cert-bootstrap   # auto-signé temporaire, pour que nginx démarre
./install.sh --prod            # pull des images, démarrage, vérifications
make -C infra verify-local     # les services répondent-ils sur 127.0.0.1 ?
make -C infra cert-staging     # essai — ne consomme aucun quota
make -C infra cert-prod        # émission réelle, une seule fois
make -C infra hsts-on          # une fois HTTPS confirmé
```

**Pourquoi l'émission du certificat n'est pas automatisée.** Le quota Let's Encrypt est de
50 certificats par 7 jours et par **domaine enregistré** — `rayan-drissi.com` — donc partagé
avec tous les autres candidats, plus 5 échecs de validation par heure. Une boucle de
déploiement qui appelle ACME amputerait un quota commun. `make cert-prod` **refuse de tourner**
tant que `make cert-staging` n'a pas réussi.

**Renouvellement** : un conteneur certbot boucle toutes les 12 h, l'edge recharge sa
configuration toutes les 6 h. La redirection 301 exclut `/.well-known/acme-challenge/` — sans
cette exclusion le renouvellement casserait dans 60 jours, silencieusement, puisque tout
fonctionne jusque-là. `make cert-renew-dry-run` valide cette chaîne sans consommer de quota.

**Images** : construites par GitHub Actions et publiées sur GHCR en `linux/amd64`. Le serveur
ne compile jamais et n'héberge aucun code source — seulement `infra/` et `.env.prod`.

**Monitoring** : `ssh -N -L 3000:127.0.0.1:21002 <user>@<serveur>` puis http://localhost:3000.

### Consulter les logs

Chaque service écrit sur sa sortie standard (aucun fichier de log sur disque) : `docker compose
logs` suffit, en local comme en production. Les logs du backend sont en JSON structuré
(identifiant de corrélation, secrets rédigés — `Authorization`, `X-Deposit-Token`, PIN, mots de
passe).

**En local** (`docker-compose.local.yml`) :

```bash
docker compose -f infra/docker-compose.local.yml logs -f backend    # suit en direct
docker compose -f infra/docker-compose.local.yml logs --tail=100 frontend
docker compose -f infra/docker-compose.local.yml logs -f            # tous les services
```

**En production**, directement en SSH sur le serveur, depuis `~/infra` :

```bash
ssh <user>@<serveur>
cd ~/infra
docker compose -f docker-compose.prod.yml --env-file .env.prod logs -f backend
docker compose -f docker-compose.prod.yml --env-file .env.prod logs --tail=200 edge
docker compose -f docker-compose.prod.yml --env-file .env.prod ps        # etat/sante de chaque service
```

`-f` suit en direct (`Ctrl+C` pour sortir), `--tail=N` limite à l'historique récent. Le nom du
service (`backend`, `frontend`, `edge`, `postgres`, `minio`, `certbot`, `prometheus`, `grafana`)
vient de `docker-compose.prod.yml`. Les logs JSON du backend se lisent plus confortablement en
les passant dans `pino-pretty` si l'outil est disponible :

```bash
docker compose -f docker-compose.prod.yml --env-file .env.prod logs backend | npx pino-pretty
```

### Images — GitHub Container Registry

Publiées automatiquement par `.github/workflows/release.yml` à chaque push sur `master` ou sur
un tag `v*` — jamais construites à la main.

| Image | Registre | Dockerfile source |
| --- | --- | --- |
| [`ghcr.io/damnthonyy/div-portail-frontend`](https://github.com/damnthonyy/divprotocol-challenge/pkgs/container/div-portail-frontend) | GHCR | `frontend/Dockerfile` |
| [`ghcr.io/damnthonyy/div-portail-backend`](https://github.com/damnthonyy/divprotocol-challenge/pkgs/container/div-portail-backend) | GHCR | `backend/Dockerfile` |

Tags produits pour chaque image : `latest` (uniquement sur `master`), `sha-<commit-complet>`
(traçabilité exacte d'un déploiement) et le tag Git lui-même sur un push `v*`. `IMAGE_TAG` dans
`infra/.env.prod` choisit lequel `docker-compose.prod.yml` tire — `latest` par défaut, ou un SHA
précis pour épingler un déploiement.

```bash
docker pull ghcr.io/damnthonyy/div-portail-frontend:latest
docker pull ghcr.io/damnthonyy/div-portail-backend:latest
```

---

## Limites connues

- **Pas de `GET /auth/me`** : au rechargement, le frontend sait qu'un JWT existe mais pas à qui
  il appartient. Le nom de l'avocat disparaît de l'en-tête jusqu'à la reconnexion.
- **La session de dépôt ne survit pas à un rechargement** : le client doit ressaisir son PIN.
  Volontaire sur un lien qui peut être partagé, mais c'est un frottement.
- **Migrations à l'entrypoint** : élégant à un réplica, à sortir dans un job dédié si l'on
  passe à l'échelle — deux instances migreraient en concurrence.
- **Image backend de 812 Mo**, dont 460 Mo de `node_modules` dominés par les moteurs Prisma et
  le CLI (nécessaire au runtime pour `migrate deploy`). La sortir dans un conteneur one-shot
  ferait gagner ~250 Mo au prix de la propriété one-click.
- **Bundle frontend de 1,2 Mo** (388 Ko gzip), non découpé. Un `React.lazy` par route est le
  gain suivant, pas fait faute de mesure préalable.
- **Pas d'antivirus** : la vérification par signature binaire couvre le détournement
  d'extension, pas un PDF légitime porteur d'une charge malveillante.
- **Métriques métier et alertes** : à définir, voir la section Observabilité.

---

## Structure

```
exo2-portail-depot/
├── frontend/     React + Vite + Chakra UI v3   — voir frontend/README.md
├── backend/      NestJS + Prisma + AWS SDK
├── infra/        compose, edge nginx, Prometheus, Grafana, Makefile
├── ai-logs/      export des conversations avec l'IA
└── install.sh    installation en une commande
```
