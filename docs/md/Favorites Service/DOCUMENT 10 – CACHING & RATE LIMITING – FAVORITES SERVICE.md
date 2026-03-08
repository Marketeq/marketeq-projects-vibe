# **DOCUMENT 10 -- CACHING & RATE LIMITING -- FAVORITES SERVICE**

## **PURPOSE**

Add Redis-backed caching for expensive operations (text embedding and
group assignment) and protect your endpoints with rate-limiting. All
changes live inside **favorites-service**.

## **PREREQUISITES**

• Documents 01--09 complete\
• A running Redis instance (with connection URL)\
• Your favorite embedding and group-assignment methods live in
FavoritesService\
• NestJS, TypeORM, and JWT auth already set up

## **DEPENDENCIES**

In apps/favorites-service, install:

npm install \\

cache-manager-redis-store \@nestjs/cache-manager \\

\@nestjs/throttler cache-manager \\

\@types/cache-manager

## **ENVIRONMENT**

Add to apps/favorites-service/.env:

REDIS_URL=redis://\<REDIS_HOST\>:\<REDIS_PORT\>

THROTTLE_TTL=60 \# seconds

THROTTLE_LIMIT=20 \# max requests per TTL per user/IP

## **DIRECTORY SNIPPET**

****apps/favorites-service/

└─ src/

├─ main.ts

├─ app.module.ts

├─ controllers/

│ └─ favorites.controller.ts

├─ services/

│ └─ favorites.service.ts

└─ \...

## **STEP 1 -- CONFIGURE CACHE & THROTTLER**

Edit **src/app.module.ts**:

import { Module } from \'@nestjs/common\';

import { ConfigModule, ConfigService } from \'@nestjs/config\';

import { CacheModule } from \'@nestjs/cache-manager\';

import { ThrottlerModule, ThrottlerGuard } from \'@nestjs/throttler\';

import { APP_GUARD } from \'@nestjs/core\';

import { TypeOrmModule } from \'@nestjs/typeorm\';

import { FavoritesController } from
\'./controllers/favorites.controller\';

import { FavoritesService } from \'./services/favorites.service\';

// \... other imports

\@Module({

imports: \[

ConfigModule.forRoot({ isGlobal: true }),

// Redis-backed cache

CacheModule.registerAsync({

imports: \[ConfigModule\],

useFactory: (cs: ConfigService) =\> ({

store: require(\'cache-manager-redis-store\'),

url: cs.get\<string\>(\'REDIS_URL\'),

ttl: 3600, // default 1 hour

}),

inject: \[ConfigService\],

isGlobal: true,

}),

// Rate limiting

ThrottlerModule.forRootAsync({

imports: \[ConfigModule\],

useFactory: (cs: ConfigService) =\> ({

ttl: +cs.get\<number\>(\'THROTTLE_TTL\'),

limit: +cs.get\<number\>(\'THROTTLE_LIMIT\'),

}),

inject: \[ConfigService\],

}),

TypeOrmModule.forRoot({ /\* existing config \*/ }),

TypeOrmModule.forFeature(\[/\* your entities \*/\]),

// \... other modules

\],

controllers: \[FavoritesController\],

providers: \[

FavoritesService,

{ provide: APP_GUARD, useClass: ThrottlerGuard }, // apply rate limits
globally

// \... other providers

\],

})

export class AppModule {}

## **STEP 2 -- ENSURE GLOBAL GUARDS IN main.ts**

Edit **src/main.ts** to register global pipes and guards:

import { NestFactory } from \'@nestjs/core\';

import { AppModule } from \'./app.module\';

import { ValidationPipe } from \'@nestjs/common\';

import \'dotenv/config\';

async function bootstrap() {

const app = await NestFactory.create(AppModule);

// Auto-validate DTOs

app.useGlobalPipes(

new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }),

);

const port = process.env.PORT \|\| 4003;

await app.listen(port);

console.log(\`favorites-service listening on port \${port}\`);

}

bootstrap();

(The ThrottlerGuard is already applied globally via APP_GUARD.)

## **STEP 3 -- INJECT CACHE INTO FavoritesService**

Open **src/services/favorites.service.ts** and add:

import { CACHE_MANAGER, Inject, Injectable } from \'@nestjs/common\';

import { Cache } from \'cache-manager\';

// \...

\@Injectable()

export class FavoritesService {

constructor(

// existing injections\...

\@Inject(CACHE_MANAGER) private cache: Cache,

) {}

// \...

}

## **STEP 4 -- CACHE EMBEDDING RESULTS**

Wrap your embed function to store/retrieve vectors:

private readonly MODEL_ID = \'sentence-transformers/all-MiniLM-L6-v2\';

private async embed(text: string): Promise\<number\[\]\> {

const key = \`embed:\${this.MODEL_ID}:\${text}\`;

const cached = await this.cache.get\<number\[\]\>(key);

if (cached) return cached;

const result = await this.hf.featureExtraction({

model: this.MODEL_ID,

inputs: text,

});

const vector = Array.isArray(result) && Array.isArray(result\[0\])

? result\[0\]

: \[\];

await this.cache.set(key, vector, { ttl: 86400 }); // 24h

return vector;

}

## **STEP 5 -- CACHE GROUP ASSIGNMENT**

In your group-assignment logic (runAssignLogic or similar), add:

async assignGroup(userId: string, type: FavoriteType, itemId: string) {

const key = \`assign:\${userId}:\${type}:\${itemId}\`;

const cached = await this.cache.get\<FavoriteGroup\>(key);

if (cached) return cached;

// existing logic to embed, compare, and create/choose group

const group = await this.runAssignLogic(userId, type, itemId);

await this.cache.set(key, group, { ttl: 3600 }); // 1h

return group;

}

## **STEP 6 -- THROTTLE HEAVY ROUTES (OPTIONAL)**

To limit only the creation endpoint, in **favorites.controller.ts**:

import { Controller, Post, Throttle } from \'@nestjs/common\';

\@Controller(\'favorites\')

export class FavoritesController {

constructor(private readonly svc: FavoritesService) {}

\@Post()

\@Throttle(5, 60) // max 5 calls per minute per user/IP

create(/\* \... \*/) {

return this.svc.create(/\* \... \*/);

}

// \...

}

## **STEP 7 -- TEST CACHING & RATE LIMITING**

1.  Start Redis and the service.

2.  Call POST /favorites twice with the same payload---check logs to
    confirm only one embed run.

3.  Exceed 20 requests in 60 seconds: you should see HTTP 429 responses.

Your favorites-service now uses Redis caching and enforces rate limits
on all endpoints.
