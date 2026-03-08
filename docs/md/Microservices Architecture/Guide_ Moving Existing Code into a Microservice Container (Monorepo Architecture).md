## **Guide: Moving Existing Code into a Microservice Container (Monorepo Architecture)**

### **Purpose**

This guide provides a consistent step-by-step process for moving any
existing business logic or feature code into its appropriate
microservice container inside our monorepo. Developers should follow
this guide to maintain modularity, enforce service boundaries, and avoid
having to refactor or untangle code later.

### **When to Use This Guide**

Use this guide whenever:

- You've written new logic or features outside an existing microservice
  directory (e.g., directly in the API Gateway or in a temp folder).

- You're creating a **new feature** that deserves its own service (e.g.,
  notifications, billing, analytics).

- You need to **refactor shared logic** into a separate, reusable
  microservice.

### **Step-by-Step: Move or Create a Microservice from Scratch**

#### **1. Determine the Microservice Boundary**

- What **single responsibility** does this code have?

- Should this be its own service (e.g., \"notifications-service\")?

- Or should it move into an existing service (e.g., auth-service,
  user-service)?

#### **2. Create a New Folder (if Needed)**

****cd apps/

mkdir your-service-name

cd your-service-name

nest new your-service-name \--directory ./ \--skip-install

Make sure it follows the same structure used in other services (e.g.,
src/, main.ts, app.module.ts).

#### **3. Move Logic Into the New Service**

- Move all related controllers, services, DTOs, and utilities.

- Update imports and module paths.

- If the logic depends on other services (e.g. auth, user), communicate
  with them via REST.

Example:

/apps

/api-gateway

/notifications-service ← new service

/src

/notifications

notifications.controller.ts

notifications.service.ts

dto/

main.ts



#### **4. Register the Microservice in nest-cli.json**

****\"projects\": {

\"api-gateway\": { \... },

\"notifications-service\": {

\"type\": \"application\",

\"root\": \"apps/notifications-service\"

}

}



#### **5. Set Up the Main Entry Point**

In notifications-service/src/main.ts:

import { NestFactory } from \'@nestjs/core\';

import { AppModule } from \'./app.module\';

async function bootstrap() {

const app = await NestFactory.create(AppModule);

await app.listen(3002); // Pick an available port

}

bootstrap();



#### **6. Expose Necessary REST Endpoints**

Your controller should expose endpoints as needed (e.g.,
/notifications/send), and other services (like the gateway) should call
them via Axios.

#### **7. Add API Gateway Integration**

If this service is part of the user-facing application or will be
accessed by the frontend, you **must** add a REST client in the API
Gateway to communicate with it. Only skip this step if the service is
strictly internal or used solely for background processing.

In the api-gateway, create a service file to communicate with the new
microservice via REST:

@Injectable()

export class NotificationClient {

async send(dto: SendNotificationDto) {

return axios.post(\'http://localhost:3002/notifications/send\', dto);

}

}



### **Best Practices**

- Keep each microservice **isolated and focused**.

- Do not share business logic across services without clear interfaces.

- Use **REST for all real-time interactions** between services.

- Always create a client wrapper in the gateway to keep service calls
  clean.

### **Summary**

This guide ensures that all new or existing logic is placed inside its
correct microservice container and that no business logic ends up buried
in the wrong location (like the API Gateway or a shared folder). Always
check first if a service already exists before creating a new one.

Let the tech lead know if you\'re unsure where to move the code or
whether it should be its own microservice.
