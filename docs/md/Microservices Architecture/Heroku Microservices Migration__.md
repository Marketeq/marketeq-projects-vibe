**Heroku Microservices Migration: .env Configuration Guide**

### **📌 Purpose**

This document provides a standardized .env configuration format for each
microservice in the monorepo to support successful deployment to Heroku
and proper integration within the GitHub-based monorepo. It is part of
the Heroku Docker-based container migration strategy. It also resolves
issues developers have encountered regarding missing JWT tokens.

### **🔢 Required Environment Variables**

These variables must be set **per microservice** in both the .env files
and Heroku Config Vars.

#### **💡 Shared Across Services:**

****NODE_ENV=production

PORT=3000 \# or service-specific port

#### **🏢 Database Configuration (PostgreSQL)**

Each service that connects to the database must define:

DATABASE_HOST=your-db-host.compute.amazonaws.com

DATABASE_PORT=5432

DATABASE_NAME=your_db_name

DATABASE_USERNAME=your_user

DATABASE_PASSWORD=your_password

> These values are parsed from Heroku's DATABASE_URL if using add-ons.

#### **🔐 JWT Token Configuration (For Auth + Internal API)**

All services that handle auth or validate tokens must define:

JWT_SECRET=your_shared_jwt_secret

JWT_EXPIRATION=1d

> The JWT_SECRET must be the **same across services** that need to
> verify tokens.\
> Use heroku config:set JWT_SECRET=\... to add the token in each Heroku
> app.
>
> All NestJS services must use the following snippet in their
> AuthModule:

JwtModule.register({

secret: process.env.JWT_SECRET,

signOptions: { expiresIn: process.env.JWT_EXPIRATION },

});



### **📂 Service-Specific Sample .env for user-service**

****NODE_ENV=production

PORT=3001

DATABASE_HOST=your-host

DATABASE_PORT=5432

DATABASE_NAME=users_db

DATABASE_USERNAME=your-user

DATABASE_PASSWORD=your-password

JWT_SECRET=shared_super_secret_key

JWT_EXPIRATION=1d



### **🚀 Setting Config Vars in Heroku**

For each Heroku app (one per microservice):

heroku config:set \\

DATABASE_HOST=your-host \\

DATABASE_PORT=5432 \\

DATABASE_NAME=your-db \\

DATABASE_USERNAME=your-user \\

DATABASE_PASSWORD=your-password \\

JWT_SECRET=shared_jwt_secret \\

JWT_EXPIRATION=1d \\

NODE_ENV=production \\

PORT=3001 \\

\--app your-heroku-app-name



### **🌐 Keeping GitHub in Sync**

- Commit .env.example files for each service with placeholders

- Never commit real credentials

- Use GitHub Actions secrets or .env.production templates for CI/CD
  pipelines

### **📅 Deployment Reminder**

- Heroku Container Registry should be used to deploy each Dockerized
  service

- Config vars must be set **per app**, even if duplicated

### **📌 Developer Issue Note: JWT Token Not Found**

This guide directly solves the reported issue where developers could not
locate or configure JWT tokens while deploying or merging microservices.

- ✅ JWT secrets are now clearly defined and required across all
  services

- ✅ They are shown in both .env and heroku config:set instructions

- ✅ JWT secrets **must be consistent across all auth-aware services\**

- ✅ NestJS must read process.env.JWT_SECRET inside JwtModule
  configuration as shown

Following this guide ensures your services won\'t run into the \"JWT
token not found\" issue again. ✅
