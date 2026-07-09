**Monorepo Stability Guide -- Eliminating Setup Errors Without Splitting
Microservices**

This guide provides a step-by-step solution for developers working
inside the **Marketeq NestJS monorepo** who are encountering dependency
conflicts, missing modules, or build errors when setting up the backend
locally.\
\
It shows how to stabilize the environment, install only what's needed
for a **[single microservice]{.mark}**, and exclude unneeded test files
--- all **without splitting** the microservices into separate
repositories.

By following these steps, each developer can work independently on their
assigned service (for example, checkout-service or user-service) without
triggering cross-service build failures or dependency issues.

## **🎯 Purpose**

To make the monorepo behave like isolated, production-safe microservices
**without losing shared infrastructure**.\
\
After applying this guide, every developer should be able to:

1.  **Work on one service at a time** (e.g., only checkout-service)

2.  **Install only that service's dependencies\**

3.  **Avoid all shared rxjs / TypeScript / NestJS conflicts\**

4.  **Prevent global build errors from other unfinished services\**

5.  **Retain the benefits of shared code and single-repo deployment\**

> **Note:** checkout-service is used only as an example throughout this
> guide.\
> The same steps apply to any backend service inside apps/ (for example,
> user-service, listings-service, time-tracking-service, etc.).

This ensures a cleaner, faster, and more reliable setup for new
contributors and QA engineers working on specific backend services or
frontend integrations.

## **Step 1 --- Pin dependency versions with pnpm.overrides**

**What & why:** Force the whole workspace to use the same rxjs,
\@nestjs/axios, and axios versions so you don't get the
Subscriber/isStopped type errors again.

**Folder path:\**
marketeq-projects-nestjs/package.json *(monorepo root -- add these keys
without removing your existing fields)*

**{

\"name\": \"marketeq-projects-nestjs\",

\"private\": true,

\"packageManager\": \"pnpm@9.12.0\",

\"engines\": { \"node\": \"\>=20 \<21\", \"pnpm\": \"\>=9\" },

\"pnpm\": {

\"overrides\": {

\"rxjs\": \"7.8.1\",

\"@nestjs/axios\": \"3.0.1\",

\"axios\": \"\^1.6.8\"

}

},

\"scripts\": {

// guard: prevent accidental whole-repo builds

\"build\": \"echo \\\"❌ Use filtered build: pnpm \--filter \<service\>
build\\\" && exit 1\",

// convenience: filtered installs/builds for the single service you're
working on

\"i:checkout\": \"pnpm \--filter checkout-service install\",

\"build:checkout\": \"pnpm \--filter checkout-service build\",

\"dev:checkout\": \"pnpm \--filter checkout-service start:dev\",

// (optional) frontend helpers if your FE is in this workspace too

\"i:frontend\": \"pnpm \--filter marketeq-projects-frontend install\",

\"dev:frontend\": \"pnpm \--filter marketeq-projects-frontend dev\"

},

\"workspaces\": \[

\"apps/\*\",

\"packages/\*\"

\]

}

**Run (once) after saving:**

****pnpm -w install

pnpm -w dedupe



## **Step 2 --- Install & build per service (never the whole repo)**

**What & why:** Make the monorepo behave like separate repos. You only
install/build the service you're touching (e.g., checkout-service), so
unrelated services can't break your local build.

**Folder path:\**
*(no files to add here---just use these commands from the monorepo
root)*

**\# install only checkout-service deps

pnpm \--filter checkout-service install

\# run only checkout-service in watch mode

pnpm \--filter checkout-service start:dev

\# build only checkout-service

pnpm \--filter checkout-service build

> You can also use the scripts added in **Step 1**:

pnpm i:checkout

pnpm dev:checkout

pnpm build:checkout



## **Step 3 --- Exclude tests and unused folders from each service's TypeScript build**

**What & why:** Keeps nest build fast and avoids compilation of
spec/tests or scaffolding that isn\'t ready, which often triggers
"cannot find module ..." errors.

