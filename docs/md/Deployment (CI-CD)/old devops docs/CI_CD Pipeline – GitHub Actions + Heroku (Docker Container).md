**CI/CD Pipeline -- GitHub Actions + Heroku (Docker Container)**

### **📌 Purpose**

This guide sets up an automated GitHub Actions pipeline to build your
Docker-based NestJS monorepo and deploy it to **a single Heroku app** on
every push to main or a production branch.

### **✅ Requirements**

- Your entire project (e.g., marketeq-projects-nestjs/) is deployed as a
  **single containerized Heroku app\**

- You have Docker working locally and a working Dockerfile +
  docker-compose.yml

- Your Heroku app is already set up and linked to your GitHub repo

### **🛠️ Step 1: Create Heroku API Key**

1.  Log into Heroku

2.  Go to **Account Settings\**

3.  Scroll down to **API Key\**

4.  Copy the key

### **🔐 Step 2: Add Secrets to GitHub Repo**

Go to your GitHub repo → **Settings** → **Secrets and Variables** →
**Actions** → **New Repository Secret**:

  ----------------------------------------
  **Secret Name**   **Value**
  ----------------- ----------------------
  HEROKU_API_KEY    (Paste from Heroku)

  HEROKU_EMAIL      (Your Heroku email)

  HEROKU_APP_NAME   (Exact app name on
                    Heroku)
  ----------------------------------------

### **📁 Step 3: Create GitHub Action Workflow**

Create the following file:

mkdir -p .github/workflows

touch .github/workflows/deploy.yml

Then paste this content:

name: 🚀 Deploy to Heroku (Docker)

on:

push:

branches:

\- main

jobs:

build-and-deploy:

runs-on: ubuntu-latest

steps:

\- name: 🔄 Checkout repo

uses: actions/checkout@v3

\- name: 🐳 Log in to Heroku Container Registry

run: echo \"\${{ secrets.HEROKU_API_KEY }}\" \| docker login
\--username=\_ \--password-stdin registry.heroku.com

\- name: 📦 Build Docker image

run: docker build -t registry.heroku.com/\${{ secrets.HEROKU_APP_NAME
}}/web .

\- name: 🚀 Push image to Heroku

run: docker push registry.heroku.com/\${{ secrets.HEROKU_APP_NAME }}/web

\- name: 🔄 Release image

run: \|

heroku container:release web \--app \${{ secrets.HEROKU_APP_NAME }}

env:

HEROKU_API_KEY: \${{ secrets.HEROKU_API_KEY }}



### **✅ Optional: Add CI Status Badge to README.md**

Add this markdown at the top of your repo's README.md:

\![CI\](https://github.com/\<your-org-or-username\>/\<your-repo-name\>/actions/workflows/deploy.yml/badge.svg)

Example:

\![CI\](https://github.com/marketeq/marketeq-projects-nestjs/actions/workflows/deploy.yml/badge.svg)



### **🔁 How It Works**

- Every time you push to main, GitHub will:

  1.  Build your container using your Dockerfile

  2.  Push it to Heroku Container Registry

  3.  Trigger a release on your Heroku app
