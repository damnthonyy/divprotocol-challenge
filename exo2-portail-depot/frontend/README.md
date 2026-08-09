# Frontend — Portail de dépôt de pièces

Interface du portail : espace avocat authentifié et parcours de dépôt anonyme.
Chakra UI v3, conforme à la charte DIV Protocol.

> État : branché sur le vrai backend NestJS. `VITE_ENABLE_MOCKS=false`, les appels
> partent vers `/api`, relayé vers NestJS par le proxy Vite en développement et par
> nginx en production — le code applicatif appelle donc la même URL des deux côtés,
> et il n'y a de CORS à configurer nulle part.
>
> Les handlers MSW sont conservés : `VITE_ENABLE_MOCKS=true` permet de travailler
> sur le front sans lancer la stack, et de provoquer les cas d'erreur à la demande.

## Démarrer

```bash
# Depuis exo2-portail-depot/ : les dépendances du backend d'abord
docker compose -f infra/docker-compose.dev.yml up -d
(cd backend && npm install && npx prisma migrate dev && npm run seed && npm run start:dev)

# Puis le frontend
npm install
cp .env.example .env
npm run dev          # http://localhost:5173
```

Compte de démonstration : `avocat@divprotocol.com` / `demo1234` (créé par le seed).

| Commande | Effet |
| --- | --- |
| `npm run dev` | Serveur de développement, `/api` relayé vers NestJS |
| `npm run build` | Build de production dans `dist/` |
| `npm run test` | Vitest |
| `npm run typecheck` | `tsc -b --noEmit` |
| `npm run lint` | ESLint |
| `npm run typegen` | Régénère les types des recipes Chakra après modification du thème |

## Écrans

| Route | Accès | Rôle |
| --- | --- | --- |
| `/login` | public | Connexion avocat |
| `/dashboard` | authentifié | Liste des demandes, création (lien + PIN affichés une seule fois) |
| `/requests/:id` | authentifié | Détail, lien de dépôt, pièces reçues |
| `/d/:token` | anonyme | Saisie du PIN puis dépôt des pièces |
| `/kit` | — | Rendu du mini UI kit, écran de contrôle visuel hors produit |

## Design system

La charte n'est pas réécrite dans les composants : elle descend en trois couches.

```
theme/tokens.ts          valeurs brutes de la charte (#5100FF, radius, Inter…)
theme/semantic-tokens.ts intentions (fg.muted, border.accent, status.pending.fg)
theme/recipes/           habillage des composants, via defineRecipe / defineSlotRecipe
```

Un composant ne référence **jamais** une couleur brute, toujours un semantic token.
Changer une couleur de statut se fait à un seul endroit.

Points de la charte volontairement verrouillés :

- **Bouton primaire** — `padding 14/24`, `radius full`, 16px/600 ; au survol il s'inverse :
  fond `#F7F6FF`, texte primary, `box-shadow: inset 0 0 0 1px primary`.
- **Cards** — blanc, bordure 1px `#E9E9E9`, radius 12px, **aucune ombre**.
- **Statuts** — toujours une couleur sémantique sur son fond dédié, jamais de couleur crue.
- **Reveal au scroll** — `opacity 0→1`, `y 24→0`, `0.55s`, easing `[0.22, 1, 0.36, 1]`.
- **Light only** — aucun gestionnaire de thème n'est embarqué, `next-themes` n'est pas installé.

## Dépendances et pourquoi

| Dépendance | Justification |
| --- | --- |
| `@chakra-ui/react` v3, `@emotion/react` | Imposé par l'énoncé |
| `vite` + React SPA | Build statique servi par nginx, aucun runtime Node en production. Pas de SEO à traiter : dashboard authentifié et lien privé |
| `react-router` | 5 routes, dont 2 publiques, avec un garde d'authentification simple |
| `@tanstack/react-query` | Fournit `isPending` / `isError` / `retry` / invalidation — les états de chargement et d'erreur évalués dans le rendu, sans les réécrire écran par écran |
| `axios` | **`onUploadProgress`** : `fetch` n'expose pas la progression d'un upload, et elle est exigée par le produit. Fournit aussi l'interceptor Bearer et la purge du JWT sur 401 |
| `zod` | Contrat d'API validé à l'exécution : un écart de contrat échoue dans la couche API, pas trois composants plus loin. Sert aussi de source des types TS |
| `react-hook-form` + `@hookform/resolvers` | Formulaires non contrôlés, validation branchée sur les mêmes schémas zod |
| `motion` | Le reveal de la charte impose un cubic-bezier précis. Chakra v3 n'embarque plus framer-motion. Usage limité au composant `Reveal` |
| `msw` *(dev)* | Mocks au niveau réseau : le code applicatif est déjà le code final. Permet de provoquer PIN erroné, lien expiré, fichier trop lourd, échec d'upload |
| `vitest` + Testing Library *(dev)* | Partage la configuration Vite. Jest reste imposé côté logique métier, donc côté NestJS |

