# syntax=docker/dockerfile:1

# --- Dependances ---------------------------------------------------------------
FROM node:22-alpine AS deps

WORKDIR /app

# Alpine (musl) plutot que slim (glibc) : verifie, l'image passe de 937 Mo a
# 812 Mo et tout fonctionne — migrations Prisma, argon2, stockage objet.
#
# La chaine de compilation est necessaire ICI et seulement ici : argon2 n'a pas
# de binaire precompile pour musl, il se compile a l'installation. Elle ne suit
# pas dans l'image finale, qui ne garde qu'openssl (moteurs Prisma) et wget
# (sonde de sante).
RUN apk add --no-cache openssl ca-certificates python3 make g++

COPY package.json package-lock.json ./
RUN npm ci

# --- Build ---------------------------------------------------------------------
FROM deps AS build

COPY . .

# `prisma generate` lit prisma.config.ts, qui exige DATABASE_URL — alors qu'il ne
# se connecte a rien : il ne fait que produire le client typé. On lui donne donc
# une URL factice, valable pour cette etape de build uniquement. La vraie URL
# arrive a l'execution, par l'environnement du conteneur.
ENV DATABASE_URL=postgresql://build:build@localhost:5432/build

# Le client Prisma est genere au build : l'image est autonome, le serveur ne
# compile rien.
RUN npx prisma generate && npm run build

# --- Dependances de production uniquement --------------------------------------
FROM deps AS prod-deps
ENV DATABASE_URL=postgresql://build:build@localhost:5432/build
COPY prisma ./prisma
COPY prisma.config.ts ./
RUN npm ci --omit=dev && npx prisma generate

# --- Image finale --------------------------------------------------------------
FROM node:22-alpine AS runtime

WORKDIR /app
ENV NODE_ENV=production

RUN apk add --no-cache openssl ca-certificates wget

# `--chown` a la copie, et surtout PAS un `chown -R` en RUN : ce dernier
# reecrirait chaque fichier et dupliquerait la couche node_modules entiere,
# ce qui ajoutait 470 Mo a l'image pour un simple changement de proprietaire.
COPY --from=prod-deps --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
# Le schema, les migrations et le seed voyagent avec l'image : c'est ce qui
# permet au conteneur de se mettre a niveau tout seul au demarrage, sans qu'un
# seul fichier source ne vive sur le serveur.
COPY --from=build --chown=node:node /app/prisma ./prisma
COPY --from=build --chown=node:node /app/prisma.config.ts ./prisma.config.ts
COPY --chown=node:node package.json ./
COPY --chmod=755 docker-entrypoint.sh /usr/local/bin/

# L'application ne tourne pas en root : sur une machine partagee, c'est le
# minimum. L'utilisateur `node` existe deja dans l'image officielle.
USER node

EXPOSE 3000

HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=5 \
  CMD wget -qO- http://127.0.0.1:3000/health > /dev/null || exit 1

ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["node", "dist/main"]
