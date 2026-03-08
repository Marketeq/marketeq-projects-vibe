## **✅ Updated render.yaml**

Use this as your **monorepo Render config** with Yarn enforced and
memory fixes applied. This example assumes each service (e.g.
notification-service) is deployed as a separate container:

# render.yaml

services:

\- type: web

name: notification-service

env: node

plan: free

rootDir: app/notification-service

buildCommand: \|

yarn install \--frozen-lockfile

NODE_OPTIONS=\"\--max_old_space_size=2048\" yarn build

startCommand: yarn start:prod

envVars:

\- key: ABLY_API_KEY

sync: false

\- key: SENDGRID_API_KEY

sync: false

\- key: DATABASE_URL

sync: false

\- key: RABBITMQ_URL

sync: false

> 🔐 After deploying, go to **Render \> notification-service \>
> Environment** and add each env variable manually.

## **✅ .npmrc (Enforce Yarn, prevent npm fallback)**

Create this in the root of your monorepo:

package-lock=false



## **✅ README Deployment Checklist (DEPLOYMENT.md)**

****\# 🧾 Marketeq Deployment Checklist (Render + Yarn + Monorepo)

This guide ensures every developer and DevOps team member follows
consistent deployment practices across all microservices.

\-\--

\## ✅ 1. Package Manager Setup (Use Yarn Only)

\`\`\`bash

rm -rf node_modules package-lock.json

yarn install

- \
  Commit yarn.lock

- Add .npmrc in root:

package-lock=false



## **✅ 2. Local Environment (.env setup)**

For each service (example: notification-service), create a .env file in:

/app/notification-service/.env



ABLY_API_KEY=your_ably_key

SENDGRID_API_KEY=your_sendgrid_key

DATABASE_URL=postgres://\<username\>:\<password\>@\<host\>:\<port\>/\<db\>

RABBITMQ_URL=amqp://\<username\>:\<password\>@\<host\>:\<port\>



## **✅ 3. Render Setup**

### **Project Structure:**

****/app

/notification-service

/src

Dockerfile

.env

render.yaml

package.json

### **Dockerfile (inside app/notification-service/):**

****FROM node:18

WORKDIR /app

COPY . .

RUN yarn install \--frozen-lockfile

CMD \[\"yarn\", \"start:prod\"\]

### **render.yaml should include:**

- rootDir for each microservice

- NODE_OPTIONS=\"\--max_old_space_size=2048\" for large builds

## **✅ 4. Environment Variables on Render**

Go to Render \> Service \> **Environment** tab.

Set these keys for notification-service:

  ---------------------------------------
  **Key**             **Value**
  ------------------- -------------------
  ABLY_API_KEY        your_ably_key

  SENDGRID_API_KEY    your_sendgrid_key

  DATABASE_URL        postgres://\...

  RABBITMQ_URL        amqp://\...
  ---------------------------------------

**Set sync: false** in render.yaml to ensure they're pulled from the
dashboard only.

## **✅ 5. Troubleshooting Build Issues**

- **Memory issue?** Add this to buildCommand in render.yaml:

NODE_OPTIONS=\"\--max_old_space_size=2048\"

- \
  **Build warning?** Delete package-lock.json and switch fully to Yarn.

## **✅ 6. Deployment Workflow**

1.  Push to GitHub (or manual trigger in Render)

2.  Render builds and deploys

3.  Monitor logs via dashboard

4.  Confirm success on Render URL

5.  Notify team ✅
