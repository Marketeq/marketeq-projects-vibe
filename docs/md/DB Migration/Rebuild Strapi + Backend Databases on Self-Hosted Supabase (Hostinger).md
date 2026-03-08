# **Rebuild Strapi + Backend Databases on Self-Hosted Supabase (Hostinger)**

## **1. Goal / Constraints**

- Old Render Postgres instances are suspended.

- We only care about **schema**, not data.

- New stack:

  - **VPS A** -- Supabase (Postgres) on Hostinger

  - **VPS B** -- Strapi on Hostinger

  - **VPS C** -- NestJS backend on Hostinger (from
    marketeq-projects-nestjs repo)

- Render config shows:

  - Strapi DB: marketeq-strapi-db → marketeq_strapi_db, user
    marketeq_strapi_db_user

  - Backend DB: marketeq-backend-DB → marketeq_backend_db, user
    marketeq_backend_db_user

  - Both apps use **DATABASE_URL** env var.

We will:

1.  Create those two databases + users on Supabase.

2.  Point Strapi to an **empty** marketeq_strapi_db and let Strapi
    auto-create all tables.

3.  Point the NestJS backend to an **empty** marketeq_backend_db and run
    the existing migrations from GitHub.

## **2. Create the Databases on Supabase VPS**

> All commands in this section run on **VPS A (Supabase)**, logged in as
> postgres or via psql inside the Supabase container.

1.  **Open psql\**

****psql
postgresql://postgres:\<SUPERUSER_PASSWORD\>@127.0.0.1:5432/postgres

2.  \
    **Create Strapi DB + user\**

****CREATE DATABASE marketeq_strapi_db;

CREATE USER marketeq_strapi_db_user

WITH PASSWORD \'\<STRONG_PASSWORD_1\>\';

GRANT ALL PRIVILEGES ON DATABASE marketeq_strapi_db

TO marketeq_strapi_db_user;

3.  \
    **Create Backend DB + user\**

****CREATE DATABASE marketeq_backend_db;

CREATE USER marketeq_backend_db_user

WITH PASSWORD \'\<STRONG_PASSWORD_2\>\';

GRANT ALL PRIVILEGES ON DATABASE marketeq_backend_db

TO marketeq_backend_db_user;

4.  \
    (Optional but recommended) Restrict network access so **only VPS B +
    VPS C IPs** can talk to port 5432.

## **3. Wire Strapi to Supabase and Let It Rebuild marketeq_strapi_db**

> All steps in this section are on **VPS B (Strapi)**, using the
> marketeq-projects-strapi repo.

### **3.1 Set DATABASE_URL for Strapi**

1.  From the Supabase VPS, decide the public host/IP for Postgres, e.g.:

\<SUPABASE_PUBLIC_IP\> \# From Hostinger panel for VPS A

2.  \
    On VPS B, edit Strapi environment (systemd service, .env, or Docker
    env) and set:

DATABASE_URL=postgresql://marketeq_strapi_db_user:\<STRONG_PASSWORD_1\>@\<SUPABASE_PUBLIC_IP\>:5432/marketeq_strapi_db

DATABASE_SSL=false \# or true if you later add SSL; for now internal
traffic is fine

3.  \
    Keep all other Strapi secrets (JWT, admin keys, etc.) the same.

### **3.2 Install and build Strapi (same as Render)**

According to the exported Render config:

# On VPS B

git clone https://github.com/Marketeq/marketeq-projects-strapi.git

cd marketeq-projects-strapi

npm ci

npm run build

### **3.3 Start Strapi and let it auto-create tables**

For the first run, you can use develop mode to watch logs:

npm run develop

\# or for production:

\# npm run start

- \
  When Strapi starts with **an empty Postgres DB**, it automatically:

  - Creates all Strapi core tables

  - Creates component / relation / join tables

  - Creates admin_users, roles, permissions, etc.

### **3.4 Verify in Supabase**

Back on the Supabase panel:

- Use the table browser or psql to connect to marketeq_strapi_db as
  marketeq_strapi_db_user and confirm:

  - Tables like strapi_core_store_settings, up_permissions, your content
    types, etc. exist.

- If Strapi schema looks good, stop npm run develop and configure your
  **production** start command (usually npm run start under a process
  manager).

## **4. Wire the NestJS Backend to Supabase and Rebuild marketeq_backend_db**

> This section is on **VPS C (NestJS backend)**, using
> marketeq-projects-nestjs.

From Render export we know: backend service
marketeq-projects-nestjs-main used DATABASE_URL and ran the Listings
service.

### **4.1 Set DATABASE_URL for backend**

1.  Use same Supabase host/IP as for Strapi.

2.  In the backend .env on VPS C (or service env vars), set:

DATABASE_URL=postgresql://marketeq_backend_db_user:\<STRONG_PASSWORD_2\>@\<SUPABASE_PUBLIC_IP\>:5432/marketeq_backend_db

3.  \
    Leave other env vars unchanged (Stripe, Auth, etc.).

### **4.2 Install dependencies and build backend**

Mirror the Render build command:

# On VPS C

git clone https://github.com/Marketeq/marketeq-projects-nestjs.git

cd marketeq-projects-nestjs

\# Install root deps

npm ci \--legacy-peer-deps

\# Build the listings service (same as Render)

cd apps/listings-service

npm ci \--legacy-peer-deps

npm run build

### **4.3 Run DB migrations to rebuild schema**

In this repo you already have migrations (TypeORM/Prisma/etc.). The dev
should:

1.  Inspect package.json and apps/\*\* for the existing migration
    script. Common patterns:

    - TypeORM:

npm run migration:run

- \
  Prisma:

npx prisma migrate deploy

2.  \
    Run the appropriate migration command **after** DATABASE_URL is
    pointing at marketeq_backend_db.

This will reconstruct all tables, relations, and indexes exactly as
defined in GitHub. No legacy data will be copied.

### **4.4 Start the backend service**

Match the Render start command:

cd apps/listings-service

NODE_PATH=\$(pwd)/../../node_modules NODE_ENV=production \\

node -r reflect-metadata dist/main.js

(Production should run this under a process manager like pm2/systemd.)

## **5. Quick Verification Checklist**

**Strapi DB (marketeq_strapi_db)**

- marketeq_strapi_db exists on Supabase.

- marketeq_strapi_db_user can connect.

- Strapi boots successfully and you can log into the admin on Hostinger.

- Tables are present in Supabase.

**Backend DB (marketeq_backend_db)**

- marketeq_backend_db exists on Supabase.

- marketeq_backend_db_user can connect.

- Migrations complete with no fatal errors.

- Backend API health check passes (e.g., /health endpoint or whatever
  you have).

- Core flows that hit the DB work (e.g., basic listing fetch).
