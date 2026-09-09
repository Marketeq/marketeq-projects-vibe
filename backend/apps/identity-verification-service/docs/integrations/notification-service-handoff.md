# Notification-Service Handoff — What's Actually Confirmed

## The confirmed relationship

Technical Architecture Section 4: "notification-service — consumes events emitted by this service via its existing RabbitMQ pipeline; category/integration specifics remain undecided."

That is the entire confirmed relationship between the two services. Everything below is what notification-service's own architecture docset says about its consuming side.

## notification-service's own docs disagree on how it consumes

**"02 - Notification Triggers"** describes topic-based RabbitMQ subscriptions with a three-segment namespaced format: `<service>.<entity>.<eventType>` (examples: listing.project.approved, messaging.message.sent). No exchange name is given.

**"NestJS notification-service bootstrap"** describes something different and incompatible: a single fixed queue (notifications_queue) consumed via @nestjs/microservices' RMQ transport, keyed on one message pattern (send_notification) carrying a generic `{ type: 'email'|'push', to, subject?, message, channel?, event? }` payload — not a topic exchange, and not per-event routing at all.

These two confirmed notification-service documents do **not agree** with each other, and no source states which pattern (if either) reflects what is actually deployed.

**Note also:** Even taken at face value, "02"'s three-segment format (`<service>.<entity>.<eventType>`) does not match this service's own two-segment routing key (`identity-verification.<event-type>`, Doc 05 Step 5) — so this service's placeholder topology is **not confirmed compatible** with either of notification-service's own patterns.

## The confirmed stored-notification payload shape (informational only)

"03 - Notification Types & Payload Structure" gives notification-service's internal/stored record shape:

```
{
  recipientId,
  category,
  event,
  title,
  body,
  link,
  metadata,
  delivery: { inApp, email, sms },
  origin,
  createdAt
}
```

This is real and stable. But it describes notification-service's own stored record, not a confirmed wire-level RabbitMQ message body a producer must publish. No source states that identity-verification-service's outbound event must arrive in this shape.

## A confirmed REST pattern exists elsewhere — not for this service

"Sending Team Member Invitations via Notification Service" documents a real, working cross-service REST call: User Registration Service calls notification-service's `POST /notification/send-invite` directly over HTTP, with no visible auth header.

This is scoped specifically to team invitations and is not connected to identity-verification-service by any source. It is cited here only as platform precedent that unauthenticated service-to-service REST calls apparently happen elsewhere today.

## What this means for this document series

Resolving the actual exchange/queue/routing-key/message-schema contract between identity-verification-service and notification-service requires both teams to agree on one pattern — this document cannot make that decision unilaterally.
