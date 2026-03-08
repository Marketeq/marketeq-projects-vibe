### **Document 10: Content Moderation API Integration**

#### **Overview:**

This document outlines how to integrate the **Content Moderation
Microservice API** into the platform to ensure that content is
automatically validated and moderated. The API is used to check **text
fields** (title, description, tags, skills) and **media files** (images,
videos) for harmful content.

The integration steps are provided, including the **API endpoints**,
**data structure**, and **step-by-step instructions** for making
requests to the **Content Moderation Microservice**.\
\
This document outlines how to integrate the **Content Moderation API**
into the **Listing Microservice** to ensure projects pass through
content validation before being published. By following this document,
developers can ensure **seamless integration** between the **Listing
Microservice** and **Content Moderation Microservice** with clear steps
for validation, error handling, and notifications.

#### **1. API Overview**

The **Content Moderation Microservice** exposes REST API endpoints that
the **Listing Microservice** (and other services) will call to validate
project content before it is approved or rejected. The API handles text
moderation (e.g., profanity detection, banned keywords) and media
moderation (e.g., explicit image or video detection).

##### **1.1. API Base URL:**

****http://content-moderation-service/api

##### **1.2. API Endpoints:**

- **POST /validate**: Validate content (text + media)

  - Validates project fields (title, description, tags, etc.) for
    profanity and banned keywords.

  - Validates images and videos for explicit content.

- **GET /status**: Check status of content moderation request

  - Retrieve the moderation status of a previously submitted project.

#### **2. API Integration in the Listing Microservice**

The **Listing Microservice** needs to call the **Content Moderation
API** to validate project content before final approval. Here\'s how you
should integrate it:

##### **2.1. Setting Up API Integration**

1.  **Install Dependencies**: Make sure the **HttpService** is installed
    in your **Listing Microservice** to make HTTP requests to the
    **Content Moderation Microservice**.

npm install \@nestjs/axios

2.  \
    **Import HttpService** in your **Listing Microservice**:

import { HttpService, Injectable } from \'@nestjs/common\';

3.  \
    **Call the Content Moderation API** from the **Listing
    Microservice** to validate the project content:

@Injectable()

export class ProjectService {

constructor(private readonly httpService: HttpService) {}

// Function to validate content via the Content Moderation API

async validateProjectContent(createProjectDto: any): Promise\<any\> {

try {

// Sending POST request to the Content Moderation API

const response = await
this.httpService.post(\'http://content-moderation-service/api/validate\',
createProjectDto).toPromise();

if (response.data.status === \'rejected\') {

return { status: \'rejected\', message: response.data.message };

}

return { status: \'approved\', message: \'Project content is clean\' };

} catch (error) {

return { status: \'error\', message: \'Content moderation service
error\' };

}

}

}



#### **3. Data Structure and Payload**

##### **3.1. Project Data to Send to Content Moderation API**

When calling the **/validate** endpoint, the **Listing Microservice**
will send the project data (title, description, tags, skills, media) in
the following structure:

interface CreateProjectDto {

title: string;

description: string;

tags: string\[\];

skills: string\[\];

media: string\[\]; // URLs or base64 encoded images/videos

}

##### **3.2. Example of Payload to Send**

Here's an example of what the **payload** looks like when submitting a
project for validation:

{

\"title\": \"Build a new website for a client\",

\"description\": \"A full-stack web development project for an
e-commerce website.\",

\"tags\": \[\"web development\", \"e-commerce\", \"frontend\",
\"backend\"\],

\"skills\": \[\"HTML\", \"CSS\", \"JavaScript\", \"Node.js\"\],

\"media\": \[

\"data:image/png;base64,\...\", // Base64-encoded image data

\"http://example.com/video.mp4\" // Video URL

\]

}



#### **4. Example of Handling API Response**

The **Content Moderation Microservice** will respond with one of the
following statuses:

- **approved**: Content passes all moderation checks.

- **pending_review**: Media requires manual review.

- **rejected**: Content violates content policies (e.g., explicit text
  or media).

##### **4.1. Example Response:**

****{

\"status\": \"approved\",

\"message\": \"Project content is clean\"

}

##### **4.2. Handling Response in Listing Microservice:**

After calling the API, the **Listing Microservice** will handle the
response as follows:

async submitProject(createProjectDto: any) {

const validationResponse = await
this.validateProjectContent(createProjectDto);

if (validationResponse.status === \'rejected\') {

return { status: \'rejected\', message: validationResponse.message };

}

// Proceed with storing the project in the database if content is
approved

const project = await this.projectRepository.save(createProjectDto);

return { status: \'approved\', message: \'Project submitted
successfully\' };

}



#### **5. Handling Errors and Failures**

During the integration process, it's important to handle potential
errors from the **Content Moderation Microservice** gracefully.

##### **5.1. Error Handling in the Listing Microservice:**

If an error occurs (e.g., API failure, timeout, invalid response),
ensure the **Listing Microservice** responds accordingly:

async submitProject(createProjectDto: any) {

try {

const validationResponse = await
this.validateProjectContent(createProjectDto);

if (validationResponse.status === \'rejected\') {

return { status: \'rejected\', message: validationResponse.message };

}

// Save the project and approve it

const project = await this.projectRepository.save(createProjectDto);

return { status: \'approved\', message: \'Project submitted
successfully\' };

} catch (error) {

return { status: \'error\', message: \'Content moderation service is
unavailable. Please try again later.\' };

}

}



#### **6. Notifications and Messaging**

##### **6.1. Notification Service:**

The **Notification Service** is responsible for sending status messages
to users based on the result of content moderation. Once a project has
been **approved** or **rejected**, the **Notification Service** will
send appropriate messages to the user.

##### **6.2. Sending Notifications to Users:**

Here\'s how the **Notification Service** will send messages:

import { Injectable } from \'@nestjs/common\';

import { NotificationService } from \'./notification.service\';

\@Injectable()

export class ProjectService {

constructor(private readonly notificationService: NotificationService)
{}

async sendStatusToUser(projectId: string, status: string) {

const project = await this.projectRepository.findOne(projectId);

let message = \'\';

switch (status) {

case \'approved\':

message = \`Your project \"\${project.title}\" has been successfully
published!\`;

break;

case \'rejected\':

message = \`Your project \"\${project.title}\" was rejected due to
content violations.\`;

break;

case \'pending_review\':

message = \`Your project \"\${project.title}\" is under review. We will
get back to you soon.\`;

break;

default:

message = \`Thanks for submitting your project. We'll review it
shortly.\`;

}

await this.notificationService.sendNotification(project.userId,
message);

}

}

#### 

.
