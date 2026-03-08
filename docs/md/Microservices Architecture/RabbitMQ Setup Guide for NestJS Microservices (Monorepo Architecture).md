## **RabbitMQ Setup Guide for NestJS Microservices (Monorepo Architecture)**

This document explains how to set up RabbitMQ within your NestJS-based
monorepo microservices architecture. It covers Heroku setup, local
Docker setup, NestJS transport configuration, and integration across
services like the API Gateway and auth-service.

### **1. Add RabbitMQ to Your Environment**

#### **Option A: Using Docker (Local Development)**

****docker run -d \\

\--hostname rabbitmq-local \\

\--name rabbitmq \\

-p 5672:5672 \\

-p 15672:15672 \\

rabbitmq:3-management

- \
  Management UI:
  [[http://localhost:15672]{.underline}](http://localhost:15672/)
  (default user: guest / guest)

- Broker URL: amqp://localhost:5672

#### **Option B: Using Heroku (Production/Staging)**

****heroku addons:create cloudamqp:lemur -a your-heroku-app-name

heroku config:get CLOUDAMQP_URL \# Copy this URL for use in NestJS



### **2. Set Environment Variables**

Create a .env file or set Heroku config vars:

RABBITMQ_URI=amqp://localhost:5672 \# local

\# or

RABBITMQ_URI=amqps://your-heroku-uri \# Heroku CloudAMQP



### **3. Configure a Microservice to Use RabbitMQ**

#### **Example: apps/auth-service/src/main.ts**

****import { NestFactory } from \'@nestjs/core\';

import { AppModule } from \'./app.module\';

import { MicroserviceOptions, Transport } from
\'@nestjs/microservices\';

async function bootstrap() {

const app = await
NestFactory.createMicroservice\<MicroserviceOptions\>(AppModule, {

transport: Transport.RMQ,

options: {

urls: \[process.env.RABBITMQ_URI\],

queue: \'auth_queue\',

queueOptions: { durable: false },

},

});

await app.listen();

}

bootstrap();

#### **Create Message Handlers**

****\@MessagePattern(\'auth_login\')

login(@Payload() data: LoginDto) {

return this.authService.login(data);

}



### **4. Configure the Client in Another Microservice (e.g., API Gateway)**

#### **apps/api-gateway/src/app.module.ts**

****ClientsModule.register(\[

{

name: \'AUTH_SERVICE\',

transport: Transport.RMQ,

options: {

urls: \[process.env.RABBITMQ_URI\],

queue: \'auth_queue\',

},

},

\]),

#### **Use Client Proxy**

****\@Injectable()

export class AuthClient {

constructor(@Inject(\'AUTH_SERVICE\') private readonly client:
ClientProxy) {}

login(credentials: LoginDto) {

return this.client.send(\'auth_login\', credentials);

}

}



### **5. Common Commands & Tips**

- **Scale up/down RabbitMQ in Docker:\**

****docker stop rabbitmq

- \
  **Reset queues or purge messages (dev only):\**
  Use the RabbitMQ UI or CLI to delete queues or reset connections.

- **Logs on Heroku:\**

****heroku logs \--tail -a your-app-name



### **✅ Final Result**

- Each service (e.g. auth-service) listens to a dedicated queue.

- Other services communicate by sending messages through RabbitMQ.

- Easily extendable to new services like notifications, payments, etc.
