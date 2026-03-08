Complete **architecture plan** for an **ActivityWatch-based time &
activity tracking system** with the following features:

## **✅ Core Goals (Your Requirements Recap)**

  ------------------------------------------------------------
  **Feature**                  **Status in this Plan**
  ---------------------------- -------------------------------
  📸 Screenshot capture        ✅ Yes (custom module)

  ⏱️ Screenshot frequency      ✅ Yes (configurable per agent)
  control                      

  🖱️ Keyboard/mouse activity   ✅ Yes (aw-watcher-input +
  logging                      extensions)

  ⚠️ Fraud detection           ✅ Yes (backend detection
                               service)

  🌐 Web dashboard             ✅ Yes (custom React/Next.js
                               admin UI)

  🧠 Endpoint control          ✅ Yes (you own all endpoints)

  🔒 Self-hosted               ✅ Yes

  🧩 Open source               ✅ Based on ActivityWatch
  ------------------------------------------------------------

## **🏗️ System Architecture Overview**

**** ┌─────────────────────────────┐

│ Admin Panel │

│ (React + Next.js) │

└────────────┬────────────────┘

│

▼

┌───────────────────────────────┐

│ API Gateway │

│ (NestJS or FastAPI Backend) │

└────────────┬──────────────────┘

│

┌───────────────────────────────┼──────────────────────────────┐

▼ ▼ ▼

┌────────────┐ ┌────────────────────┐ ┌─────────────────────┐

│ Screenshot │──────────────▶│ Activity Logs DB │◀───────▶│ Fraud
Detection │

│ Watcher │ │ (Postgres/Timescale)│ │ Microservice │

└────────────┘ └────────────────────┘ └─────────────────────┘

▲ │

│ ▼

┌────────────┐

│ Desktop │

│ Agent │ ◀── ActivityWatch Core (aw-server, aw-watcher-window,
aw-watcher-afk)

│ (Mac/Win) │ + Screenshot Module + Input Stats Module

└────────────┘



## **🧩 Modules and Responsibilities**

### **1. Desktop Agent (Mac + Windows)**

- Base: [[ActivityWatch\]{.underline}
  ](https://github.com/ActivityWatch/activitywatch)

- Extensions:

  - **Screenshot Module**: Captures screenshots every X seconds
    (customizable), stored locally, then syncs to server.

    - Based on community projects like
      [[aw-watcher-screenshot\]{.underline}
      ](https://github.com/ActivityWatch/aw-watcher-screenshot)

  - **Input Stats Module**: Monitors mouse movements, keyboard presses,
    idle vs active ratios.

    - Fork or wrap [[aw-watcher-input\]{.underline}
      ](https://github.com/ActivityWatch/aw-watcher-input)

- Data pushed to aw-server (running locally) → forwarded to central
  server via secure REST API (JWT or service token auth)

### **2. Backend API (NestJS)**

- Authenticates agents via service tokens or JWT

- Collects:

  - Screenshot blobs (store in object storage or local volume)

  - Activity logs (AFK time, app focus, input stats)

- Saves to Postgres (with TimescaleDB for timeseries if needed)

- Provides endpoints for:

  - Admin dashboard

  - Project/contract time logs

  - Screenshot previewing

  - Alerts/logs from fraud detection

### **3. Fraud Detection Microservice**

- Runs periodic jobs (cron or event-driven)

- Flags:

  - Low input activity + full-time tracking (e.g., "ghosting")

  - Repetitive screenshot patterns (same apps, no cursor movement)

  - Time tracked outside allowed contract hours

  - Suspicious keyboard-mouse ratios (e.g., bots)

- Outputs:

  - Risk score

  - Suggested flags (e.g., "Needs Review", "Likely Simulated")

### **4. Admin Dashboard (React + Next.js)**

- Views per:

  - Freelancer

  - Project/Contract

  - Date range

- Features:

  - Screenshot viewer

  - Activity graphs (input stats, app usage)

  - Fraud alerts (with override controls)

  - Time log approvals/rejections

### **5. Database**

- PostgreSQL (with optional TimescaleDB for performance)

- Stores:

  - User & contract metadata

  - Screenshot logs (metadata + path to file)

  - ActivityWatch logs (AFK, app usage, input stats)

  - Fraud detection logs

- Optional: store screenshot blobs in S3-compatible object storage
  (e.g., MinIO)

## **🧪 Screenshot Module Example (Python)**

****import time

import mss

import requests

INTERVAL = 60 \# seconds

API_ENDPOINT = \"https://your-api.com/api/screenshots\"

TOKEN = \"Bearer abc123\...\"

while True:

with mss.mss() as sct:

screenshot = sct.shot(mon=-1, output=\"latest.png\")

with open(\"latest.png\", \"rb\") as f:

files = {\"file\": f}

headers = {\"Authorization\": TOKEN}

requests.post(API_ENDPOINT, files=files, headers=headers)

time.sleep(INTERVAL)

You can run this in the background via your custom watcher or bundle it
in the AW desktop app folder.

## **🛡️ Security Considerations**

- Encrypt screenshot uploads (HTTPS + token auth)

- Use signed JWTs for client identification

- Access control on dashboard per organization/client

- Mask sensitive areas of the screen if needed (e.g., blur by app name)

## **🚀 Next Steps to Build This**

1.  **Fork ActivityWatch\**

2.  Add:

    - Screenshot watcher

    - Input watcher if needed

3.  Build NestJS backend

4.  Create admin dashboard (React)

5.  Add fraud scoring microservice

6.  Deploy all services via Docker or Kubernetes

7.  Optional: integrate with your freelance marketplace platform backend
