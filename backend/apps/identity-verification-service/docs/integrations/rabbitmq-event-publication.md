# RabbitMQ Event Publication — Identity Verification Service

## What's confirmed

- **Technical Architecture Section 5:** RabbitMQ (not polling) is the confirmed mechanism for publishing state-change events, consumed by notification-service and any other interested consumer.

- **The six event types and their trigger conditions** — Doc 05 Step 5, restated in identity-verification-event-catalog.ts.

- **The message body shape:** `IdentityVerificationEvent { eventType, profileId, userId, occurredAt, data? }` — Doc 05 Step 5.

- **Delivery semantics:** A publish failure is logged and swallowed, never thrown back to the caller. "A notification-event failure must never break the request that triggered it" (Doc 05 Step 5's own code comment). No retry, no outbox — Doc 05 Section 7 already flags this as an open question.

## What's NOT confirmed (Doc 05 Step 5's own placeholder)

- **The exchange name** (`identity-verification.events`), its type (`topic`), and the routing-key pattern (`identity-verification.<event-type>`) are Doc 05's own recommended default, not a Product or Architecture decision. Technical Architecture Section 4: "category/integration specifics remain undecided."

- **Marketeq's real shared RabbitMQ messaging client/abstraction** (Technical Architecture Section 17: referenced, but "no specific package name is confirmed") — Doc 05 built directly on amqplib instead of guessing.

## This document's contribution

This document does not change the exchange name, routing key, message body, or delivery semantics — all remain exactly as Doc 05 Step 5 left them.

What this document adds is a way to actually observe the publisher working end-to-end against a real broker: see the diagnostic scripts in Step 2 of Doc 07 and Step 5 (Verify).

See `notification-service-handoff.md` for whether this topology is compatible with notification-service's own confirmed consumption patterns.
