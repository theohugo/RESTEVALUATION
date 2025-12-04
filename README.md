Yes bro c’est **clean de chez clean**, ta base est nickel 🔥
On te génère maintenant un **README clair** + un **.gitignore propre** pour Node/Postgres/Docker.

---

# 📘 **README.md — Projet KBO (Import + Base Postgres)**

Structure du dossier :

```

RESTEVALUATION/
    docker-compose.yml
    init.sql
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

````

---

## ▶️ Lancer la base de données

```bash
docker compose up -d
````

Cela va :

1. Démarrer PostgreSQL
2. Exécuter `init.sql`
3. Créer toutes les tables
4. Importer automatiquement les CSV

---

## 🗃️ Se connecter à PostgreSQL

```bash
docker exec -it kbo-postgres psql -U kbo -d kbo
```

---

## 📦 Vérification rapide

Dans `psql` :

```sql
SELECT COUNT(*) FROM enterprise;
SELECT COUNT(*) FROM branch;
SELECT COUNT(*) FROM establishment;
```

Normalement :

* `enterprise` ≈ **1.9M** lignes
* `branch`, `establishment`, etc. ≈ **100** lignes (limitées pour test)

---

## 🔄 Réinitialiser la base (si besoin)

```bash
docker compose down
rm -rf postgres-data
docker compose up -d
```

⚠️ `postgres-data` contient toutes les données → suppression = reset complet.

---

## 📁 Contenu du projet

* **docker-compose.yml**
  Configure PostgreSQL + montage des CSV.

* **init.sql**

  * Crée toutes les tables
  * Ajoute PK + FK
  * Importe les CSV automatiquement
  * Limite à 100 lignes pour les tables hors `enterprise`

---

## 🧩 Étapes suivantes

* Développer l'API **Node.js (Express ou Nest)**
* Ajouter Prisma / Sequelize si besoin
* CRUD complet
* Routes relationnelles (enterprise → establishments → branches, etc.)

---

## ✨ Auteur

Projet scolaire – évaluation REST API (Hugo)
