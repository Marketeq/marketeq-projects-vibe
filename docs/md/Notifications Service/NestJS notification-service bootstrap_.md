**NestJS notification-service bootstrap**\
\
including:

- NotificationModule

- NotificationService (email + Ably push)

- RabbitMQHandler to receive events

- AppModule, main.ts

- Folder structure

- README for devs

## **📁 Folder Structure (/app/notification-service)**

****notification-service/

├── Dockerfile

├── .env

├── README.md

├── yarn.lock

├── package.json

└── src/

├── main.ts

├── app.module.ts

├── notification/

│ ├── notification.module.ts

│ ├── notification.service.ts

└── rabbitmq/

├── rabbitmq.module.ts

└── rabbitmq.handler.ts



## **✅ package.json**

****{

\"name\": \"notification-service\",

\"version\": \"1.0.0\",

\"main\": \"dist/main.js\",

\"scripts\": {

\"start\": \"nest start\",

\"start:prod\": \"node dist/main.js\",

\"build\": \"nest build\"

},

\"dependencies\": {

\"@nestjs/common\": \"\^10.0.0\",

\"@nestjs/core\": \"\^10.0.0\",

\"@nestjs/microservices\": \"\^10.0.0\",

\"@nestjs/platform-express\": \"\^10.0.0\",

\"rxjs\": \"\^7.0.0\",

\"amqplib\": \"\^0.10.0\",

\"@sendgrid/mail\": \"\^7.7.0\",

\"ably\": \"\^1.2.0\",

\"dotenv\": \"\^16.0.3\"

},

\"devDependencies\": {

\"@nestjs/cli\": \"\^10.0.0\",

\"@nestjs/schematics\": \"\^10.0.0\",

\"typescript\": \"\^5.0.0\"

}

}



## **✅ main.ts**

****import { NestFactory } from \'@nestjs/core\';

import { AppModule } from \'./app.module\';

import { MicroserviceOptions, Transport } from
\'@nestjs/microservices\';

import \* as dotenv from \'dotenv\';

dotenv.config();

async function bootstrap() {

const app = await NestFactory.create(AppModule);

app.connectMicroservice\<MicroserviceOptions\>({

transport: Transport.RMQ,

options: {

urls: \[process.env.RABBITMQ_URL\],

queue: \'notifications_queue\',

queueOptions: { durable: true },

},

});

await app.startAllMicroservices();

await app.listen(3000);

}

bootstrap();



## **✅ app.module.ts**

****import { Module } from \'@nestjs/common\';

import { NotificationModule } from
\'./notification/notification.module\';

import { RabbitmqModule } from \'./rabbitmq/rabbitmq.module\';

\@Module({

imports: \[NotificationModule, RabbitmqModule\],

})

export class AppModule {}



## **✅ notification.module.ts**

****import { Module } from \'@nestjs/common\';

import { NotificationService } from \'./notification.service\';

\@Module({

providers: \[NotificationService\],

exports: \[NotificationService\],

})

export class NotificationModule {}



## **✅ notification.service.ts**

****import { Injectable, Logger } from \'@nestjs/common\';

import \* as sgMail from \'@sendgrid/mail\';

import \* as Ably from \'ably\';

\@Injectable()

export class NotificationService {

private readonly logger = new Logger(NotificationService.name);

private ably;

constructor() {

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

this.ably = new Ably.Realtime(process.env.ABLY_API_KEY);

}

async sendEmail(to: string, subject: string, text: string) {

const msg = {

to,

from: \'no-reply@yourdomain.com\',

subject,

text,

};

try {

await sgMail.send(msg);

this.logger.log(\`Email sent to \${to}\`);

} catch (error) {

this.logger.error(\`Failed to send email: \${error.message}\`);

}

}

async sendPush(channel: string, event: string, data: any) {

try {

const ablyChannel = this.ably.channels.get(channel);

ablyChannel.publish(event, data);

this.logger.log(\`Push sent to \${channel}:\${event}\`);

} catch (error) {

this.logger.error(\`Failed to send push: \${error.message}\`);

}

}

}



## **✅ rabbitmq.module.ts**

****import { Module } from \'@nestjs/common\';

import { ClientsModule, Transport } from \'@nestjs/microservices\';

import { RabbitmqHandler } from \'./rabbitmq.handler\';

import { NotificationModule } from
\'../notification/notification.module\';

\@Module({

imports: \[

NotificationModule,

ClientsModule.register(\[

{

name: \'RABBITMQ_SERVICE\',

transport: Transport.RMQ,

options: {

urls: \[process.env.RABBITMQ_URL\],

queue: \'notifications_queue\',

queueOptions: { durable: true },

},

},

\]),

\],

providers: \[RabbitmqHandler\],

})

export class RabbitmqModule {}



## **✅ rabbitmq.handler.ts**

****import { Controller, Logger } from \'@nestjs/common\';

import { MessagePattern } from \'@nestjs/microservices\';

import { NotificationService } from
\'../notification/notification.service\';

\@Controller()

export class RabbitmqHandler {

private readonly logger = new Logger(RabbitmqHandler.name);

constructor(private readonly notificationService: NotificationService)
{}

\@MessagePattern(\'send_notification\')

async handleMessage(data: {

type: \'email\' \| \'push\';

to: string;

subject?: string;

message: string;

channel?: string;

event?: string;

}) {

this.logger.log(\`Received notification event:
\${JSON.stringify(data)}\`);

if (data.type === \'email\') {

await this.notificationService.sendEmail(data.to, data.subject,
data.message);

} else if (data.type === \'push\') {

await this.notificationService.sendPush(data.channel, data.event, {
message: data.message });

}

}

}



## **✅ Dockerfile**

****FROM node:18

WORKDIR /app

COPY . .

RUN yarn install \--frozen-lockfile

RUN yarn build

CMD \[\"yarn\", \"start:prod\"\]



## **✅ .env (example)**

****ABLY_API_KEY=your_ably_key

SENDGRID_API_KEY=your_sendgrid_key

DATABASE_URL=postgres://user:pass@host:5432/dbname

RABBITMQ_URL=amqp://user:pass@host:5672



## **✅ README.md (Developer Quickstart)**

****\# 📬 Notification Service

Sends emails via SendGrid and real-time messages via Ably. Listens to
RabbitMQ for \`send_notification\` events.

\## 🔧 Setup

\`\`\`bash

cp .env.example .env

yarn install

yarn start:dev

## **🐇 Sample Event to Trigger**

****{

\"pattern\": \"send_notification\",

\"data\": {

\"type\": \"email\",

\"to\": \"user@example.com\",

\"subject\": \"Welcome\",

\"message\": \"Thanks for joining!\"

}

}

For push:

{

\"type\": \"push\",

\"channel\": \"user_123\",

\"event\": \"new_message\",

\"message\": \"You have a new message!\"

}

## **🐳 Docker Build**

****docker build -t notification-service .

## **🚀 Deployment (Render)**

See render.yaml and add env vars in the dashboard.



\-\--

Let me know if you\'d like this saved as a document, committed to
GitHub, or zipped for download.


