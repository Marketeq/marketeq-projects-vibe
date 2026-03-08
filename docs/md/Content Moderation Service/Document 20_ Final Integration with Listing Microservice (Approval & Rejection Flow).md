### **Document 20: Final Integration with Listing Microservice (Approval & Rejection Flow)**

#### **Overview:**

This document describes how to integrate the **Content Moderation
Microservice** with the **Listing Microservice**, specifically focusing
on the **approval** and **rejection** process for project submissions.
The goal of this integration is to ensure that content submitted through
the **Listing Microservice** is properly processed by the **Content
Moderation Microservice**, and that the final decision (approval or
rejection) is sent back to the **Listing Microservice** for further
action.

#### **1. Integration Overview**

The **Listing Microservice** handles the **submission** of projects,
while the **Content Moderation Microservice** checks the content for
compliance with the platform's guidelines. When a project is submitted:

1.  The **Listing Microservice** submits the project data (e.g., text
    fields, media) to the **Content Moderation Microservice**.

2.  The **Content Moderation Microservice** validates the content and
    returns the status of the project (approved, rejected, flagged).

3.  The **Listing Microservice** handles the status by either publishing
    the project or rejecting it, notifying the user accordingly.

#### **2. Submitting Projects for Moderation**

Once the project is submitted by the user through the **Listing
Microservice**, the backend sends the project data to the **Content
Moderation Microservice** for validation. The submission includes **text
fields** (title, description, tags, skills) and **media files** (images,
videos).

##### **2.1. Example Submission API (Listing Microservice)**

****import { Injectable } from \'@nestjs/common\';

import { HttpService } from \'@nestjs/axios\';

\@Injectable()

export class ProjectService {

constructor(private readonly httpService: HttpService) {}

async submitProjectForModeration(createProjectDto: any): Promise\<any\>
{

try {

const response = await this.httpService.post(

\'http://content-moderation-service/api/validate\',

createProjectDto,

).toPromise();

if (response.data.status === \'rejected\') {

return { status: \'rejected\', message: response.data.message };

}

// If content passes moderation, proceed to save and publish the project

await this.saveProject(createProjectDto);

return { status: \'approved\', message: \'Project successfully submitted
and approved.\' };

} catch (error) {

throw new Error(\'Content moderation failed.\');

}

}

private async saveProject(createProjectDto: any) {

// Logic to save the project to the Listings Microservice database

await this.projectRepository.save(createProjectDto);

}

}



#### **3. Content Moderation Decision Handling**

The **Content Moderation Microservice** processes the content and
returns the **approval status**. The key actions in the approval process
are:

1.  **Approval**: If all fields pass the validation, the project is
    marked as **approved**.

2.  **Rejection**: If the content fails the validation (e.g., profanity,
    explicit content), the project is **rejected** with reasons provided
    to the user.

3.  **Flagging**: If the content is borderline or needs additional
    review, it is flagged for manual review. The status is marked as
    **pending**, and the user is informed that their project is under
    review.

##### **3.1. Handling Approval and Rejection Status**

When the content passes or fails moderation, the **Content Moderation
Microservice** will return a response that the **Listing Microservice**
uses to decide how to proceed.

@Injectable()

export class ProjectService {

constructor(private readonly httpService: HttpService) {}

async handleModerationDecision(projectId: string, status: string):
Promise\<any\> {

if (status === \'approved\') {

await this.publishProject(projectId);

return { status: \'approved\', message: \'Project published
successfully.\' };

} else if (status === \'rejected\') {

await this.rejectProject(projectId);

return { status: \'rejected\', message: \'Project rejected due to
content violations.\' };

} else {

return { status: \'pending\', message: \'Project is under review.\' };

}

}

private async publishProject(projectId: string) {

// Update the project\'s status to \'active\' and publish it to the
marketplace

await this.projectRepository.update(projectId, { status: \'active\' });

}

private async rejectProject(projectId: string) {

// Update the project\'s status to \'rejected\' and inform the user

await this.projectRepository.update(projectId, { status: \'rejected\'
});

}

}



#### **4. Notifications to User**

Once a decision has been made, the **Listing Microservice** will notify
the user about the approval or rejection of their project.

- **Approved projects** are immediately visible on the marketplace.

- **Rejected projects** trigger an **email** and **in-app notification**
  with feedback.

- **Flagged projects** will notify the user that their project is under
  review.

##### **4.1. Example Notification API**

****import { Injectable } from \'@nestjs/common\';

import { NotificationService } from \'./notification.service\';

\@Injectable()

export class ProjectService {

constructor(private readonly notificationService: NotificationService)
{}

async notifyUserAboutDecision(projectId: string, status: string, userId:
string) {

let message = \'\';

if (status === \'approved\') {

message = \'Your project has been successfully published!\';

} else if (status === \'rejected\') {

message = \'Your project has been rejected due to content violations.
Please review the feedback.\';

} else if (status === \'pending\') {

message = \'Your project is under review. We will notify you once a
decision is made.\';

}

await this.notificationService.sendNotification(userId, message);

}

}



#### **5. Conclusion**

The **Content Moderation Microservice** and the **Listing Microservice**
work together to validate and process content for submission to the
marketplace. The **Listing Microservice** submits the project for
moderation, handles the approval or rejection status, and informs the
user about the outcome. The **Content Moderation Microservice** performs
automated checks on content and returns a status for each submission,
while also providing **clear rejection reasons** and **feedback** to
users.

The integration ensures that content is properly moderated, and users
are kept informed throughout the process.
