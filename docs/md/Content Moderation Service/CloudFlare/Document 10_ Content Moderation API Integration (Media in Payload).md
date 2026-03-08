### **Document 10: Content Moderation API Integration (Media in Payload)**

#### **Overview**

This document describes how the **Listing Microservice** integrates with
the **Content Moderation Microservice** to validate **media URLs**
(hosted on Cloudflare R2). It covers:

1.  **API endpoints** in the Content Moderation service

2.  **Payload structure** including media URLs

3.  **Listing Microservice** call to /validate

4.  **Error handling** and **status responses\**

#### **1. Content Moderation API Endpoints**

- **POST /api/validate\**
  Validates text and media. Expects a JSON payload:

POST /api/validate

Content-Type: application/json

{

\"title\": string,

\"description\": string,

\"tags\": string\[\],

\"skills\": string\[\],

\"media\": string\[\] // Array of Cloudflare URLs (images/videos)

}

- **Response**:

{

\"status\": \"approved\" \| \"rejected\" \| \"pending\",

\"message\": string

}



#### **2. Payload Definition**

****// listing-service/src/project/dto/create-project.dto.ts

export class CreateProjectDto {

title: string;

description: string;

tags: string\[\];

skills: string\[\];

featuredImage: string; // Cloudflare URL from /media/upload

additionalImages: string\[\]; // Cloudflare URLs

videoUrl?: string; // Cloudflare URL

}

When sending to /api/validate, compile media array:

const mediaUrls = \[dto.featuredImage, \...dto.additionalImages\];

if (dto.videoUrl) mediaUrls.push(dto.videoUrl);



#### **3. Content Moderation Service Implementation**

****// content-moderation-service/src/app.module.ts

import { Module } from \'@nestjs/common\';

import { HttpModule } from \'@nestjs/axios\';

import { ValidateController } from \'./validate.controller\';

import { ValidateService } from \'./validate.service\';

\@Module({

imports: \[HttpModule\],

controllers: \[ValidateController\],

providers: \[ValidateService\],

})

export class AppModule {}



// content-moderation-service/src/validate.controller.ts

import { Controller, Post, Body } from \'@nestjs/common\';

import { ValidateService } from \'./validate.service\';

import { CreateProjectDto } from \'./dto/create-project.dto\';

\@Controller(\'api\')

export class ValidateController {

constructor(private readonly validateService: ValidateService) {}

\@Post(\'validate\')

async validate(@Body() dto: CreateProjectDto) {

return this.validateService.validateAll(dto);

}

}



// content-moderation-service/src/validate.service.ts

import { Injectable } from \'@nestjs/common\';

import { MediaModerationService } from
\'./media/media-moderation.service\';

import { TextValidationService } from
\'./text/text-validation.service\';

\@Injectable()

export class ValidateService {

constructor(

private readonly textSvc: TextValidationService,

private readonly mediaSvc: MediaModerationService,

) {}

async validateAll(dto: { title: string; description: string; tags:
string\[\]; skills: string\[\]; media: string\[\] }) {

// 1. Validate text

if (!this.textSvc.validateProjectContent(dto.title)) {

return { status: \'rejected\', message: \'Title failed text
moderation.\' };

}

if (!this.textSvc.validateProjectContent(dto.description)) {

return { status: \'rejected\', message: \'Description failed text
moderation.\' };

}

if (!this.textSvc.validateProjectContent(dto.tags.join(\' \'))) {

return { status: \'rejected\', message: \'Tags failed text moderation.\'
};

}

if (!this.textSvc.validateProjectContent(dto.skills.join(\' \'))) {

return { status: \'rejected\', message: \'Skills failed text
moderation.\' };

}

// 2. Validate media sequentially

for (const url of dto.media) {

const valid = await this.mediaSvc.validateMedia(url);

if (!valid) {

return { status: \'rejected\', message: \'Media contains explicit
content.\' };

}

}

// 3. All checks passed

return { status: \'approved\', message: \'Content is clean.\' };

}

}



#### **4. Listing Microservice Call**

****// listing-service/src/project/project.service.ts

import { Injectable, HttpException } from \'@nestjs/common\';

import { HttpService } from \'@nestjs/axios\';

import { firstValueFrom } from \'rxjs\';

import { CreateProjectDto } from \'./dto/create-project.dto\';

\@Injectable()

export class ProjectService {

constructor(private readonly http: HttpService) {}

async validateProjectContent(dto: CreateProjectDto) {

const media = \[dto.featuredImage, \...dto.additionalImages\];

if (dto.videoUrl) media.push(dto.videoUrl);

const payload = {

title: dto.title,

description: dto.description,

tags: dto.tags,

skills: dto.skills,

media,

};

const response = await firstValueFrom(

this.http.post(\'http://content-moderation-service/api/validate\',
payload),

);

if (response.data.status !== \'approved\') {

throw new HttpException(response.data.message, 422);

}

}

}



// listing-service/src/project/project.controller.ts

import { Controller, Post, Body } from \'@nestjs/common\';

import { ProjectService } from \'./project.service\';

import { CreateProjectDto } from \'./dto/create-project.dto\';

\@Controller(\'projects\')

export class ProjectController {

constructor(private readonly projectService: ProjectService) {}

\@Post(\'submit\')

async submit(@Body() dto: CreateProjectDto) {

await this.projectService.validateProjectContent(dto);

// proceed to save and publish\...

return { status: \'approved\', message: \'Project published
successfully.\' };

}

}



#### **5. Error Responses**

- **422 Unprocessable Entity**: Returned when text or media validation
  fails.

- **500 Internal Server Error**: Returned on unexpected errors.

This integration ensures that **all media** in your project
payload---hosted on **Cloudflare R2**---is fetched by the Content
Moderation Microservice, scanned for explicit content, and only approved
projects proceed to publication.
