**04 - Ably Integration for In-App Alerts**

**Purpose**

This document describes how the notification-service uses Ably to send
real-time in-app notifications, badge counter updates, and toast-style
alerts to users. It covers channel structure, event publishing, and
integration setup.

This system is responsible only for publishing events to Ably. Frontend
clients are responsible for subscribing to channels and displaying
notifications in the UI.

**Ably Usage in the Platform**

Ably is used for:

- Delivering toast notifications (non-persistent)

- Updating bell icon badge counters (based on unread count)

- Delivering payloads for in-app notification center

All communication is one-way: from the backend to Ably. The frontend
listens to those updates per user.

**Channel Naming Convention**

Ably channels follow a consistent format:

user-{userId}-notifications

Each user has a private Ably channel, and the frontend subscribes after
authentication.

**Message Format Sent to Ably**

The published message structure matches the standard notification
payload:

{

\"event\": \"project.approved\",

\"title\": \"Your project has been approved!\",

\"body\": \"Your project \'Landing Page Redesign\' is now live.\",

\"link\": \"/projects/abc123\",

\"unreadCount\": 4,

\"metadata\": {

\"projectId\": \"abc123\"

}

}

The unreadCount is calculated before publishing and included in every
message.

**Installation and SDK Setup**

Install the Ably SDK:

yarn add ably

Create a new service in src/ably/ably.service.ts:

import { Injectable, Logger } from \'@nestjs/common\';

import Ably from \'ably\';

\@Injectable()

export class AblyService {

private client: Ably.Realtime;

private readonly logger = new Logger(AblyService.name);

constructor() {

this.client = new Ably.Realtime(process.env.ABLY_API_KEY);

}

async publishToUser(userId: string, payload: any) {

const channel =
this.client.channels.get(\`user-\${userId}-notifications\`);

try {

await channel.publish(\'notification\', payload);

} catch (err) {

this.logger.error(\`Failed to publish to Ably for user \${userId}\`,
err);

}

}

}

Register the service in AblyModule and import it into
NotificationModule.

Usage example:

await this.ablyService.publishToUser(user.id, {

event: \'project.approved\',

title: \'Your project has been approved!\',

body: \'Landing Page Redesign is now live.\',

link: \'/projects/abc123\',

unreadCount: 4,

metadata: { projectId: \'abc123\' }

});

> 

**Ably Permissions (Frontend Reminder)**

Frontend clients must:

- Authenticate via Ably with a token

- Subscribe to their private user channel only

- Handle real-time message parsing and display

**Notes**

- No messages are stored in Ably. Persistence is handled by PostgreSQL.

- If Ably delivery fails (e.g., disconnected client), no retry mechanism
  is used.

- Toasts and badges are triggered purely from the frontend side based on
  Ably payload.