**Écartées, volontairement :** Tailwind (redondant avec le moteur de style Chakra) ·
Redux / Zustand (react-query couvre l'état serveur, un contexte suffit pour l'identité) ·
`date-fns` / `dayjs` (`Intl.RelativeTimeFormat` et `Intl.DateTimeFormat` suffisent) ·
`react-dropzone` (~60 lignes de hook maison, et on veut contrôler finement l'état de survol) ·
`next-themes` (site light only).

### Une exception à expliquer

`package.json` déclare quatre `optionalDependencies` : les bindings natifs Linux de
`rolldown` et `lightningcss`. C'est le contournement d'un [bug npm connu](https://github.com/npm/cli/issues/4828) —
un `package-lock.json` généré sur macOS n'enregistre pas les binaires des autres
plateformes, et `npm ci` échoue donc dans l'image Docker. Sans ces lignes, le build
de l'image ne passe pas.

## États non nominaux

L'énoncé les évalue explicitement, ils ne sont pas décoratifs :

- **Vide** — dashboard sans demande, demande sans pièce, dépôt sans envoi : titre,
  explication et action, jamais un écran blanc.
- **Chargement** — skeletons sur les listes, `LoadingState` ailleurs, distinct du vide réel.
- **Erreur** — message issu de l'API et bouton de reprise. Un lien expiré (`410`) ou
  verrouillé (`PIN_LOCKED`) n'affiche plus le clavier PIN : insister n'aurait aucun effet.
- **Échec d'upload** — porté par la ligne du fichier concerné, avec son « Réessayer ».
  Un fichier qui échoue ne fait pas disparaître la progression des autres.

Pour les provoquer sans backend, passer `VITE_ENABLE_MOCKS=true` puis modifier l'objet
`chaos` dans `src/mocks/handlers.ts` : `failDashboard`, `emptyDashboard`, `flakyUpload`,
`latencyMs`.

**Un `429` ne veut pas dire la même chose selon son `code`.** L'API l'utilise pour le
verrouillage du PIN (`PIN_LOCKED`, définitif jusqu'à expiration du verrou) et pour la
limitation de débit (`RATE_LIMITED`, levée en une minute). `UnlockForm` se fie au `code`
et non au statut : traiter les deux pareil afficherait une impasse à quelqu'un qui n'a
qu'à patienter.

## Choix d'implémentation à défendre

- **File d'envoi séquentielle** (`useUploadQueue`) — sur une connexion de client, quatre
  envois parallèles n'avancent nulle part et un échec devient illisible. Chaque fichier
  garde son état propre et peut être réessayé seul.
- **PIN écrit à la main** plutôt qu'importé — il faut gérer le collage des quatre chiffres
  d'un coup, le retour arrière qui recule d'une case et les flèches. Trois comportements
  testés unitairement.
- **Le PIN n'est affiché qu'à la création** — l'API ne le renvoie plus ensuite, l'écran
  le dit explicitement.
- **Session de dépôt en mémoire** — elle ne survit pas à un rechargement, le PIN doit être
  ressaisi. Limite assumée sur un lien partagé.

## Conteneurisation

```bash
docker build -t div-portail-front .
docker run -p 8080:80 div-portail-front
```

Image finale : `nginx:alpine` + bundle statique, ~94 Mo, aucun Node.
L'étape de build utilise `node:22-slim` et non alpine : le binding natif de rolldown
n'est pas résolu correctement sous musl.

nginx sert le SPA (`try_files` vers `index.html`), expose `/healthz`, pose les en-têtes
de sécurité et relaie `/api/` vers le backend. L'hôte du backend est résolu **à chaque
requête** (`proxy_pass` avec variable + `resolver`) : le conteneur démarre même si NestJS
n'est pas encore joignable, ce qui compte pour un `install.sh` one-click.

Variables d'image : `BACKEND_HOST` (défaut `backend:3000`), `NGINX_RESOLVER` (défaut `127.0.0.11`).
Les variables `VITE_*` sont figées au build et passent donc en `--build-arg`.

## Limites connues

- Pas de `GET /auth/me` : au rechargement, on sait qu'un JWT existe mais pas à qui il
  appartient tant que le backend n'expose pas la route. Le nom de l'avocat disparaît
  de l'en-tête jusqu'à la reconnexion.
- Le bundle fait ~1,2 Mo (388 Ko gzip), non découpé. Un `React.lazy` par route est le
  prochain gain évident, il n'a pas été fait pour ne pas complexifier avant mesure.
- Le statut d'une demande est calculé côté serveur ; le frontend le réaffiche sans
  recalculer, sauf l'expiration qu'il vérifie localement pour l'affichage relatif.
