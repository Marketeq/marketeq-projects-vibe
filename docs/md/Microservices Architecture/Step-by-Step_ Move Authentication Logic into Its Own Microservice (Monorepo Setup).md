## **Step-by-Step: Move Authentication Logic into Its Own Microservice (Monorepo Setup)**

This guide explains how to extract your authentication logic from your
main NestJS application into its own microservice using REST for
inter-service communication. This is designed for a monorepo
architecture.

### **1. Create the auth-service Microservice Folder**

In your apps/ or services/ directory:

/apps

/api-gateway

/auth-service ← 🆕 create this

Follow the NestJS structure used in your monorepo:

/auth-service

/src

/auth

auth.module.ts

auth.service.ts

auth.controller.ts

jwt.strategy.ts

/users

user.entity.ts

users.service.ts

main.ts



### **2. Move Auth Code to auth-service**

Move the following files from api-gateway (or main app) to auth-service:

- auth.module.ts

- auth.service.ts

- auth.controller.ts

- Any strategies (jwt.strategy.ts, etc.)

- DTOs and guards used for auth flows

- users.service.ts and user.entity.ts (if user logic is handled by auth)

Ensure imports are updated to reflect the new paths.

### **3. Set Up auth-service as a Standalone NestJS App**

In auth-service/src/main.ts:

import { NestFactory } from \'@nestjs/core\';

import { AppModule } from \'./app.module\';

async function bootstrap() {

const app = await NestFactory.create(AppModule);

await app.listen(3001); // auth service runs on its own port

}

bootstrap();



### **4. Register the Microservice in the Monorepo**

In nest-cli.json:

\"projects\": {

\"api-gateway\": {

\"type\": \"application\",

\"root\": \"apps/api-gateway\"

},

\"auth-service\": {

\"type\": \"application\",

\"root\": \"apps/auth-service\"

}

}



### **5. Expose REST Endpoints in auth-service**

In auth.controller.ts:

@Controller(\'auth\')

export class AuthController {

constructor(private readonly authService: AuthService) {}

\@Post(\'login\')

login(@Body() dto: LoginDto) {

return this.authService.login(dto);

}

\@Post(\'register\')

register(@Body() dto: RegisterDto) {

return this.authService.register(dto);

}

}



### **6. Connect to auth-service from api-gateway**

In api-gateway, install Axios:

npm install axios

Create an AuthClient service in the gateway:

@Injectable()

export class AuthClient {

private readonly baseUrl = \'http://localhost:3001/auth\';

async login(dto: LoginDto) {

return axios.post(\`\${this.baseUrl}/login\`, dto);

}

async register(dto: RegisterDto) {

return axios.post(\`\${this.baseUrl}/register\`, dto);

}

}

Inject and use this service in your api-gateway controller or resolver
as needed.

### **7. (Optional) Add CORS & Global Prefix**

In auth-service/src/main.ts, if needed:

app.enableCors();

app.setGlobalPrefix(\'api\');



### **✅ Final Outcome**

- Auth logic is separated into its own cleanly organized microservice.

- Communication with the gateway happens via REST endpoints.

- Easy to scale, update, or swap out in future (e.g. with Auth0).
