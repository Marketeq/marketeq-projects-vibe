### **Document 8: Project Submission Approval Flow**

#### **Overview:**

This document describes the **process flow** for submitting a
**project** to the marketplace, with a clear separation of
responsibilities. The **Listing Microservice** handles **project
metadata** (submission, storage, and validation), while the **Content
Moderation Microservice** performs the **content validation**. The
**Messaging Service** and **Notification Service** handle all
**messages** and **notifications** to the user.

#### **1. Project Submission Flow**

##### **1.1. User Submits a Project (Listing Microservice)**

- The **user submits a project** via the **Listing Microservice**, which
  handles project metadata and media.

- Once the **project data** (title, description, categories, tags,
  skills, media) is received, it is sent to the **Content Moderation
  Microservice** for validation.

##### **1.2. File Structure of the Listing Microservice**

The **Listing Microservice** handles the storage and processing of
project data:

marketeq-projects/

│

├── app/

│ ├── listing-service/

│ │ ├── project/

│ │ │ ├── project.controller.ts \# Handles project submission and
validation logic

│ │ │ ├── project.service.ts \# Business logic for project processing
(nested under listing)

│ │ │ ├── project.validation.ts \# Field validation (title, description,
etc.)

│ │ │ ├── project.filters.ts \# Filters used in project content
moderation

│ │ │ └── project.status.ts \# Handles project approval and rejection
statuses



#### **2. Content Moderation Microservice**

The **Listing Microservice** sends the project data to the **Content
Moderation Microservice** for content validation (profanity, explicit
content, banned keywords, media).

##### **2.1. Calling the Content Moderation API:**

The **Listing Microservice** calls the **Content Moderation
Microservice** to validate the **project content** (fields and media).

import { Injectable } from \'@nestjs/common\';

import { HttpService } from \'@nestjs/axios\'; // Use HttpService to
make API calls to Content Moderation Microservice

\@Injectable()

export class ProjectService {

constructor(private readonly httpService: HttpService) {}

// Call Content Moderation API to validate project content

async validateProjectContent(createProjectDto: any): Promise\<any\> {

const contentModerationResponse = await
this.httpService.post(\'http://content-moderation-service/api/validate\',
createProjectDto);

if (contentModerationResponse.data.status === \'rejected\') {

return { status: \'rejected\', message:
contentModerationResponse.data.message };

}

return { status: \'approved\', message: \'Project content is clean.\' };

}

}



#### **3. Media Moderation and Validation**

##### **3.1. Content Moderation Microservice (Media and Text Validation)**

The **Content Moderation Microservice** will validate **media content**
(images, videos) using **Hugging Face models** for explicit content
detection. Text fields are checked for **profanity** and **banned
keywords**.

import { Injectable } from \'@nestjs/common\';

import { moderateImage, moderateVideo } from
\'./media-moderation.service\'; // Import media moderation functions

\@Injectable()

export class ContentModerationService {

async validateMedia(media: string): Promise\<any\> {

const isImage = media.endsWith(\'.jpg\') \|\| media.endsWith(\'.png\');

const isVideo = media.endsWith(\'.mp4\') \|\| media.endsWith(\'.avi\');

if (isImage) {

const isImageValid = await moderateImage(media);

if (!isImageValid) {

return { status: \'rejected\', message: \'Image contains explicit
content\' };

}

}

if (isVideo) {

const isVideoValid = await moderateVideo(media);

if (!isVideoValid) {

return { status: \'rejected\', message: \'Video contains explicit
content\' };

}

}

return { status: \'approved\', message: \'Media content is valid\' };

}

}



#### **4. Response and Notification Handling**

##### **4.1. Messaging and Notification Services**

Once the **Content Moderation Microservice** has processed the project,
the **Listing Microservice** will pass the final status (approved,
pending review, or rejected) to the **Messaging Service** or
**Notification Service**. These services are responsible for **sending
messages** or **notifications** to the user.

##### **4.2. Sending Status Messages via Notification Service**

The **Notification Service** will send **status messages** to the user
based on the final decision from the **Content Moderation
Microservice**.

**Example Status Messages**:

- **Your Project Has Been Submitted for a Review!\**

- **Your project has been successfully published.\**

- **Please update your project to meet community guidelines.\**

****import { Injectable } from \'@nestjs/common\';

import { NotificationService } from \'./notification.service\';

\@Injectable()

export class ProjectService {

constructor(private readonly notificationService: NotificationService)
{}

// Send status message to user via Notification Service

async sendSubmissionStatus(projectId: string, status: string) {

const project = await this.projectRepository.findOne(projectId);

let message = \'\';

switch (status) {

case \'rejected\':

message = \`Your project \"\${project.title}\" was rejected due to
content violations.\`;

break;

case \'approved\':

message = \`Your project \"\${project.title}\" has been successfully
published!\`;

break;

case \'pending_review\':

message = \`Your project \"\${project.title}\" is under review. We will
get back to you soon.\`;

break;

default:

message = \`Thanks for submitting your project. We\'ll review it
soon.\`;

break;

}

await this.notificationService.sendNotification(project.userId,
message);

}

}



#### **5. Final Approval or Rejection Process**

##### **5.1. Project Status Finalization**

- **Approved**: If content passes moderation (fields and media), the
  project is marked as **approved** and sent to the **Listing
  Microservice** to be published.

- **Pending Review**: If media requires **manual review**, the project
  is **flagged** with the **pending_review** status.

- **Rejected**: If content is not approved (e.g., profanity, explicit
  media, or banned keywords), the project is rejected and feedback is
  sent to the user.

#### **6. Conclusion**

This document outlines the **Project Submission Approval Flow**, where
the **Listing Microservice** handles project submission and stores data,
while the **Content Moderation Microservice** performs **validation**.
The **Messaging Service** and **Notification Service** handle **status
messages and notifications**.

This ensures a **clear separation of concerns**, allowing content to be
moderated effectively, while users receive the appropriate feedback
based on the moderation results.
