# **Strapi Quick Setup --- Dependencies & Bootstrap**

**Goal:** A fast, repeatable setup so devs can clone the Strapi repo and
run it **without errors**.

> This covers local dev and production Docker. Adjust versions to your
> org standards if different.

## **0) System Requirements**

- **Node.js:** v18.x or v20.x (LTS)

- **Package manager:** yarn **or** npm (pick one per repo)

- **DB:** PostgreSQL 13+ (recommended)

- **OS deps (common gotchas):\**

  - Linux: build-essential, python3, make, g++

  - macOS (Apple Silicon): Xcode CLT; Rosetta if using Intel-only deps

  - Windows: windows-build-tools or VS Build Tools (for node-gyp)

## **1) Clone & Install**

**Folder path\**
/strapi (repo root)

# 1) Clone

git clone \<your-strapi-repo-url\> strapi

cd strapi

\# 2) Node version

node -v \# ensure 18.x or 20.x

\# 3) Install deps

\# choose ONE: yarn OR npm

yarn install \# or: npm ci

**Common errors**

- sharp build errors → ensure build tools installed; try npm rebuild
  sharp.

- node-gyp fails → verify Python 3 and C/C++ toolchain.

## **2) Environment Variables**

**Folder path\**
/strapi/.env (create from example)

cp .env.example .env

**Minimum vars**

****APP_KEYS=change-this,change-this-too

API_TOKEN_SALT=change-this

ADMIN_JWT_SECRET=change-this

JWT_SECRET=change-this

\# Database (Postgres)

DATABASE_CLIENT=postgres

DATABASE_HOST=127.0.0.1

DATABASE_PORT=5432

DATABASE_NAME=strapi

DATABASE_USERNAME=strapi

DATABASE_PASSWORD=strapi

DATABASE_SSL=false

> Do **not** commit .env with real secrets.

## **3) Database**

### **Local Postgres (docker)**

****docker run \--name strapi-pg -e POSTGRES_DB=strapi -e
POSTGRES_USER=strapi -e POSTGRES_PASSWORD=strapi -p 5432:5432 -d
postgres:15

### **Existing Postgres**

- Create DB/user and set the .env accordingly.

## **4) Run Strapi (Dev)**

****yarn develop \# or: npm run develop

- \
  First run will prompt for **Admin** user creation.

- Visit: http://localhost:1337/admin

**Hot reload issues?** Clear .cache and build folders; re-run develop.

## **5) Build & Start (Prod)**

****yarn build && yarn start \# or: npm run build && npm run start

- \
  Ensure .env has production DB and secrets.

## **6) Docker (Prod)**

**Folder path\**
/strapi/Dockerfile

FROM node:20-alpine

WORKDIR /app

COPY package\*.json yarn.lock\* ./

RUN yarn install \--frozen-lockfile \|\| npm ci

COPY . .

RUN yarn build \|\| npm run build

EXPOSE 1337

CMD \[\"yarn\",\"start\"\]

**Folder path\**
/strapi/docker-compose.yml

version: \'3.9\'

services:

strapi:

build: .

image: yourorg/strapi:latest

env_file: .env

ports: \[\"1337:1337\"\]

depends_on: \[db\]

db:

image: postgres:15

environment:

POSTGRES_DB: \${DATABASE_NAME}

POSTGRES_USER: \${DATABASE_USERNAME}

POSTGRES_PASSWORD: \${DATABASE_PASSWORD}

volumes:

\- strapi-pg:/var/lib/postgresql/data

ports: \[\"5432:5432\"\]

volumes:

strapi-pg:



## **7) Content Types & Components (from Schema Doc)**

After first boot, create content types/components **exactly** as in
**"Strapi Schema --- L1/L2/L3 Category Pages."\**
Alternatively, copy the JSON schemas:

- /src/api/category/content-types/category/schema.json

- /src/components/seo/seo-override.json

- /src/components/editorial/hero.json

- /src/api/guide/content-types/guide/schema.json

- /src/api/course/content-types/course/schema.json

- /src/api/taxonomy-group/content-types/taxonomy-group/schema.json

- /src/components/rules/rule.json

Then run:

yarn build && yarn develop \# regenerate types and admin UI



## **8) Media & Uploads**

- Default local upload works out of the box.

- If using a CDN (e.g., Cloudflare Images/S3), configure the
  corresponding Strapi upload provider plugin and set env vars.

## **9) Permissions & Security**

- Restrict Public/Authenticated roles; only Admins log into Strapi.

- Rotate secrets in .env for non‑dev.

## **10) Troubleshooting Quicklist**

- **Port 1337 in use** → stop other Strapi instances.

- **DB auth failed** → check .env DB creds and container logs.

- **Admin build stuck** → clear ./.cache and ./build.

- **Plugin errors after git pull** → re-install deps (yarn install),
  yarn build.

## **11) Hand‑off Checklist**

- Node 18/20 installed

- Postgres reachable (local or cloud)

- .env created with secrets & DB vars

- yarn develop runs, admin reachable

- Content types/components match the Schema Doc

- Upload provider configured (if using CDN)
