**User Service Main Files:**

### **✅ User Service Quick Setup Summary (NestJS)**

**📁 Folder Structure:**

****user-service/

├── src/

│ ├── user/ \# Main user module

│ ├── education/ \# Education entries per user

│ ├── experience/ \# Work experience

│ ├── skills/ \# User skills

│ └── app.module.ts \# Root module

├── main.ts \# App bootstrap



### **🛠️ Step-by-Step Instructions**

1.  **Install dependencies** if not already installed:

npm install \@nestjs/common \@nestjs/core \@nestjs/platform-express
reflect-metadata rxjs

2.  **Implement all modules** using provided code:

    - user/ -- CRUD endpoints: create, get by ID, update, delete

    - education/, experience/, skills/ -- All support userId-based GET
      and POST

3.  **Wire modules** into app.module.ts

4.  **Start the service** locally:

npm run start:dev

5.  **Verify endpoints** via:

    - POST /users

    - GET /users/:id

    - GET /education/:userId

    - GET /experience/:userId

    - GET /skills/:userId

6.  **Frontend** should call http://localhost:3001 to consume this
    service.

### **⚠️ Notes**

- Reviews and listings must be fetched from **separate microservices**
  (review-service, listing-service).

- Make sure ports and CORS are correctly configured.

## **👤 user/**

#### **✅ user.controller.ts**

****import { Controller, Get, Post, Put, Delete, Body, Param } from
\'@nestjs/common\';

import { UserService } from \'../services/user.service\';

import { CreateUserDto } from \'../dtos/create-user.dto\';

import { UpdateUserDto } from \'../dtos/update-user.dto\';

