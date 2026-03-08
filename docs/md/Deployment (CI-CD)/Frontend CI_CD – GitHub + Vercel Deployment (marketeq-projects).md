# **Frontend CI/CD -- GitHub + Vercel Deployment (marketeq-projects)**

### **📌 Purpose**

This document outlines the CI/CD setup for your frontend
(marketeq-projects) using **Vercel's GitHub integration** to
automatically deploy staging and live branches to their respective
environments.

## **🚀 Branch-to-Environment Mapping**

  --------------------------------------------------------------------
  **Branch**   **Environment    **Deployment Target**    **Trigger
               Type**                                    Type**
  ------------ ---------------- ------------------------ -------------
  staging      Preview / UAT    Vercel Staging (Preview  Auto-deploy
                                URL)                     

  live         Production       Vercel Production Domain Auto-deploy
  --------------------------------------------------------------------

## **🛠️ Vercel Setup (One-Time Configuration)**

1.  Go to [[vercel.com\]{.underline}
    ](https://vercel.com/)

2.  Import the GitHub repository marketeq-projects

3.  During setup:

    - Set **Production Branch** to live

    - Enable **Preview Deployments** for staging and other branches

4.  Set up the following **Environment Variables** in the Vercel
    dashboard (under Project → Settings → Environment Variables):

  ---------------------------------------------------------------------------
  **Name**              **Environment**   **Description**
  --------------------- ----------------- -----------------------------------
  NEXT_PUBLIC_API_URL   All               Backend endpoint

  NODE_ENV              All               Set to production or development as
                                          needed

  Any secrets (e.g.     All               e.g., analytics keys, CMS tokens
  tokens)                                 
  ---------------------------------------------------------------------------

## **🧾 CI Behavior (Handled by Vercel Automatically)**

- Any commit to staging creates a **preview URL** like:\
  https://marketeq-projects-git-staging-username.vercel.app

- Any commit to live deploys to the **production domain**:\
  https://marketeq.vercel.app (or your custom domain)

No GitHub Actions workflow is needed unless you want to add custom build
steps, testing, or conditions.

## **✅ Optional GitHub Actions for Pre-Vercel Testing (Advanced)**

You can add a GitHub workflow like this if you want to test before
deploying:

name: Frontend Lint & Build

on:

push:

branches:

\- staging

\- live

jobs:

check:

runs-on: ubuntu-latest

steps:

\- uses: actions/checkout@v3

\- name: Install Dependencies

run: npm install

\- name: Lint

run: npm run lint

\- name: Build

run: npm run build

> Not required --- only add this if you want CI checks before Vercel
> deploys.

## **📦 Status Badge (Optional)**

Add this to your frontend README.md:

\[\![Vercel
Deploy\](https://vercel.com/api/badges/\<project-id\>/\<deployment-status\>)\](https://vercel.com/\<your-org\>/\<project-name\>)

You can find this badge under Project → Settings → General in the
Vercel dashboard.
