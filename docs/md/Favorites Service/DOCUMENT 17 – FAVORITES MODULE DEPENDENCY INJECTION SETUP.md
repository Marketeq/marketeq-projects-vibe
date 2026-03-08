# **DOCUMENT 17 -- FAVORITES MODULE DEPENDENCY INJECTION SETUP**

## **PURPOSE**

Resolve the runtime DI error in FavoritesService
( ?, FavoriteRepository ) by ensuring every constructor parameter in
FavoritesService is backed by a provider. This doc shows the complete
FavoritesModule and the exact injection setup your service needs.

## **1. FavoritesService Constructor**

Your service should only ask Nest for tokens you've registered:

// src/services/favorites.service.ts

import { Injectable, Inject, CACHE_MANAGER } from \'@nestjs/common\';

import { Cache } from \'cache-manager\';

import { InjectRepository } from \'@nestjs/typeorm\';

import { Repository } from \'typeorm\';

import { Favorite } from \'../entities/favorite.entity\';

\@Injectable()

export class FavoritesService {

constructor(

\@Inject(CACHE_MANAGER)

private readonly cacheManager: Cache,

\@InjectRepository(Favorite)

private readonly favoriteRepository: Repository\<Favorite\>,

) {}

// ...methods...

}

- **Param 0** uses the CACHE_MANAGER token.

- **Param 1** uses the InjectRepository(Favorite) token.

If you have additional constructor parameters (e.g. ConfigService, other
repos), each must be decorated or implicit (i.e. private readonly foo:
FooService for a provider FooService).

## **2. FavoritesModule Definition**

Create or update src/favorites/favorites.module.ts as follows:

import { Module } from \'@nestjs/common\';

import { CacheModule } from \'@nestjs/cache-manager\';

import { TypeOrmModule } from \'@nestjs/typeorm\';

import { FavoritesController } from
\'../controllers/favorites.controller\';

import { GroupsController } from \'../controllers/groups.controller\';

import { FavoritesService } from \'../services/favorites.service\';

import { Favorite } from \'../entities/favorite.entity\';

import { FavoriteGroup } from \'../entities/favorite-group.entity\';

\@Module({

imports: \[

// 1) CacheModule must be imported (or be global)

// If you have a global CacheModule.registerAsync in AppModule, you can
omit this import.

CacheModule.register(),

// 2) Register both repositories your service needs

TypeOrmModule.forFeature(\[Favorite, FavoriteGroup\]),

\],

controllers: \[

FavoritesController,

GroupsController,

\],

providers: \[

FavoritesService,

\],

exports: \[

FavoritesService,

\],

})

export class FavoritesModule {}

### **Notes**

- If you did CacheModule.registerAsync({ isGlobal: true, ... }) in your
  **AppModule**, you can **skip** CacheModule.register() here. If not,
  you **must** import CacheModule in **every** module that injects
  CACHE_MANAGER.

- Always list **every** entity repository you inject via
  \@InjectRepository(\...) in the forFeature() call.

## **3. AppModule Wiring**

Ensure your root AppModule (or service entry module) imports
FavoritesModule:

// src/app.module.ts

import { Module } from \'@nestjs/common\';

import { TypeOrmModule } from \'@nestjs/typeorm\';

import { ConfigModule } from \'@nestjs/config\';

import { CacheModule } from \'@nestjs/cache-manager\';

import { FavoritesModule } from \'./favorites/favorites.module\';

// ...other imports...

\@Module({

imports: \[

ConfigModule.forRoot({ isGlobal: true }),

// If you prefer global cache from the root:

CacheModule.registerAsync({

isGlobal: true,

// ...redis or in‑memory config...

}),

TypeOrmModule.forRoot({ /\* your DB config \*/ }),

FavoritesModule,

// ...other feature modules...

\],

})

export class AppModule {}



## **4. Verify & Rebuild**

1.  **Rebuild** from your monorepo root:

npx nx run favorites-service:build

2.  **Start** the service:

npx nx run favorites-service:serve

3.  The error Nest can\'t resolve dependencies of the FavoritesService
    (?, FavoriteRepository) should no longer appear.

By matching the **constructor tokens** (CACHE_MANAGER/InjectRepository)
with **module imports** (CacheModule/TypeOrmModule.forFeature), NestJS
can now satisfy every dependency of FavoritesService.
