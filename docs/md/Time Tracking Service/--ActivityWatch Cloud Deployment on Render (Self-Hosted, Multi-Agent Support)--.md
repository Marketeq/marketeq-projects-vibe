\*\*ActivityWatch Cloud Deployment on Render (Self-Hosted, Multi-Agent
Support)\*\*

This document provides complete instructions for deploying the full
ActivityWatch system on Render, enabling remote contractors to track
time, upload screenshots, and sync all activity to a secure cloud
backend. Screenshots and media will be uploaded to Cloudflare R2, not
stored locally or in Postgres. This setup supports multiple user agents
and ensures screenshots cannot be manipulated locally.

\-\--

\## 🌐 Overview

\* \*\*Render\*\*: Hosts centralized \`aw-server\`, \`aw-server-rust\`,
and \`aw-webui\`

\* \*\*Desktop Agents\*\* (Mac/Windows): Run \`aw-watcher-window\`,
\`aw-watcher-afk\`, \`aw-watcher-working\`, and custom screenshot module

\* \*\*Media Storage\*\*: Cloudflare R2 bucket

\* \*\*Backend API\*\*: Sync metadata and events to NestJS backend via
internal auth

\* \*\*Security\*\*: Local screenshot tampering is disabled

\-\--

\## 🚄 Services to Deploy on Render

\### 1. \`aw-server\` (Python)

\* Receives data from clients (watchers)

\* Exposes HTTP API for screenshots, events, and logs

\### 2. \`aw-server-rust\`

\* High-performance version of \`aw-server\`

\* Better scalability for high-volume usage (recommended for production)

\### 3. \`aw-webui\`

\* Optional dashboard for admin/internal QA review (behind basic auth or
internal IP restriction)

\-\--

\## 📦 Folder Structure

\`\`\`bash

/activitywatch-cloud

/aw-server \# (Python) or aw-server-rust

/aw-webui \# Web dashboard

/render.yaml \# Render services config

/Dockerfile \# Shared Docker build for Render

/cloudflare-uploader \# Media upload microservice (see below)

\`\`\`

\-\--

\## 💡 Deployment Instructions

\### Step 1: Fork ActivityWatch

\`\`\`bash

git clone https://github.com/ActivityWatch/activitywatch.git

cd activitywatch

\`\`\`

\### Step 2: Choose server engine (Rust or Python)

Use \*\*\`aw-server-rust\`\*\* for better performance:

\`\`\`bash

cd aw-server-rust

cargo build \--release

\`\`\`

\### Step 3: Dockerfile (in root)

\`\`\`Dockerfile

FROM rust:latest AS builder

WORKDIR /app

COPY ./aw-server-rust /app

RUN cargo install \--path .

FROM debian:bullseye-slim

RUN apt-get update && apt-get install -y ca-certificates

COPY \--from=builder /usr/local/cargo/bin/aw-server-rust
/usr/local/bin/aw-server-rust

EXPOSE 5600

CMD \[\"aw-server-rust\"\]

\`\`\`

\### Step 4: \`render.yaml\`

\`\`\`yaml

services:

\- name: activitywatch-server

type: web

env: docker

dockerfilePath: ./Dockerfile

plan: standard

envVars:

\- key: R2_BUCKET

value: your-cloudflare-bucket

\- key: R2_ACCESS_KEY

value: your-access-key

\- key: R2_SECRET_KEY

value: your-secret-key

\`\`\`

Deploy using Render Dashboard or CLI:

\`\`\`bash

render deploy

\`\`\`

\-\--

\## 💻 Local Agent Behavior (macOS/Windows)

Each remote worker installs a preconfigured ActivityWatch agent with:

\* \`aw-watcher-window\`

\* \`aw-watcher-afk\`

\* \`aw-watcher-working\`

\* \`custom-screenshot-watcher\`

All are configured to push to your Render-hosted
\`https://tracker.mycompany.com:5600\`.

\### Config File Example (\`aw-server/aw-server.ini\`)

\`\`\`ini

\[server\]

host = https://tracker.mycompany.com:5600

\[upload\]

verify_certificate = true

\`\`\`

\-\--

\## 🚀 Screenshot Upload to Cloudflare R2

A sidecar service will upload all \`.jpg\` screenshots to Cloudflare R2.

\### \`cloudflare-uploader/index.ts\`

\`\`\`ts

import { R2 } from \'cloudflare-r2\';

import fs from \'fs\';

const r2 = new R2({

accessKey: process.env.R2_ACCESS_KEY,

secretKey: process.env.R2_SECRET_KEY,

bucket: process.env.R2_BUCKET,

endpoint: \'https://\<your-endpoint\>.r2.cloudflarestorage.com\'

});

export async function uploadScreenshot(filepath: string, key: string) {

const file = fs.readFileSync(filepath);

await r2.putObject(key, file);

}

\`\`\`

All screenshots are:

\* Auto-uploaded on creation

\* Deleted from local after upload

\* Tracked by NestJS via webhook/REST

\-\--

\## 🔐 Prevent Local Screenshot Tampering

\* Store screenshots in a write-protected temp dir

\* Prevent access to ActivityWatch SQLite using filesystem permissions

\* Use NestJS server to verify file hashes

\* Optionally sign files with client keys

\-\--

\## 🌍 NestJS Integration

When a screenshot is uploaded:

\* Call \`POST /api/screenshots\` with metadata:

\`\`\`json

{

\"userId\": \"user_123\",

\"timestamp\": \"2025-08-05T14:00:00Z\",

\"imageUrl\": \"https://r2.yourdomain.com/screenshots/abc.jpg\",

\"projectId\": \"proj_456\",

\"activity\": { \"keyboard\": 87, \"mouse\": 60 }

}

\`\`\`

NestJS handles:

\* Metadata indexing

\* Blurring, deleting, editing (via API)

\* Linking screenshots to projects/tasks

\-\--

\## 📅 Summary

\| Component \| Host \| Purpose \|

\| \-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-- \| \-\-\-\-\-\-- \|
\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-- \|

\| \`aw-server-rust\` \| Render \| Central API and event log store \|

\| \`aw-webui\` \| Render \| (Optional) admin-only dashboard \|

\| \`desktop agent\` \| User PC \| Captures time, screenshots \|

\| \`cloudflare-uploader\` \| Render \| Pushes media to secure R2 bucket
\|

\| \`NestJS backend\` \| Render \| Links media to projects/tasks \|
