# **How to Add a New Microservice (NestJS + Heroku via GitHub Auto-Deploy)**

### **📌 Purpose**

This document explains how to properly add a new microservice to the
marketeq-projects-nestjs monorepo, assuming you are using **GitHub
auto-deploy to Heroku Container Registry**. It includes folder
structure, Docker config, and environment file setup.\
**No Heroku CLI push is required.**

### **📁 Folder Structure**

****marketeq-projects-nestjs/

├── apps/

│ ├── user-service/

│ ├── auth-service/

│ ├── project-service/

│ └── new-service-name/ ← Create this

├── docker-compose.yml

├── .env.example

└── .gitignore



### **✅ Step-by-Step Instructions**

#### **1. 🧱 Copy an Existing Service**

****cd apps

cp -R user-service new-service-name

#### **2. ✏️ Update main.ts and AppModule**

Edit apps/new-service-name/src/main.ts and rename any app-specific
console logs.

Also update AppModule:

@Module({

controllers: \[\...\],

providers: \[\...\],

})

export class AppModule {}

#### **3. 📦 Modify package.json**

Edit apps/new-service-name/package.json:

{

\"name\": \"new-service-name\",

\"scripts\": {

\"start\": \"nest start\",

\"start:dev\": \"nest start \--watch\"

}

}

#### **4. ⚙️ Create .env for the New Service**

Create apps/new-service-name/.env:

NODE_ENV=development

PORT=3004

DATABASE_HOST=your-host

DATABASE_PORT=5432

DATABASE_NAME=new_service_db

DATABASE_USERNAME=your-user

DATABASE_PASSWORD=your-password

JWT_SECRET=your_shared_jwt_secret

Also update .env.example at the repo root with placeholder keys for
this service.

#### **5. 🐳 Add to docker-compose.yml**

Append to docker-compose.yml:

new-service-name:

build:

context: ./apps/new-service-name

ports:

\- \'3004:3004\'

env_file:

\- ./apps/new-service-name/.env

depends_on:

\- postgres



### **🚀 Deployment via GitHub Auto-Deploy**

Once you push changes to your connected GitHub branch (usually main or
prod):

- Heroku automatically pulls the repo

- Rebuilds the container using Dockerfile + docker-compose.yml

- Deploys all microservices together

✅ No heroku create, heroku push, or CLI deployment needed.

### **✅ Final Checklist**

- New folder created under apps/

- .env file created

- package.json updated

- docker-compose.yml updated

- .env.example updated

- GitHub changes pushed → Heroku auto-deploys
