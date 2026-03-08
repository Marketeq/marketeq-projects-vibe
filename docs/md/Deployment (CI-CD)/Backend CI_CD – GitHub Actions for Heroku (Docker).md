**Backend CI/CD -- GitHub Actions for Heroku (Docker)**

### **📌 Purpose**

Automate backend deployments from the marketeq-projects-nestjs repo
using GitHub Actions for both staging and production environments.

### **🚀 Branch to Environment Mapping**

  ------------------------------------------------------------
  **Branch**   **Environment**   **Deploys To**  **Trigger
                                                 Type**
  ------------ ----------------- --------------- -------------
  staging      Staging           Heroku Staging  Auto-deploy

  live         Production        Heroku          Auto-deploy
                                 Production      
  ------------------------------------------------------------

### **🔐 Required GitHub Secrets**

Add these in GitHub → Settings \> Secrets and Variables \> Actions:

For **staging**:

- HEROKU_API_KEY_STAGING

- HEROKU_APP_NAME_STAGING

- HEROKU_EMAIL

For **live**:

- HEROKU_API_KEY_LIVE

- HEROKU_APP_NAME_LIVE

- HEROKU_EMAIL

### **🧾 GitHub Actions: .github/workflows/deploy-staging.yml**

****name: Deploy to Heroku Staging

on:

push:

branches: \[staging\]

jobs:

deploy:

runs-on: ubuntu-latest

steps:

\- name: Checkout code

uses: actions/checkout@v3

\- name: Log in to Heroku

run: echo \"\${{ secrets.HEROKU_API_KEY_STAGING }}\" \| docker login
\--username=\_ \--password-stdin registry.heroku.com

\- name: Build image

run: docker build -t registry.heroku.com/\${{
secrets.HEROKU_APP_NAME_STAGING }}/web .

\- name: Push to Heroku

run: docker push registry.heroku.com/\${{
secrets.HEROKU_APP_NAME_STAGING }}/web

\- name: Release container

run: heroku container:release web \--app \${{
secrets.HEROKU_APP_NAME_STAGING }}

env:

HEROKU_API_KEY: \${{ secrets.HEROKU_API_KEY_STAGING }}



### **🧾 GitHub Actions: .github/workflows/deploy-live.yml**

****name: Deploy to Heroku Production

on:

push:

branches: \[live\]

jobs:

deploy:

runs-on: ubuntu-latest

steps:

\- name: Checkout code

uses: actions/checkout@v3

\- name: Log in to Heroku

run: echo \"\${{ secrets.HEROKU_API_KEY_LIVE }}\" \| docker login
\--username=\_ \--password-stdin registry.heroku.com

\- name: Build image

run: docker build -t registry.heroku.com/\${{
secrets.HEROKU_APP_NAME_LIVE }}/web .

\- name: Push to Heroku

run: docker push registry.heroku.com/\${{ secrets.HEROKU_APP_NAME_LIVE
}}/web

\- name: Release container

run: heroku container:release web \--app \${{
secrets.HEROKU_APP_NAME_LIVE }}

env:

HEROKU_API_KEY: \${{ secrets.HEROKU_API_KEY_LIVE }}



### **✅ Status Badges (Optional for README.md)**

****\![Heroku
Staging\](https://github.com/YOUR_ORG/marketeq-projects-nestjs/actions/workflows/deploy-staging.yml/badge.svg)

\![Heroku
Production\](https://github.com/YOUR_ORG/marketeq-projects-nestjs/actions/workflows/deploy-live.yml/badge.svg)


