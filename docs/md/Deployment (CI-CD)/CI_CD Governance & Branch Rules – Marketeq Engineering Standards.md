**CI/CD Governance & Branch Rules -- Marketeq Engineering Standards**

### **📌 Purpose**

This document outlines the official CI/CD governance structure and
branch protection rules for all contributors working on the Marketeq
frontend (marketeq-projects) and backend (marketeq-projects-nestjs)
repositories. It establishes a clear and enforceable release process
from local development to production deployment.

## **🛠️ Core Branches & Environments**

  --------------------------------------------------------------------
  **Branch**    **Environment**   **Access Level** **Deployment
                                                   Target**
  ------------- ----------------- ---------------- -------------------
  development   Local only        Dev team         None
                                  (optional)       

  staging       QA/UAT            Dev leads only   Heroku + Vercel
                                                   Staging

  live          Production        Release Lead     Heroku + Vercel
                                  only             Live
  --------------------------------------------------------------------

## **🔐 Branch Protection Policies**

### **live Branch (Production)**

- ✅ Pull request required (no direct push)

- ✅ Force pushes disabled

- ✅ Deletion disabled

- ✅ Status checks must pass (build/test/deploy)

- ✅ Required reviewer: Tech lead or QA reviewer

- ✅ Linear history (no merge commits)

### **staging Branch (QA)**

- ✅ Pull request required (no direct push)

- ✅ Force pushes disabled

- ✅ Deletion disabled

- ⚠️ Status checks optional

- ⚠️ Review optional (but encouraged)

### **development Branch (Optional)**

- ❌ No restrictions

- 🧪 Used for early integration, experimentation, or WIP

## **🧑‍💼 Role-Based Permissions**

  **Role**       **Can Push to staging**   **Can Merge to live**   **Notes**
  -------------- ------------------------- ----------------------- ------------------------------------
  Intern Dev     No                        No                      PRs must be reviewed by lead
  Developer      Yes (via PR)              No                      Can merge feature → staging only
  QA Tester      No                        No                      Initiates release approvals
  Tech Lead      Yes                       Yes (via PR)            Oversees merge from staging → live
  PM / Release   No                        Yes (via PR)            Final production sign-off

## **🔄 PR & Deployment Flow**

1.  **Dev creates a feature branch** from development

2.  **Pull Request to staging** once feature is complete

3.  **CI auto-deploys staging** to Vercel/Heroku for QA

4.  **QA/PM signs off** on functionality

5.  **Tech lead merges staging → live via PR\**

6.  **CI auto-deploys live** to production platforms

## **💡 Additional Notes**

- No code should sit on a local machine for more than 2 days

- QA will not test features until they are live on staging

- Hotfixes must go through the same staging → live flow

- The live branch is always the single source of truth for production