\@Controller(\'users\')

export class UserController {

constructor(private readonly userService: UserService) {}

\@Post()

create(@Body() createUserDto: CreateUserDto) {

return this.userService.create(createUserDto);

}

\@Get(\':id\')

findOne(@Param(\'id\') id: string) {

return this.userService.findOne(+id);

}

\@Put(\':id\')

update(@Param(\'id\') id: string, \@Body() updateUserDto: UpdateUserDto)
{

return this.userService.update(+id, updateUserDto);

}

\@Delete(\':id\')

remove(@Param(\'id\') id: string) {

return this.userService.remove(+id);

}

}



#### **✅ user.service.ts**

****import { Injectable } from \'@nestjs/common\';

import { CreateUserDto } from \'../dtos/create-user.dto\';

import { UpdateUserDto } from \'../dtos/update-user.dto\';

import { User } from \'../entities/user.entity\';

\@Injectable()

export class UserService {

private users: User\[\] = \[\];

create(createUserDto: CreateUserDto): User {

const newUser = { id: Date.now(), \...createUserDto } as User;

this.users.push(newUser);

return newUser;

}

findOne(id: number): User {

return this.users.find(user =\> user.id === id);

}

update(id: number, updateUserDto: UpdateUserDto): User {

const index = this.users.findIndex(user =\> user.id === id);

this.users\[index\] = { \...this.users\[index\], \...updateUserDto };

return this.users\[index\];

}

remove(id: number): void {

this.users = this.users.filter(user =\> user.id !== id);

}

}



#### **✅ create-user.dto.ts**

****export class CreateUserDto {

readonly name: string;

readonly email: string;

readonly username: string;

readonly userType: \'client\' \| \'talent\';

readonly location: string;

readonly timeZone: string;

readonly availability: string;

readonly skills: string\[\];

}

#### **✅ update-user.dto.ts**

****export class UpdateUserDto {

readonly name?: string;

readonly email?: string;

readonly username?: string;

readonly userType?: \'client\' \| \'talent\';

readonly location?: string;

readonly timeZone?: string;

readonly availability?: string;

readonly skills?: string\[\];

}

#### **✅ profile-response.dto.ts**

****export class ProfileResponseDto {

readonly id: number;

readonly name: string;

readonly username: string;

readonly email: string;

readonly userType: \'client\' \| \'talent\';

readonly location: string;

readonly timeZone: string;

readonly availability: string;

readonly skills: string\[\];

readonly education: any\[\];

readonly experience: any\[\];

}



#### **✅ user.entity.ts**

****export class User {

id: number;

name: string;

email: string;

username: string;

userType: \'client\' \| \'talent\';

location: string;

timeZone: string;

availability: string;

skills: string\[\];

}



## **🎓 education/**

#### **✅ education.controller.ts**

****import { Controller, Get, Post, Body, Param } from
\'@nestjs/common\';

import { EducationService } from \'./education.service\';

import { CreateEducationDto } from \'./dtos/create-education.dto\';

\@Controller(\'education\')

export class EducationController {

constructor(private readonly educationService: EducationService) {}

\@Post()

create(@Body() createEducationDto: CreateEducationDto) {

return this.educationService.create(createEducationDto);

}

\@Get(\':userId\')

findByUser(@Param(\'userId\') userId: string) {

return this.educationService.findByUser(+userId);

}

}

#### **✅ education.service.ts**

****import { Injectable } from \'@nestjs/common\';

import { CreateEducationDto } from \'./dtos/create-education.dto\';

import { Education } from \'./entities/education.entity\';

\@Injectable()

export class EducationService {

private education: Education\[\] = \[\];

create(createEducationDto: CreateEducationDto): Education {

const record = { id: Date.now(), \...createEducationDto };

this.education.push(record);

return record;

}

findByUser(userId: number): Education\[\] {

return this.education.filter(e =\> e.userId === userId);

}

}

#### **✅ create-education.dto.ts**

****export class CreateEducationDto {

readonly userId: number;

readonly institution: string;

readonly degree: string;

readonly field: string;

readonly startDate: string;

readonly endDate?: string;

}

#### **✅ education.entity.ts**

****export class Education {

id: number;

userId: number;

institution: string;

degree: string;

field: string;

startDate: string;

endDate?: string;

}



## **💼 experience/**

#### **✅ experience.controller.ts**

****import { Controller, Get, Post, Body, Param } from
\'@nestjs/common\';

import { ExperienceService } from \'./experience.service\';

import { CreateExperienceDto } from \'./dtos/create-experience.dto\';

\@Controller(\'experience\')

export class ExperienceController {

constructor(private readonly experienceService: ExperienceService) {}

\@Post()

create(@Body() dto: CreateExperienceDto) {

return this.experienceService.create(dto);

}

\@Get(\':userId\')

findByUser(@Param(\'userId\') userId: string) {

return this.experienceService.findByUser(+userId);

}

}

#### **✅ experience.service.ts**

****import { Injectable } from \'@nestjs/common\';

import { CreateExperienceDto } from \'./dtos/create-experience.dto\';

import { Experience } from \'./entities/experience.entity\';

\@Injectable()

export class ExperienceService {

private experience: Experience\[\] = \[\];

create(dto: CreateExperienceDto): Experience {

const record = { id: Date.now(), \...dto };

this.experience.push(record);

return record;

}

findByUser(userId: number): Experience\[\] {

return this.experience.filter(e =\> e.userId === userId);

}

}

#### **✅ create-experience.dto.ts**

****export class CreateExperienceDto {

readonly userId: number;

readonly company: string;

readonly role: string;

readonly startDate: string;

readonly endDate?: string;

readonly description?: string;

}

#### **✅ experience.entity.ts**

****export class Experience {

id: number;

userId: number;

company: string;

role: string;

startDate: string;

endDate?: string;

description?: string;

}



## **🧠 skills/**

#### **✅ skills.controller.ts**

****import { Controller, Post, Get, Body, Param } from
\'@nestjs/common\';

import { SkillsService } from \'./skills.service\';

import { CreateSkillDto } from \'./dtos/create-skill.dto\';

\@Controller(\'skills\')

export class SkillsController {

constructor(private readonly skillsService: SkillsService) {}

\@Post()

create(@Body() dto: CreateSkillDto) {

return this.skillsService.create(dto);

}

\@Get(\':userId\')

findByUser(@Param(\'userId\') userId: string) {

return this.skillsService.findByUser(+userId);

}

}

#### **✅ skills.service.ts**

****import { Injectable } from \'@nestjs/common\';

import { CreateSkillDto } from \'./dtos/create-skill.dto\';

import { Skill } from \'./entities/skill.entity\';

\@Injectable()

export class SkillsService {

private skills: Skill\[\] = \[\];

create(dto: CreateSkillDto): Skill {

const record = { id: Date.now(), \...dto };

this.skills.push(record);

return record;

}

findByUser(userId: number): Skill\[\] {

return this.skills.filter(s =\> s.userId === userId);

}

}

#### **✅ create-skill.dto.ts**

****export class CreateSkillDto {

readonly userId: number;

readonly name: string;

readonly proficiency: string;

}

#### **✅ skill.entity.ts**

****export class Skill {

id: number;

userId: number;

name: string;

proficiency: string;

}



## **🧩 user.module.ts**

****import { Module } from \'@nestjs/common\';

import { UserController } from \'./controllers/user.controller\';

import { UserService } from \'./services/user.service\';

\@Module({

controllers: \[UserController\],

providers: \[UserService\],

})

export class UserModule {}



## **🧩 app.module.ts**

****import { Module } from \'@nestjs/common\';

import { UserModule } from \'./user/user.module\';

import { EducationModule } from \'./education/education.module\';

import { ExperienceModule } from \'./experience/experience.module\';

import { SkillsModule } from \'./skills/skills.module\';

\@Module({

imports: \[

UserModule,

EducationModule,

ExperienceModule,

SkillsModule,

\],

})

export class AppModule {}



## **🚀 main.ts**

****import { NestFactory } from \'@nestjs/core\';

import { AppModule } from \'./app.module\';

async function bootstrap() {

const app = await NestFactory.create(AppModule);

app.enableCors(); // Optional, useful for frontend integration

await app.listen(3001); // Adjust port as needed

}

bootstrap();


