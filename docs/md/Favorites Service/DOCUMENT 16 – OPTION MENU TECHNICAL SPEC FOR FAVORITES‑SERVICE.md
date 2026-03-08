# **DOCUMENT 16 -- OPTION MENU TECHNICAL SPEC FOR FAVORITES‑SERVICE**

This document provides the **backend API definitions** and code snippets
necessary to support the option‑menu actions on your Favorites UI. It
covers **group‑level** (rename, delete) and **item‑level** (move,
remove) operations.

## **1. API ENDPOINTS**

### **1.1 Group‑Level**

+--------------+--------------+------------------------------+------------+----------------+
| > **Action** | > **Method** | > **Path**                   | > **Body** | > **Response** |
+--------------+--------------+------------------------------+------------+----------------+
| > Rename     | > PATCH      | > /favorites/groups/:groupId | > { name:  | > 200 OK +     |
| > Group      |              |                              | > string } | > updated      |
|              |              |                              |            | > group object |
+--------------+--------------+------------------------------+------------+----------------+
| > Delete     | > DELETE     | > /favorites/groups/:groupId | > *none*   | > 204 No       |
| > Group      |              |                              |            | > Content      |
+==============+==============+==============================+============+================+

### **1.2 Item‑Level**

+--------------+--------------+--------------------------+------------+----------------+
| > **Action** | > **Method** | > **Path**               | > **Body** | > **Response** |
+--------------+--------------+--------------------------+------------+----------------+
| > Move to    | > PATCH      | > /favorites/:favoriteId | > {        | > 200 OK +     |
| > Another    |              |                          | > groupId: | > updated      |
| > Group      |              |                          | > string } | > favorite     |
+--------------+--------------+--------------------------+------------+----------------+
| > Remove     | > DELETE     | > /favorites/:favoriteId | > *none*   | > 204 No       |
| > from       |              |                          |            | > Content      |
| > Favorites  |              |                          |            |                |
+==============+==============+==========================+============+================+

## **2. DTO DEFINITIONS**

### **2.1 RenameGroupDto**

****// src/dtos/rename-group.dto.ts

import { IsNotEmpty, IsString } from \'class-validator\';

export class RenameGroupDto {

\@IsNotEmpty()

\@IsString()

name: string;

}

### **2.2 (Reused) UpdateFavoriteDto**

****// src/dtos/update-favorite.dto.ts

import { IsUUID } from \'class-validator\';

export class UpdateFavoriteDto {

\@IsUUID()

groupId: string;

}

> 

## **3. CONTROLLERS**

### **3.1 Groups Controller**

****// src/controllers/groups.controller.ts

import {

Controller,

Patch,

Delete,

Param,

Body,

HttpCode,

UseGuards,

} from \'@nestjs/common\';

import { Auth } from \'../decorators/auth.decorator\';

import { FavoritesService } from \'../services/favorites.service\';

import { RenameGroupDto } from \'../dtos/rename-group.dto\';

\@Controller(\'favorites/groups\')

\@UseGuards(Auth)

export class GroupsController {

constructor(private readonly favService: FavoritesService) {}

\@Patch(\':groupId\')

rename(

\@Param(\'groupId\') groupId: string,

\@Body() dto: RenameGroupDto,

) {

return this.favService.renameGroup(groupId, dto.name);

}

\@Delete(\':groupId\')

\@HttpCode(204)

delete(@Param(\'groupId\') groupId: string) {

return this.favService.deleteGroup(groupId);

}

}

### **3.2 Favorites (Items) Controller**

*Existing controller already handles move and remove; snippets for
clarity:*

**// src/controllers/favorites.controller.ts

import {

Controller,

Patch,

Delete,

Param,

Body,

HttpCode,

UseGuards,

} from \'@nestjs/common\';

import { Auth } from \'../decorators/auth.decorator\';

import { FavoritesService } from \'../services/favorites.service\';

import { UpdateFavoriteDto } from \'../dtos/update-favorite.dto\';

\@Controller(\'favorites\')

\@UseGuards(Auth)

export class FavoritesController {

constructor(private readonly favService: FavoritesService) {}

\@Patch(\':favoriteId\')

move(

\@Param(\'favoriteId\') favoriteId: string,

\@Body() dto: UpdateFavoriteDto,

) {

return this.favService.moveFavorite(favoriteId, dto.groupId);

}

\@Delete(\':favoriteId\')

\@HttpCode(204)

remove(@Param(\'favoriteId\') favoriteId: string) {

return this.favService.removeFavorite(favoriteId);

}

}

> 

## **4. SERVICE METHODS**

*Add these to your existing FavoritesService in
src/services/favorites.service.ts.*

### **4.1 Rename Group**

****async renameGroup(groupId: string, newName: string):
Promise\<FavoriteGroup\> {

const group = await this.groupRepo.findOne({ where: { id: groupId,
userId: this.currentUserId() } });

if (!group) throw new NotFoundException(\'Group not found\');

group.name = newName;

return this.groupRepo.save(group);

}

### **4.2 Delete Group**

****async deleteGroup(groupId: string): Promise\<void\> {

const group = await this.groupRepo.findOne({ where: { id: groupId,
userId: this.currentUserId() } });

if (!group) throw new NotFoundException(\'Group not found\');

await this.groupRepo.remove(group);

}

### **4.3 Move Favorite (alias to update)**

****async moveFavorite(favoriteId: string, newGroupId: string):
Promise\<Favorite\> {

// reuse existing update logic

return this.updateFavoriteGroup(favoriteId, newGroupId);

}

### **4.4 Remove Favorite**

****async removeFavorite(favoriteId: string): Promise\<void\> {

// reuse existing delete logic

return this.remove(favoriteId);

}

> 

## **5. MODULE REGISTRATION**

*Edit src/app.module.ts to include the new controller:*

**import { GroupsController } from \'./controllers/groups.controller\';

\@Module({

imports: \[

// \...existing imports\...

\],

controllers: \[

FavoritesController,

GroupsController,

// \...other controllers\...

\],

providers: \[

FavoritesService,

// \...other providers\...

\],

})

export class AppModule {}

> 

## **6. CORS & Security**

- All endpoints protected by JWT via \@Auth() guard.

- Ensure CORS on your API allows the front‑end origin.

## **7. EXAMPLE cURL COMMANDS**

****\# Rename group

curl -X PATCH http://localhost:4003/favorites/groups/\<groupId\> \\

-H \"Authorization: Bearer \<token\>\" \\

-H \"Content-Type: application/json\" \\

-d \'{\"name\":\"New Group Name\"}\'

\# Delete group

curl -X DELETE http://localhost:4003/favorites/groups/\<groupId\> \\

-H \"Authorization: Bearer \<token\>\"

\# Move favorite

curl -X PATCH http://localhost:4003/favorites/\<favId\> \\

-H \"Authorization: Bearer \<token\>\" \\

-H \"Content-Type: application/json\" \\

-d \'{\"groupId\":\"\<newGroupId\>\"}\'

\# Remove favorite

curl -X DELETE http://localhost:4003/favorites/\<favId\> \\

-H \"Authorization: Bearer \<token\>\"

> 
