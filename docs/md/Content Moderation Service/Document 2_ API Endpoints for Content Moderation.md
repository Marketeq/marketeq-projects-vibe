### **Document 2: API Endpoints for Content Moderation**

#### **Overview:**

This document details the **API endpoints** exposed by the **Content
Moderation Microservice**, including their functionality,
request/response formats, and error handling. These endpoints allow
external services (e.g., project submission, user profile updates) to
interact with the moderation system for real-time validation.\
\
By using these endpoints, external services can interact with the
moderation system, submitting content for validation, fetching
moderation logs, and taking actions on flagged content.

#### **1. Endpoint: POST /api/moderate/content**

**Description**:\
This endpoint is used to submit content for moderation. It will validate
the content (title, description, tags, etc.) and return a status
indicating whether the content passes moderation.

- **Auth Required**: Yes (JWT token in headers)

- **Payload**: JSON (content DTO)

**Request Body**:

{

\"content_type\": \"project\", // Type of content (project, review,
profile)

\"content\": \"This is a test project description to be validated\",

\"language\": \"en\" // Optional: Language of the content

}

**Response Body** (Success):

{

\"status\": \"approved\", // Status of content (approved, flagged, or
rejected)

\"reason\": \"Content passes validation\"

}

**Response Body** (Failure):

{

\"status\": \"rejected\", // Content failed validation

\"reason\": \"Profanity detected in content\"

}

**Code Example**:

import { Controller, Post, Body } from \'@nestjs/common\';

import { ContentValidationService } from
\'./content-validation.service\';

\@Controller(\'api/moderate\')

export class ContentModerationController {

constructor(private readonly contentValidationService:
ContentValidationService) {}

\@Post(\'content\')

async moderateContent(@Body() contentDto: { content: string;
content_type: string }): Promise\<any\> {

const result = await
this.contentValidationService.validateContent(contentDto.content);

if (result) {

return { status: \'approved\', reason: \'Content passes validation\' };

} else {

return { status: \'rejected\', reason: \'Profanity detected in content\'
};

}

}

}



#### **2. Endpoint: POST /api/moderate/media**

**Description**:\
This endpoint is used to submit media content (e.g., images, videos) for
moderation. The system scans the media to check for explicit or
inappropriate content.

- **Auth Required**: Yes (JWT token in headers)

- **Payload**: JSON (media submission DTO)

**Request Body**:

{

\"media_type\": \"image\", // Media type (image, video)

\"media_url\": \"http://path-to-media.com/image.jpg\"

}

**Response Body** (Success):

{

\"status\": \"approved\", // Media passed moderation

\"reason\": \"No inappropriate content detected\"

}

**Response Body** (Failure):

{

\"status\": \"rejected\", // Media rejected

\"reason\": \"Inappropriate content detected\"

}

**Code Example**:

import { Injectable } from \'@nestjs/common\';

import \* as cloudflare from \'cloudflare-media-mod\'; // External
moderation service

\@Injectable()

export class MediaModerationService {

async moderateMedia(mediaUrl: string, mediaType: string):
Promise\<boolean\> {

if (mediaType === \'image\') {

const scanResult = await cloudflare.scanImage(mediaUrl);

if (scanResult.containsInappropriateContent) {

return false; // Reject media if inappropriate content is found

}

}

// Further checks can be added for other media types (e.g., videos,
audio)

return true; // Approve media if no issues are found

}

}



#### **3. Endpoint: GET /api/moderate/logs**

**Description**:\
This endpoint allows admins to fetch moderation logs, providing
transparency on all content moderation actions. Logs can be filtered by
content type, status, or other parameters.

- **Auth Required**: Yes (Admin access required)

- **Query Parameters**:

  - status (string): Filter by status (approved, flagged, rejected)

  - content_type (string): Filter by content type (project, review,
    profile, etc.)

  - page (int): Page number (default is 1)

  - per_page (int): Items per page (default is 20)

**Response Body**:

{

\"logs\": \[

{

\"content_id\": \"12345\",

\"content_type\": \"project\",

\"action\": \"approved\",

\"reason\": null,

\"moderator_id\": null,

\"timestamp\": \"2025-05-28T12:34:56Z\"

},

{

\"content_id\": \"67890\",

\"content_type\": \"review\",

\"action\": \"flagged\",

\"reason\": \"Profanity detected in review\",

\"moderator_id\": null,

\"timestamp\": \"2025-05-28T12:35:00Z\"

}

\]

}

**Code Example**:

import { Controller, Get, Query } from \'@nestjs/common\';

import { ModerationLogService } from \'./moderation-log.service\';

\@Controller(\'api/moderate\')

export class ModerationController {

constructor(private readonly moderationLogService: ModerationLogService)
{}

\@Get(\'logs\')

async getLogs(

\@Query(\'status\') status: string,

\@Query(\'content_type\') contentType: string,

\@Query(\'page\') page: number = 1,

\@Query(\'per_page\') perPage: number = 20

) {

return await this.moderationLogService.getLogs(status, contentType,
page, perPage);

}

}



#### **4. Endpoint: POST /api/moderate/content/{id}/approve**

**Description**:\
This endpoint allows admins to approve flagged content after manual
review.

- **Auth Required**: Yes (Admin access required)

- **Payload**: JSON (optional for additional notes)

**Request Body**:

{

\"reason\": \"Approved after manual review\" // Optional: Notes about
approval

}

**Response Body** (Success):

{

\"status\": \"approved\",

\"message\": \"Content has been approved\"

}

**Code Example**:

import { Controller, Post, Param, Body } from \'@nestjs/common\';

import { ContentModerationService } from
\'./content-moderation.service\';

\@Controller(\'api/moderate\')

export class ModerationController {

constructor(private readonly contentModerationService:
ContentModerationService) {}

\@Post(\'content/:id/approve\')

async approveContent(@Param(\'id\') contentId: string, \@Body() body: {
reason?: string }) {

await this.contentModerationService.approveContent(contentId,
body.reason);

return { status: \'approved\', message: \'Content has been approved\' };

}

}


