# **📄 NestJS Microservice Communication Fix -- Listings Service Integration**

This document fixes the TS2307: Cannot find module errors and
establishes a best-practice pattern for the **listings-service** to
communicate with **user-service** and **content-moderation-service**.

## **✅ Why Direct Imports Fail**

- Each service is isolated inside Docker and has its own build context.

- TypeScript cannot resolve cross-service imports like
  ../../../user-service/\....

- Violates microservice boundaries --- production deployments will fail.

- The solution: **Replace direct imports with internal REST or gRPC
  APIs.\**

## **✅ Architecture Recommendation**

- Use **internal REST API calls** for synchronous communication.

- Use **shared DTOs package** for type safety (optional).

- Each service owns its own database --- no cross-service imports of
  models or modules.

## **✅ Step-by-Step Implementation**

### **1️⃣ Expose Internal Endpoints in user-service**

Add a route to check if a user is an admin.

**File:** apps/user-service/src/internal/internal.controller.ts

import { Controller, Get, Param } from \'@nestjs/common\';

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

### **2️⃣ Expose Internal Endpoints in content-moderation-service**

Add a route to create notifications.

**File:**
apps/content-moderation-service/src/internal/internal.controller.ts

import { Controller, Post, Body } from \'@nestjs/common\';

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

### **3️⃣ Add HTTP Client to listings-service**

Install Axios wrapper:

npm install \@nestjs/axios

Enable it in the service module.

**File:** apps/listings-service/src/app.module.ts

import { Module } from \'@nestjs/common\';

import { HttpModule } from \'@nestjs/axios\';

import { ProjectService } from \'./listings/project.service\';

\@Module({

imports: \[HttpModule\],

providers: \[ProjectService\],

})

export class AppModule {}



### **4️⃣ Replace Direct Imports with API Calls**

**File:** apps/listings-service/src/listings/project.service.ts

import { Injectable } from \'@nestjs/common\';

import { HttpService } from \'@nestjs/axios\';

\@Injectable()

export class ProjectService {

constructor(private readonly http: HttpService) {}

async isAdmin(userId: string): Promise\<boolean\> {

const res = await this.http

.get(\`http://user-service:3000/internal/users/\${userId}/is-admin\`)

.toPromise();

return res.data.isAdmin;

}

async sendNotification(userId: string, message: string) {

await this.http

.post(\`http://content-moderation-service:3000/internal/notifications\`,
{

userId,

message,

})

.toPromise();

}

}

> 🔗 Replace http://user-service:3000 with the correct internal Docker
> network host if different.

### **5️⃣ Optional: Create a Shared DTOs Package**

For type safety, create a libs/shared-types package:

libs/shared-types/src/user.dto.ts

libs/shared-types/src/notification.dto.ts

Example DTO:

export interface NotificationPayload {

userId: string;

message: string;

}

Publish locally or via npm workspace, then import in all services:

import { NotificationPayload } from \'@marketeq/shared-types\';



## **✅ Final Checklist**

- Removed all cross-service direct imports

- Exposed internal REST endpoints in user-service and
  content-moderation-service

- Added HttpModule to listings-service

- Replaced imports with API calls

- (Optional) Added shared DTOs package for type safety

## **✅ Best Practices**

- Never import code or modules directly across services.

- Keep communication at the API boundary.

- Use Docker internal network hostnames (http://user-service) for
  service-to-service calls.

- Log failed requests and handle retries.

- Keep DTOs in a shared package if needed.

- Use gRPC or a message queue for high-performance async operations.
