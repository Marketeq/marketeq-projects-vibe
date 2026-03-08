**03 - Notification Types & Payload Structure**

**Purpose**

This document outlines how different types of notifications are
categorized and how the notification payloads are structured within the
notification-service. It supports dynamic notification generation,
flexible delivery, and localized formatting.

This document does **not** attempt to define every notification the
system will ever use. Instead, it provides a standard payload structure
and handling pattern that all notification types must follow.

**Notification Categories (Examples Only)**

Categories help organize user preferences and control routing logic.

- **Messages** -- Direct messages or group chat notifications

- **Projects** -- Project approval, rejection, assignment, etc.

- **Reviews** -- New reviews received

- **Applications** -- Job application status updates

- **Contracts** -- Contract starts, completions, milestones

- **Account** -- Flags, suspensions, reinstatements

- **Platform** -- Admin messages, updates, announcements

These are **not hardcoded**; new categories can be added as the platform
evolves.

**Core Payload Structure**

All notifications conform to a standard structure. This ensures
consistency across delivery methods and simplifies processing.

{

\"recipientId\": \"uuid\",

\"category\": \"projects\",

\"event\": \"project.approved\",

\"title\": \"Your project has been approved!\",

\"body\": \"Your project \\\"Landing Page Redesign\\\" is now live on
the marketplace.\",

\"link\": \"/projects/abc123\",

\"metadata\": {

\"projectId\": \"abc123\",

\"moderated\": false

},

\"delivery\": {

\"inApp\": true,

\"email\": true,

\"sms\": false

},

\"origin\": \"system\",

\"createdAt\": \"2025-06-04T16:00:00Z\"

}



**Payload Field Definitions**

- recipientId: The UUID of the user receiving the notification

- category: Used to group notifications for user preferences

- event: Internal event name used for logs and analytics

- title: Short notification title (used in toasts, inbox)

- body: Descriptive text for email or in-app details

- link: Relative link to redirect the user when clicked

- metadata: Optional object with context-specific data

- delivery: Flags for which channels this notification will use

- origin: Either system or manual

- createdAt: ISO timestamp of when the notification was created

**Formatting & Localization**

If localization is required in the future, title and body should be
generated through a template system with language keys. Example:

\"title\": \"notifications.project.approved.title\",

\"body\": \"notifications.project.approved.body\"

This allows dynamic translation based on user language preferences.

**Payload Usage by Channel**

- **In-App (Ably)**: Uses title, body, link, and badge counter

- **Email (SendGrid)**: Uses title, body, and optionally metadata

- **Database**: Full payload is stored unless filtered out

- **SMS** (future): Will use a short version of body only
