### **Document 4: Content Types & Workflow**

#### **Overview:**

This document describes the **workflow** for handling different
**content types** in the **Content Moderation Microservice**. The
content types (e.g., project, review, profile, service, job, team) are
processed with specific filters and validation rules. The system ensures
that each piece of content meets platform guidelines before being
published, either automatically or through manual review (when needed).\
\
Each content type (e.g., project, review, profile) has specific rules
that ensure it meets platform guidelines. By following this workflow,
developers can ensure that content is automatically moderated, either
approved, flagged for review, or rejected.

#### **1. Content Types & Filters**

The **Content Moderation Microservice** is designed to handle various
content types. Each content type undergoes a series of validation checks
to ensure it complies with platform standards.

**Content Types**:

1.  **Project**: Projects submitted by contractors.

2.  **Review**: Feedback left by clients or contractors about a
    completed project.

3.  **Profile**: User profiles, including personal information and bio.

4.  **Service**: Services offered by contractors or agencies on the
    marketplace.

5.  **Job**: Job postings created by clients seeking talent.

6.  **Team**: Teams of contractors offering specialized services.

**Field-Level Filters** are applied to the individual fields of each
content type, such as:

- **Project Title**: Profanity detection, length validation, and keyword
  checks.

- **Project Description**: Profanity, banned keywords, and spam
  detection.

- **Review Text**: Profanity detection, inappropriate feedback, and
  keyword checks.

- **Profile Bio**: Prohibited links (e.g., personal contact info, social
  media), and profanity detection.

- **Service Description**: Inappropriate content detection and keyword
  validation.

- **Job Description**: Title and description validation to ensure
  content is clear, relevant, and free of inappropriate language.

#### **2. Workflow for Content Submission**

When a user submits content (e.g., a project or job post), the **Content
Moderation Microservice** follows these steps:

1.  **Content Reception**:

    - The content is submitted via the appropriate API endpoint (e.g.,
      POST /api/moderate/content for projects or services).

2.  **Field-Level Validation**:

    - Each field is validated according to predefined rules. This
      includes checking for profanity, banned keywords, and ensuring
      that the content does not exceed length limits.

3.  **Code Example**:

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

4.  \
    **Media Validation**:

    - If the content includes media (e.g., images or videos), the
      **Media Moderation Service** scans the files for explicit content
      and ensures they meet the platform's requirements for file type
      and size.

5.  **Code Example**:

import { Injectable } from \'@nestjs/common\';

import \* as cloudflare from \'cloudflare-media-mod\'; // Example
third-party service

\@Injectable()

export class MediaModerationService {

async moderateImage(imageUrl: string): Promise\<boolean\> {

const scanResult = await cloudflare.scanImage(imageUrl);

if (scanResult.containsInappropriateContent) {

return false; // Reject image if adult content is detected

}

return true; // Approve image

}

}

6.  \
    **Submission Status**:

    - If the content passes all field-level and media checks, it is
      marked as **approved** and submitted for storage in the database.

    - If any issues are detected, the content is **flagged** for further
      review or **rejected**.

7.  **Code Example**:

@Injectable()

export class ContentModerationService {

async processContent(contentId: string, contentType: string, content:
string) {

const isValid = await
this.contentValidationService.validateContent(content);

if (!isValid) {

return { status: \'rejected\', reason: \'Content failed moderation\' };

}

// Approve and save content if validation passes

await this.contentRepository.save({ contentId, contentType, status:
\'approved\' });

return { status: \'approved\', reason: \'Content passes validation\' };

}

}



#### **3. Flagging and Rejecting Content**

If content fails any of the validation checks, it can be flagged for
further review or rejected outright. The system will notify the user of
the reason for rejection.

1.  **Flagged Content**:

    - Flagged content is stored in the database with a **pending**
      status. A notification is sent to the admin or moderation team for
      manual review.

2.  **Rejected Content**:

    - Rejected content is discarded, and the user is notified with a
      detailed explanation of why their content was rejected (e.g.,
      profanity, inappropriate keywords).

3.  **Code Example**:

@Injectable()

export class ContentModerationService {

async rejectContent(contentId: string, reason: string) {

await this.contentRepository.save({

contentId,

status: \'rejected\',

reason

});

// Notify user about rejection

await this.notificationService.sendRejectionNotice(contentId, reason);

}

}



#### **4. Logging & Auditing**

All moderation actions (approval, rejection, flagging) are logged for
transparency and auditing. These logs can be accessed via the
**Moderation Log API**.

**Code Example for Logging**:

import { Injectable } from \'@nestjs/common\';

import { ModerationLogService } from \'./moderation-log.service\';

\@Injectable()

export class ContentModerationService {

constructor(private readonly moderationLogService: ModerationLogService)
{}

async logAction(contentId: string, action: string, reason: string \|
null) {

await this.moderationLogService.createLog({

contentId,

action,

reason

});

}

}



#### **5. Workflow Example: Project Submission**

Here's an example of the **entire workflow** when a user submits a new
project for moderation:

1.  **User submits project** with title, description, tags, skills, and
    media.

2.  **Field-Level Validation** is triggered (checks for profanity,
    banned keywords).

3.  **Media Validation** (image/video content) is triggered.

4.  Content is either **approved**, **flagged**, or **rejected** based
    on the validation results.

5.  If approved, the project is stored in the **database** and becomes
    visible on the marketplace.

6.  If flagged, a notification is sent to the **admin** for manual
    review.
