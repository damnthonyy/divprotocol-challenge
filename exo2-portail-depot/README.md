# DIV Protocol — Portail de dépôt de pièces

Portail permettant à un avocat de créer des demandes de dépôt de pièces (lien + code PIN)
et à ses clients de déposer leurs fichiers de façon anonyme et sécurisée.

## Structure du dépôt

```
frontend/   Application React/Vite (Chakra UI v3). Voir frontend/README.md
backend/    API NestJS — à venir
infra/      Déploiement / conteneurisation globale — à venir
```

## Démarrer en local

Seul le frontend est disponible pour l'instant ; il tourne sur des mocks MSW en
attendant le backend NestJS.

```bash
cd frontend
npm install
cp .env.example .env
npm run dev          # http://localhost:5173
```

Compte de démonstration : `avocat@divprotocol.com` / `demo1234`.

Détails (scripts, écrans, design system, choix techniques, Docker) : voir
[frontend/README.md](frontend/README.md).

## À venir

- `backend/` : API NestJS remplaçant les mocks MSW.
- `infra/` : orchestration des conteneurs (frontend + backend) et `install.sh`.

Ce README sera complété au fur et à mesure du scaffolding de ces parties.
