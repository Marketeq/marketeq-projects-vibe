# **DOCUMENT 03 -- FAVORITES API ENDPOINTS & BUSINESS LOGIC**

PURPOSE\
Implement the core CRUD endpoints for favorites, and wire up business
logic. You'll create DTOs, a JWT guard, a user decorator, service
methods, controller routes---all with full code and precise placement.

PREREQUISITES\
• Document 01 & Document 02 complete\
• Entities in src/entities/ exist\
• \@nestjs/typeorm, typeorm, pg installed

## **DIRECTORY STRUCTURE**

****apps/favorites-service/

└─ src/

├─ controllers/

│ └─ favorites.controller.ts

├─ services/

│ ├─ favorites.service.ts

│ └─ ai.service.ts

├─ dtos/

│ ├─ create-favorite.dto.ts

│ └─ update-favorite.dto.ts

├─ guards/

│ └─ jwt-auth.guard.ts

├─ decorators/

│ └─ user.decorator.ts

├─ entities/

│ ├─ favorite-group.entity.ts

│ └─ favorite.entity.ts

└─ app.module.ts

STEP 1 -- Create DTOs\
File: src/dtos/create-favorite.dto.ts

import { IsEnum, IsNotEmpty, IsOptional, IsUUID } from
\'class-validator\';

import { FavoriteType } from \'../entities/favorite.entity\';

export class CreateFavoriteDto {

\@IsEnum(FavoriteType)

type: FavoriteType;

\@IsNotEmpty()

itemId: string;

\@IsUUID()

\@IsOptional()

groupId?: string;

}

File: src/dtos/update-favorite.dto.ts

import { IsUUID } from \'class-validator\';

export class UpdateFavoriteDto {

\@IsUUID()

groupId: string;

}

STEP 2 -- JWT Auth Guard\
File: src/guards/jwt-auth.guard.ts

import { CanActivate, ExecutionContext, Injectable,
UnauthorizedException } from \'@nestjs/common\';

import \* as jwt from \'jsonwebtoken\';

\@Injectable()

