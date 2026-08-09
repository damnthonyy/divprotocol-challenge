# Exercices — DIV Protocol

Monorepo regroupant les exercices du parcours candidat DIV Protocol.

| Dossier | Contenu | Statut |
| --- | --- | --- |
| [`exo2-portail-depot/`](exo2-portail-depot/README.md) | Portail de dépôt de pièces pour avocats — frontend React/Chakra, backend NestJS, infra Docker complète | En production, voir son README |
| `exo1-no-ai/` | Exercice sans assistance IA | À venir |

## CI/CD

`.github/workflows/` contient deux workflows, tous deux scopés à `exo2-portail-depot/` :

- **`ci.yml`** — lint, typecheck, tests et build de `frontend/` et `backend/` en parallèle, à
  chaque push et sur toute pull request vers `master`, `staging` ou `dev`.
- **`release.yml`** — construit et publie les images Docker sur GitHub Container Registry à
  chaque push sur `master` ou sur un tag `v*`. Détail des images publiées dans
  [exo2-portail-depot/README.md](exo2-portail-depot/README.md#images--github-container-registry).

## Branches

- `master` — branche de référence, déployée en production.
- `staging`, `dev` — branches de travail.

## Dossier `ai-logs/`

Chaque exercice conserve ses propres logs de conversation IA dans son sous-dossier
`ai-logs/` (secrets caviardés), pas à la racine.
