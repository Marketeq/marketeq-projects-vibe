### **Document 12: Manual Review Process**

#### **Overview:**

This document provides an outline of the **manual review process**
within the **Content Moderation Microservice**. While the system is
designed to **automatically moderate** content (text and media), some
cases may require **manual intervention** due to the complexity or
ambiguity of the content. This process ensures that **human moderators**
can review flagged content, make final decisions, and override automated
actions when necessary.

The **manual review process** is the **last resort** in content
moderation, with **99.999999% of content** being automatically approved
or rejected based on predefined filters. This document outlines how
flagged content is handled by **human moderators**, what tools they use,
and how decisions are communicated to users.

#### **1. Manual Review Process Overview**

The **manual review process** is triggered when content:

- Is flagged during **automated validation** (e.g., explicit images,
  offensive text).

- Is **repeatedly flagged** by the system.

- Requires **human judgment** due to the complexity of the content.

**Human moderators** are responsible for reviewing flagged projects,
deciding whether the content complies with platform guidelines, and
taking the appropriate action (approval, rejection, or modification).

#### **2. Triggering Manual Review**

Manual review is triggered in the following scenarios:

- **Content fails multiple automatic checks**: If content is flagged by
  multiple filters (e.g., a combination of **profanity** in text and
  **explicit media**), it will be sent to manual review.

- **Media requires deeper analysis**: When media content (images or
  videos) is borderline or ambiguous (e.g., unclear explicit content),
  human moderators must decide whether it violates guidelines.

- **Repeated violations**: If a user repeatedly submits content that
  fails moderation, it triggers a manual review process to ensure the
  content meets platform standards.

##### **2.1. API Call to Flag Content for Manual Review**

If content fails automated moderation, an API call is made to the
**Manual Review Microservice**, flagging the content for review.

@Injectable()

export class ContentModerationService {

async flagForManualReview(projectId: string): Promise\<void\> {

// Call the Manual Review Microservice to flag the project for human
review

await this.httpService.post(\'http://manual-review-service/api/flag\', {
projectId }).toPromise();

}

}



#### **3. Manual Review Dashboard**

Once flagged for manual review, the content is presented to **human
moderators** via a dashboard. This dashboard allows moderators to:

1.  **Review flagged content**: View project details, media, and
    feedback from the automated moderation system.

2.  **Take action**: Approve, reject, or request edits to the content.

##### **3.1. Review Interface**

The **manual review interface** should be simple and intuitive, allowing
moderators to make decisions quickly while ensuring accuracy. It will
include:

- **Project metadata** (title, description, tags, etc.).

- **Media preview** (images, videos, and thumbnails).

- **Automated moderation feedback**: A list of the filters that flagged
  the content (e.g., profanity detected, explicit media detected).

- **Action buttons**:

  - **Approve**: If the content complies with guidelines.

  - **Reject**: If the content violates platform policies.

  - **Request Edits**: If the content can be approved once changes are
    made.

##### **3.2. Example: Manual Review Action Code**

****import { Controller, Post, Body } from \'@nestjs/common\';

\@Controller(\'manual-review\')

export class ManualReviewController {

\@Post(\'action\')

async handleManualReview(@Body() reviewData: { projectId: string,
action: string }) {

const { projectId, action } = reviewData;

switch (action) {

case \'approve\':

// Mark the project as approved

await this.projectService.updateStatus(projectId, \'approved\');

break;

case \'reject\':

// Mark the project as rejected

await this.projectService.updateStatus(projectId, \'rejected\');

break;

case \'request-edits\':

// Request changes to the project

await this.projectService.updateStatus(projectId, \'pending-edits\');

break;

default:

throw new Error(\'Invalid action\');

}

// Notify the user about the decision

await this.notificationService.sendNotification(projectId, action);

}

}



#### **4. Notification After Manual Review**

Once the content has been reviewed by a **human moderator**, the user
will be notified of the decision. The **Notification Service** is
responsible for sending these messages.

##### **4.1. Example Notification Logic**

After the manual review, a **status message** will be sent to the user
indicating the outcome of the review process:

@Injectable()

export class NotificationService {

async sendNotification(projectId: string, action: string) {

const project = await this.projectRepository.findOne(projectId);

let message = \'\';

switch (action) {

case \'approved\':

message = \`Your project \"\${project.title}\" has been successfully
published!\`;

break;

case \'rejected\':

message = \`Your project \"\${project.title}\" was rejected due to
content violations.\`;

break;

case \'pending-edits\':

message = \`Your project \"\${project.title}\" requires edits before it
can be approved.\`;

break;

default:

message = \`Your project \"\${project.title}\" is under review. We\'ll
get back to you soon.\`;

break;

}

// Send notification to user

await this.notificationRepository.sendNotification(project.userId,
message);

}

}



#### **5. Moderator Actions and Overrides**

Moderators can take the following actions based on the review:

- **Approve**: If the content is appropriate and adheres to platform
  guidelines, the project is marked as **approved** and is visible on
  the marketplace.

- **Reject**: If the content violates guidelines, the project is
  **rejected**, and the user is notified about the violation.

- **Request Edits**: If the content has minor issues, such as offensive
  language or explicit media, the moderator can request edits from the
  user. The project is set to **pending-edits**, and the user is asked
  to make the necessary changes.

#### **6. Monitoring and Reporting**

It's important to monitor the manual review process for accuracy and
efficiency. **Moderation logs** should be kept to track all decisions
and provide insights into the performance of human moderators.

##### **6.1. Logging Moderator Actions**

Every moderator action (approve, reject, request edits) is logged for
auditing and analysis purposes. This helps in improving the system and
training moderators.

@Injectable()

export class ModerationLoggingService {

async logAction(projectId: string, action: string, moderatorId: string)
{

const log = new ModerationLog();

log.projectId = projectId;

log.action = action;

log.moderatorId = moderatorId;

log.timestamp = new Date();

await this.moderationLogRepository.save(log);

}

}


