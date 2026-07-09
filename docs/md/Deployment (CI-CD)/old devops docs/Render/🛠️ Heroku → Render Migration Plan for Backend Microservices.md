# **🛠️ Heroku → Render Migration Plan for Backend Microservices**

## **✅ Overview**

You\'re migrating from Heroku to **Render**, using a **single app** on
Render that contains **multiple Docker containers**, each corresponding
to a backend microservice. This avoids billing confusion and
over-provisioning caused by Heroku's "one-app-per-service" model. Your
project uses a **monorepo** structure.

## **🧱 Assumptions**

- You have a working NestJS monorepo with microservices.

- Each service has its own Dockerfile.

- You've already created a Render account (Free plan is sufficient for
  MVP).

- The frontend remains hosted on **Vercel**.

- You want to run **all microservices in a single Render app** using
  separate containers.

## **📦 Step 1: Prepare Each Microservice**

Ensure each microservice directory contains:

- A valid Dockerfile

- .dockerignore

- .env (excluded from Git via .gitignore, but referenced for local dev)

- Unique PORT environment variable per service

**Example Dockerfile (basic):**

****FROM node:18-alpine

WORKDIR /app

COPY . .

RUN npm install

CMD \[\"npm\", \"run\", \"start:prod\"\]



## **📁 Step 2: Update Your Monorepo Layout (if needed)**

Example structure:

/marketeq-projects-nestjs

├── apps

│ ├── user-service

│ ├── auth-service

│ ├── review-service

│ └── \...

├── docker-compose.yml \<\-- optional for local dev

├── .github/workflows/ \<\-- GitHub Actions config

└── \...



## **⚙️ Step 3: Create a New \"Web Service\" on Render**

- Go to [[Render Dashboard\]{.underline}
  ](https://dashboard.render.com/)

- Click **\"New +\" \> Web Service\**

- Connect to your GitHub repo (marketeq-projects-nestjs)

- Name it something like marketeq-backend

- Environment: **Docker\**

- Region: Closest to your users or Oregon for lowest latency

- Select your branch (e.g., staging)

## **🧩 Step 4: Configure Docker Multi-Service Setup**

Render doesn't natively support docker-compose.yml for production, so
instead:

1.  **Use Render Blueprint Spec (render.yaml)\**

Create a file at the root of your repo:

# render.yaml

services:

\- type: web

name: user-service

env: docker

repo: https://github.com/your-org/marketeq-projects-nestjs

dockerContext: ./apps/user-service

dockerfilePath: Dockerfile

branch: staging

plan: free

envVars:

\- key: PORT

value: 3001

\- key: DATABASE_URL

sync: false

\- type: web

name: auth-service

env: docker

repo: https://github.com/your-org/marketeq-projects-nestjs

dockerContext: ./apps/auth-service

dockerfilePath: Dockerfile

branch: staging

plan: free

envVars:

\- key: PORT

value: 3002

\- key: DATABASE_URL

sync: false

You can repeat this for each service. This still appears as **one
\"app\"** on Render, just with multiple containers.

> ⚠️ Render technically provisions one \"service\" per container even
> within one project dashboard --- this is not the same as Heroku\'s
> separate apps per container.

## **🔑 Step 5: Set Environment Variables**

For each microservice, define:

- DATABASE_URL

- JWT_SECRET

- PORT (must be unique per container)

- Any service-specific secrets (e.g., STRIPE_KEY, PLAID_CLIENT_ID, etc.)

Use .env files locally. Render provides a UI for production vars.

## **🚀 Step 6: Enable Automatic Deploys**

From the Render dashboard:

- Enable \"Auto-Deploy\" on staging and/or live branches.

- Whenever you push to GitHub → it builds and redeploys.

## **🧪 Step 7: Test Your Containers on Render**

- Use the Render logs tab to verify container health.

- Use /health or /ping routes if implemented.

- Test service-to-service communication (via REST).

## **🧹 Step 8: Decommission Heroku**

Once you\'re confident:

- Stop your Heroku apps

- Remove old Heroku Git remotes from .git/config

- Cancel any paid Heroku dynos/add-ons

## **✅ Final Notes**

- You **do NOT** need multiple Render projects --- one is fine.

- Each microservice is still isolated by container, but billed under the
  same app.

- You can scale individual containers up/down as needed later.
