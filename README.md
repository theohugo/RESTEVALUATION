# KBO – Explorateur d'entreprises

Application full-stack pour explorer et gérer les entreprises, adresses et établissements (CRUD). Stack: PostgreSQL, Node.js (Express, TypeScript), Vue 3.

## Prérequis
- Docker + Docker Compose
- Node.js 18+ et npm
- CSV KBO disponibles dans le dossier kbo-data

## Structure
```
RESTEVALUATION/
  backend/
    src/
    package.json
  frontend/
    src/
    package.json
  init.sql
  docker-compose.yml
  kbo-data/
    activity.csv
    address.csv
    branch.csv
    code.csv
    contact.csv
    denomination.csv
    enterprise.csv
    establishment.csv
    meta.csv
```

## 1) Préparer les CSV
- Place les fichiers CSV dans `kbo-data/` (noms attendus comme ci-dessus).
- L’import se fait via `init.sql`. Par défaut:
  - enterprise: import complet
  - autres tables: 100 lignes (pour tests)

## 2) Lancer PostgreSQL (Docker)
```
docker compose up -d
```
- Postgres démarre et exécute `init.sql` pour créer les tables + importer les CSV.

Réinitialiser:
```
docker compose down
rm -rf postgres-data
docker compose up -d
```

## 3) Installer les dépendances
Backend:
```
cd backend
npm install
```
Frontend:
```
cd ../frontend
npm install
```

## 4) Configurer les environnements
Backend (optionnel):
- PORT (par défaut 4000)
- Connexion DB (configurée dans backend/src/db.ts selon docker-compose)

Frontend:
- Crée `frontend/.env` (ou `.env.local`) avec:
```
VITE_API_URL=http://localhost:4000
```

## 5) Démarrer
Backend (Express + TS):
```
cd backend
npm run dev
```
Frontend (Vue 3 + Vite):
```
cd ../frontend
npm run dev
```
Applications:
- API: http://localhost:4000
- Frontend: http://localhost:5173 (par défaut)

## 6) API principale (résumé)
- GET /health
- GET /enterprises?take=50&skip=0&q=term
- GET /enterprises/count?q=term
- GET /enterprises/:id
- POST /enterprises  (tous champs requis: enterprisenumber, name, status, juridicalsituation, typeofenterprise, juridicalform, juridicalformcac, startdate)
- PUT /enterprises/:id
- DELETE /enterprises/:id  (cascade: établissements + adresse)
- GET /enterprises/:id/establishments
- POST /enterprises/:id/establishments
- PUT /establishments/:establishmentnumber
- DELETE /establishments/:establishmentnumber
- PUT /enterprises/:id/address  (upsert adresse REGO)

## 7) Choix techniques
- Base de données: PostgreSQL (Docker)
  - Import via `init.sql`, clés primaires et étrangères
  - dates normalisées en `YYYY-MM-DD` côté API pour éviter les décalages timezone
  - Cohérence: Postgres est robuste pour des datasets volumineux (enterprise ~millions de lignes), SQL expressif pour jointures (enterprise ↔ denomination ↔ address ↔ establishment), Docker garantit un environnement reproductible.

- Backend: Node.js + Express + TypeScript
  - Pagination (take/skip), filtres `q`, erreurs HTTP claires
  - Suppression entreprise en cascade (établissements + adresses)
  - Cohérence: Express offre une API REST simple et performante, TypeScript sécurise les contrats entre couches (DTO, repository), et l’écosystème Node facilite l’intégration, le dev rapide et le tooling (nodemon, vite, etc.).

- Frontend: Vue 3 + Vite
  - UI moderne: icônes, boutons primaires/danger/subtle
  - Recherche avec barre stylisée et clear
  - Vue détail en lecture seule avec bouton “Éditer” → modale pour CRUD (entreprise, adresse, établissements)
  - Validation côté front sur création (tous champs requis)
  - Cohérence: Vue 3 Composition API est adaptée à des états réactifs (pagination, filtres, modales), Vite apporte un DX rapide et un bundling efficace, et le pattern “lecture seule + modale d’édition” améliore l’UX en évitant les modifications accidentelles.

## 8) Tests rapides
Vérifier la DB:
```
docker exec -it kbo-postgres psql -U kbo -d kbo -c "SELECT COUNT(*) FROM enterprise;"
```
Tester l’API:
```
curl http://localhost:4000/health
curl "http://localhost:4000/enterprises?take=25&skip=0"
```

## Licence
Projet scolaire – évaluation REST API.
