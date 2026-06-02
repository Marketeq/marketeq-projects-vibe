# **CI/CD Architecture Overview -- Backend + Frontend (GitHub Actions + Heroku + Vercel)**

### **📌 Purpose**

This document defines the complete CI/CD architecture for the
marketeq-projects-nestjs (backend) and marketeq-projects (frontend)
repositories. It includes Git branch strategy, deployment environments,
CI pipelines, and toolchain choices for automated, stable,
multi-environment deployment.

## **🚀 CI/CD Tooling Summary**

  --------------------------------------------------------------------
  **Layer**         **Tool/Platform**   **Purpose**
  ----------------- ------------------- ------------------------------
  Source Control    GitHub              Code versioning and workflow
                                        triggers

  CI/CD             GitHub Actions      Pipeline execution
  Orchestrator                          

  Backend           Heroku + Docker     NestJS service deployment
  Deployment                            

  Frontend          Vercel              Next.js deployment
  Deployment        (GitHub-linked)     
  --------------------------------------------------------------------

## **🧭 Git Branch Strategy**

  ---------------------------------------------------------------------
  **Branch      **Purpose**              **Deploys To**
  Name**                                 
  ------------- ------------------------ ------------------------------
  development   Local dev (optional,     No automatic deployment
                untracked)               

  staging       Pre-release QA/UAT       Heroku Staging + Vercel
                testing                  Preview

  live          Production (stable       Heroku Production + Vercel
                public site)             Production
  ---------------------------------------------------------------------

> live is used instead of main to make it explicit that this is the
> production state.

## **📆 Deployment Flow & Scheduling Policy**

To ensure visibility and momentum across dev, QA, and release teams:

### **🔄 Local to Staging**

- Developers are expected to **push completed features to staging
  regularly**.

- GitHub Actions **automatically deploys** every push on staging to:

  - **Heroku Staging** (backend)

  - **Vercel Preview** (frontend)

- QA begins testing as soon as staging is updated --- no delays or
  waiting for manual deployment.

### **🚀 Staging to Live**

- Once QA approves the latest changes on staging, the **release lead or
  dev team** merges staging into live.

- GitHub Actions **auto-deploys the updated container** to:

  - **Heroku Production\**

  - **Vercel Production\**

- live is a **protected branch**. No one pushes directly. All merges are
  reviewed.

### **📌 Notes**

- There is **no fixed deployment calendar**, but the process must stay
  active and visible.

- Code **should never sit idle on local machines** --- it should move
  from local → staging → live.

- QA will **only test what exists in the staging branch**, so developers
  must push updates timely.
