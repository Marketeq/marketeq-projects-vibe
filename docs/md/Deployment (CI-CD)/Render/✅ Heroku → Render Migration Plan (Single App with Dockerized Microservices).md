# **✅ Heroku → Render Migration Plan (Single App with Dockerized Microservices)**

**Goal**: Migrate all backend microservices from Heroku to Render under
a single app using separate Docker containers for each service. This
avoids the billing issues and confusion caused by Heroku's multiple-app
setup.

## **📁 1. Folder Structure (Already Set Up)**

Assuming you're using a monorepo with this structure:

/marketeq-projects-nestjs

├── apps

│ ├── user-service

│ ├── review-service

│ ├── messaging-service

│ └── listing-service

├── shared

├── docker-compose.yml

├── .env

└── render.yaml \<\-- (New Render configuration file)



## **⚙️ 2. Render Configuration File (render.yaml)**

Create a render.yaml file in the root of your monorepo:

services:

\- type: web

name: marketeq-backend

env: docker

region: oregon

plan: free

dockerContext: .

dockerfilePath: ./Dockerfile

buildCommand: docker compose build

startCommand: docker compose up

autoDeploy: true

> ✅ You will only deploy *one* web service (monolithic), but inside it
> each microservice will run in a separate container via docker-compose.

## **🐳 3. Docker Compose Setup**

Update your docker-compose.yml to include each microservice like this:

version: \'3.8\'

services:

user-service:

build:

context: ./apps/user-service

ports:

\- \"3001:3000\"

env_file:

\- .env

depends_on:

\- postgres

review-service:

build:

context: ./apps/review-service

ports:

\- \"3002:3000\"

env_file:

\- .env

depends_on:

\- postgres

messaging-service:

build:

context: ./apps/messaging-service

ports:

\- \"3003:3000\"

env_file:

\- .env

depends_on:

\- postgres

listing-service:

build:

context: ./apps/listing-service

ports:

\- \"3004:3000\"

env_file:

\- .env

depends_on:

\- postgres

postgres:

image: postgres

restart: always

environment:

POSTGRES_USER: youruser

POSTGRES_PASSWORD: yourpass

POSTGRES_DB: yourdb

volumes:

\- postgres-data:/var/lib/postgresql/data

volumes:

postgres-data:



## **🔐 4. Environment Variables (.env)**

Add a .env file in your root directory with shared values used by all
services:

DATABASE_URL=postgres://youruser:yourpass@postgres:5432/yourdb

JWT_SECRET=your_jwt_secret

> These variables are used by every service when it starts. Render will
> detect .env automatically.

## **🚀 5. Deployment Steps**

1.  **Commit your docker-compose.yml and render.yaml to GitHub\**

2.  **Login to Render** and create a new **Web Service\**

3.  **Connect your GitHub repo\**

4.  Render will detect render.yaml and auto-deploy all containers

5.  Your microservices will be live under one domain with different
    ports internally

## **🔁 6. Post-Migration Cleanup**

- Delete Heroku apps to avoid duplicate billing

- Remove any Heroku-specific config from .env or codebase

- Optional: Reassign domain if needed (e.g. api.marketeq.dev)

## **🧠 Additional Notes**

- **Render Free Tier** includes:

  - 500 compute hours/month

  - PostgreSQL instance (separate setup if needed)

  - Background workers (paid)

- You do **not** need to use multiple Render services for each
  microservice
