**🧭 Render Backend Setup -- Single App, Multi-Container Deployment**

This guide walks you through **migrating the entire
marketeq-projects-nestjs backend** to Render using a **single app with
multiple Docker containers**. No frontend, no CI/CD. This is just for
standing up your backend microservices with one PostgreSQL database.

## **🔁 Step 0: Delete All Failed Render Services**

Before starting, make sure there are **no failed or duplicate
services**:

1.  Log in to your Render dashboard:
    [[https://dashboard.render.com\]{.underline}
    ](https://dashboard.render.com/)

2.  Delete **all previous web services** related to
    marketeq-projects-nestjs if they failed or were created separately.

    - Do NOT delete your existing PostgreSQL instance.

    - Keep only one empty Render Web Service.

## **🛠 Step 1: Create a Single App for Backend Deployment**

1.  In the Render dashboard, click **\"New Web Service\"\**

2.  Choose **\"Deploy from a Git repository\"\**

3.  Select the repo: marketeq-projects-nestjs

4.  Choose the branch: staging or live (pick the one you\'re ready to
    deploy)

5.  Select environment: **Docker\**

6.  Use **Docker Build** → Make sure you have a valid render.yaml in
    your root directory.

> ✅ Your microservices must follow the monorepo format:

/app

/user-service

/listing-service

/review-service

/messaging-service

/notification-service

/content-moderation-service

\...

/render.yaml



## **⚙️ Step 2: Set Up render.yaml**

Your render.yaml file should live in the **root** of your GitHub repo.
Example:

services:

\- type: web

name: user-service

env: docker

plan: free

dockerfilePath: ./app/user-service/Dockerfile

buildCommand: \"\"

startCommand: \"yarn start:prod\"

envVars:

\- key: DATABASE_URL

fromDatabase:

name: marketeq-poster-db

property: connectionString

\- key: JWT_SECRET

value: your_jwt_secret_here

\- type: web

name: listing-service

env: docker

plan: free

dockerfilePath: ./app/listing-service/Dockerfile

buildCommand: \"\"

startCommand: \"yarn start:prod\"

envVars:

\- key: DATABASE_URL

fromDatabase:

name: marketeq-poster-db

property: connectionString

\- key: JWT_SECRET

value: your_jwt_secret_here

> Repeat for all your microservices (you can just copy-paste each
> block).

## **🔗 Step 3: Link GitHub & Trigger Deploy**

1.  In Render dashboard → Go to your new Web App

2.  Under **Settings \> Git**, make sure the correct GitHub repo and
    branch is selected

3.  Click **\"Manual Deploy\" \> \"Deploy latest commit\"\**

This will trigger all the services in render.yaml.

## **🔐 Step 4: Add Environment Variables**

1.  From the Render dashboard → Go to each microservice listed

2.  Under **Environment** tab:

    - Add JWT_SECRET

    - Add any custom variables like PORT, SERVICE_NAME, etc.

    - Use the **DATABASE_URL** from your Render PostgreSQL instance

> ⚠️ Do **not** hardcode secrets into GitHub. Use Render's env
> management instead.

## **✅ Step 5: Final Validation Checklist**

- All containers show "Live" in the Render dashboard

- render.yaml is committed to your staging or live branch

- Your PostgreSQL instance remains unchanged

- Services are pointing to the correct DB connection string

- Each service has its environment variables set

- You can hit endpoints at:

  - https://your-render-url.onrender.com/auth/login

  - https://your-render-url.onrender.com/user/profile

  - etc.

### **🛑 DO NOT:**

- Do not create separate apps per service.

- Do not run integration testing until the full backend is live.

- Do not manually rebuild services outside GitHub → let Render
  auto-deploy from branch commits.

✅ **Done. You now have a fully working Render backend migration.\**
