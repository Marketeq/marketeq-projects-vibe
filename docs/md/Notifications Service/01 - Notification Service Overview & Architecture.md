**Notification Service -- Document 1: Overview & Architecture**

**Purpose**

The notification-service handles the platform\'s end-to-end notification
system. It listens to platform events via RabbitMQ, applies user
preferences, delivers messages across in-app and email channels, and
stores notification history for users. This service ensures real-time
feedback, reliable audit trails, and scalable alert delivery throughout
the system.

**Technologies Used**

- **NestJS (monorepo)**: Service logic and REST API endpoints

- **RabbitMQ**: Asynchronous event listening from other microservices

- **Ably**: Real-time in-app notifications and UI badge delivery

- **SendGrid**: Email notifications using transactional templates

- **PostgreSQL**: Persistent storage for notifications, preferences, and
  unread counts

**Core Responsibilities**

- Subscribe to platform events from RabbitMQ

- Process and deliver notifications based on user preferences

- Send in-app alerts using Ably

- Send email alerts using SendGrid

- Store each notification (except frontend-only toasts)

- Track unread notifications and maintain badge counters

- (Planned) Support for SMS and push notifications

- (Planned) Admin dashboard to manage manual or scheduled notifications

**Planned Manual Notification Composer**

The system is designed to support future development of an admin-facing
interface to:

- Compose manual notifications or platform announcements

- Schedule or preview outgoing notifications

- Target user segments by type, status, or behavior

- Approve or pause scheduled messages before delivery

Database support for manual notifications includes fields such as:

- origin: \'system\' or \'manual\'

- status: \'pending\', \'sent\', or \'cancelled\'

- scheduled_time

- created_by

**High-Level Flow (Example)**

1.  Event is published to RabbitMQ by another service (e.g.,
    project.approved)

2.  Notification service consumes the event

3.  User preferences are fetched (e.g., allow email, allow in-app)

4.  Notification is written to PostgreSQL

5.  Ably sends the real-time message and badge update

6.  SendGrid sends the email (if enabled)

7.  Unread count is updated in the database

**Folder Structure (Inside Monorepo)**

This is the recommended layout for the notification service inside the
monorepo:

- app/notification-service/src/

  - events/ -- RabbitMQ subscribers

  - ably/ -- In-app publishing logic

  - sendgrid/ -- Email service integration

  - controllers/ -- REST API endpoints

  - services/ -- Notification creation, dispatch, and unread logic

  - preferences/ -- User delivery settings

  - entities/ -- TypeORM models

  - dtos/ -- Data transfer objects

  - main.ts -- Service entry point

**Environment Variables**

The following values must be configured in the service\'s .env file:

- ABLY_API_KEY

- SENDGRID_API_KEY

- DATABASE_URL

- RABBITMQ_URL
