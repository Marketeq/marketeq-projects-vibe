# **📄 NestJS Microservice Communication with Docker Networking and Environment Variables**

This document sets up **listings-service** to communicate with
**user-service** and **content-moderation-service** using best
practices, Docker networks, and .env-based configuration. It includes
step-by-step instructions and all necessary code.

## **✅ Goals**

- Remove all cross-service file imports.

- Use REST API calls with HttpService.

- Configure Docker networks for service discovery.

- Use .env variables for URLs (local + Render).

- Provide complete code examples for every step.

## **1️⃣ Docker Network Setup**

### **docker-compose.yml**

****version: \'3.9\'

services:

user-service:

build: ./apps/user-service

container_name: user-service

ports:

\- \"3001:3000\"

networks:

\- marketeq-net

content-moderation-service:

build: ./apps/content-moderation-service

container_name: content-moderation-service

ports:

\- \"3002:3000\"

networks:

\- marketeq-net

listings-service:

build: ./apps/listings-service

container_name: listings-service

ports:

\- \"3003:3000\"

networks:

\- marketeq-net

depends_on:

\- user-service

\- content-moderation-service

networks:

marketeq-net:

driver: bridge

✅ **Result:**

- Each service can reach the others via http://user-service:3000,
  http://content-moderation-service:3000.

## **2️⃣ Environment Variables**

### **.env.local (for local development)**

****USER_SERVICE_URL=http://user-service:3000

CONTENT_MODERATION_URL=http://content-moderation-service:3000

### **.env.production (for Render)**

****USER_SERVICE_URL=https://user-service.internal

CONTENT_MODERATION_URL=https://content-moderation-service.internal



## **3️⃣ Expose Internal Routes**

### **user-service: internal.controller.ts**

****import { Controller, Get, Param } from \'@nestjs/common\';

import { UserService } from \'./user.service\';

\@Controller(\'internal/users\')

export class InternalUserController {

constructor(private readonly userService: UserService) {}

\@Get(\':id/is-admin\')

async isAdmin(@Param(\'id\') id: string) {

const isAdmin = await this.userService.checkIfAdmin(id);

return { isAdmin };

}

}



### **content-moderation-service: internal.controller.ts**

****import { Controller, Post, Body } from \'@nestjs/common\';

import { NotificationService } from \'./notification.service\';

\@Controller(\'internal/notifications\')

export class InternalNotificationController {

constructor(private readonly notificationService: NotificationService)
{}

\@Post()

async send(@Body() body: { userId: string; message: string }) {

await this.notificationService.sendNotification(body.userId,
body.message);

return { status: \'ok\' };

}

}



## **4️⃣ Configure Listings Service to Use Env URLs**

### **apps/listings-service/src/app.module.ts**

****import { Module } from \'@nestjs/common\';

import { ConfigModule } from \'@nestjs/config\';

import { HttpModule } from \'@nestjs/axios\';

import { ProjectService } from \'./listings/project.service\';

\@Module({

imports: \[ConfigModule.forRoot({ isGlobal: true }), HttpModule\],

providers: \[ProjectService\],

})

export class AppModule {}



### **apps/listings-service/src/listings/project.service.ts**

****import { Injectable } from \'@nestjs/common\';

import { HttpService } from \'@nestjs/axios\';

\@Injectable()

export class ProjectService {

constructor(private readonly http: HttpService) {}

async isAdmin(userId: string): Promise\<boolean\> {

const res = await this.http

.get(\`\${process.env.USER_SERVICE_URL}/internal/users/\${userId}/is-admin\`)

.toPromise();

return res.data.isAdmin;

}

async sendNotification(userId: string, message: string) {

await this.http

.post(\`\${process.env.CONTENT_MODERATION_URL}/internal/notifications\`,
{

userId,

message,

})

.toPromise();

}

}

✅ **Result:**

- URLs resolve via .env.

- Works in Docker with service names or in Render with internal service
  URLs.

## **5️⃣ Optional: Shared DTOs Package**

Create libs/shared-types for common interfaces:

libs/shared-types/src/notification.dto.ts



export interface NotificationPayload {

userId: string;

message: string;

}

Import in both services:

import { NotificationPayload } from \'@marketeq/shared-types\';



## **✅ Final Checklist**

- Docker Compose with marketeq-net network.

- .env values for local + production.

- Internal endpoints created.

- HttpService with environment-based URLs.

- Removed all cross-service file imports.

- Optional shared DTOs package for type safety.

## **✅ Best Practices**

- Use internal Docker network names for local dev.

- Keep URLs in .env for easy environment switching.

- Never import NestJS modules/services across microservices.

- Handle request failures gracefully and add retries.

- Use gRPC or message queues for async, high-performance flows.

- Keep Docker networks consistent across environments.
