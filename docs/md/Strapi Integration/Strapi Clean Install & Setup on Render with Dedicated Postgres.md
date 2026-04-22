**Payload Clean Install & Setup on Render with Dedicated Postgres**

This guide walks you through a **production-ready deployment** of Payload
CMS on **Render**, using a **dedicated Postgres database**. This setup
is completely isolated from your NestJS backend, ensuring safe admin
editing and CMS-only access to data.

### **🧱 1. Prerequisites**

- A GitHub repo for your Payload project (public or private)

- A Render account

- Basic familiarity with Node.js, Git, and Postgres

### **📦 2. Project Structure**

Your Payload repo can be accessed below:\
[[https://github.com/Marketeq/marketeq-projects-strapi]{.underline}](https://github.com/Marketeq/marketeq-projects-strapi)

marketeq-projects-strapi/

├── config/

├── src/

├── .env

├── .gitignore

├── package.json

├── yarn.lock / package-lock.json



### **🗄️ 3. Provision Postgres on Render**

1.  Go to **Render Dashboard \> New \> PostgreSQL\**

2.  Set:

    - Name: marketeq-strapi-db

    - Region: Same as your web service

3.  After provisioning, copy:

    - **Database URL** (e.g., postgres://\...)

> ✅ **This Postgres DB must be exclusive to Payload.**

### **🛠️ 4. Create a New Web Service for Payload**

1.  Go to **Render \> New \> Web Service\**

2.  Connect your GitHub repo

3.  Fill in:

    - Name: strapi-cms

    - Branch: main or live

    - Root Directory: / (or custom if monorepo)

    - Runtime: Node 18+

    - Build Command: yarn install && yarn build

    - Start Command: yarn start

### **🔐 5. Configure Environment Variables**

Go to the **Environment tab** in your Render service and add:

NODE_ENV=production

APP_KEYS=your_app_keys

API_TOKEN_SALT=your_api_token_salt

ADMIN_JWT_SECRET=your_admin_jwt_secret

JWT_SECRET=your_jwt_secret

DATABASE_CLIENT=postgres

DATABASE_HOST=your-db-host.render.com

DATABASE_PORT=5432

DATABASE_NAME=your_db_name

DATABASE_USERNAME=your_db_user

DATABASE_PASSWORD=your_db_password

DATABASE_SSL=true

> 💡 Generate secure secrets using
> [[https://generate-secret.now.sh/32]{.underline}](https://generate-secret.now.sh/32)

### **⚙️ 6. Configure config/database.js**

Ensure your config/database.js (or config/env/production/database.js)
looks like this:

module.exports = ({ env }) =\> ({

connection: {

client: \'postgres\',

connection: {

host: env(\'DATABASE_HOST\'),

port: env.int(\'DATABASE_PORT\', 5432),

database: env(\'DATABASE_NAME\'),

user: env(\'DATABASE_USERNAME\'),

password: env(\'DATABASE_PASSWORD\'),

ssl: env.bool(\'DATABASE_SSL\', true),

},

},

});



### **🧪 7. Deploy & Verify**

1.  Push your code to GitHub

2.  Wait for Render to build and deploy

3.  Visit the deployed URL (e.g., https://strapi-cms.onrender.com/admin)

4.  Create your first admin user

> 🎉 You now have a working Payload CMS on Render with an isolated
> database.

### **🧼 8. Cleanup & Security Checklist**

- Enable HTTPS redirect in Render settings

- Add CORS_ORIGIN env variable if frontend integration is needed

- Set up backup snapshots in your Postgres service

- Configure roles/permissions in Payload before enabling API access

### **✅ Summary**

  ---------------------------------------------
  **Layer**     **Service**
  ------------- -------------------------------
  CMS UI        Render Web Service (strapi-cms)

  CMS DB        Render Postgres
                (marketeq-strapi-db)

  Admin Auth    Handled by Payload (JWT)

  Integration   Webhooks / Sync service to
                NestJS
  ---------------------------------------------
