# **Document 03.1: Favorites Service -- Core Enhancements**

This document adds industry-standard improvements to the existing code
you built in Documents 01--03. You'll implement:

- Global validation and error handling

- Structured logging

- Compound index on favorites

- Module separation for AI and group logic

## **✅ Step 1 -- Global Validation & Exception Handling**

Edit **src/main.ts** to register Nest's ValidationPipe and a global
exception filter.

import { NestFactory, HttpAdapterHost } from \'@nestjs/core\';

import { AppModule } from \'./app.module\';

import { ValidationPipe, Logger } from \'@nestjs/common\';

import { AllExceptionsFilter } from \'./utils/all-exceptions.filter\';

import \'dotenv/config\';

async function bootstrap() {

const app = await NestFactory.create(AppModule);

const logger = new Logger(\'Main\');

// Global DTO validation

app.useGlobalPipes(

new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true })

);

// Global exception filter

const { httpAdapter } = app.get(HttpAdapterHost);

app.useGlobalFilters(new AllExceptionsFilter(httpAdapter));

const port = process.env.PORT \|\| 4003;

await app.listen(port);

logger.log(\`favorites-service listening on port \${port}\`);

}

bootstrap();

Create **src/utils/all-exceptions.filter.ts**:

import {

ExceptionFilter,

Catch,

ArgumentsHost,

HttpException,

HttpStatus,

} from \'@nestjs/common\';

import { HttpAdapterHost } from \'@nestjs/core\';

\@Catch()

export class AllExceptionsFilter implements ExceptionFilter {

constructor(private readonly httpAdapterHost: HttpAdapterHost) {}

catch(exception: unknown, host: ArgumentsHost): void {

const { httpAdapter } = this.httpAdapterHost;

const ctx = host.switchToHttp();

const response = ctx.getResponse();

const request = ctx.getRequest();

const status =

exception instanceof HttpException

? exception.getStatus()

: HttpStatus.INTERNAL_SERVER_ERROR;

const message =

exception instanceof HttpException

? exception.getResponse()

: \'Internal server error\';

const body = {

statusCode: status,

timestamp: new Date().toISOString(),

path: request.url,

error: message,

};

httpAdapter.reply(response, body, status);

}

}



## **✅ Step 2 -- Structured Logging**

1.  Install Nest's Logger with Winston (optional but recommended):

npm install \--save \@nestjs/winston winston

2.  \
    Edit **src/main.ts** to replace default logger:

import { NestFactory } from \'@nestjs/core\';

import { AppModule } from \'./app.module\';

import { WinstonModule } from \'nest-winston\';

import \* as winston from \'winston\';

import \'dotenv/config\';

async function bootstrap() {

const logger = WinstonModule.createLogger({

transports: \[

new winston.transports.Console({

format: winston.format.combine(

winston.format.timestamp(),

winston.format.json(),

),

}),

\],

});

const app = await NestFactory.create(AppModule, { logger });

// ...global pipes & filters...

const port = process.env.PORT \|\| 4003;

await app.listen(port);

logger.log(\'info\', \`favorites-service listening on port \${port}\`);

}

bootstrap();

3.  \
    In **services** (e.g. favorites.service.ts), inject Nest's Logger:

import { Injectable, Logger } from \'@nestjs/common\';

// ...

\@Injectable()

export class FavoritesService {

private readonly logger = new Logger(FavoritesService.name);

// in methods:

this.logger.debug(\`Creating favorite for user \${userId}\`);

// ...

}



## **✅ Step 3 -- Compound Index on Favorites**

Add a compound index for (userId, type) to speed up queries by user and
type.

Edit **src/entities/favorite.entity.ts**:

import { Entity, PrimaryGeneratedColumn, Column, ManyToOne,
CreateDateColumn, Index } from \'typeorm\';

import { FavoriteGroup } from \'./favorite-group.entity\';

import { FavoriteType } from \'./favorite.entity\';

\@Index(\[\'userId\', \'type\'\])

\@Entity({ name: \'favorites\' })

export class Favorite {

\@PrimaryGeneratedColumn(\'uuid\')

id: string;

\@Index()

\@Column(\'uuid\')

userId: string;

\@Index()

\@Column(\'uuid\')

groupId: string;

\@ManyToOne(() =\> FavoriteGroup, (group) =\> group.favorites, {
onDelete: \'CASCADE\' })

group: FavoriteGroup;

\@Column({ type: \'enum\', enum: FavoriteType })

type: FavoriteType;

\@Column({ length: 100 })

itemId: string;

\@CreateDateColumn()

createdAt: Date;

}

Generate and run a quick migration to add the index:

npm run migration:generate \-- -n AddUserTypeIndex

npm run migration:run



## **✅ Step 4 -- Module Separation**

Split AI logic and group-specific logic into separate modules.

1.  Create **src/ai/ai.module.ts**:

import { Module } from \'@nestjs/common\';

import { TypeOrmModule } from \'@nestjs/typeorm\';

import { FavoriteGroup } from \'../entities/favorite-group.entity\';

import { AiService } from \'./ai.service\';

\@Module({

imports: \[TypeOrmModule.forFeature(\[FavoriteGroup\])\],

providers: \[AiService\],

exports: \[AiService\],

})

export class AiModule {}

2.  \
    Move **src/services/ai.service.ts** into src/ai/.

3.  Create **src/groups/groups.module.ts**:

import { Module } from \'@nestjs/common\';

import { TypeOrmModule } from \'@nestjs/typeorm\';

import { FavoriteGroup } from \'../entities/favorite-group.entity\';

import { Favorite } from \'../entities/favorite.entity\';

import { FavoritesService } from \'../services/favorites.service\';

\@Module({

imports: \[TypeOrmModule.forFeature(\[FavoriteGroup, Favorite\])\],

providers: \[FavoritesService\],

exports: \[FavoritesService\],

})

export class GroupsModule {}

4.  \
    Move **favorites.service.ts** into src/groups/, adjust imports.

5.  Update **src/app.module.ts**:

import { Module } from \'@nestjs/common\';

import { ConfigModule } from \'@nestjs/config\';

import { TypeOrmModule } from \'@nestjs/typeorm\';

import { AiModule } from \'./ai/ai.module\';

import { GroupsModule } from \'./groups/groups.module\';

import { FavoritesController } from
\'./controllers/favorites.controller\';

\@Module({

imports: \[

ConfigModule.forRoot({ isGlobal: true }),

TypeOrmModule.forRoot({ /\* existing config \*/ }),

AiModule,

GroupsModule,

\],

controllers: \[FavoritesController\],

})

export class AppModule {}



Your existing Documents 01--03 remain unchanged. This new Document 03.1
upgrades your service with:

- Global validation & error filtering

- Structured, JSON-based logging

- A performance-boosting compound index

- Clear separation of AI and group logic into modules
