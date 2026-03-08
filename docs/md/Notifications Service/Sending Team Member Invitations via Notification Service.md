**Sending Team Member Invitations via Notification Service (Including
Invitation Link)**

### **Objective**

The goal is to send email invitations to team members during the
registration onboarding process, using **SendGrid** through the
**Notification Service**. Invitations will contain:

- **Dynamic invitation link** for team members to accept the invitation.

- **Email fields** where team member emails can be manually entered by
  the user.

By integrating **SendGrid** into the **Notification Service**, you
centralize communication-related tasks in your microservices
architecture. This approach keeps your user-related logic clean and
decouples email sending from core user registration and team management
features. It also allows easy expansion in the future, should you want
to extend notifications to other channels (SMS, push notifications,
etc.).

The invitation link functionality is securely generated using **JWT**.

### **Key Features & Screen Layout**

1.  **Email Input Fields**:

    - Users can input team member emails directly.

    - Users can add additional email fields dynamically using an \"Add
      Another\" button.

2.  **Invitation Link**:

    - A pre-generated invitation link is displayed for sharing.

    - The user can copy the link and share it with their team.

### **Microservices Overview**

1.  **User Registration Service**: Handles user sign-up, basic
    information input (email, password), and triggers the **Notification
    Service** when teammates are invited.

2.  **Notification Service**: Sends the email invitations using
    **SendGrid** and handles the **invitation link generation** logic.

3.  **Team Management Service**: Manages team member operations such as
    adding/removing team members and initiating the invitation process.

### **1. Set Up SendGrid in the Notification Service**

1.  **Install SendGrid\**
    In the **Notification Service**, install the **SendGrid** package:

npm install \@sendgrid/mail

2.  \
    **Set SendGrid API Key\**
    Store the **SendGrid API Key** securely in environment variables
    (e.g., in a .env file):

SENDGRID_API_KEY=your-sendgrid-api-key



### **2. Generating and Sharing the Invitation Link**

The **invitation link** will be dynamically generated for each user,
containing a unique token that can be shared with team members.

#### **Generate the Invitation Token (JWT)**

To generate a secure token for each invite, use **JWT**.

##### **Example: Generating Token in NestJS**

****import { Injectable } from \'@nestjs/common\';

import \* as jwt from \'jsonwebtoken\'; // JWT library for generating
tokens

\@Injectable()

export class NotificationService {

// Generate invitation token (JWT)

generateInvitationToken(userId: string, teamId: string): string {

const payload = { userId, teamId };

const secretKey = process.env.JWT_SECRET_KEY; // Secret key to sign the
token

const token = jwt.sign(payload, secretKey);

return token;

}

}

- \
  **generateInvitationToken** creates a **JWT token** that contains user
  and team data.

#### **Generate the Invitation Link**

Once the token is generated, the invitation link is formed:

https://projects.marketeqdigital.com/invite/{uniqueToken}

##### **Invitation Link Example:**

****https://projects.marketeqdigital.com/invite/abc123xyz

This link will be included in the **email invitation**.

### **3. Notification Service: Sending Email Invitations**

The **Notification Service** will send email invitations to the team
members using **SendGrid**. The email will contain the invitation link.

#### **Service Code (NestJS)**

****import { Injectable } from \'@nestjs/common\';

import \* as sgMail from \'@sendgrid/mail\';

\@Injectable()

export class NotificationService {

constructor() {

sgMail.setApiKey(process.env.SENDGRID_API_KEY); // Set SendGrid API key

}

// Send email invitations to team members

async sendTeamInvites(senderEmail: string, teamMemberEmails: string\[\],
userId: string, teamId: string) {

const token = this.generateInvitationToken(userId, teamId);

const invitationLink =
\`https://projects.marketeqdigital.com/invite/\${token}\`; // Invitation
link

const messages = teamMemberEmails.map(email =\> ({

to: email,

from: senderEmail, // Sender email (could be user or company email)

subject: \'You've been invited to join the team!\',

text: \`Hello, you've been invited to join the team! Please click the
following link to sign up and get started: \${invitationLink}\`,

html: \`\<p\>Hello,\</p\>\<p\>You've been invited to join the team!
Click \<a href=\"\${invitationLink}\"\>here\</a\> to sign up and get
started.\</p\>\`,

}));

try {

await sgMail.send(messages); // Send email via SendGrid

return { success: true, message: \'Invitations sent successfully!\' };

} catch (error) {

console.error(\'Error sending invitations:\', error);

throw new Error(\'Failed to send invitations\');

}

}

}

#### **Controller Code (NestJS)**

In the **Notification Service**, create a controller to expose an
endpoint for other services to send the invitations:

import { Controller, Post, Body } from \'@nestjs/common\';

import { NotificationService } from \'./notification.service\';

import { SendInviteDto } from \'./dto/send-invite.dto\';

\@Controller(\'notification\')

export class NotificationController {

constructor(private readonly notificationService: NotificationService)
{}

// Endpoint to send invitations

\@Post(\'send-invite\')

async sendInvite(@Body() sendInviteDto: SendInviteDto) {

const { senderEmail, teamMemberEmails, userId, teamId } = sendInviteDto;

// Call Notification Service to send invitations

return this.notificationService.sendTeamInvites(senderEmail,
teamMemberEmails, userId, teamId);

}

}



### **4. Handling Responses and Failures**

- The **Notification Service** should be able to handle errors from
  **SendGrid** (e.g., invalid email addresses, API limits).

- If any error occurs while sending the invitations (e.g., rate limits,
  invalid email format), the **User Registration Service** should handle
  retries or notify the user accordingly.

### **5. User Registration Service Integration**

Once the user has successfully signed up, the **User Registration
Service** will trigger the **Notification Service** to send out
invitations to any team members the user specifies.

#### **Integration Example (NestJS)**

****import { Injectable } from \'@nestjs/common\';

import { HttpService } from \'@nestjs/axios\';

import { SendInviteDto } from \'./dto/send-invite.dto\';

\@Injectable()

export class UserRegistrationService {

constructor(private readonly httpService: HttpService) {}

// After successful registration, call Notification Service to send team
invites

async sendInvites(senderEmail: string, teamMemberEmails: string\[\],
userId: string, teamId: string) {

const sendInviteDto: SendInviteDto = {

senderEmail: senderEmail,

teamMemberEmails: teamMemberEmails,

userId: userId, // The registered user\'s ID

teamId: teamId, // The team ID

};

// Call Notification Service\'s \'send-invite\' API

const response = await this.httpService

.post(\'http://notification-service/api/v1/notification/send-invite\',
sendInviteDto)

.toPromise();

if (response.data.success) {

console.log(\'Invitations sent successfully!\');

} else {

throw new Error(\'Failed to send invitations\');

}

}

}



### **6. Communication Between Microservices**

- The **User Registration Service** sends an HTTP request to the
  **Notification Service** to trigger email invitations.

- The **Notification Service** exposes a RESTful endpoint (POST
  /notification/send-invite) to send invites using the **SendGrid API**.

- The **Team Management Service** (if part of the workflow) could also
  interact with the **Notification Service** to trigger email
  invitations when adding/removing team members.

### **7. Scalability and Considerations**

- **Queueing**: If you anticipate high email volume, consider
  introducing a message queue (e.g., **RabbitMQ**, **Kafka**) to manage
  email invite tasks asynchronously and scale the **Notification
  Service** independently.

- **Rate Limiting**: Implement rate limiting to handle **SendGrid's**
  API limitations, ensuring smooth operation during peak times.
