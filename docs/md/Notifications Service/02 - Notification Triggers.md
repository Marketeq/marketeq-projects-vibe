**02 - Notification Triggers**

**Purpose**

This document defines the types of platform events the
notification-service is expected to listen to via RabbitMQ. These
examples represent common cases, but they are not a complete list of all
future notification triggers. Events may be added, modified, or
deprecated over time.

**Event Consumption Overview**

The notification service subscribes to various event queues from
microservices such as the listing service, messaging service, review
service, user service, and contract/job services. Each event corresponds
to a specific type of user action or platform event that may require
notification delivery.

**Example Events and Source Services**

These are illustrative examples of events that could trigger
notifications:

  **Event Name**        **Source Service**     **Example Description**
  --------------------- ---------------------- ---------------------------------------------------------------------------
  project.approved      listing-service        Notifies a client that their project has been approved.
  project.rejected      listing-service        Notifies a client that their project was rejected and needs revisions.
  message.sent          messaging-service      Notifies a user that they've received a new direct message.
  review.received       review-service         Notifies a talent user that a new review has been added to their profile.
  team.assigned         listing-service        Notifies a contractor that they have been assigned to a project task.
  application.updated   job-service            Notifies applicants when the status of their job application changes.
  contract.started      contract-service       Notifies both client and contractor when a contract becomes active.
  contract.completed    contract-service       Notifies both parties when a contract is completed.
  account.flagged       user-service           Alerts a user if their account has been flagged for moderation.
  account.reinstated    user-service           Informs the user if their account has been reinstated.
  admin.broadcast       notification-service   Used for platform-wide admin announcements.

This list is non-exhaustive and subject to change based on future
feature needs.

**Event Subscription Format**

Events are consumed via RabbitMQ using topic-based subscriptions. Events
should follow a namespaced format:

\<service\>.\<entity\>.\<eventType\>

Examples:

- listing.project.approved

- messaging.message.sent

- review.profile.received

**Future-Proofing for Additional Triggers**

The notification service is built with extensibility in mind. As new
events are added across the platform, developers can add new RabbitMQ
subscribers with minimal effort. All event handlers route through a
centralized EventDispatcherService which manages delivery channels, user
preferences, and notification storage.

Potential future event categories (for reference):

- Payment-related events (e.g., invoice paid, refund issued)

- Milestone completion inside contracts

- Profile or project view alerts (if opt-in)

- Job saved/bookmarked

- Feature releases, marketing campaigns, and onboarding steps
