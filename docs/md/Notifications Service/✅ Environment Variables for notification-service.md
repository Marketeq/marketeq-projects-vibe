## **✅ Environment Variables for notification-service**

In your monorepo structure under apps/notification-service/, create a
.env file with:

# Ably Real-Time Messaging

ABLY_API_KEY=your_ably_key

\# SendGrid Email Delivery

SENDGRID_API_KEY=your_sendgrid_key

\# PostgreSQL Database

DATABASE_URL=postgres://\<username\>:\<password\>@\<host\>:\<port\>/\<database\>

\# RabbitMQ Broker (for internal event communication)

RABBITMQ_URL=amqp://\<username\>:\<password\>@\<host\>:\<port\>



## **📁 Monorepo Structure**

Your monorepo (/app) should look like this:

/app

/notification-service

/src

.env

Dockerfile

main.ts

\...

/other-services

render.yaml

package.json



## **🛠️ Dockerfile for Notification Service**

If this service is containerized:

# apps/notification-service/Dockerfile

FROM node:18

WORKDIR /app

COPY . .

RUN yarn install \--frozen-lockfile

CMD \[\"yarn\", \"start:prod\"\]



## **🧩 render.yaml (multi-service deployment)**

Assuming each service has its own container:

services:

\- type: web

name: notification-service

env: node

plan: free

rootDir: app/notification-service

buildCommand: \|

yarn install \--frozen-lockfile

startCommand: yarn start:prod

envVars:

\- key: ABLY_API_KEY

sync: false

\- key: SENDGRID_API_KEY

sync: false

\- key: DATABASE_URL

sync: false

\- key: RABBITMQ_URL

sync: false

> ⚠️ After deploying, go to the Render dashboard \> Environment tab \>
> manually enter each env var if sync: false.
