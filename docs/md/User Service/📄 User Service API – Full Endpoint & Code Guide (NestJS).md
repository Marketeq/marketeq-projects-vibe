# **📄 User Service API -- Full Endpoint & Code Guide (NestJS)**

This document includes all the code needed to expose the full user
profile via a dedicated microservice in a monorepo NestJS architecture.
It **excludes endpoints** from other services like Reviews and Listings,
but **provides reference code** on how to pull that data.

## **✅ Folder Structure**

****/apps/user-service

/src

/controllers

user.controller.ts

/dtos

create-user.dto.ts

update-user.dto.ts

/services

user.service.ts

/entities

user.entity.ts



## **✅ API Endpoints (User Profile Only)**

  ---------------------------------------------
  **Method**   **Endpoint**   **Description**
  ------------ -------------- -----------------
  POST         /users         Create user
                              profile

  GET          /users/:id     Get user profile
                              by ID

  PUT          /users/:id     Update user
                              profile

  DELETE       /users/:id     Delete user
                              profile
  ---------------------------------------------

## **✅ DTOs**

**create-user.dto.ts**

****export class CreateUserDto {

username: string;

email: string;

bio?: string;

location?: string;

timezone?: string;

availability?: string;

rate_min?: number;

rate_max?: number;

client_success_rating?: number;

repeat_hire_rate?: number;

response_time?: string;

}

**update-user.dto.ts**

****import { PartialType } from \'@nestjs/mapped-types\';

import { CreateUserDto } from \'./create-user.dto\';

export class UpdateUserDto extends PartialType(CreateUserDto) {}



## **✅ Controller**

**user.controller.ts**

****import { Controller, Get, Post, Body, Param, Put, Delete } from
\'@nestjs/common\';

import { UserService } from \'../services/user.service\';

import { CreateUserDto } from \'../dtos/create-user.dto\';

import { UpdateUserDto } from \'../dtos/update-user.dto\';

\@Controller(\'users\')

export class UserController {

constructor(private readonly userService: UserService) {}

\@Post()

create(@Body() dto: CreateUserDto) {

return this.userService.create(dto);

}

\@Get(\':id\')

findOne(@Param(\'id\') id: string) {

return this.userService.findOne(id);

}

\@Put(\':id\')

update(@Param(\'id\') id: string, \@Body() dto: UpdateUserDto) {

return this.userService.update(id, dto);

}

\@Delete(\':id\')

remove(@Param(\'id\') id: string) {

return this.userService.remove(id);

}

}



## **✅ Service**

**user.service.ts**

****import { Injectable } from \'@nestjs/common\';

import { CreateUserDto } from \'../dtos/create-user.dto\';

import { UpdateUserDto } from \'../dtos/update-user.dto\';

\@Injectable()

export class UserService {

private users = \[\];

create(dto: CreateUserDto) {

const newUser = { id: Date.now().toString(), \...dto };

this.users.push(newUser);

return newUser;

}

findOne(id: string) {

return this.users.find(user =\> user.id === id);

}

update(id: string, dto: UpdateUserDto) {

const user = this.findOne(id);

if (user) Object.assign(user, dto);

return user;

}

remove(id: string) {

const index = this.users.findIndex(user =\> user.id === id);

if (index !== -1) this.users.splice(index, 1);

return { deleted: true };

}

}



## **✅ Entity (Optional)**

**user.entity.ts**

****export class User {

id: string;

username: string;

email: string;

bio?: string;

location?: string;

timezone?: string;

availability?: string;

rate_min?: number;

rate_max?: number;

client_success_rating?: number;

repeat_hire_rate?: number;

response_time?: string;

}



## **🔁 Related Services**

You **do not** expose the following endpoints here, but reference them
with API calls:

### **🎯 Reviews by User (from review-service)**

****\@Get(\':id/reviews\')

getReviews(@Param(\'id\') id: string) {

return
this.httpService.get(\`http://review-service/reviews/user/\${id}\`).toPromise();

}

### **📋 Listings by User (from listing-service)**

****\@Get(\':id/listings\')

getListings(@Param(\'id\') id: string) {

return
this.httpService.get(\`http://listing-service/listings/user/\${id}\`).toPromise();

}



## **✅ Final Checklist**

- ✅ All user profile fields are covered.

- ✅ All endpoints are in a single user.controller.ts file.

- ✅ Includes full copy/paste-ready DTO, controller, and service code.

- ✅ Instructions are clear for other services (listings, reviews) and
  **not duplicated** here.
