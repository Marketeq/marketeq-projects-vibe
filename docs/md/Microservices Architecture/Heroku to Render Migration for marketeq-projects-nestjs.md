# **Heroku to Render Migration for marketeq-projects-nestjs**

**Goal:** Migrate the marketeq-projects-nestjs backend from Heroku to
Render, using the existing Heroku PostgreSQL database and Docker-based
microservices setup, all inside **a single Render app** with **multiple
Docker containers.**

## **☑️ Step 1: Export PostgreSQL Database from Heroku**

1.  Run the following command to **export your entire Heroku PostgreSQL
    database**:

heroku pg:backups:capture \--app marketeq-projects-nestjs

heroku pg:backups:download \--app marketeq-projects-nestjs

2.  \
    This will create a file called latest.dump. Keep it safe --- you\'ll
    import it on Render.

## **☑️ Step 2: Create a Single Render Web Service App with Docker**

> 🔁 You are **not creating separate apps** for each microservice. You
> are using a **single Render service** with multi-container Docker.

1.  Create a new Render **Web Service**.

2.  Connect the Render app to your GitHub repo:
    marketeq-projects-nestjs.

3.  Use the Render **Docker deployment** option.

4.  Make sure your root repo has a render.yaml and docker-compose.yml
    (already configured per your migration plan).

## **☑️ Step 3: Import the Heroku PostgreSQL Database into Render**

> ⚠️ Do not create a new blank database. You are importing the data from
> Heroku.

1.  On Render, provision a **new PostgreSQL database**.

2.  Open a terminal and connect to the new Render DB:

psql -h \<render-host\> -U \<username\> -d \<database-name\>

3.  \
    Restore the .dump file:

pg_restore \--verbose \--clean \--no-acl \--no-owner -h \<render-host\>
-U \<username\> -d \<database-name\> latest.dump

4.  \
    Double-check that your tables, data, and users were all imported
    correctly.

## **☑️ Step 4: Update Environment Variables in Render**

Make sure you copy these values from your Heroku app into Render:

DATABASE_URL=postgres://\<username\>:\<password\>@\<host\>:5432/\<database\>

JWT_SECRET=your_existing_secret

NODE_ENV=production

Also update each service's .env or container-specific env block in
docker-compose.yml.

## **☑️ Step 5: Trigger Build & Deploy via GitHub**

1.  Once environment variables are set, push any commit to your repo to
    trigger Render's auto-deploy.

2.  If everything is configured correctly, Render will:

    - Spin up the containers via docker-compose

    - Point all services to the restored PostgreSQL database

    - Start the full backend in production
