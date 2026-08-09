# syntax=docker/dockerfile:1

# --- Etape de build -----------------------------------------------------------
# Base glibc et non alpine : Vite 8 s'appuie sur rolldown, dont le binding natif
# n'est pas resolu correctement sous musl depuis un lockfile genere sur macOS.
# L'etape de build n'est pas embarquee dans l'image finale, son poids est sans effet.
FROM node:22-slim AS build

WORKDIR /app

# Les dependances sont installees avant la copie des sources : le cache de couche
# survit a toute modification de code qui ne touche pas au lockfile.
COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Vite fige les variables VITE_* au build : elles arrivent donc en build-arg,
# pas en variable d'environnement du conteneur final.
ARG VITE_API_URL=/api
ARG VITE_PUBLIC_BASE_URL=
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_PUBLIC_BASE_URL=$VITE_PUBLIC_BASE_URL
# Les mocks ne sont jamais embarques dans une image publiee.
ENV VITE_ENABLE_MOCKS=false

RUN npm run build

# --- Image finale -------------------------------------------------------------
FROM nginx:1.29-alpine AS runtime

# Aucun runtime Node en production : le bundle est statique, nginx suffit.
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx/default.conf.template /etc/nginx/templates/default.conf.template
COPY nginx/security-headers.conf /etc/nginx/snippets/security-headers.conf

# Hote du backend, resolu a chaque requete : le frontend demarre meme si NestJS
# n'est pas encore pret. `127.0.0.11` est le resolveur DNS interne de Docker.
ENV BACKEND_HOST=backend:3000
ENV NGINX_RESOLVER=127.0.0.11
# Sans ce filtre, envsubst remplacerait aussi des variables nginx natives.
ENV NGINX_ENVSUBST_FILTER="^(BACKEND_HOST|NGINX_RESOLVER)$"

# Le service ecoute en interne ; le proxy frontal de la machine partagee
# se charge du 80/443 et du TLS.
EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s \
  CMD wget -qO- http://127.0.0.1/healthz || exit 1

CMD ["nginx", "-g", "daemon off;"]
