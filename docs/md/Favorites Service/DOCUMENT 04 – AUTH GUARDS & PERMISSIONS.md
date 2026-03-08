# **DOCUMENT 04 -- AUTH GUARDS & PERMISSIONS**

PURPOSE\
Secure all endpoints in favorites-service with industry-standard JWT
authentication (Passport-JWT) and add a simple service-to-service token
guard. You'll set up an AuthModule, Passport strategy, custom \@Auth()
decorator, and register guards globally.

PREREQUISITES\
• Documents 01--03 complete\
• nestjs/passport, nestjs/jwt, and passport-jwt installed

DEPENDENCIES\
From apps/favorites-service run:

npm install \@nestjs/passport \@nestjs/jwt passport-jwt

## **DIRECTORY STRUCTURE**

****apps/favorites-service/

└─ src/

├─ auth/

│ ├─ auth.module.ts

│ ├─ jwt.strategy.ts

│ └─ jwt-auth.guard.ts

├─ guards/

│ └─ service-auth.guard.ts

├─ decorators/

│ ├─ user.decorator.ts (existing)

│ └─ auth.decorator.ts

├─ main.ts

└─ app.module.ts

STEP 1 -- Create AuthModule\
File: src/auth/auth.module.ts

import { Module } from \'@nestjs/common\';

import { JwtModule } from \'@nestjs/jwt\';

import { PassportModule } from \'@nestjs/passport\';

import { ConfigModule, ConfigService } from \'@nestjs/config\';

import { JwtStrategy } from \'./jwt.strategy\';

\@Module({

imports: \[

PassportModule.register({ defaultStrategy: \'jwt\' }),

JwtModule.registerAsync({

imports: \[ConfigModule\],

useFactory: (cs: ConfigService) =\> ({

secret: cs.get\<string\>(\'JWT_SECRET\'),

signOptions: { expiresIn: \'1h\' },

}),

inject: \[ConfigService\],

}),

\],

providers: \[JwtStrategy\],

exports: \[PassportModule, JwtModule\],

})

export class AuthModule {}

STEP 2 -- Implement JwtStrategy\
File: src/auth/jwt.strategy.ts

import { Injectable } from \'@nestjs/common\';

import { PassportStrategy } from \'@nestjs/passport\';

import { ExtractJwt, Strategy } from \'passport-jwt\';

import { ConfigService } from \'@nestjs/config\';

\@Injectable()

export class JwtStrategy extends PassportStrategy(Strategy) {

constructor(cs: ConfigService) {

super({

jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),

ignoreExpiration: false,

secretOrKey: cs.get\<string\>(\'JWT_SECRET\'),

});

}

async validate(payload: any) {

// payload should contain user ID and any claims

return { userId: payload.sub \|\| payload.id, \...payload };

}

}

STEP 3 -- Create JwtAuthGuard\
File: src/auth/jwt-auth.guard.ts

import { Injectable } from \'@nestjs/common\';

import { AuthGuard } from \'@nestjs/passport\';

\@Injectable()

export class JwtAuthGuard extends AuthGuard(\'jwt\') {}

STEP 4 -- Create \@Auth() Decorator\
File: src/decorators/auth.decorator.ts

import { applyDecorators, UseGuards } from \'@nestjs/common\';

import { JwtAuthGuard } from \'../auth/jwt-auth.guard\';

export function Auth() {

return applyDecorators(UseGuards(JwtAuthGuard));

}

STEP 5 -- Service-to-Service Guard\
File: src/guards/service-auth.guard.ts

import {

CanActivate,

ExecutionContext,

Injectable,

UnauthorizedException,

} from \'@nestjs/common\';

import { Request } from \'express\';

\@Injectable()

export class ServiceAuthGuard implements CanActivate {

canActivate(context: ExecutionContext): boolean {

const req: Request = context.switchToHttp().getRequest();

const token = req.headers\[\'x-service-token\'\] as string;

if (!token \|\| token !== process.env.SERVICE_TOKEN) {

throw new UnauthorizedException(\'Invalid service token\');

}

return true;

}

}

Add SERVICE_TOKEN=\<your_service_token\> to .env.

STEP 6 -- Register AuthModule and Global Guard\
Edit src/app.module.ts to import AuthModule and add global guard:

import { Module } from \'@nestjs/common\';

import { ConfigModule } from \'@nestjs/config\';

import { TypeOrmModule } from \'@nestjs/typeorm\';

import { AuthModule } from \'./auth/auth.module\';

import { APP_GUARD } from \'@nestjs/core\';

import { JwtAuthGuard } from \'./auth/jwt-auth.guard\';

import { FavoritesController } from
\'./controllers/favorites.controller\';

import { AiModule } from \'./ai/ai.module\';

import { GroupsModule } from \'./groups/groups.module\';

\@Module({

imports: \[

ConfigModule.forRoot({ isGlobal: true }),

TypeOrmModule.forRoot({ /\* existing config \*/ }),

AuthModule,

AiModule,

GroupsModule,

\],

controllers: \[FavoritesController\],

providers: \[

{ provide: APP_GUARD, useClass: JwtAuthGuard }, // protect all routes

\],

})

export class AppModule {}

STEP 7 -- Apply Service Auth Where Needed\
In any controller needing service-level access (e.g. webhook handlers),
add:

import { ServiceAuthGuard } from \'../guards/service-auth.guard\';

import { UseGuards, Controller, Post } from \'@nestjs/common\';

\@Controller(\'internal\')

\@UseGuards(ServiceAuthGuard)

export class InternalController {

\@Post(\'sync\')

syncData() { /\* ... \*/ }

}

STEP 8 -- Update Controllers to Use \@Auth()\
Replace \@UseGuards(JwtAuthGuard) on FavoritesController with \@Auth():

import { Controller, Post, Get, Patch, Delete, Body, Param } from
\'@nestjs/common\';

import { Auth } from \'../decorators/auth.decorator\';

\@Controller(\'favorites\')

\@Auth()

export class FavoritesController { /\* ... \*/ }

STEP 9 -- Verify Authentication

1.  Start the service:

npm run start:dev

2.  \
    Test unauthorized access:

curl http://localhost:4003/favorites

→ 401 Unauthorized

3.  \
    Test valid token:

curl -H \"Authorization: Bearer \<valid_jwt\>\"
http://localhost:4003/favorites

→ 200 OK (empty array)

AUTH GUARDS & PERMISSIONS IMPLEMENTED\
All routes now require a valid JWT. You have a reusable \@Auth()
decorator and a separate guard for service-to-service calls.
