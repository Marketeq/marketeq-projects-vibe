### **Document 12: Project Moderation and Notification Flow (Media Handling)**

#### **Overview**

This document describes how **media** (images/videos) are handled in the
**Project Moderation** flow. It covers:

- **Automatic moderation** of Cloudflare-hosted media via the Content
  Moderation Microservice

- **Immediate user notification** on media failure

- **User resubmission** steps for media corrections

- **Notification Service** logic specifically for media failures

#### **1. Project Moderation Process**

1.  **User submits** a project with **Cloudflare URLs** for media
    (featuredImage, additionalImages\[\], videoUrl).

2.  **Listing Microservice** calls the **Content Moderation API** (POST
    /api/validate) with:

{

\"title\": \"\...\",

\"description\": \"\...\",

\"tags\": \[\"\...\"\],

\"skills\": \[\"\...\"\],

\"media\": \[\"\<featuredImage URL\>\", \"\<additionalImage URL\>\",
\"\<videoUrl\>\"\]

}

3.  **Content Moderation Microservice**:

    - Fetches each URL from Cloudflare R2

    - Runs **Hugging Face + Cloudflare scan** via
      MediaModerationService.validateMedia(url)

    - Returns { status: \'approved\' } if all pass, or { status:
      \'rejected\', message: \'Media contains explicit content.\' } on
      first failure

#### **2. Handling Failed Media Moderation**

If **any** media URL fails validation:

- **Listing Controller** throws UnprocessableEntityException with the
  moderation message.

- **Notification Service** immediately notifies the user by email and
  in-app notification.

// listing-service/src/project/project.controller.ts

\@Post(\'submit\')

async submitProject(@Body() dto: CreateProjectDto) {

try {

await this.projectService.validateProjectContent(dto);

// ...save & publish...

return { status: \'approved\', message: \'Project published
successfully.\' };

} catch (err) {

// err.message === \'Media contains explicit content.\' (or text
failure)

await this.notificationService.sendMediaFailureNotification(dto.userId,
dto.projectId, err.message);

throw new UnprocessableEntityException(err.message);

}

}



// listing-service/src/notification/notification.service.ts

\@Injectable()

export class NotificationService {

constructor(private readonly notifier: MessagingService) {}

async sendMediaFailureNotification(userId: string, projectId: string,
reason: string) {

const message = \`Your project (ID: \${projectId}) was rejected due to
media validation: \${reason}\`;

// In-app

await this.notifier.sendInApp(userId, message,
\`/projects/\${projectId}\`);

// Email

await this.notifier.sendEmail(userId, \'Project Media Rejected\',
message);

}

}



#### **3. Steps for User Resubmission**

1.  **User sees** the in-app banner and email with the **media rejection
    reason**.

2.  **User replaces** the problematic media by uploading a new file via
    /media/upload.

3.  **Frontend** updates the project draft with new Cloudflare URLs.

4.  **User clicks** "Resubmit," triggering the same /projects/submit
    flow.

// listing-service/src/project/project.service.ts

async handleProjectResubmission(projectId: string, dto:
UpdateProjectDto) {

// Update stored URLs

await this.projectRepository.update(projectId, { \...dto });

// Re-run moderation

await this.validateProjectContent(dto);

// Notify on success

await this.notificationService.sendApprovalNotification(dto.userId,
projectId);

}



#### **4. Notification Logic for Media Success**

When a resubmitted project passes media moderation:

// listing-service/src/notification/notification.service.ts

async sendApprovalNotification(userId: string, projectId: string) {

const message = \`Your project (ID: \${projectId}) has been approved and
is now live.\`;

await this.notifier.sendInApp(userId, message,
\`/projects/\${projectId}\`);

await this.notifier.sendEmail(userId, \'Project Approved\', message);

}



#### **5. Feedback Example for Media Rejection**

****// In-app payload

{

\"type\": \"media-rejection\",

\"projectId\": \"abc123\",

\"message\": \"Media contains explicit content.\",

\"actions\": \[

{ \"label\": \"Replace Image\", \"link\":
\"/projects/abc123/edit/media\" },

{ \"label\": \"View Guidelines\", \"link\":
\"/docs/content-guidelines#media\" }

\]

}



#### **6. Final Status and Resubmission Logic**

- **Approved** → project status set to active, user notified via
  sendApprovalNotification().

- **Rejected** → project remains in draft, user notified via
  sendMediaFailureNotification().

- **User resubmits** → flow repeats until all media pass moderation.