export class JwtAuthGuard implements CanActivate {

canActivate(context: ExecutionContext): boolean {

const req = context.switchToHttp().getRequest();

const authHeader = req.headers.authorization;

if (!authHeader \|\| !authHeader.startsWith(\'Bearer \')) {

throw new UnauthorizedException(\'Missing auth token\');

}

const token = authHeader.split(\' \')\[1\];

try {

const payload = jwt.verify(token, process.env.JWT_SECRET);

req.user = payload;

return true;

} catch {

throw new UnauthorizedException(\'Invalid or expired token\');

}

}

}

STEP 3 -- User Decorator\
File: src/decorators/user.decorator.ts

import { createParamDecorator, ExecutionContext } from
\'@nestjs/common\';

export const User = createParamDecorator(

(data: unknown, ctx: ExecutionContext) =\> {

const req = ctx.switchToHttp().getRequest();

return req.user; // decoded JWT payload

},

);

STEP 4 -- AI Service Stub\
File: src/services/ai.service.ts

import { Injectable, NotImplementedException } from \'@nestjs/common\';

import { FavoriteGroup } from \'../entities/favorite-group.entity\';

import { FavoriteType } from \'../entities/favorite.entity\';

\@Injectable()

export class AiService {

async assignGroup(

userId: string,

type: FavoriteType,

itemId: string,

): Promise\<FavoriteGroup\> {

// Placeholder: AI logic to select or create group goes here.

// Will be implemented in Document 05.

throw new NotImplementedException(\'AI group assignment not
implemented\');

}

}

STEP 5 -- Favorites Service\
File: src/services/favorites.service.ts

import { Injectable, BadRequestException } from \'@nestjs/common\';

import { InjectRepository } from \'@nestjs/typeorm\';

import { Repository } from \'typeorm\';

import { Favorite, FavoriteType } from \'../entities/favorite.entity\';

import { FavoriteGroup } from \'../entities/favorite-group.entity\';

import { CreateFavoriteDto } from \'../dtos/create-favorite.dto\';

import { UpdateFavoriteDto } from \'../dtos/update-favorite.dto\';

import { AiService } from \'./ai.service\';

\@Injectable()

export class FavoritesService {

constructor(

\@InjectRepository(Favorite)

private favRepo: Repository\<Favorite\>,

\@InjectRepository(FavoriteGroup)

private groupRepo: Repository\<FavoriteGroup\>,

private aiService: AiService,

) {}

async create(createDto: CreateFavoriteDto, user: any):
Promise\<Favorite\> {

const userId = user.sub \|\| user.id;

let groupId = createDto.groupId;

if (!groupId) {

const group = await this.aiService.assignGroup(userId, createDto.type,
createDto.itemId);

groupId = group.id;

} else {

const groupExists = await this.groupRepo.findOne({ where: { id: groupId,
userId } });

if (!groupExists) throw new BadRequestException(\'Invalid groupId\');

}

const favorite = this.favRepo.create({

userId,

groupId,

type: createDto.type,

itemId: createDto.itemId,

});

return this.favRepo.save(favorite);

}

async findAll(user: any): Promise\<FavoriteGroup\[\]\> {

const userId = user.sub \|\| user.id;

return this.groupRepo.find({

where: { userId },

relations: \[\'favorites\'\],

order: { createdAt: \'ASC\' },

});

}

async update(id: string, dto: UpdateFavoriteDto, user: any):
Promise\<Favorite\> {

const userId = user.sub \|\| user.id;

const fav = await this.favRepo.findOne({ where: { id, userId } });

if (!fav) throw new BadRequestException(\'Favorite not found\');

const newGroup = await this.groupRepo.findOne({ where: { id:
dto.groupId, userId } });

if (!newGroup) throw new BadRequestException(\'Invalid groupId\');

fav.groupId = dto.groupId;

return this.favRepo.save(fav);

}

async remove(id: string, user: any): Promise\<void\> {

const userId = user.sub \|\| user.id;

const fav = await this.favRepo.findOne({ where: { id, userId } });

if (!fav) throw new BadRequestException(\'Favorite not found\');

await this.favRepo.remove(fav);

}

}

STEP 6 -- Favorites Controller\
File: src/controllers/favorites.controller.ts

import {

Controller,

Post,

Get,

Patch,

Delete,

Body,

Param,

UseGuards,

} from \'@nestjs/common\';

import { FavoritesService } from \'../services/favorites.service\';

import { CreateFavoriteDto } from \'../dtos/create-favorite.dto\';

import { UpdateFavoriteDto } from \'../dtos/update-favorite.dto\';

import { JwtAuthGuard } from \'../guards/jwt-auth.guard\';

import { User } from \'../decorators/user.decorator\';

\@Controller(\'favorites\')

\@UseGuards(JwtAuthGuard)

export class FavoritesController {

constructor(private favService: FavoritesService) {}

\@Post()

create(@Body() dto: CreateFavoriteDto, \@User() user) {

return this.favService.create(dto, user);

}

\@Get()

findAll(@User() user) {

return this.favService.findAll(user);

}

\@Patch(\':id\')

update(

\@Param(\'id\') id: string,

\@Body() dto: UpdateFavoriteDto,

\@User() user,

) {

return this.favService.update(id, dto, user);

}

\@Delete(\':id\')

remove(@Param(\'id\') id: string, \@User() user) {

return this.favService.remove(id, user);

}

}

STEP 7 -- Register in AppModule\
File: src/app.module.ts (append imports & providers)

import { Module } from \'@nestjs/common\';

import { TypeOrmModule } from \'@nestjs/typeorm\';

import { ConfigModule } from \'@nestjs/config\';

import { Favorite } from \'./entities/favorite.entity\';

import { FavoriteGroup } from \'./entities/favorite-group.entity\';

import { FavoritesService } from \'./services/favorites.service\';

import { AiService } from \'./services/ai.service\';

import { FavoritesController } from
\'./controllers/favorites.controller\';

\@Module({

imports: \[

ConfigModule.forRoot({ isGlobal: true }),

TypeOrmModule.forFeature(\[Favorite, FavoriteGroup\]),

\],

controllers: \[FavoritesController\],

providers: \[FavoritesService, AiService\],

})

export class AppModule {}

STEP 8 -- Test Endpoints (cURL Examples)\
Create favorite (AI group assignment):

curl -X POST http://localhost:4003/favorites \\

-H \"Authorization: Bearer \<token\>\" \\

-H \"Content-Type: application/json\" \\

-d \'{\"type\":\"project\",\"itemId\":\"12345\"}\'

Fetch all groups & favorites:

curl http://localhost:4003/favorites \\

-H \"Authorization: Bearer \<token\>\"

Move favorite to another group:

curl -X PATCH http://localhost:4003/favorites/\<favId\> \\

-H \"Authorization: Bearer \<token\>\" \\

-H \"Content-Type: application/json\" \\

-d \'{\"groupId\":\"\<newGroupId\>\"}\'

Remove favorite:

curl -X DELETE http://localhost:4003/favorites/\<favId\> \\

-H \"Authorization: Bearer \<token\>\"

SERVICE API SHELL READY
