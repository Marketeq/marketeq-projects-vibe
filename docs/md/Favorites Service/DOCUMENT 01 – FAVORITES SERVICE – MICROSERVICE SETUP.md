# **DOCUMENT 01 -- FAVORITES SERVICE -- MICROSERVICE SETUP**

## **PURPOSE**

Add a brand-new favorites-service NestJS microservice to your existing
backend. By the end, you'll have a standalone service that:\
• Listens on its own port\
• Connects to Postgres\
• Loads environment variables\
• Is ready for schema, endpoints and AI logic in later docs

## **PREREQUISITES**

• Node.js v16+ and npm installed\
• Nest CLI (@nestjs/cli) installed globally\
• Monorepo root with shared tsconfig.base.json\
• Access to Postgres credentials

## **DIRECTORY STRUCTURE AFTER SETUP**

****monorepo/

└─ apps/

└─ favorites-service/

├─ src/

│ ├─ main.ts

│ └─ app.module.ts

├─ .env

├─ package.json

└─ tsconfig.json

## **STEP 1 -- Create service folder**

From your repo root:

mkdir -p apps/favorites-service/src

## **STEP 2 -- package.json**

Create apps/favorites-service/package.json with exactly:

{

\"name\": \"favorites-service\",

\"version\": \"1.0.0\",

\"scripts\": {

\"start\": \"nest start\",

\"start:dev\": \"nest start \--watch\",

\"build\": \"nest build\"

},

\"dependencies\": {

\"@nestjs/common\": \"\^10.0.0\",

\"@nestjs/core\": \"\^10.0.0\",

\"@nestjs/typeorm\": \"\^10.0.0\",

\"@nestjs/config\": \"\^2.2.0\",

\"pg\": \"\^8.7.1\",

\"class-validator\": \"\^0.13.2\",

\"class-transformer\": \"\^0.5.1\",

\"dotenv\": \"\^16.3.1\",

\"jsonwebtoken\": \"\^9.0.0\",

\"reflect-metadata\": \"\^0.1.13\",

\"rxjs\": \"\^7.8.0\"

},

\"devDependencies\": {

\"@nestjs/cli\": \"\^10.0.0\",

\"typescript\": \"\^5.3.3\"

}

}

## **STEP 3 -- tsconfig.json**

Create apps/favorites-service/tsconfig.json:

{

\"extends\": \"../../tsconfig.base.json\",

\"compilerOptions\": {

\"rootDir\": \"src\",

\"outDir\": \"dist\"

},

\"include\": \[\"src\"\]

}

(Adjust extends path if your base config lives elsewhere.)

## **STEP 4 -- Environment variables**

Create apps/favorites-service/.env:

PORT=4003

DATABASE_URL=postgres://\<DB_USER\>:\<DB_PASS\>@\<DB_HOST\>:5432/\<DB_NAME\>

JWT_SECRET=\<YOUR_JWT_SECRET\>

• PORT is the service port\
• JWT_SECRET must match your existing auth secret

## **STEP 5 -- Application entry point (main.ts)**

Create apps/favorites-service/src/main.ts:

import { NestFactory } from \'@nestjs/core\';

import { AppModule } from \'./app.module\';

import \'dotenv/config\';

async function bootstrap() {

const app = await NestFactory.create(AppModule);

const port = process.env.PORT \|\| 4003;

await app.listen(port);

console.log(\`favorites-service listening on port \${port}\`);

}

bootstrap();

## **STEP 6 -- AppModule setup (app.module.ts)**

Create apps/favorites-service/src/app.module.ts:

import { Module } from \'@nestjs/common\';

import { ConfigModule } from \'@nestjs/config\';

import { TypeOrmModule } from \'@nestjs/typeorm\';

\@Module({

imports: \[

ConfigModule.forRoot({ isGlobal: true }),

TypeOrmModule.forRoot({

type: \'postgres\',

url: process.env.DATABASE_URL,

autoLoadEntities: true,

synchronize: false // migrations in next doc

}),

\],

})

export class AppModule {}

## **STEP 7 -- Verify service startup**

From apps/favorites-service folder, run:

npm install

npm run start:dev

Expected console output:

\[Nest\] 12345 - favorites-service listening on port 4003

## **YOUR SERVICE SHELL IS READY**

• Strict TypeScript NestJS project\
• Postgres connection via TypeORM\
• Environment variables loaded\
• No other services modified
