# **✅ Strapi Clean Install & Setup on Heroku with Existing Postgres**

## **🧱 Prerequisites**

- Heroku CLI installed and logged in

- Heroku app already created (heroku create your-strapi-app)

- Heroku Postgres add-on is already attached (heroku addons:create
  heroku-postgresql)

- PostgreSQL database URL is available from:

heroku config:get DATABASE_URL \--app your-strapi-app



## **➊ Delete Existing .cache and build Folders (Local Clean-Up)**

If you\'re reinstalling:

rm -rf .cache build

Also clear node_modules if needed:

rm -rf node_modules



## **➋ Reinitialize Strapi Locally (Linked to Heroku Postgres)**

1.  Scaffold a new Strapi project:

npx create-strapi-app@latest my-strapi-app \--no-run

cd my-strapi-app

2.  Choose **Custom (Manual)** setup when prompted

    - Select **PostgreSQL\**

    - Set the database details to match your Heroku Postgres instance
      (you'll override this with DATABASE_URL anyway)

## **➌ Set .env with Heroku Postgres URL**

****DATABASE_CLIENT=postgres

DATABASE_URL=your_heroku_database_url

⚠️ Replace your_heroku_database_url with the actual value from:

heroku config:get DATABASE_URL \--app your-strapi-app



## **➍ Commit Code to Git**

****git init

git add .

git commit -m \"Initial Strapi install\"



## **➎ Deploy to Heroku (Container or Node Buildpack)**

### **Option A -- Deploy via Heroku Git (Buildpack)**

1.  Set Heroku Node environment:

heroku buildpacks:add heroku/nodejs \--app your-strapi-app

2.  \
    Push to Heroku:

heroku git:remote -a your-strapi-app

git push heroku main



## **➏ Set Required Environment Vars**

****heroku config:set \\

APP_KEYS=some_random_key \\

API_TOKEN_SALT=some_other_key \\

ADMIN_JWT_SECRET=another_key \\

JWT_SECRET=yet_another_key \\

NODE_ENV=production \\

\--app your-strapi-app

Use a key generator like:

openssl rand -hex 32



## **➐ Open the Admin Panel**

****heroku open

You should now see the **registration screen** *only once* --- this is
where you create the **first super admin**.

After that, it should redirect to /admin as expected.

## **❌ Still Getting Redirected to Registration?**

Try these recovery steps:

- Confirm DATABASE_URL is correct

- Clear .cache and re-deploy

- Run this on Heroku to check if user table exists:

heroku pg:psql \--app your-strapi-app

\\dt

SELECT \* FROM strapi_admin_user;

If strapi_admin_user is empty, the admin is not registered yet.

## **✅ Recap**

  ------------------------------------
  **Task**                 **Done?**
  ------------------------ -----------
  Cleaned previous Strapi  ✅
  cache                    

  Linked to Heroku DB      ✅

  Used env vars to         ✅
  configure DB             

  Deployed fresh to Heroku ✅

  Registered first admin   ✅
  user                     
  ------------------------------------
