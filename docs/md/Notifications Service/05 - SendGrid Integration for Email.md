**05 - SendGrid Integration for Email**

**Purpose**

This document outlines how the notification-service uses SendGrid to
deliver email notifications. It covers integration, template handling,
delivery logic, and fallback behavior. It also includes the actual
NestJS implementation needed for developers to integrate and use the
SendGrid client.

The service sends only transactional and platform-based emails.
Marketing or campaign-style emails are managed separately.

**SendGrid Account & Setup**

- The platform already has a verified SendGrid account.

- The domain is authenticated and ready for production email delivery.

- The API key is stored in the environment variable: SENDGRID_API_KEY

Install the SendGrid SDK:

yarn add \@sendgrid/mail

> 

**SendGridService Implementation (NestJS)**

Create a service at src/sendgrid/sendgrid.service.ts:

import { Injectable, Logger } from \'@nestjs/common\';

import \* as sgMail from \'@sendgrid/mail\';

\@Injectable()

export class SendGridService {

private readonly logger = new Logger(SendGridService.name);

constructor() {

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

}

async sendNotificationEmail(to: string, templateId: string, dynamicData:
any) {

try {

await sgMail.send({

to,

from: \'noreply@marketeq.com\',

templateId,

dynamicTemplateData: dynamicData

});

} catch (err) {

this.logger.error(\`Failed to send email to \${to}\`, err);

}

}

}

Register the service in sendgrid.module.ts and import it into your main
NotificationModule.

**Email Use Cases**

SendGrid is used to send emails for notifications that the user has
enabled under their preferences. Example types include:

- Project approval or rejection

- Job application status

- New review or feedback

- Contract started or completed

- Account flagging or reinstatement

- Admin or platform announcements

This list is non-exhaustive and delivery is based on user preferences
per notification category.

**Template Usage**

All emails use dynamic templates stored in SendGrid. Templates contain:

- Placeholder tags (e.g., {{title}}, {{body}}, {{ctaLink}})

- Visual formatting aligned with brand guidelines

Payloads are injected using dynamic template data per notification.

**Email Payload Format**

Example of data passed to SendGrid:

{

\"to\": \"user@example.com\",

\"from\": \"noreply@marketeq.com\",

\"template_id\": \"d-xxxxxxxxxx\",

\"dynamic_template_data\": {

\"title\": \"Your project has been approved!\",

\"body\": \"Your project \'Landing Page Redesign\' is now live on the
marketplace.\",

\"ctaLink\": \"https://app.marketeq.com/projects/abc123\"

}

}

> 

**Send Logic**

- The system checks user preferences before sending

- If the user has opted out of email for a category, no email is sent

- If SendGrid fails (timeout or error), it is logged in the service

- Email is not retried unless retry logic is explicitly added in a
  future queue handler

You may call the email function from your main notification dispatcher:

await this.sendGridService.sendNotificationEmail(

user.email,

\'d-template-id-here\',

{

title: \'Your project has been approved!\',

body: \'Landing Page Redesign is now live.\',

ctaLink: \'https://app.marketeq.com/projects/abc123\'

}

);

> 

**Best Practices**

- Use short subject lines, matching title

- Link back to platform with ctaLink

- Avoid attaching files or large media

- Keep dynamic values concise and sanitized

- Use environment variables for template IDs if different per
  environment