**Folder path:\**
marketeq-projects-nestjs/apps/checkout-service/tsconfig.build.json
*(create if missing)*

**{

\"extends\": \"./tsconfig.json\",

\"compilerOptions\": {

\"outDir\": \"../dist\",

\"declaration\": true,

\"sourceMap\": true

},

\"exclude\": \[

\"test\",

\"\*\*/\*.spec.ts\",

\"\*\*/\*.test.ts\",

\"\*\*/\_\_mocks\_\_/\*\*\",

\"\*\*/e2e/\*\*\",

\"\*\*/\*.md\",

\"\*\*/\*.json\",

\"dist\"

\]

}

> Repeat this file for any other service you work on, e.g.\
> apps/user-service/tsconfig.build.json,
> apps/time-tracking-service/tsconfig.build.json, etc.

## **Step 4 --- Ensure each service has local build/run scripts (simple & explicit)**

**What & why:** Some services miss local scripts or rely on root scripts
that try to build everything. Add minimal service-local scripts so the
filtered commands "just work."

**Folder path:\**
marketeq-projects-nestjs/apps/checkout-service/package.json *(create or
merge; don't delete your existing fields)*

**{

\"name\": \"checkout-service\",

\"private\": true,

\"scripts\": {

\"start:dev\": \"nest start \--watch\",

\"build\": \"nest build\"

}

}



## **Step 5 --- (Optional but recommended) Minimal service-only Docker for local DB**

**What & why:** Prevent "password authentication failed for user
\'postgres\'" loops by keeping DB env with the service you're running.
You'll only bring up Postgres for this service.

**Folder path:\**
marketeq-projects-nestjs/apps/checkout-service/docker-compose.dev.yml

version: \"3.9\"

services:

db:

image: postgres:15-alpine

environment:

POSTGRES_USER: postgres

POSTGRES_PASSWORD: postgres

POSTGRES_DB: marketeq_checkout_dev

ports:

\- \"5432:5432\"

**Service env file (used by TypeORM):\**
marketeq-projects-nestjs/apps/checkout-service/.env

DB_HOST=localhost

DB_PORT=5432

DB_USER=postgres

DB_PASS=postgres

DB_NAME=marketeq_checkout_dev

**Run:**

****cd marketeq-projects-nestjs/apps/checkout-service

docker compose -f docker-compose.dev.yml up -d

cd ../../..

pnpm dev:checkout



## **Step 6 --- (Optional) Frontend stays isolated to Checkout only**

**What & why:** The frontend should only call the Checkout API. No
backend needed while you code UI if you prefer mocks; zero throwaway at
deploy.

**Folder path:\**
marketeq-projects-frontend/src/lib/checkoutClient.ts

const BASE = process.env.NEXT_PUBLIC_CHECKOUT_BASE_URL!;

async function j\<T\>(res: Response): Promise\<T\> {

if (!res.ok) throw await res.json().catch(() =\> ({ message:
res.statusText }));

return res.json() as Promise\<T\>;

}

export const CheckoutAPI = {

createSession: (body: { items: Array\<{ id: string; qty: number }\> })
=\>

fetch(\`\${BASE}/v1/checkout/sessions\`, {

method: \'POST\',

headers: { \'Content-Type\': \'application/json\' },

body: JSON.stringify(body),

credentials: \'include\'

}).then(j\<{ id: string; clientSecret: string }\>()),

getSession: (id: string) =\>

fetch(\`\${BASE}/v1/checkout/sessions/\${id}\`, { credentials:
\'include\' })

.then(j\<{ id: string; status: string }\>())

};

**Folder path:\**
marketeq-projects-frontend/.env.local

NEXT_PUBLIC_CHECKOUT_BASE_URL=http://localhost:41000

*(If your Checkout API is behind the gateway, point that URL to the
gateway route instead.)*

### **✅ You're done**

- **(a)** Versions pinned → pnpm.overrides in root package.json.

- **(b)** Service-scoped work → always run with pnpm \--filter
  checkout-service ... (or the scripts you added).

- **(c)** Test/unused code excluded → tsconfig.build.json per service.
