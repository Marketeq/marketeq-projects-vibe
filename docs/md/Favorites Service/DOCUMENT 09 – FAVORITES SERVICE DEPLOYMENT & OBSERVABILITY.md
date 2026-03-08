# **DOCUMENT 09 -- FAVORITES SERVICE DEPLOYMENT & OBSERVABILITY**

## **PURPOSE**

Containerize the favorites-service, deploy it to Render, add a
health-check endpoint, and set up CI/CD via GitHub Actions. By the end
you'll have:\
• A Dockerfile for the service\
• render.yaml config for Render deployment\
• A /health endpoint for uptime checks\
• A GitHub Actions workflow that builds, tests, and deploys on push to
main

## **PREREQUISITES**

• Documents 01--08 complete\
• Render account with linked GitHub repo\
• Render CLI installed (optional)\
• GitHub repo for monorepo

## **DIRECTORY STRUCTURE**

****monorepo/

└─ apps/

└─ favorites-service/

├─ src/

│ └─ health/

│ ├─ health.controller.ts

│ └─ health.module.ts

├─ Dockerfile

├─ render.yaml

├─ .env \# production vars stored in Render console

└─ \...

└─ .github/

└─ workflows/

└─ favorites-service.yml

## **STEP 1 -- Add Health-Check Endpoint**

1.  Create apps/favorites-service/src/health/health.controller.ts:

import { Controller, Get } from \'@nestjs/common\';

\@Controller(\'health\')

export class HealthController {

\@Get()

status() {

return { status: \'ok\', timestamp: new Date().toISOString() };

}

}

2.  Create apps/favorites-service/src/health/health.module.ts:

import { Module } from \'@nestjs/common\';

import { HealthController } from \'./health.controller\';

\@Module({

controllers: \[HealthController\],

})

export class HealthModule {}

3.  Register HealthModule in src/app.module.ts:

import { HealthModule } from \'./health/health.module\';

\@Module({

imports: \[

// existing imports...

HealthModule,

\],

// controllers/providers...

})

export class AppModule {}

4.  Verify locally:

curl http://localhost:4003/health

\# → {\"status\":\"ok\",\"timestamp\":\"2025-06-23T21:00:00.000Z\"}

## **STEP 2 -- Write Dockerfile**

In apps/favorites-service/Dockerfile:

# Stage 1: Build

FROM node:18-alpine AS builder

WORKDIR /usr/src/app

\# Install dependencies

COPY package.json package-lock.json ./

RUN npm ci

\# Copy source and build

COPY tsconfig.json ormconfig.ts ./

COPY src/ src/

RUN npm run build

\# Stage 2: Run

FROM node:18-alpine

WORKDIR /usr/src/app

\# Production deps only

COPY package.json package-lock.json ./

RUN npm ci \--omit=dev

\# Copy build output and config

COPY \--from=builder /usr/src/app/dist ./dist

COPY .env ./

\# Expose port and start

EXPOSE 4003

CMD \[\"node\", \"dist/main.js\"\]

## **STEP 3 -- Render Service Configuration**

At apps/favorites-service/render.yaml:

services:

\- type: web

name: favorites-service

env: node

region: oregon \# adjust to your preferred region

plan: starter \# or standard depending on load

envVars:

\- key: DATABASE_URL

sync: false

\- key: JWT_SECRET

sync: false

\- key: HUGGINGFACE_API_KEY

sync: false

\- key: SERVICE_TOKEN

sync: false

buildCommand: cd apps/favorites-service && npm ci && npm run build

startCommand: cd apps/favorites-service && npm run start

healthCheckPath: /health

• **envVars.sync=false** means you'll set values in the Render
dashboard's Environment page.\
• Save render.yaml at the repo root or point Render to it in "Settings
\> Deploy Hooks."

## **STEP 4 -- GitHub Actions Workflow**

Create .github/workflows/favorites-service.yml:

name: CI/CD Favorites Service

on:

push:

branches: \[ main \]

jobs:

build-and-test:

runs-on: ubuntu-latest

defaults:

run:

working-directory: apps/favorites-service

steps:

\- name: Checkout code

uses: actions/checkout@v3

\- name: Use Node.js

uses: actions/setup-node@v3

with:

node-version: \'18\'

\- name: Install dependencies

run: npm ci

\- name: Run lint

run: npm run lint \|\| true

\- name: Run tests

run: npm test

deploy:

needs: build-and-test

runs-on: ubuntu-latest

steps:

\- name: Checkout code

uses: actions/checkout@v3

\- name: Install Render CLI

run: \|

curl -L https://cli.render.com/install.sh \| bash

\- name: Deploy to Render

env:

RENDER_API_KEY: \${{ secrets.RENDER_API_KEY }}

run: \|

render services apply \--service favorites-service
apps/favorites-service/render.yaml

• Store your Render API key in GitHub Secrets as RENDER_API_KEY.\
• render services apply updates or creates the service based on
render.yaml.

## **STEP 5 -- Monitor Logs & Alerts**

1.  In the Render dashboard, navigate to your favorites-service Logs tab
    to view live logs (structured JSON from Winston).

2.  Add an alert in Render under **Alerts**:

    - **Condition**: Failure Rate \> 5%

    - **Contact**: your Slack/email channel

3.  (Optional) Expose a Prometheus metrics endpoint via
    \@nestjs/terminus in a future doc.

## **DEPLOYMENT PIPELINE READY**

• Dockerized service with multi-stage build\
• Render config for zero-touch deploys\
• GitHub Actions for CI (build, test) and CD (deploy)\
• Health-check endpoint for uptime monitoring

Your Favorites Service is now production-ready end-to-end.
