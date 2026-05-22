# **Branch Protection Rules -- CI/CD Safety Controls for staging and live**

### **📌 Purpose**

This document outlines the GitHub branch protection rules for the
marketeq-projects (frontend) and marketeq-projects-nestjs (backend)
repositories. These rules help maintain code quality, ensure structured
deployment, and prevent regressions or accidental pushes.

## **🔐 Branch: live (Production)**

The live branch represents the production state of both backend and
frontend. It is protected to ensure only QA-approved, reviewed code is
deployed.

  ------------------------------------------------
  **Protection Rule**                **Status**
  ---------------------------------- -------------
  ✅ Require pull request before     Enabled
  merging                            

  ✅ Require status checks to pass   Optional\*

  ✅ Require linear history          Recommended

  ✅ Prevent force pushes            Enabled

  ✅ Prevent branch deletions        Enabled

  ⚠️ Require code owner review (if   Optional
  applicable)                        
  ------------------------------------------------

> \*You may choose to connect this to GitHub Actions CI checks or
> Vercel/Heroku deploy status checks.

## **🔐 Branch: staging (QA/UAT)**

The staging branch is used for QA, client preview, and validation. It is
semi-protected to allow faster feedback but avoid chaotic commits.

  -------------------------------------------
  **Protection Rule**            **Status**
  ------------------------------ ------------
  ✅ Require pull request before Enabled
  merging                        

  ✅ Prevent force pushes        Enabled

  ✅ Prevent branch deletions    Enabled

  ⚠️ Require status checks to    Optional
  pass                           

  ⚠️ Require review before       Optional
  merging                        
  -------------------------------------------

## **📝 Workflow Responsibility**

  ---------------------------------------------------------------
  **Branch**    **Who Can Push or     **Intended Flow**
                Merge**               
  ------------- --------------------- ---------------------------
  development   Developers (local     Feature → PR → staging
                only)                 

  staging       Dev leads / approved  Review + QA → Merge to live
                PRs                   

  live          Release lead only     QA-approved merge from
                (manual)              staging
  ---------------------------------------------------------------
