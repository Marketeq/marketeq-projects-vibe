# **🧩 Next.js Frontend -- Quick Setup Guide**

### **1️⃣ Prerequisites**

Before cloning, make sure you have these installed:

  -----------------------------------------------
  **Tool**        **Version**   **Command to
                                Check**
  --------------- ------------- -----------------
  Node.js         v20.x+        node -v

  npm             v10.x+        npm -v

  npm             v9.x+         npm -v
  *(preferred)*                 

  Git             latest        git \--version

  VS Code         latest        ---
  -----------------------------------------------

✅ **Recommended:** use nvm to manage Node versions:

nvm install 20

nvm use 20



### **2️⃣ Clone the Repository**

****git clone
https://github.com/marketeq/marketeq-projects-frontend.git

cd marketeq-projects-frontend



### **3️⃣ Install Dependencies**

> Always remove existing lockfiles if switching between npm/yarn/npm to
> avoid peer dependency conflicts.

Using **npm**:

npm install \--legacy-peer-deps



Using **npm**:

npm install \--legacy-peer-deps



### **4️⃣ Environment Setup**

Create your .env.local file in the project root:

cp .env.example .env.local

Fill in your local config values:

NEXT_PUBLIC_API_URL=http://localhost:3000

NEXT_PUBLIC_STRAPI_URL=http://localhost:1337

NEXT_PUBLIC_STRIPE_PUBLIC_KEY=pk_test_xxx

NEXT_PUBLIC_ABLY_KEY=ably:xxx

NEXTAUTH_SECRET=your_secret_key

NEXTAUTH_URL=http://localhost:3001

🧠 **Tip:** Generate a strong secret:

openssl rand -base64 32



### **5️⃣ Run the App**

Development mode:

npm run dev

Production build:

npm run build

npm run start



### **6️⃣ Storybook (Optional for UI Testing)**

Run Storybook locally:

npm run storybook

It should open at:
[[http://localhost:6006]{.underline}](http://localhost:6006/)

### **7️⃣ Linting, Formatting & Type Checks**

Run all pre-commit checks manually:

npm run lint

npm run format

npm run type-check

These are automatically enforced via **Husky + Lint-Staged**:

- eslint for linting

- prettier for formatting

- commitlint for message standards

### **8️⃣ Git Hooks (Auto-setup)**

If Husky doesn't auto-install, run:

npm husky install

To re-enable after cloning:

npm prepare



### **9️⃣ Verify Setup**

Once npm run dev runs successfully, open:

http://localhost:3001

You should see the **Marketeq** frontend load without errors.

✅ Check the console:

✅ Environment variables loaded

✅ API connected: http://localhost:3000

✅ Ably ready



### **🔍 10️⃣ Common Troubleshooting**

  -----------------------------------------------------------
  **Error**          **Fix**
  ------------------ ----------------------------------------
  Module not found   Delete node_modules and reinstall (npm
                     install)

  Port already in    lsof -i :3001 → kill -9 \<pid\>
  use                

  .env not loaded    Ensure .env.local exists and variable
                     names match

  Ably/Stripe errors Check test keys are set and prefixed
                     correctly

  CORS issues        Verify backend CORS_ORIGIN matches
                     frontend URL

  Build fails on     Delete lockfile, reinstall, and redeploy
  Vercel             

  Git hook not       Run npm prepare again
  triggered          
  -----------------------------------------------------------

### **✅ Quick One-Liner (Mac/Linux)**

****git clone
https://github.com/marketeq/marketeq-projects-frontend.git \\

&& cd marketeq-projects-frontend \\

&& npm install \\

&& cp .env.example .env.local \\

&& npm run dev



### **📦 Recommended Folder Overview**

****marketeq-projects-frontend/

│

├── app/ \# Next.js App Router

├── components/ \# Shared React components

├── constants/ \# App-wide constants

├── data/ \# Static JSON/data mocks

├── hoc/ \# Higher-order components

├── public/ \# Static assets

├── service/ \# API clients (Axios, Ably, Stripe)

├── src/ \# Main frontend logic

├── stories/ \# Storybook stories

├── styles/ \# Tailwind & global CSS

├── utils/ \# Helper functions

└── package.json



### **⚡ Deployment (Vercel)**

Production builds are auto-deployed to:

https://marketeq-projects.vercel.app

If needed locally:

vercel dev


