#!/bin/sh
set -e

# Les migrations sont appliquees au demarrage du conteneur.
#
# C'est ce qui rend le deploiement one-click : `docker compose up -d` suffit,
# il n'y a pas d'etape manuelle a enchainer ni de README a lire pour reparer.
#
# Limite assumee : avec plusieurs repliques, deux instances lanceraient la
# migration en meme temps. Prisma pose un verrou consultatif qui protege de la
# corruption, mais si l'on passe un jour a l'echelle, cette etape devra sortir
# dans un job dedie.
echo "-> Application des migrations..."
npx prisma migrate deploy

# Le seed est idempotent : il ne recree rien s'il trouve deja des donnees.
# Active par defaut pour que le premier demarrage donne une application
# utilisable, comme l'exige le livrable (identifiants de demo + demande seedee).
if [ "${RUN_SEED:-true}" = "true" ]; then
  echo "-> Seed (idempotent)..."
  npx tsx prisma/seed.ts
fi

echo "-> Demarrage de l'API."
exec "$@"
