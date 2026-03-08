# **Database Security Setup for GitHub + Render (PostgreSQL)**

### **🔐 Overview**

This guide explains how to secure access to your PostgreSQL database
when deploying backend microservices using GitHub and Render. It covers
everything from storing secrets securely to rotating credentials and
controlling developer access. This applies to all services (e.g.,
user-service, listings-service) in your microservice architecture.
Heroku is no longer in use.

## **1. Secure PostgreSQL Access on Render**

### **a. Access your PostgreSQL instance**

- Log in at [[https://dashboard.render.com\]{.underline}
  ](https://dashboard.render.com/)

- Navigate to your PostgreSQL instance (e.g. marketeq-db)

### **b. Rotate credentials**

- Go to the "Settings" tab

- Under **Connection**, click **Rotate Credentials\**

- Copy the new DATABASE_URL

### **c. Restrict IP access (optional)**

- Under "Allowed Inbound IPs", add only:

  - Render backend IPs

  - VPN or internal IPs for staging/prod environments

### **d. Update all services that use the database**

- Go to each app (e.g., marketeq-user-service,
  marketeq-listings-service)

- Under Environment → Add or update the DATABASE_URL field with the new
  string

## **2. Store Secrets in GitHub for CI/CD**

### **a. In your GitHub repo (e.g. marketeq-backend)**

- Go to: **Settings** → **Secrets and variables** → **Actions\**

- Click **New repository secret\**

### **b. Add the following secrets:**

  ------------------------------------------------------
  **Name**           **Value (example)**
  ------------------ -----------------------------------
  DATABASE_URL       (Paste the one from Render)

  JWT_SECRET         Your JWT secret key

  AUTH_SERVICE_URL   https://user-service.onrender.com

  ALGOLIA_API_KEY    Optional, if search is enabled
  ------------------------------------------------------

### **c. Access secrets in GitHub Actions**

****env:

DATABASE_URL: \${{ secrets.DATABASE_URL }}

JWT_SECRET: \${{ secrets.JWT_SECRET }}



## **3. Role-Based Access in PostgreSQL (Advanced, Optional)**

If you want to restrict read/write permissions for different team
members or microservices:

### **a. Connect to your PostgreSQL DB using psql or DBeaver**

Use the DATABASE_URL admin string from Render.

### **b. Create a read-only role:**

****CREATE ROLE readonly WITH LOGIN PASSWORD \'readonly-password\';

GRANT CONNECT ON DATABASE yourdbname TO readonly;

GRANT USAGE ON SCHEMA public TO readonly;

GRANT SELECT ON ALL TABLES IN SCHEMA public TO readonly;

### **c. Block sensitive access:**

****REVOKE ALL ON TABLE users FROM readonly;

You can now share these read-only credentials with interns or frontend
devs safely.

## **4. Remove Old Access & Audit**

- **Delete old Heroku apps and databases\**

- **Remove unused team members from GitHub\**

- **Revoke Render team invites when people leave\**

- **Rotate passwords immediately after team changes\**

- Enable Render's PostgreSQL monitoring or use:

SELECT \* FROM pg_stat_activity;



## **✅ Summary**

- Secrets go in GitHub Actions & Render, never committed to .env or
  code.

- Rotate DB credentials frequently.

- Only backend services (NestJS) should have full DB access.

- Set up readonly accounts for limited or internal use cases.

- If a microservice doesn't need the DB, don't connect it.
