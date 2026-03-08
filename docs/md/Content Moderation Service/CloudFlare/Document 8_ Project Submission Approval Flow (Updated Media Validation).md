### **Document 8: Project Submission Approval Flow (Updated Media Validation)**

#### **Overview**

This document describes the **media validation** portion of the
**Project Submission Approval Flow**, incorporating our **Cloudflare
R2**--backed upload pipeline and the **Content Moderation
Microservice**. It assumes the text fields (title, description, tags,
skills) follow the existing validation logic and focuses on how to
handle images and videos in a Cloudflare-native way.

#### **2. Content Validation**

##### **2.1 Field Validation**

*(Unchanged; see Document 8 original.)*

##### **2.2 Media Validation**

1.  **Upload Raw Media to Cloudflare\**
    Before project submission, the frontend must upload each file via
    our **Media API**:

POST /media/upload

Content-Type: multipart/form-data

form-data:

file: \<binary image or video\>

2.  **Response** returns a Cloudflare URL:

{

\"status\": \"approved\",

\"url\": \"https://imagedelivery.net/ACCOUNT_ID/KEY/public\"

}

3.  **Include Cloudflare URLs in Submission\**
    In your CreateProjectDto, use those URLs:

interface CreateProjectDto {

title: string;

description: string;

tags: string\[\];

skills: string\[\];

featuredImage: string; // Cloudflare URL from /media/upload

additionalImages: string\[\]; // Array of Cloudflare URLs

videoUrl?: string; // Cloudflare URL or null

// ...other fields...

}

4.  **Validate Media via Content Moderation API\**
    The Listing Microservice passes those URLs into the Content
    Moderation Microservice's /validate endpoint. That service fetches
    each URL (from R2), runs it through our Hugging Face + Cloudflare
    scan logic, and returns a single pass/fail:

// listing-service/src/project/project.service.ts

import { HttpService } from \'@nestjs/axios\';

import { Injectable } from \'@nestjs/common\';

\@Injectable()

export class ProjectService {

constructor(private readonly http: HttpService) {}

async validateProjectContent(dto: CreateProjectDto): Promise\<{ status:
string; message: string }\> {

const { title, description, tags, skills, featuredImage,
additionalImages, videoUrl } = dto;

// 1) Validate text fields (as before)\...

// 2) Validate media URLs in one shot

const mediaUrls = \[featuredImage, \...additionalImages\];

if (videoUrl) mediaUrls.push(videoUrl);

const response = await this.http

.post(\'http://content-moderation-service/api/validate\', { media:
mediaUrls })

.toPromise();

return response.data; // { status: \'approved\' \| \'rejected\' \|
\'pending\', message: string }

}

}

5.  **Handle Validation Result\**
    In your controller, reject the submission if media validation fails:

// listing-service/src/project/project.controller.ts

import { Controller, Post, Body, UnprocessableEntityException } from
\'@nestjs/common\';

import { ProjectService } from \'./project.service\';

import { CreateProjectDto } from \'./dto/create-project.dto\';

\@Controller(\'projects\')

export class ProjectController {

constructor(private readonly projectService: ProjectService) {}

\@Post(\'submit\')

async submitProject(@Body() dto: CreateProjectDto) {

const validation = await
this.projectService.validateProjectContent(dto);

if (validation.status !== \'approved\') {

throw new UnprocessableEntityException(validation.message);

}

// ...continue to finalize and publish...

}

}



With these steps, all user-supplied images and videos are:

1.  **Uploaded** to Cloudflare R2 via our Media API

2.  **Validated** by the Content Moderation Microservice (which fetches
    from R2 and runs Hugging Face + Cloudflare checks)

3.  **Approved or rejected** as part of the overall project submission
    flow

This ensures a seamless, CDN-backed media pipeline integrated into your
project approval system.
