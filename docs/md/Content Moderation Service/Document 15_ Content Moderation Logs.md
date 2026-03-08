### **Document 15: Content Moderation Logs**

#### **Overview:**

This document outlines how to implement **content moderation logs**
within the **Content Moderation Microservice**. The logs track all
actions performed by the **Content Moderation Microservice**, including
the results of text and media moderation, approval or rejection
statuses, and any errors or system failures.

Content moderation logs are critical for **auditability**, **tracking
content compliance**, and identifying patterns or issues with the
moderation process. They provide **traceability** for content decisions
and help ensure transparency and accuracy.

#### **1. Purpose of Content Moderation Logs**

Content moderation logs serve several key purposes:

1.  **Audit trail**: Tracks every moderation action for review and
    regulatory compliance.

2.  **Transparency**: Provides a clear record of decisions made by
    automated systems, which is important for ensuring that content
    moderation is fair and unbiased.

3.  **Error tracking**: Helps identify errors in the content moderation
    process, allowing for faster resolution of issues.

4.  **Monitoring and improvements**: Logs help identify trends, such as
    recurring violations of specific content guidelines.

#### **2. Types of Logs to Capture**

The following key actions should be logged:

##### **2.1. Text Moderation Logs**

- **Action**: Profanity detection, banned keyword checks, length
  validation.

- **Data Logged**:

  - Project ID

  - Field type (title, description, tags, skills)

  - Moderation action (approved, rejected, flagged)

  - Reason for rejection or flagging

##### **2.2. Media Moderation Logs**

- **Action**: Image and video moderation (explicit content,
  inappropriate media).

- **Data Logged**:

  - Project ID

  - Media URL

  - Media type (image, video)

  - Moderation action (approved, rejected)

  - Reason for rejection (e.g., explicit content detected)

##### **2.3. System Errors Logs**

- **Action**: Errors occurring during moderation (e.g., invalid media
  formats, API failures).

- **Data Logged**:

  - Error message

  - Project ID

  - Timestamp

  - Stack trace (if applicable)

#### **3. Logging Mechanism**

##### **3.1. Log Storage**

Content moderation logs should be stored in a centralized logging system
(e.g., **AWS CloudWatch**, **Elasticsearch**, or **a dedicated logging
database**). Logs must be indexed by project ID, field type, and
timestamp for easy retrieval.

##### **3.2. Example Log Format**

The log entries should be stored in the following format:

{

\"timestamp\": \"2025-05-30T10:30:00Z\",

\"project_id\": \"12345\",

\"action\": \"rejected\",

\"field_type\": \"description\",

\"reason\": \"profanity detected\",

\"moderator\": \"system\",

\"media_url\": null,

\"error_message\": null

}

- \
  **Timestamp**: The date and time the moderation action took place.

- **Project ID**: The ID of the project being moderated.

- **Action**: The moderation result (approved, rejected, flagged).

- **Field type**: The field being moderated (title, description, etc.).

- **Reason**: The reason for rejection or flagging (e.g., profanity,
  banned keyword, explicit content).

- **Moderator**: The entity performing the action (either system or
  human moderator).

- **Media URL**: The URL of the media (if applicable).

- **Error Message**: Any error that occurred (if applicable).

#### **4. Log Generation Code**

Here's how the **Content Moderation Microservice** can generate logs
when a project fails the moderation checks:

import { Injectable } from \'@nestjs/common\';

import { LoggerService } from \'@nestjs/common\';

\@Injectable()

export class ModerationLoggingService {

constructor(private readonly loggerService: LoggerService) {}

// Log moderation action

async logModerationAction(projectId: string, action: string, fieldType:
string, reason: string, mediaUrl?: string): Promise\<void\> {

const logEntry = {

timestamp: new Date().toISOString(),

project_id: projectId,

action: action,

field_type: fieldType,

reason: reason,

media_url: mediaUrl \|\| null,

error_message: null

};

// Store the log entry in your preferred log storage (e.g., database or
cloud logging service)

await this.loggerService.log(JSON.stringify(logEntry)); // Assuming log
service for storing logs

}

// Example of logging a failed project moderation due to profanity in
title

async logTextModerationFailure(projectId: string, reason: string):
Promise\<void\> {

await this.logModerationAction(projectId, \'rejected\', \'title\',
reason);

}

// Example of logging failed media moderation

async logMediaModerationFailure(projectId: string, mediaUrl: string,
reason: string): Promise\<void\> {

await this.logModerationAction(projectId, \'rejected\', \'media\',
reason, mediaUrl);

}

}

##### **4.1. Example Integration with Content Moderation Logic**

When the project is processed by the **Content Moderation
Microservice**, it will log each action:

@Injectable()

export class ProjectService {

constructor(private readonly moderationLoggingService:
ModerationLoggingService) {}

async validateProjectContent(createProjectDto: any): Promise\<any\> {

if (this.containsProfanity(createProjectDto.title)) {

// Log the profanity rejection

await
this.moderationLoggingService.logTextModerationFailure(createProjectDto.projectId,
\'profanity detected\');

return { status: \'rejected\', message: \'Project contains profanity\'
};

}

// Validate media content

const mediaValidationResult = await
this.validateMedia(createProjectDto.media);

if (mediaValidationResult.status === \'rejected\') {

// Log the media rejection

await
this.moderationLoggingService.logMediaModerationFailure(createProjectDto.projectId,
createProjectDto.media\[0\], mediaValidationResult.message);

return { status: \'rejected\', message: mediaValidationResult.message };

}

// Proceed with project approval

return { status: \'approved\', message: \'Project is clean\' };

}

containsProfanity(title: string): boolean {

// Add logic to detect profanity (e.g., using a predefined list or API)

return false; // Example return, assuming title is clean

}

async validateMedia(media: string\[\]): Promise\<any\> {

// Integrate media validation (e.g., using Hugging Face or Google
Vision)

return { status: \'approved\' }; // Example, assumes no explicit content

}

}



#### **5. Monitoring and Reporting**

Logs should be **monitored** for trends in content rejection or failure.
Regular reports can be generated to assess the effectiveness of the
**Content Moderation Microservice** and identify patterns in failed
content, which can help in improving content filters over time.

##### **5.1. Reporting Example**

You could set up a report generator to look at rejected projects:

@Injectable()

export class ModerationReportService {

constructor(private readonly moderationLoggingService:
ModerationLoggingService) {}

// Generate daily report of rejected content

async generateDailyReport(): Promise\<void\> {

// Retrieve logs for rejected projects from the moderation logs

const rejectedLogs = await
this.moderationLoggingService.getLogsByAction(\'rejected\');

// Format and send the report to the relevant team or dashboard

console.log(\'Rejected Content Report:\', rejectedLogs);

}

}



#### **6. Conclusion**

This document outlines the implementation of **content moderation logs**
within the **Content Moderation Microservice**. By logging each action
taken by the moderation system, including text and media validation
results, the platform ensures **transparency**, **auditability**, and
**traceability** of all moderation decisions. Logs also provide insight
into system performance and help **improve content moderation** accuracy
over time.
