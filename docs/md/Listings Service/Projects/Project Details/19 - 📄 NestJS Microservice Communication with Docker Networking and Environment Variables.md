# **📄 NestJS Microservice Communication with Docker Networking and Environment Variables**

This guide establishes a production-ready way for **listings-service**
to communicate with **user-service** and **content-moderation-service**
using Docker networking and environment variables. Includes setup, code,
and verification tests.

## **✅ Goals**

- Remove all cross-service imports.

- Use REST API calls with HttpService.

- Use Docker networks for local dev.

- Use .env for service URLs in all environments.

- Provide full testing instructions.

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

✅ Allows http://user-service:3000 and
http://content-moderation-service:3000 access inside containers.

## **2️⃣ Environment Variables**

### **.env.local**

****USER_SERVICE_URL=http://user-service:3000

CONTENT_MODERATION_URL=http://content-moderation-service:3000

### **.env.production**

****USER_SERVICE_URL=https://user-service.internal

CONTENT_MODERATION_URL=https://content-moderation-service.internal



## **3️⃣ Expose Internal Routes**

**user-service:**

****\@Controller(\'internal/users\')

export class InternalUserController {

constructor(private readonly userService: UserService) {}

\@Get(\':id/is-admin\')

async isAdmin(@Param(\'id\') id: string) {

const isAdmin = await this.userService.checkIfAdmin(id);

return { isAdmin };

}

}

**content-moderation-service:**

****\@Controller(\'internal/notifications\')

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

## **4️⃣ Configure Listings Service**

Enable HttpModule and ConfigModule:

@Module({

imports: \[ConfigModule.forRoot({ isGlobal: true }), HttpModule\],

providers: \[ProjectService\],

})

export class AppModule {}

Use env URLs in service:

@Injectable()

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



## **5️⃣ Optional: Shared DTOs Package**

Use a libs/shared-types package for interfaces only.

export interface NotificationPayload {

userId: string;

message: string;

}



## **6️⃣ Testing Instructions**

### **✅ 1. Test Local Docker Network**

1.  Run docker-compose up \--build.

2.  Open a shell in listings-service:

docker exec -it listings-service sh

3.  Test curl to user-service:

curl http://user-service:3000/internal/users/123/is-admin

4.  ✅ Should return { \"isAdmin\": true/false }.

5.  Test curl to content-moderation-service:

curl -X POST
http://content-moderation-service:3000/internal/notifications \\

-H \"Content-Type: application/json\" \\

-d \'{\"userId\":\"123\",\"message\":\"Test\"}\'

6.  ✅ Should return { \"status\": \"ok\" }.

### **✅ 2. Test in Render/Staging**

- Set .env.production URLs.

- Deploy all services.

- Run curl against the Render internal URLs to verify connectivity.

### **✅ 3. Test Inside Code**

- Add a temporary route in listings-service:

@Get(\'test-admin/:id\')

async testAdmin(@Param(\'id\') id: string) {

return this.projectService.isAdmin(id);

}

- Hit /test-admin/123 and confirm output.

## **✅ Final Checklist**

- Docker network configured.

- .env for local and production.

- Internal endpoints exposed.

- HttpService integrated with env URLs.

- Testing steps for local and Render.

- No cross-service imports remain.

## **✅ Best Practices**

- Always use env-based service URLs.

- Keep Docker network names consistent.

- Never directly import code across services.

- Implement retries and logging for internal calls.

- Use message queues for async heavy operations.
