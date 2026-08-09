#!/bin/sh
# Amorcage du certificat.
#
# nginx refuse de demarrer si `ssl_certificate` pointe vers un fichier absent —
# or Let's Encrypt ne peut pas emettre sans un nginx qui ecoute deja sur le port 80
# pour servir le challenge. On casse la boucle avec un certificat auto-signe
# jetable, remplace des la premiere emission reelle.
#
# Idempotent : ne touche a rien si un certificat existe deja. En particulier, il
# n'ecrase JAMAIS un certificat Let's Encrypt valide.
set -e

DOMAIN="${PUBLIC_DOMAIN:?PUBLIC_DOMAIN doit etre defini}"
LIVE_DIR="/etc/letsencrypt/live/${DOMAIN}"

if [ -f "${LIVE_DIR}/fullchain.pem" ]; then
  echo "Certificat deja present pour ${DOMAIN} — rien a faire."
  exit 0
fi

echo "Aucun certificat pour ${DOMAIN} : generation d'un auto-signe temporaire."
mkdir -p "${LIVE_DIR}"

openssl req -x509 -nodes -newkey rsa:2048 -days 1 \
  -keyout "${LIVE_DIR}/privkey.pem" \
  -out "${LIVE_DIR}/fullchain.pem" \
  -subj "/CN=${DOMAIN}" 2>/dev/null

# Validite d'un jour, deliberement : si ce certificat est encore la demain, c'est
# que l'emission reelle n'a jamais eu lieu. Mieux vaut un avertissement voyant
# qu'un auto-signe qui s'installe discretement pour dix ans.
echo "Auto-signe temporaire en place (valide 1 jour)."
echo "Enchaine avec : make cert-staging puis make cert-prod"
