### **Document 1: Content Moderation Microservice Overview**

#### **Overview:**

The **Content Moderation Microservice** is designed to automatically
review user-generated content before it is published on the platform.
This microservice integrates with other platform services to enforce
platform policies, detect inappropriate content, and ensure high-quality
submissions.

This document outlines the architecture and implementation details
required to build and deploy the **Content Moderation Microservice**. It
provides guidelines on how to interact with the system, including API
integration, data processing, and content validation.\
\
The **Content Moderation Microservice** is built to automatically
validate and moderate content submitted to the platform, with the
flexibility to integrate AI and third-party media scanning tools. It
leverages a clean, modular architecture in **NestJS**, ensuring
scalability and maintainability. The system allows for automatic
approval, flagging, or rejection of content based on pre-set filters,
ensuring high-quality content is consistently maintained.

#### **1. Tech Stack**

The **Content Moderation Microservice** is built using the following
stack:

- **Backend Framework**: **NestJS** (for building scalable and
  maintainable microservices).

- **Database**: **PostgreSQL** (for storing content data and logs).

- **Queueing**: **RabbitMQ** (for handling background processing of
  flagged content).

- **AI/ML Tooling**: For scanning media (e.g., Cloudflare or custom AI
  for image/video moderation).

- **API Gateway**: **GraphQL/REST API** (for interacting with other
  services like listing-service, user-service, etc.).

#### **2. Microservice Architecture**

The **Content Moderation Microservice** is designed to validate,
approve, and flag content before it's published. It communicates with
other services (e.g., **listing-service** for projects and
**user-service** for profiles) through a REST API and **RabbitMQ** for
asynchronous tasks.

**Key Components**:

1.  **Content Validation Service**:

    - **Receives** content submissions.

    - **Runs automated filters** to detect spam, profanity, and other
      violations.

    - **Flags** content that requires manual review or rejection.

2.  **Media Moderation**:

    - Scans images and videos for explicit content using **AI or
      third-party tools** (e.g., Cloudflare API).

    - **Rejects** media files that exceed size limits or contain
      inappropriate content.

3.  **Filter Management**:

    - **Dynamic filter rules** that can be updated in real-time (e.g.,
      adding banned keywords or adjusting profanity filters).

4.  **Logging & Auditing**:

    - Logs all moderation actions for transparency and reporting.

    - Stores content moderation results and actions taken.

#### **3. Content Validation & Moderation Logic**

The microservice applies a series of filters based on the content type
(e.g., project, review, profile). These filters are applied in real time
when content is submitted.

**Example of content validation** (using **NestJS**):

import { Injectable } from \'@nestjs/common\';

import { ProfanityFilterService } from
\'./filters/profanity-filter.service\';

import { BannedKeywordsService } from
\'./filters/banned-keywords.service\';

\@Injectable()

export class ContentValidationService {

constructor(

private profanityFilter: ProfanityFilterService,

private bannedKeywordsService: BannedKeywordsService

) {}

async validateContent(content: string): Promise\<boolean\> {

const profanityCheck = await this.profanityFilter.check(content);

if (profanityCheck.failed) {

return false; // Reject content if profanity is found

}

const bannedKeywordsCheck = await
this.bannedKeywordsService.check(content);

if (bannedKeywordsCheck.failed) {

return false; // Reject content if banned keywords are found

}

return true; // Content passes validation

}

}

In this example, the **ContentValidationService** checks the content
for profanity and banned keywords using dedicated filter services.

#### **4. Media Moderation Process**

The **Media Moderation** feature ensures that all images, videos, and
other media files uploaded by users are appropriately scanned and
validated before being published.

**Code Example for Media Validation**:

import { Injectable } from \'@nestjs/common\';

import \* as cloudflare from \'cloudflare-media-mod\'; // Example
third-party service

\@Injectable()

export class MediaModerationService {

async moderateImage(imageUrl: string): Promise\<boolean\> {

const scanResult = await cloudflare.scanImage(imageUrl);

if (scanResult.containsInappropriateContent) {

return false; // Reject image

}

return true; // Approve image

}

async moderateVideo(videoUrl: string): Promise\<boolean\> {

const scanResult = await cloudflare.scanVideo(videoUrl);

if (scanResult.containsInappropriateContent) {

return false; // Reject video

}

return true; // Approve video

}

}

In this example, **Cloudflare** (or any other third-party service) is
used to scan media for inappropriate content, and the result is either
approval or rejection based on the scan.

#### **5. Media Content File Validation**

We also need to check for file type and size, rejecting any media files
that do not meet the platform\'s requirements.

**Example of file type and size validation**:

import { Injectable } from \'@nestjs/common\';

import \* as fs from \'fs\';

\@Injectable()

export class FileValidationService {

async validateFile(filePath: string): Promise\<boolean\> {

const file = fs.statSync(filePath);

// Check file size (e.g., max 10MB)

if (file.size \> 10 \* 1024 \* 1024) {

return false; // Reject if file size exceeds 10MB

}

// Check file type (only allow .jpg, .png)

const allowedTypes = \[\'.jpg\', \'.png\'\];

const fileExtension = filePath.split(\'.\').pop();

if (!allowedTypes.includes(fileExtension)) {

return false; // Reject if file type is not allowed

}

return true; // Approve file if it\'s within allowed limits

}

}

This **FileValidationService** ensures that uploaded files are the
correct type and do not exceed the allowed size.

#### **6. API Endpoints**

**API Endpoints** for interacting with the **Content Moderation
Microservice**:

1.  **POST /api/moderate/content\**

    - Submits content for validation (projects, reviews, profiles,
      etc.).

    - Returns a response indicating whether content is approved or
      flagged.

**Code Example**:

import { Controller, Post, Body } from \'@nestjs/common\';

import { ContentValidationService } from
\'./content-validation.service\';

\@Controller(\'api/moderate\')

export class ContentModerationController {

constructor(private contentValidationService: ContentValidationService)
{}

\@Post(\'content\')

async moderateContent(@Body() contentDto: { content: string }):
Promise\<any\> {

const isContentValid = await
this.contentValidationService.validateContent(contentDto.content);

if (isContentValid) {

return { status: \'approved\' };

}

return { status: \'rejected\', reason: \'Content failed validation\' };

}

}

**Response Example**:

{

\"status\": \"approved\" // If content passes validation

}

**Error Response**:

{

\"status\": \"rejected\",

\"reason\": \"Profanity detected\" // Specific reason for rejection

}


