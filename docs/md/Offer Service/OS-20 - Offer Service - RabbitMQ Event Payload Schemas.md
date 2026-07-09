**OS-20**

**Offer Service --- RabbitMQ Event Payload Schemas**

**Events:** 14 **Exchange:** marketeq.offers **Schema version:** 1
**Format:** application/json UTF-8

This document defines the complete payload shape for every event
published by offer-service to the marketeq.offers exchange. Every
payload follows a common base envelope plus event-specific fields.
Consuming services --- contracts-service, notification-service,
messaging-service --- parse these payloads. Any breaking change to a
payload requires incrementing schemaVersion and coordinating the
consuming service deployments.

**File Map**

  ---------- ------------------------------------------------ ----------------------
  **Step**   **File Path**                                    **Purpose**

  **1**      src/messaging/events/offer-event-payloads.ts     All 14 TypeScript
                                                              payload interfaces +
                                                              WorkSchedule type

  **2**      src/messaging/events/offer-payload-builders.ts   Builder functions used
                                                              by service methods to
                                                              create payloads

  **3**      (reference)                                      All 14 event payloads
                                                              as JSON examples with
                                                              field-by-field notes

  **4**      (reference)                                      Consumer parsing guide
                                                              --- how downstream
                                                              services should handle
                                                              events
  ---------- ------------------------------------------------ ----------------------

+-----------------------------------------------------------------------+
| **Overview Base Payload Envelope**                                    |
|                                                                       |
| Fields present in every event published by offer-service              |
+-----------------------------------------------------------------------+

Every event payload begins with a base envelope containing a common set
of fields that all consumers can rely on regardless of event type.
Event-specific fields are added on top of this base.

+-----------------------------------------------------------------------+
| // Base envelope --- present in every offer-service event             |
|                                                                       |
| {                                                                     |
|                                                                       |
| \"eventId\": \"uuid-v4\", // Unique ID for this event emission        |
|                                                                       |
| \"eventType\": \"offer.created\", // Routing key --- matches          |
| OFFER_ROUTING_KEYS                                                    |
|                                                                       |
| \"schemaVersion\": \"1\", // Increment on breaking payload changes    |
|                                                                       |
| \"occurredAt\": \"2025-01-30T10:00:00.000Z\", // ISO 8601 UTC ---     |
| when the event occurred                                               |
|                                                                       |
| \"offerId\": \"uuid-v4\", // The primary offer this event relates to  |
|                                                                       |
| \"clientId\": \"uuid-v4\", // The client who sent the offer           |
|                                                                       |
| \"talentId\": \"uuid-v4\", // The talent who received the offer       |
|                                                                       |
| \"jobListingId\": \"uuid-v4\", // The job listing the offer is for    |
|                                                                       |
| \"contractType\": \"PROJECT\", // PROJECT \| SERVICE \| TEAM \|       |
| CONTRACT                                                              |
|                                                                       |
| \"contractTitle\": \"Alpha Platform Rebuild\" // Contract title       |
|                                                                       |
| }                                                                     |
|                                                                       |
| // eventId: Generated on publish, not stored in DB.                   |
|                                                                       |
| // Consumers use this for idempotency (avoid processing the same      |
| event twice).                                                         |
|                                                                       |
| // If the outbox retries a delivery, the same eventId is reused.      |
|                                                                       |
| // Consumers MUST store consumed eventIds and skip duplicates.        |
|                                                                       |
| // occurredAt: The timestamp of the state change, NOT the publish     |
| time.                                                                 |
|                                                                       |
| // For SYSTEM events (scheduler): the moment the scheduler ran.       |
|                                                                       |
| // For CLIENT/TALENT events: the moment the API request was           |
| processed.                                                            |
|                                                                       |
| // schemaVersion: \"1\" for all initial events.                       |
|                                                                       |
| // If a field is removed or renamed: increment to \"2\".              |
|                                                                       |
| // Adding optional fields is backwards-compatible --- no version bump |
| needed.                                                               |
+-----------------------------------------------------------------------+

**Actor field --- who triggered the event**

Every event also carries an actor field identifying who triggered it.
This determines the notification recipient direction.

+-----------------------------------------------------------------------+
| \"actor\": \"CLIENT\", // CLIENT --- client user action: create,      |
| edit, withdraw, resend                                                |
|                                                                       |
| \"actor\": \"TALENT\", // TALENT --- talent user action: accept,      |
| decline, counter offer                                                |
|                                                                       |
| \"actor\": \"SYSTEM\", // SYSTEM --- automated: expiry scheduler,     |
| warning scheduler                                                     |
|                                                                       |
| \"actorId\": \"uuid\", // userId of the actor. null for SYSTEM        |
| events.                                                               |
|                                                                       |
| // notification-service uses actor + actorId to:                      |
|                                                                       |
| // 1. Identify who triggered the event                                |
|                                                                       |
| // 2. Determine who the notification recipient is (the OTHER party)   |
|                                                                       |
| // 3. Fetch display name for the notification body                    |
+-----------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| **Step 1 TypeScript Payload Interfaces --- offer-event-payloads.ts**  |
|                                                                       |
| All 14 event payload types in one file                                |
+-----------------------------------------------------------------------+

Define all payload interfaces in one file. These are imported by the
payload builders (Step 2) and by any consumer service that is written in
TypeScript. The interfaces enforce type safety when constructing and
parsing payloads.

  -----------------------------------------------------------------------
  **FILE:
  apps/offer-service/src/messaging/events/offer-event-payloads.ts**

  -----------------------------------------------------------------------

+-----------------------------------------------------------------------+
| import { ContractType } from                                          |
| \'../../offers/enums/contract-type.enum\';                            |
|                                                                       |
| import { WorkScheduleType } from                                      |
| \'../../offers/enums/work-schedule-type.enum\';                       |
|                                                                       |
| import { OfferRoutingKey } from \'../constants/rabbitmq.constants\';  |
|                                                                       |
| // ============================================================       |
|                                                                       |
| // Shared sub-types                                                   |
|                                                                       |
| // ============================================================       |
|                                                                       |
| /\*\* Work schedule as it appears in every offer-related payload. \*/ |
|                                                                       |
| export interface PayloadWorkSchedule {                                |
|                                                                       |
| type: WorkScheduleType;                                               |
|                                                                       |
| hoursPerWeek?: number; // Only present when type = CUSTOM             |
|                                                                       |
| }                                                                     |
|                                                                       |
| /\*\* Snapshot of offer terms included in most payloads. \*/          |
|                                                                       |
| export interface OfferTermsPayload {                                  |
|                                                                       |
| rate: number; // Integer. e.g. 95                                     |
|                                                                       |
| currencyCode: string; // ISO 4217. e.g. \"USD\"                       |
|                                                                       |
| durationMonths: number; // Integer. e.g. 6                            |
|                                                                       |
| workSchedule: PayloadWorkSchedule;                                    |
|                                                                       |
| startDate: string; // YYYY-MM-DD. e.g. \"2025-03-01\"                 |
|                                                                       |
| message: string \| null; // Optional message from sender              |
|                                                                       |
| }                                                                     |
|                                                                       |
| // ============================================================       |
|                                                                       |
| // Base payload (all events)                                          |
|                                                                       |
| // ============================================================       |
|                                                                       |
| /\*\*                                                                 |
|                                                                       |
| \* BaseOfferEventPayload --- Common fields in every offer-service     |
| event.                                                                |
|                                                                       |
| \* All 14 event payloads extend this interface.                       |
|                                                                       |
| \*/                                                                   |
|                                                                       |
| export interface BaseOfferEventPayload {                              |
|                                                                       |
| eventId: string; // UUID v4. Unique per emission.                     |
|                                                                       |
| eventType: OfferRoutingKey; // Matches the RabbitMQ routing key       |
| exactly.                                                              |
|                                                                       |
| schemaVersion: string; // \"1\" --- increment on breaking changes     |
| only.                                                                 |
|                                                                       |
| occurredAt: string; // ISO 8601 UTC datetime.                         |
|                                                                       |
| actor: \'CLIENT\' \| \'TALENT\' \| \'SYSTEM\';                        |
|                                                                       |
| actorId: string \| null; // userId of the actor. null for SYSTEM.     |
|                                                                       |
| offerId: string;                                                      |
|                                                                       |
| clientId: string;                                                     |
|                                                                       |
| talentId: string;                                                     |
|                                                                       |
| jobListingId: string;                                                 |
|                                                                       |
| contractType: ContractType;                                           |
|                                                                       |
| contractTitle: string;                                                |
|                                                                       |
| }                                                                     |
|                                                                       |
| // ============================================================       |
|                                                                       |
| // Event 01: offer.created                                            |
|                                                                       |
| // ============================================================       |
|                                                                       |
| /\*\*                                                                 |
|                                                                       |
| \* OfferCreatedPayload                                                |
|                                                                       |
| \* Trigger: Client creates a new offer.                               |
|                                                                       |
| \* Consumers: notification-service, messaging-service                 |
|                                                                       |
| \*/                                                                   |
|                                                                       |
| export interface OfferCreatedPayload extends BaseOfferEventPayload {  |
|                                                                       |
| eventType: \'offer.created\';                                         |
|                                                                       |
| actor: \'CLIENT\';                                                    |
|                                                                       |
| terms: OfferTermsPayload;                                             |
|                                                                       |
| expiresAt: string; // ISO 8601 UTC --- when this offer expires        |
|                                                                       |
| }                                                                     |
|                                                                       |
| // ============================================================       |
|                                                                       |
| // Event 02: offer.edited                                             |
|                                                                       |
| // ============================================================       |
|                                                                       |
| /\*\*                                                                 |
|                                                                       |
| \* OfferEditedPayload                                                 |
|                                                                       |
| \* Trigger: Client edits a pending offer.                             |
|                                                                       |
| \* Consumers: notification-service (\"Offer Updated\"),               |
| messaging-service (updates chat card)                                 |
|                                                                       |
| \* Note: notification IS sent to talent when an offer is edited.      |
|                                                                       |
| \*/                                                                   |
|                                                                       |
| export interface OfferEditedPayload extends BaseOfferEventPayload {   |
|                                                                       |
| eventType: \'offer.edited\';                                          |
|                                                                       |
| actor: \'CLIENT\';                                                    |
|                                                                       |
| terms: OfferTermsPayload; // New terms after edit                     |
|                                                                       |
| previousTerms: OfferTermsPayload; // Previous terms before edit       |
|                                                                       |
| expiresAt: string; // Refreshed TTL (NOW + 14 days)                   |
|                                                                       |
| }                                                                     |
|                                                                       |
| // ============================================================       |
|                                                                       |
| // Event 03: offer.accepted                                           |
|                                                                       |
| // ============================================================       |
|                                                                       |
| /\*\*                                                                 |
|                                                                       |
| \* OfferAcceptedPayload                                               |
|                                                                       |
| \* Trigger: Talent accepts a pending offer.                           |
|                                                                       |
| \* Consumers: contracts-service (CRITICAL --- creates ContractGroup   |
| from this payload),                                                   |
|                                                                       |
| \* notification-service, messaging-service                            |
|                                                                       |
| \*                                                                    |
|                                                                       |
| \* IMPORTANT: contracts-service reads ALL fields from this payload to |
| create                                                                |
|                                                                       |
| \* the ContractGroup. Do not remove or rename any field without       |
| coordinating                                                          |
|                                                                       |
| \* with contracts-service team and bumping schemaVersion.             |
|                                                                       |
| \*/                                                                   |
|                                                                       |
| export interface OfferAcceptedPayload extends BaseOfferEventPayload { |
|                                                                       |
| eventType: \'offer.accepted\';                                        |
|                                                                       |
| actor: \'TALENT\';                                                    |
|                                                                       |
| acceptedAt: string; // ISO 8601 UTC                                   |
|                                                                       |
| terms: OfferTermsPayload;                                             |
|                                                                       |
| // Acceptance message is NOT in the payload --- it is stored on the   |
| Offer record only.                                                    |
|                                                                       |
| }                                                                     |
|                                                                       |
| // ============================================================       |
|                                                                       |
| // Event 04: offer.declined                                           |
|                                                                       |
| // ============================================================       |
|                                                                       |
| /\*\*                                                                 |
|                                                                       |
| \* OfferDeclinedPayload                                               |
|                                                                       |
| \* Trigger: Talent declines a pending offer.                          |
|                                                                       |
| \* Consumers: notification-service (\"Offer Declined\"),              |
| messaging-service                                                     |
|                                                                       |
| \*                                                                    |
|                                                                       |
| \* IMPORTANT: declineReason and declineChip are NOT included in the   |
| payload.                                                              |
|                                                                       |
| \* The decline reason is stored in the Offer database record.         |
|                                                                       |
| \* notification-service sends \"Offer Declined\" without the reason.  |
|                                                                       |
| \* The client sees the reason ONLY in the Declined Offer Details      |
| modal.                                                                |
|                                                                       |
| \*/                                                                   |
|                                                                       |
| export interface OfferDeclinedPayload extends BaseOfferEventPayload { |
|                                                                       |
| eventType: \'offer.declined\';                                        |
|                                                                       |
| actor: \'TALENT\';                                                    |
|                                                                       |
| declinedAt: string; // ISO 8601 UTC                                   |
|                                                                       |
| terms: OfferTermsPayload; // Terms at the time of decline (for chat   |
| card)                                                                 |
|                                                                       |
| // declineReason: intentionally omitted. Fetched by client from offer |
| details endpoint.                                                     |
|                                                                       |
| }                                                                     |
|                                                                       |
| // ============================================================       |
|                                                                       |
| // Event 05: offer.withdrawn                                          |
|                                                                       |
| // ============================================================       |
|                                                                       |
| /\*\*                                                                 |
|                                                                       |
| \* OfferWithdrawnPayload                                              |
|                                                                       |
| \* Trigger: Client withdraws a pending offer.                         |
|                                                                       |
| \* Consumers: notification-service (\"Offer Withdrawn\"),             |
| messaging-service                                                     |
|                                                                       |
| \*/                                                                   |
|                                                                       |
| export interface OfferWithdrawnPayload extends BaseOfferEventPayload  |
| {                                                                     |
|                                                                       |
| eventType: \'offer.withdrawn\';                                       |
|                                                                       |
| actor: \'CLIENT\';                                                    |
|                                                                       |
| withdrawnAt: string;                                                  |
|                                                                       |
| withdrawalMessage: string \| null;                                    |
|                                                                       |
| terms: OfferTermsPayload;                                             |
|                                                                       |
| }                                                                     |
|                                                                       |
| // ============================================================       |
|                                                                       |
| // Event 06: offer.expired                                            |
|                                                                       |
| // ============================================================       |
|                                                                       |
| /\*\*                                                                 |
|                                                                       |
| \* OfferExpiredPayload                                                |
|                                                                       |
| \* Trigger: Scheduler expires a pending offer after 14-day TTL.       |
|                                                                       |
| \* Consumers: notification-service (\"Offer Expired\"),               |
| messaging-service                                                     |
|                                                                       |
| \*/                                                                   |
|                                                                       |
| export interface OfferExpiredPayload extends BaseOfferEventPayload {  |
|                                                                       |
| eventType: \'offer.expired\';                                         |
|                                                                       |
| actor: \'SYSTEM\';                                                    |
|                                                                       |
| actorId: null; // Always null for SYSTEM events                       |
|                                                                       |
| expiredAt: string; // ISO 8601 UTC --- the expiresAt timestamp from   |
| the offer record                                                      |
|                                                                       |
| terms: OfferTermsPayload;                                             |
|                                                                       |
| }                                                                     |
|                                                                       |
| // ============================================================       |
|                                                                       |
| // Event 07: offer.expiring_soon                                      |
|                                                                       |
| // ============================================================       |
|                                                                       |
| /\*\*                                                                 |
|                                                                       |
| \* OfferExpiringSoonPayload                                           |
|                                                                       |
| \* Trigger: Scheduler fires 48h before offer TTL (once per expiry     |
| window).                                                              |
|                                                                       |
| \* Consumers: notification-service ONLY (not messaging-service)       |
|                                                                       |
| \*                                                                    |
|                                                                       |
| \* hoursRemaining is approximate (computed at scheduler run time, not |
| exact math).                                                          |
|                                                                       |
| \*/                                                                   |
|                                                                       |
| export interface OfferExpiringSoonPayload extends                     |
| BaseOfferEventPayload {                                               |
|                                                                       |
| eventType: \'offer.expiring_soon\';                                   |
|                                                                       |
| actor: \'SYSTEM\';                                                    |
|                                                                       |
| actorId: null;                                                        |
|                                                                       |
| expiresAt: string; // When the offer will expire                      |
|                                                                       |
| hoursRemaining: number; // Approximate. E.g. 47 (always \<= 48)       |
|                                                                       |
| terms: OfferTermsPayload;                                             |
|                                                                       |
| }                                                                     |
|                                                                       |
| // ============================================================       |
|                                                                       |
| // Event 08: offer.resent                                             |
|                                                                       |
| // ============================================================       |
|                                                                       |
| /\*\*                                                                 |
|                                                                       |
| \* OfferResentPayload                                                 |
|                                                                       |
| \* Trigger: Client resends a terminal (expired/declined/withdrawn)    |
| offer.                                                                |
|                                                                       |
| \* Result: A NEW offer record is created. The new offer ID is in      |
| offerId.                                                              |
|                                                                       |
| \* Consumers: notification-service, messaging-service                 |
|                                                                       |
| \*                                                                    |
|                                                                       |
| \* originalOfferId references the old offer that was resent.          |
|                                                                       |
| \* notification-service shows \"Offer Resent\" to talent.             |
|                                                                       |
| \* messaging-service posts a new offer card in chat.                  |
|                                                                       |
| \*/                                                                   |
|                                                                       |
| export interface OfferResentPayload extends BaseOfferEventPayload {   |
|                                                                       |
| eventType: \'offer.resent\';                                          |
|                                                                       |
| actor: \'CLIENT\';                                                    |
|                                                                       |
| originalOfferId: string; // ID of the original                        |
| expired/declined/withdrawn offer                                      |
|                                                                       |
| terms: OfferTermsPayload; // Terms of the NEW (resent) offer          |
|                                                                       |
| expiresAt: string;                                                    |
|                                                                       |
| }                                                                     |
|                                                                       |
| // ============================================================       |
|                                                                       |
| // Event 09: offer.countered                                          |
|                                                                       |
| // ============================================================       |
|                                                                       |
| /\*\*                                                                 |
|                                                                       |
| \* OfferCounteredPayload                                              |
|                                                                       |
| \* Trigger: Either TALENT (initial CO) or CLIENT (responding CO)      |
| submits a counter offer.                                              |
|                                                                       |
| \* Consumers: notification-service, messaging-service                 |
|                                                                       |
| \*                                                                    |
|                                                                       |
| \* submittedBy determines which party submitted and therefore who     |
| receives the notification.                                            |
|                                                                       |
| \* notification-service uses: \"if submittedBy === CLIENT, notify     |
| TALENT and vice versa.\"                                              |
|                                                                       |
| \*                                                                    |
|                                                                       |
| \* parentOfferTerms = the original offer terms (for comparison        |
| display).                                                             |
|                                                                       |
| \* counterOfferTerms = the new counter offer terms.                   |
|                                                                       |
| \*/                                                                   |
|                                                                       |
| export interface OfferCounteredPayload extends BaseOfferEventPayload  |
| {                                                                     |
|                                                                       |
| eventType: \'offer.countered\';                                       |
|                                                                       |
| actor: \'CLIENT\' \| \'TALENT\';                                      |
|                                                                       |
| counterOfferId: string;                                               |
|                                                                       |
| submittedBy: \'CLIENT\' \| \'TALENT\';                                |
|                                                                       |
| submittedById: string;                                                |
|                                                                       |
| parentOfferTerms: OfferTermsPayload;                                  |
|                                                                       |
| counterOfferTerms: OfferTermsPayload;                                 |
|                                                                       |
| rateWarning: boolean; // true if counter rate exceeds 1.25x threshold |
| (advisory)                                                            |
|                                                                       |
| counterExpiresAt: string; // ISO 8601 UTC --- when the counter offer  |
| expires                                                               |
|                                                                       |
| }                                                                     |
|                                                                       |
| // ============================================================       |
|                                                                       |
| // Event 10: offer.counter_edited                                     |
|                                                                       |
| // ============================================================       |
|                                                                       |
| /\*\*                                                                 |
|                                                                       |
| \* OfferCounterEditedPayload                                          |
|                                                                       |
| \* Trigger: Counter offer submitter edits their own CO in-place.      |
|                                                                       |
| \* Consumers: notification-service (other party notified),            |
| messaging-service                                                     |
|                                                                       |
| \*                                                                    |
|                                                                       |
| \* This is NOT a new counter offer record --- it is an in-place edit  |
| of the existing CO.                                                   |
|                                                                       |
| \* The counterOfferId is the SAME CO ID before and after the edit.    |
|                                                                       |
| \* expiresAt does NOT change on edit (only on new CO creation).       |
|                                                                       |
| \*/                                                                   |
|                                                                       |
| export interface OfferCounterEditedPayload extends                    |
| BaseOfferEventPayload {                                               |
|                                                                       |
| eventType: \'offer.counter_edited\';                                  |
|                                                                       |
| actor: \'CLIENT\' \| \'TALENT\';                                      |
|                                                                       |
| counterOfferId: string;                                               |
|                                                                       |
| submittedBy: \'CLIENT\' \| \'TALENT\';                                |
|                                                                       |
| submittedById: string;                                                |
|                                                                       |
| counterOfferTerms: OfferTermsPayload; // New terms after edit         |
|                                                                       |
| previousTerms: OfferTermsPayload; // Terms before edit                |
|                                                                       |
| counterExpiresAt: string; // Unchanged (no TTL reset on edit)         |
|                                                                       |
| }                                                                     |
|                                                                       |
| // ============================================================       |
|                                                                       |
| // Event 11: offer.counter_accepted                                   |
|                                                                       |
| // ============================================================       |
|                                                                       |
| /\*\*                                                                 |
|                                                                       |
| \* OfferCounterAcceptedPayload                                        |
|                                                                       |
| \* Trigger: The NON-submitter accepts a pending counter offer.        |
|                                                                       |
| \* Result: BOTH the counter offer AND the parent offer move to        |
| ACCEPTED.                                                             |
|                                                                       |
| \* Consumers: contracts-service (CRITICAL), notification-service,     |
| messaging-service                                                     |
|                                                                       |
| \*                                                                    |
|                                                                       |
| \* contracts-service creates ContractGroup from the                   |
| counterOfferTerms.                                                    |
|                                                                       |
| \* The counter offer terms override the original offer terms.         |
|                                                                       |
| \*                                                                    |
|                                                                       |
| \* acceptedBy = the party who accepted (the NON-submitter).           |
|                                                                       |
| \* submittedBy = who originally submitted the counter offer.          |
|                                                                       |
| \*/                                                                   |
|                                                                       |
| export interface OfferCounterAcceptedPayload extends                  |
| BaseOfferEventPayload {                                               |
|                                                                       |
| eventType: \'offer.counter_accepted\';                                |
|                                                                       |
| actor: \'CLIENT\' \| \'TALENT\';                                      |
|                                                                       |
| counterOfferId: string;                                               |
|                                                                       |
| submittedBy: \'CLIENT\' \| \'TALENT\';                                |
|                                                                       |
| acceptedBy: \'CLIENT\' \| \'TALENT\'; // The NON-submitter            |
|                                                                       |
| acceptedById: string;                                                 |
|                                                                       |
| acceptedAt: string;                                                   |
|                                                                       |
| counterOfferTerms: OfferTermsPayload; // The accepted counter offer   |
| terms                                                                 |
|                                                                       |
| originalOfferTerms: OfferTermsPayload; // The original offer terms    |
| (for reference)                                                       |
|                                                                       |
| }                                                                     |
|                                                                       |
| // ============================================================       |
|                                                                       |
| // Event 12: offer.counter_declined                                   |
|                                                                       |
| // ============================================================       |
|                                                                       |
| /\*\*                                                                 |
|                                                                       |
| \* OfferCounterDeclinedPayload                                        |
|                                                                       |
| \* Trigger: The NON-submitter declines the counter offer.             |
|                                                                       |
| \* Result: CO → DECLINED. Parent offer restored to PENDING.           |
|                                                                       |
| \* Consumers: notification-service ONLY                               |
|                                                                       |
| \*                                                                    |
|                                                                       |
| \* parentOfferStatus = \"PENDING\" always (restored after decline).   |
|                                                                       |
| \*/                                                                   |
|                                                                       |
| export interface OfferCounterDeclinedPayload extends                  |
| BaseOfferEventPayload {                                               |
|                                                                       |
| eventType: \'offer.counter_declined\';                                |
|                                                                       |
| actor: \'CLIENT\' \| \'TALENT\';                                      |
|                                                                       |
| counterOfferId: string;                                               |
|                                                                       |
| declinedBy: \'CLIENT\' \| \'TALENT\'; // The NON-submitter            |
|                                                                       |
| declinedById: string;                                                 |
|                                                                       |
| declinedAt: string;                                                   |
|                                                                       |
| counterOfferTerms: OfferTermsPayload;                                 |
|                                                                       |
| parentOfferStatus: \'PENDING\'; // Always PENDING --- restored after  |
| CO decline                                                            |
|                                                                       |
| }                                                                     |
|                                                                       |
| // ============================================================       |
|                                                                       |
| // Event 13: offer.counter_withdrawn                                  |
|                                                                       |
| // ============================================================       |
|                                                                       |
| /\*\*                                                                 |
|                                                                       |
| \* OfferCounterWithdrawnPayload                                       |
|                                                                       |
| \* Trigger: The CO SUBMITTER withdraws their own counter offer.       |
|                                                                       |
| \* Result: CO → WITHDRAWN. Parent offer restored to PENDING.          |
|                                                                       |
| \* Consumers: notification-service ONLY                               |
|                                                                       |
| \*                                                                    |
|                                                                       |
| \* withdrawnBy = the submitter (same as submittedBy).                 |
|                                                                       |
| \*/                                                                   |
|                                                                       |
| export interface OfferCounterWithdrawnPayload extends                 |
| BaseOfferEventPayload {                                               |
|                                                                       |
| eventType: \'offer.counter_withdrawn\';                               |
|                                                                       |
| actor: \'CLIENT\' \| \'TALENT\';                                      |
|                                                                       |
| counterOfferId: string;                                               |
|                                                                       |
| submittedBy: \'CLIENT\' \| \'TALENT\';                                |
|                                                                       |
| withdrawnBy: \'CLIENT\' \| \'TALENT\';                                |
|                                                                       |
| withdrawnById: string;                                                |
|                                                                       |
| withdrawnAt: string;                                                  |
|                                                                       |
| withdrawalMessage: string \| null;                                    |
|                                                                       |
| counterOfferTerms: OfferTermsPayload;                                 |
|                                                                       |
| parentOfferStatus: \'PENDING\';                                       |
|                                                                       |
| }                                                                     |
|                                                                       |
| // ============================================================       |
|                                                                       |
| // Event 14: offer.counter_expired                                    |
|                                                                       |
| // ============================================================       |
|                                                                       |
| /\*\*                                                                 |
|                                                                       |
| \* OfferCounterExpiredPayload                                         |
|                                                                       |
| \* Trigger: Scheduler expires a pending counter offer after 14-day    |
| TTL.                                                                  |
|                                                                       |
| \* Result: CO → EXPIRED. Parent offer restored to PENDING             |
|                                                                       |
| \* (unless the parent independently expired during the CO window).    |
|                                                                       |
| \* Consumers: notification-service ONLY                               |
|                                                                       |
| \*/                                                                   |
|                                                                       |
| export interface OfferCounterExpiredPayload extends                   |
| BaseOfferEventPayload {                                               |
|                                                                       |
| eventType: \'offer.counter_expired\';                                 |
|                                                                       |
| actor: \'SYSTEM\';                                                    |
|                                                                       |
| actorId: null;                                                        |
|                                                                       |
| counterOfferId: string;                                               |
|                                                                       |
| submittedBy: \'CLIENT\' \| \'TALENT\';                                |
|                                                                       |
| expiredAt: string; // ISO 8601 UTC                                    |
|                                                                       |
| counterOfferTerms: OfferTermsPayload;                                 |
|                                                                       |
| parentOfferStatus: \'PENDING\' \| \'EXPIRED\'; // EXPIRED if parent   |
| also expired independently                                            |
|                                                                       |
| }                                                                     |
|                                                                       |
| // ============================================================       |
|                                                                       |
| // Union type --- any offer-service event payload                     |
|                                                                       |
| // ============================================================       |
|                                                                       |
| export type AnyOfferEventPayload =                                    |
|                                                                       |
| \| OfferCreatedPayload                                                |
|                                                                       |
| \| OfferEditedPayload                                                 |
|                                                                       |
| \| OfferAcceptedPayload                                               |
|                                                                       |
| \| OfferDeclinedPayload                                               |
|                                                                       |
| \| OfferWithdrawnPayload                                              |
|                                                                       |
| \| OfferExpiredPayload                                                |
|                                                                       |
| \| OfferExpiringSoonPayload                                           |
|                                                                       |
| \| OfferResentPayload                                                 |
|                                                                       |
| \| OfferCounteredPayload                                              |
|                                                                       |
| \| OfferCounterEditedPayload                                          |
|                                                                       |
| \| OfferCounterAcceptedPayload                                        |
|                                                                       |
| \| OfferCounterDeclinedPayload                                        |
|                                                                       |
| \| OfferCounterWithdrawnPayload                                       |
|                                                                       |
| \| OfferCounterExpiredPayload;                                        |
+-----------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| **Step 2 Payload Builder Functions --- offer-payload-builders.ts**    |
|                                                                       |
| Called by service methods when writing to the outbox                  |
+-----------------------------------------------------------------------+

Each service method that changes offer state calls the corresponding
builder function to create the payload. The builder takes the relevant
entity objects and assembles the correct payload shape. Keeping all
payload assembly in one file ensures consistency and makes it easy to
update all payloads simultaneously if the schema changes.

+-----------------------------------------------------------------------+
| How builders are used:                                                |
|                                                                       |
| 1\. Service method (e.g. OffersService.accept()) changes the offer    |
| status.                                                               |
|                                                                       |
| 2\. Same transaction: service calls this.outboxService.create({       |
|                                                                       |
| eventType: OFFER_EVENTS.ACCEPTED,                                     |
|                                                                       |
| routingKey: OFFER_EVENTS.ACCEPTED,                                    |
|                                                                       |
| payload: buildOfferAcceptedPayload(offer, requesterId),               |
|                                                                       |
| });                                                                   |
|                                                                       |
| 3\. Outbox processor picks up the row and publishes the payload.      |
|                                                                       |
| 4\. The consumer receives the payload with the correct shape.         |
|                                                                       |
| Builders never write to the database. They only produce a plain       |
| object.                                                               |
|                                                                       |
| The outbox service handles serializing it to JSONB for storage.       |
+-----------------------------------------------------------------------+

  -----------------------------------------------------------------------
  **FILE:
  apps/offer-service/src/messaging/events/offer-payload-builders.ts**

  -----------------------------------------------------------------------

+-----------------------------------------------------------------------+
| import { v4 as uuidv4 } from \'uuid\';                                |
|                                                                       |
| import { Offer } from \'../../offers/entities/offer.entity\';         |
|                                                                       |
| import { CounterOffer } from                                          |
| \'../../counter-offers/entities/counter-offer.entity\';               |
|                                                                       |
| import { OFFER_EVENTS } from \'./offer-events\';                      |
|                                                                       |
| import {                                                              |
|                                                                       |
| OfferCreatedPayload, OfferEditedPayload, OfferAcceptedPayload,        |
|                                                                       |
| OfferDeclinedPayload, OfferWithdrawnPayload, OfferExpiredPayload,     |
|                                                                       |
| OfferExpiringSoonPayload, OfferResentPayload,                         |
|                                                                       |
| OfferCounteredPayload, OfferCounterEditedPayload,                     |
|                                                                       |
| OfferCounterAcceptedPayload, OfferCounterDeclinedPayload,             |
|                                                                       |
| OfferCounterWithdrawnPayload, OfferCounterExpiredPayload,             |
|                                                                       |
| OfferTermsPayload, PayloadWorkSchedule,                               |
|                                                                       |
| } from \'./offer-event-payloads\';                                    |
|                                                                       |
| // ============================================================       |
|                                                                       |
| // Helper: extract OfferTermsPayload from an Offer entity             |
|                                                                       |
| // ============================================================       |
|                                                                       |
| function termsFromOffer(offer: Offer): OfferTermsPayload {            |
|                                                                       |
| return {                                                              |
|                                                                       |
| rate: offer.rate,                                                     |
|                                                                       |
| currencyCode: offer.currencyCode,                                     |
|                                                                       |
| durationMonths: offer.durationMonths,                                 |
|                                                                       |
| workSchedule: offer.workSchedule as PayloadWorkSchedule,              |
|                                                                       |
| startDate: offer.startDate,                                           |
|                                                                       |
| message: offer.message,                                               |
|                                                                       |
| };                                                                    |
|                                                                       |
| }                                                                     |
|                                                                       |
| function termsFromCO(co: CounterOffer): OfferTermsPayload {           |
|                                                                       |
| return {                                                              |
|                                                                       |
| rate: co.rate,                                                        |
|                                                                       |
| currencyCode: co.currencyCode,                                        |
|                                                                       |
| durationMonths: co.durationMonths,                                    |
|                                                                       |
| workSchedule: co.workSchedule as PayloadWorkSchedule,                 |
|                                                                       |
| startDate: co.startDate,                                              |
|                                                                       |
| message: co.message,                                                  |
|                                                                       |
| };                                                                    |
|                                                                       |
| }                                                                     |
|                                                                       |
| function base(offer: Offer, actor: string, actorId: string \| null) { |
|                                                                       |
| return {                                                              |
|                                                                       |
| eventId: uuidv4(),                                                    |
|                                                                       |
| schemaVersion: \'1\',                                                 |
|                                                                       |
| occurredAt: new Date().toISOString(),                                 |
|                                                                       |
| actor,                                                                |
|                                                                       |
| actorId,                                                              |
|                                                                       |
| offerId: offer.id,                                                    |
|                                                                       |
| clientId: offer.clientId,                                             |
|                                                                       |
| talentId: offer.talentId,                                             |
|                                                                       |
| jobListingId: offer.jobListingId,                                     |
|                                                                       |
| contractType: offer.contractType,                                     |
|                                                                       |
| contractTitle: offer.contractTitle,                                   |
|                                                                       |
| };                                                                    |
|                                                                       |
| }                                                                     |
|                                                                       |
| // ============================================================       |
|                                                                       |
| // Event 01: offer.created                                            |
|                                                                       |
| // ============================================================       |
|                                                                       |
| export function buildOfferCreatedPayload(                             |
|                                                                       |
| offer: Offer,                                                         |
|                                                                       |
| ): OfferCreatedPayload {                                              |
|                                                                       |
| return {                                                              |
|                                                                       |
| \...base(offer, \'CLIENT\', offer.clientId),                          |
|                                                                       |
| eventType: OFFER_EVENTS.CREATED,                                      |
|                                                                       |
| terms: termsFromOffer(offer),                                         |
|                                                                       |
| expiresAt: offer.expiresAt.toISOString(),                             |
|                                                                       |
| };                                                                    |
|                                                                       |
| }                                                                     |
|                                                                       |
| // ============================================================       |
|                                                                       |
| // Event 02: offer.edited                                             |
|                                                                       |
| // ============================================================       |
|                                                                       |
| export function buildOfferEditedPayload(                              |
|                                                                       |
| offer: Offer,                                                         |
|                                                                       |
| previousTerms: OfferTermsPayload,                                     |
|                                                                       |
| ): OfferEditedPayload {                                               |
|                                                                       |
| return {                                                              |
|                                                                       |
| \...base(offer, \'CLIENT\', offer.clientId),                          |
|                                                                       |
| eventType: OFFER_EVENTS.EDITED,                                       |
|                                                                       |
| terms: termsFromOffer(offer),                                         |
|                                                                       |
| previousTerms,                                                        |
|                                                                       |
| expiresAt: offer.expiresAt.toISOString(),                             |
|                                                                       |
| };                                                                    |
|                                                                       |
| }                                                                     |
|                                                                       |
| // ============================================================       |
|                                                                       |
| // Event 03: offer.accepted                                           |
|                                                                       |
| // ============================================================       |
|                                                                       |
| export function buildOfferAcceptedPayload(                            |
|                                                                       |
| offer: Offer,                                                         |
|                                                                       |
| ): OfferAcceptedPayload {                                             |
|                                                                       |
| return {                                                              |
|                                                                       |
| \...base(offer, \'TALENT\', offer.talentId),                          |
|                                                                       |
| eventType: OFFER_EVENTS.ACCEPTED,                                     |
|                                                                       |
| acceptedAt: (offer.acceptedAt ?? new Date()).toISOString(),           |
|                                                                       |
| terms: termsFromOffer(offer),                                         |
|                                                                       |
| };                                                                    |
|                                                                       |
| }                                                                     |
|                                                                       |
| // ============================================================       |
|                                                                       |
| // Event 04: offer.declined                                           |
|                                                                       |
| // ============================================================       |
|                                                                       |
| export function buildOfferDeclinedPayload(                            |
|                                                                       |
| offer: Offer,                                                         |
|                                                                       |
| ): OfferDeclinedPayload {                                             |
|                                                                       |
| return {                                                              |
|                                                                       |
| \...base(offer, \'TALENT\', offer.talentId),                          |
|                                                                       |
| eventType: OFFER_EVENTS.DECLINED,                                     |
|                                                                       |
| declinedAt: (offer.declinedAt ?? new Date()).toISOString(),           |
|                                                                       |
| terms: termsFromOffer(offer),                                         |
|                                                                       |
| // declineReason intentionally NOT included in payload.               |
|                                                                       |
| };                                                                    |
|                                                                       |
| }                                                                     |
|                                                                       |
| // ============================================================       |
|                                                                       |
| // Event 05: offer.withdrawn                                          |
|                                                                       |
| // ============================================================       |
|                                                                       |
| export function buildOfferWithdrawnPayload(                           |
|                                                                       |
| offer: Offer,                                                         |
|                                                                       |
| ): OfferWithdrawnPayload {                                            |
|                                                                       |
| return {                                                              |
|                                                                       |
| \...base(offer, \'CLIENT\', offer.clientId),                          |
|                                                                       |
| eventType: OFFER_EVENTS.WITHDRAWN,                                    |
|                                                                       |
| withdrawnAt: (offer.withdrawnAt ?? new Date()).toISOString(),         |
|                                                                       |
| withdrawalMessage: offer.withdrawalMessage,                           |
|                                                                       |
| terms: termsFromOffer(offer),                                         |
|                                                                       |
| };                                                                    |
|                                                                       |
| }                                                                     |
|                                                                       |
| // ============================================================       |
|                                                                       |
| // Event 06: offer.expired                                            |
|                                                                       |
| // ============================================================       |
|                                                                       |
| export function buildOfferExpiredPayload(                             |
|                                                                       |
| offer: Offer,                                                         |
|                                                                       |
| ): OfferExpiredPayload {                                              |
|                                                                       |
| return {                                                              |
|                                                                       |
| \...base(offer, \'SYSTEM\', null),                                    |
|                                                                       |
| eventType: OFFER_EVENTS.EXPIRED,                                      |
|                                                                       |
| expiredAt: (offer.expiredAt ?? offer.expiresAt).toISOString(),        |
|                                                                       |
| terms: termsFromOffer(offer),                                         |
|                                                                       |
| };                                                                    |
|                                                                       |
| }                                                                     |
|                                                                       |
| // ============================================================       |
|                                                                       |
| // Event 07: offer.expiring_soon                                      |
|                                                                       |
| // ============================================================       |
|                                                                       |
| export function buildOfferExpiringSoonPayload(                        |
|                                                                       |
| offer: Offer,                                                         |
|                                                                       |
| ): OfferExpiringSoonPayload {                                         |
|                                                                       |
| const msRemaining = offer.expiresAt.getTime() - Date.now();           |
|                                                                       |
| const hoursRemaining = Math.max(0, Math.floor(msRemaining / (1000 \*  |
| 60 \* 60)));                                                          |
|                                                                       |
| return {                                                              |
|                                                                       |
| \...base(offer, \'SYSTEM\', null),                                    |
|                                                                       |
| eventType: OFFER_EVENTS.EXPIRING_SOON,                                |
|                                                                       |
| expiresAt: offer.expiresAt.toISOString(),                             |
|                                                                       |
| hoursRemaining,                                                       |
|                                                                       |
| terms: termsFromOffer(offer),                                         |
|                                                                       |
| };                                                                    |
|                                                                       |
| }                                                                     |
|                                                                       |
| // ============================================================       |
|                                                                       |
| // Event 08: offer.resent                                             |
|                                                                       |
| // ============================================================       |
|                                                                       |
| export function buildOfferResentPayload(                              |
|                                                                       |
| newOffer: Offer,                                                      |
|                                                                       |
| ): OfferResentPayload {                                               |
|                                                                       |
| return {                                                              |
|                                                                       |
| \...base(newOffer, \'CLIENT\', newOffer.clientId),                    |
|                                                                       |
| eventType: OFFER_EVENTS.RESENT,                                       |
|                                                                       |
| originalOfferId: newOffer.originalOfferId!,                           |
|                                                                       |
| terms: termsFromOffer(newOffer),                                      |
|                                                                       |
| expiresAt: newOffer.expiresAt.toISOString(),                          |
|                                                                       |
| };                                                                    |
|                                                                       |
| }                                                                     |
|                                                                       |
| // ============================================================       |
|                                                                       |
| // Event 09: offer.countered                                          |
|                                                                       |
| // ============================================================       |
|                                                                       |
| export function buildOfferCounteredPayload(                           |
|                                                                       |
| offer: Offer,                                                         |
|                                                                       |
| co: CounterOffer,                                                     |
|                                                                       |
| rateWarning: boolean,                                                 |
|                                                                       |
| ): OfferCounteredPayload {                                            |
|                                                                       |
| return {                                                              |
|                                                                       |
| \...base(offer, co.submittedBy, co.submittedById),                    |
|                                                                       |
| eventType: OFFER_EVENTS.COUNTERED,                                    |
|                                                                       |
| counterOfferId: co.id,                                                |
|                                                                       |
| submittedBy: co.submittedBy,                                          |
|                                                                       |
| submittedById: co.submittedById,                                      |
|                                                                       |
| parentOfferTerms: termsFromOffer(offer),                              |
|                                                                       |
| counterOfferTerms: termsFromCO(co),                                   |
|                                                                       |
| rateWarning,                                                          |
|                                                                       |
| counterExpiresAt: co.expiresAt.toISOString(),                         |
|                                                                       |
| };                                                                    |
|                                                                       |
| }                                                                     |
|                                                                       |
| // ============================================================       |
|                                                                       |
| // Event 10: offer.counter_edited                                     |
|                                                                       |
| // ============================================================       |
|                                                                       |
| export function buildOfferCounterEditedPayload(                       |
|                                                                       |
| offer: Offer,                                                         |
|                                                                       |
| co: CounterOffer,                                                     |
|                                                                       |
| previousTerms: OfferTermsPayload,                                     |
|                                                                       |
| ): OfferCounterEditedPayload {                                        |
|                                                                       |
| return {                                                              |
|                                                                       |
| \...base(offer, co.submittedBy, co.submittedById),                    |
|                                                                       |
| eventType: OFFER_EVENTS.COUNTER_EDITED,                               |
|                                                                       |
| counterOfferId: co.id,                                                |
|                                                                       |
| submittedBy: co.submittedBy,                                          |
|                                                                       |
| submittedById: co.submittedById,                                      |
|                                                                       |
| counterOfferTerms: termsFromCO(co),                                   |
|                                                                       |
| previousTerms,                                                        |
|                                                                       |
| counterExpiresAt: co.expiresAt.toISOString(),                         |
|                                                                       |
| };                                                                    |
|                                                                       |
| }                                                                     |
|                                                                       |
| // ============================================================       |
|                                                                       |
| // Event 11: offer.counter_accepted                                   |
|                                                                       |
| // ============================================================       |
|                                                                       |
| export function buildOfferCounterAcceptedPayload(                     |
|                                                                       |
| offer: Offer,                                                         |
|                                                                       |
| co: CounterOffer,                                                     |
|                                                                       |
| acceptedById: string,                                                 |
|                                                                       |
| ): OfferCounterAcceptedPayload {                                      |
|                                                                       |
| const acceptedBy = co.submittedBy === \'CLIENT\' ? \'TALENT\' :       |
| \'CLIENT\';                                                           |
|                                                                       |
| return {                                                              |
|                                                                       |
| \...base(offer, acceptedBy, acceptedById),                            |
|                                                                       |
| eventType: OFFER_EVENTS.COUNTER_ACCEPTED,                             |
|                                                                       |
| counterOfferId: co.id,                                                |
|                                                                       |
| submittedBy: co.submittedBy,                                          |
|                                                                       |
| acceptedBy,                                                           |
|                                                                       |
| acceptedById,                                                         |
|                                                                       |
| acceptedAt: (co.acceptedAt ?? new Date()).toISOString(),              |
|                                                                       |
| counterOfferTerms: termsFromCO(co),                                   |
|                                                                       |
| originalOfferTerms: termsFromOffer(offer),                            |
|                                                                       |
| };                                                                    |
|                                                                       |
| }                                                                     |
|                                                                       |
| // ============================================================       |
|                                                                       |
| // Event 12: offer.counter_declined                                   |
|                                                                       |
| // ============================================================       |
|                                                                       |
| export function buildOfferCounterDeclinedPayload(                     |
|                                                                       |
| offer: Offer,                                                         |
|                                                                       |
| co: CounterOffer,                                                     |
|                                                                       |
| declinedById: string,                                                 |
|                                                                       |
| ): OfferCounterDeclinedPayload {                                      |
|                                                                       |
| const declinedBy = co.submittedBy === \'CLIENT\' ? \'TALENT\' :       |
| \'CLIENT\';                                                           |
|                                                                       |
| return {                                                              |
|                                                                       |
| \...base(offer, declinedBy, declinedById),                            |
|                                                                       |
| eventType: OFFER_EVENTS.COUNTER_DECLINED,                             |
|                                                                       |
| counterOfferId: co.id,                                                |
|                                                                       |
| declinedBy,                                                           |
|                                                                       |
| declinedById,                                                         |
|                                                                       |
| declinedAt: (co.declinedAt ?? new Date()).toISOString(),              |
|                                                                       |
| counterOfferTerms: termsFromCO(co),                                   |
|                                                                       |
| parentOfferStatus: \'PENDING\',                                       |
|                                                                       |
| };                                                                    |
|                                                                       |
| }                                                                     |
|                                                                       |
| // ============================================================       |
|                                                                       |
| // Event 13: offer.counter_withdrawn                                  |
|                                                                       |
| // ============================================================       |
|                                                                       |
| export function buildOfferCounterWithdrawnPayload(                    |
|                                                                       |
| offer: Offer,                                                         |
|                                                                       |
| co: CounterOffer,                                                     |
|                                                                       |
| ): OfferCounterWithdrawnPayload {                                     |
|                                                                       |
| return {                                                              |
|                                                                       |
| \...base(offer, co.submittedBy, co.submittedById),                    |
|                                                                       |
| eventType: OFFER_EVENTS.COUNTER_WITHDRAWN,                            |
|                                                                       |
| counterOfferId: co.id,                                                |
|                                                                       |
| submittedBy: co.submittedBy,                                          |
|                                                                       |
| withdrawnBy: co.submittedBy,                                          |
|                                                                       |
| withdrawnById: co.submittedById,                                      |
|                                                                       |
| withdrawnAt: (co.withdrawnAt ?? new Date()).toISOString(),            |
|                                                                       |
| withdrawalMessage: co.withdrawalMessage,                              |
|                                                                       |
| counterOfferTerms: termsFromCO(co),                                   |
|                                                                       |
| parentOfferStatus: \'PENDING\',                                       |
|                                                                       |
| };                                                                    |
|                                                                       |
| }                                                                     |
|                                                                       |
| // ============================================================       |
|                                                                       |
| // Event 14: offer.counter_expired                                    |
|                                                                       |
| // ============================================================       |
|                                                                       |
| export function buildOfferCounterExpiredPayload(                      |
|                                                                       |
| offer: Offer,                                                         |
|                                                                       |
| co: CounterOffer,                                                     |
|                                                                       |
| ): OfferCounterExpiredPayload {                                       |
|                                                                       |
| return {                                                              |
|                                                                       |
| \...base(offer, \'SYSTEM\', null),                                    |
|                                                                       |
| eventType: OFFER_EVENTS.COUNTER_EXPIRED,                              |
|                                                                       |
| counterOfferId: co.id,                                                |
|                                                                       |
| submittedBy: co.submittedBy,                                          |
|                                                                       |
| expiredAt: (co.expiredAt ?? co.expiresAt).toISOString(),              |
|                                                                       |
| counterOfferTerms: termsFromCO(co),                                   |
|                                                                       |
| parentOfferStatus: offer.status === \'EXPIRED\' ? \'EXPIRED\' :       |
| \'PENDING\',                                                          |
|                                                                       |
| };                                                                    |
|                                                                       |
| }                                                                     |
+-----------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| **Step 3 Event Payload JSON Reference --- All 14 Events**             |
|                                                                       |
| Copy-ready examples with field annotations                            |
+-----------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| **Event 01 offer.created \[CLIENT\]**                                 |
|                                                                       |
| Client sends a new offer. Both notification-service and               |
| messaging-service receive this.                                       |
+-----------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| {                                                                     |
|                                                                       |
| \"eventId\": \"f47ac10b-58cc-4372-a567-0e02b2c3d479\",                |
|                                                                       |
| \"eventType\": \"offer.created\",                                     |
|                                                                       |
| \"schemaVersion\": \"1\",                                             |
|                                                                       |
| \"occurredAt\": \"2025-01-30T10:00:00.000Z\",                         |
|                                                                       |
| \"actor\": \"CLIENT\",                                                |
|                                                                       |
| \"actorId\": \"10000000-0000-4000-a000-000000000001\",                |
|                                                                       |
| \"offerId\": \"40000000-0000-4000-a000-000000000001\",                |
|                                                                       |
| \"clientId\": \"10000000-0000-4000-a000-000000000001\",               |
|                                                                       |
| \"talentId\": \"20000000-0000-4000-a000-000000000001\",               |
|                                                                       |
| \"jobListingId\": \"30000000-0000-4000-a000-000000000001\",           |
|                                                                       |
| \"contractType\": \"PROJECT\",                                        |
|                                                                       |
| \"contractTitle\": \"Alpha Platform Rebuild\",                        |
|                                                                       |
| \"terms\": {                                                          |
|                                                                       |
| \"rate\": 95,                                                         |
|                                                                       |
| \"currencyCode\": \"USD\",                                            |
|                                                                       |
| \"durationMonths\": 6,                                                |
|                                                                       |
| \"workSchedule\": { \"type\": \"FULL_TIME\" },                        |
|                                                                       |
| \"startDate\": \"2025-03-01\",                                        |
|                                                                       |
| \"message\": \"Looking forward to working together.\"                 |
|                                                                       |
| },                                                                    |
|                                                                       |
| \"expiresAt\": \"2025-02-13T10:00:00.000Z\"                           |
|                                                                       |
| }                                                                     |
+-----------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| **Event 02 offer.edited \[CLIENT\]**                                  |
|                                                                       |
| Client edits a pending offer. Talent receives \"Offer Updated\"       |
| notification. previousTerms shows what changed.                       |
+-----------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| {                                                                     |
|                                                                       |
| \"eventId\": \"uuid\",                                                |
|                                                                       |
| \"eventType\": \"offer.edited\",                                      |
|                                                                       |
| \"schemaVersion\": \"1\",                                             |
|                                                                       |
| \"occurredAt\": \"2025-01-31T09:00:00.000Z\",                         |
|                                                                       |
| \"actor\": \"CLIENT\",                                                |
|                                                                       |
| \"actorId\": \"10000000-0000-4000-a000-000000000001\",                |
|                                                                       |
| \"offerId\": \"40000000-0000-4000-a000-000000000001\",                |
|                                                                       |
| \"clientId\": \"10000000-0000-4000-a000-000000000001\",               |
|                                                                       |
| \"talentId\": \"20000000-0000-4000-a000-000000000001\",               |
|                                                                       |
| \"jobListingId\": \"30000000-0000-4000-a000-000000000001\",           |
|                                                                       |
| \"contractType\": \"PROJECT\",                                        |
|                                                                       |
| \"contractTitle\": \"Alpha Platform Rebuild\",                        |
|                                                                       |
| \"terms\": {                                                          |
|                                                                       |
| \"rate\": 100,                                                        |
|                                                                       |
| \"currencyCode\": \"USD\",                                            |
|                                                                       |
| \"durationMonths\": 6,                                                |
|                                                                       |
| \"workSchedule\": { \"type\": \"FULL_TIME\" },                        |
|                                                                       |
| \"startDate\": \"2025-03-15\",                                        |
|                                                                       |
| \"message\": \"Revised the start date after review.\"                 |
|                                                                       |
| },                                                                    |
|                                                                       |
| \"previousTerms\": {                                                  |
|                                                                       |
| \"rate\": 95,                                                         |
|                                                                       |
| \"currencyCode\": \"USD\",                                            |
|                                                                       |
| \"durationMonths\": 6,                                                |
|                                                                       |
| \"workSchedule\": { \"type\": \"FULL_TIME\" },                        |
|                                                                       |
| \"startDate\": \"2025-03-01\",                                        |
|                                                                       |
| \"message\": \"Looking forward to working together.\"                 |
|                                                                       |
| },                                                                    |
|                                                                       |
| \"expiresAt\": \"2025-02-14T09:00:00.000Z\" // Reset: NOW + 14 days   |
|                                                                       |
| }                                                                     |
+-----------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| **Event 03 offer.accepted \[TALENT\]**                                |
|                                                                       |
| Talent accepts offer. contracts-service MUST create a ContractGroup   |
| from this payload.                                                    |
+-----------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| offer.accepted is consumed by contracts-service to create the         |
| ContractGroup.                                                        |
|                                                                       |
| contracts-service reads: offerId, clientId, talentId, jobListingId,   |
| contractType,                                                         |
|                                                                       |
| contractTitle, terms.rate, terms.currencyCode, terms.durationMonths,  |
|                                                                       |
| terms.workSchedule, terms.startDate.                                  |
|                                                                       |
| Do NOT remove, rename, or change the type of any of these fields.     |
|                                                                       |
| Any breaking change requires a schemaVersion bump and                 |
| contracts-service update.                                             |
+-----------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| {                                                                     |
|                                                                       |
| \"eventId\": \"uuid\",                                                |
|                                                                       |
| \"eventType\": \"offer.accepted\",                                    |
|                                                                       |
| \"schemaVersion\": \"1\",                                             |
|                                                                       |
| \"occurredAt\": \"2025-02-01T14:30:00.000Z\",                         |
|                                                                       |
| \"actor\": \"TALENT\",                                                |
|                                                                       |
| \"actorId\": \"20000000-0000-4000-a000-000000000001\",                |
|                                                                       |
| \"offerId\": \"40000000-0000-4000-a000-000000000001\",                |
|                                                                       |
| \"clientId\": \"10000000-0000-4000-a000-000000000001\",               |
|                                                                       |
| \"talentId\": \"20000000-0000-4000-a000-000000000001\",               |
|                                                                       |
| \"jobListingId\": \"30000000-0000-4000-a000-000000000001\",           |
|                                                                       |
| \"contractType\": \"PROJECT\",                                        |
|                                                                       |
| \"contractTitle\": \"Alpha Platform Rebuild\",                        |
|                                                                       |
| \"acceptedAt\": \"2025-02-01T14:30:00.000Z\",                         |
|                                                                       |
| \"terms\": {                                                          |
|                                                                       |
| \"rate\": 95,                                                         |
|                                                                       |
| \"currencyCode\": \"USD\",                                            |
|                                                                       |
| \"durationMonths\": 6,                                                |
|                                                                       |
| \"workSchedule\": { \"type\": \"FULL_TIME\" },                        |
|                                                                       |
| \"startDate\": \"2025-03-01\",                                        |
|                                                                       |
| \"message\": \"Looking forward to working together.\"                 |
|                                                                       |
| }                                                                     |
|                                                                       |
| // Note: acceptanceMessage NOT in payload. Stored on Offer record     |
| only.                                                                 |
|                                                                       |
| }                                                                     |
+-----------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| **Event 04 offer.declined \[TALENT\]**                                |
|                                                                       |
| Talent declines offer. declineReason is intentionally excluded ---    |
| not shown in notification.                                            |
+-----------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| {                                                                     |
|                                                                       |
| \"eventId\": \"uuid\",                                                |
|                                                                       |
| \"eventType\": \"offer.declined\",                                    |
|                                                                       |
| \"schemaVersion\":\"1\",                                              |
|                                                                       |
| \"occurredAt\": \"2025-02-01T11:00:00.000Z\",                         |
|                                                                       |
| \"actor\": \"TALENT\",                                                |
|                                                                       |
| \"actorId\": \"20000000-0000-4000-a000-000000000001\",                |
|                                                                       |
| \"offerId\": \"40000000-0000-4000-a000-000000000001\",                |
|                                                                       |
| \"clientId\": \"10000000-0000-4000-a000-000000000001\",               |
|                                                                       |
| \"talentId\": \"20000000-0000-4000-a000-000000000001\",               |
|                                                                       |
| \"jobListingId\": \"30000000-0000-4000-a000-000000000001\",           |
|                                                                       |
| \"contractType\": \"PROJECT\",                                        |
|                                                                       |
| \"contractTitle\":\"Alpha Platform Rebuild\",                         |
|                                                                       |
| \"declinedAt\": \"2025-02-01T11:00:00.000Z\",                         |
|                                                                       |
| \"terms\": {                                                          |
|                                                                       |
| \"rate\": 95, \"currencyCode\": \"USD\", \"durationMonths\": 6,       |
|                                                                       |
| \"workSchedule\": { \"type\": \"FULL_TIME\" },                        |
|                                                                       |
| \"startDate\": \"2025-03-01\", \"message\": null                      |
|                                                                       |
| }                                                                     |
|                                                                       |
| // declineReason NOT included. notification-service sends generic     |
| \"Offer Declined\".                                                   |
|                                                                       |
| // Client sees reason only in the Declined Offer Details modal (API   |
| call, not event).                                                     |
|                                                                       |
| }                                                                     |
+-----------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| **Event 05 offer.withdrawn \[CLIENT\]**                               |
|                                                                       |
| Client withdraws offer. withdrawalMessage is optional.                |
+-----------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| {                                                                     |
|                                                                       |
| \"eventId\": \"uuid\",                                                |
|                                                                       |
| \"eventType\": \"offer.withdrawn\",                                   |
|                                                                       |
| \"schemaVersion\": \"1\",                                             |
|                                                                       |
| \"occurredAt\": \"2025-02-02T08:00:00.000Z\",                         |
|                                                                       |
| \"actor\": \"CLIENT\",                                                |
|                                                                       |
| \"actorId\": \"10000000-0000-4000-a000-000000000001\",                |
|                                                                       |
| \"offerId\": \"40000000-0000-4000-a000-000000000001\",                |
|                                                                       |
| \"clientId\": \"10000000-0000-4000-a000-000000000001\",               |
|                                                                       |
| \"talentId\": \"20000000-0000-4000-a000-000000000001\",               |
|                                                                       |
| \"jobListingId\": \"30000000-0000-4000-a000-000000000001\",           |
|                                                                       |
| \"contractType\": \"PROJECT\",                                        |
|                                                                       |
| \"contractTitle\": \"Alpha Platform Rebuild\",                        |
|                                                                       |
| \"withdrawnAt\": \"2025-02-02T08:00:00.000Z\",                        |
|                                                                       |
| \"withdrawalMessage\":\"We have decided to pause hiring.\",           |
|                                                                       |
| \"terms\": {                                                          |
|                                                                       |
| \"rate\": 95, \"currencyCode\": \"USD\", \"durationMonths\": 6,       |
|                                                                       |
| \"workSchedule\": { \"type\": \"FULL_TIME\" },                        |
|                                                                       |
| \"startDate\": \"2025-03-01\", \"message\": null                      |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
+-----------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| **Event 06 offer.expired \[SYSTEM\]**                                 |
|                                                                       |
| Scheduler expires a PENDING offer. actor is SYSTEM, actorId is null.  |
+-----------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| {                                                                     |
|                                                                       |
| \"eventId\": \"uuid\",                                                |
|                                                                       |
| \"eventType\": \"offer.expired\",                                     |
|                                                                       |
| \"schemaVersion\": \"1\",                                             |
|                                                                       |
| \"occurredAt\":\"2025-02-14T10:00:00.000Z\",                          |
|                                                                       |
| \"actor\": \"SYSTEM\",                                                |
|                                                                       |
| \"actorId\": null,                                                    |
|                                                                       |
| \"offerId\": \"40000000-0000-4000-a000-000000000001\",                |
|                                                                       |
| \"clientId\": \"10000000-0000-4000-a000-000000000001\",               |
|                                                                       |
| \"talentId\": \"20000000-0000-4000-a000-000000000001\",               |
|                                                                       |
| \"jobListingId\": \"30000000-0000-4000-a000-000000000001\",           |
|                                                                       |
| \"contractType\": \"PROJECT\",                                        |
|                                                                       |
| \"contractTitle\": \"Alpha Platform Rebuild\",                        |
|                                                                       |
| \"expiredAt\": \"2025-02-14T10:00:00.000Z\",                          |
|                                                                       |
| \"terms\": {                                                          |
|                                                                       |
| \"rate\": 95, \"currencyCode\": \"USD\", \"durationMonths\": 6,       |
|                                                                       |
| \"workSchedule\": { \"type\": \"FULL_TIME\" },                        |
|                                                                       |
| \"startDate\": \"2025-03-01\", \"message\": null                      |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
+-----------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| **Event 07 offer.expiring_soon \[SYSTEM\]**                           |
|                                                                       |
| 48h warning. Only notification-service receives this (not             |
| messaging-service).                                                   |
+-----------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| {                                                                     |
|                                                                       |
| \"eventId\": \"uuid\",                                                |
|                                                                       |
| \"eventType\": \"offer.expiring_soon\",                               |
|                                                                       |
| \"schemaVersion\": \"1\",                                             |
|                                                                       |
| \"occurredAt\": \"2025-02-12T10:00:00.000Z\",                         |
|                                                                       |
| \"actor\": \"SYSTEM\",                                                |
|                                                                       |
| \"actorId\": null,                                                    |
|                                                                       |
| \"offerId\": \"40000000-0000-4000-a000-000000000001\",                |
|                                                                       |
| \"clientId\": \"10000000-0000-4000-a000-000000000001\",               |
|                                                                       |
| \"talentId\": \"20000000-0000-4000-a000-000000000001\",               |
|                                                                       |
| \"jobListingId\": \"30000000-0000-4000-a000-000000000001\",           |
|                                                                       |
| \"contractType\": \"PROJECT\",                                        |
|                                                                       |
| \"contractTitle\": \"Alpha Platform Rebuild\",                        |
|                                                                       |
| \"expiresAt\": \"2025-02-14T10:00:00.000Z\",                          |
|                                                                       |
| \"hoursRemaining\": 47,                                               |
|                                                                       |
| \"terms\": {                                                          |
|                                                                       |
| \"rate\": 95, \"currencyCode\": \"USD\", \"durationMonths\": 6,       |
|                                                                       |
| \"workSchedule\": { \"type\": \"FULL_TIME\" },                        |
|                                                                       |
| \"startDate\": \"2025-03-01\", \"message\": null                      |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
+-----------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| **Event 08 offer.resent \[CLIENT\]**                                  |
|                                                                       |
| Client resends a terminal offer. offerId is the NEW offer ID.         |
| originalOfferId is the old one.                                       |
+-----------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| {                                                                     |
|                                                                       |
| \"eventId\": \"uuid\",                                                |
|                                                                       |
| \"eventType\": \"offer.resent\",                                      |
|                                                                       |
| \"schemaVersion\": \"1\",                                             |
|                                                                       |
| \"occurredAt\": \"2025-02-15T09:00:00.000Z\",                         |
|                                                                       |
| \"actor\": \"CLIENT\",                                                |
|                                                                       |
| \"actorId\": \"10000000-0000-4000-a000-000000000001\",                |
|                                                                       |
| \"offerId\": \"40000000-0000-4000-a000-000000000009\", // NEW offer   |
| ID                                                                    |
|                                                                       |
| \"clientId\": \"10000000-0000-4000-a000-000000000001\",               |
|                                                                       |
| \"talentId\": \"20000000-0000-4000-a000-000000000001\",               |
|                                                                       |
| \"jobListingId\": \"30000000-0000-4000-a000-000000000001\",           |
|                                                                       |
| \"contractType\": \"PROJECT\",                                        |
|                                                                       |
| \"contractTitle\": \"Alpha Platform Rebuild\",                        |
|                                                                       |
| \"originalOfferId\": \"40000000-0000-4000-a000-000000000001\", // OLD |
| offer (expired/declined)                                              |
|                                                                       |
| \"terms\": {                                                          |
|                                                                       |
| \"rate\": 100, \"currencyCode\": \"USD\", \"durationMonths\": 6,      |
|                                                                       |
| \"workSchedule\": { \"type\": \"FULL_TIME\" },                        |
|                                                                       |
| \"startDate\": \"2025-04-01\", \"message\": \"Revised the rate for    |
| you.\"                                                                |
|                                                                       |
| },                                                                    |
|                                                                       |
| \"expiresAt\": \"2025-03-01T09:00:00.000Z\"                           |
|                                                                       |
| }                                                                     |
+-----------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| **Event 09 offer.countered \[BOTH\]**                                 |
|                                                                       |
| Either TALENT (initial) or CLIENT (response) submits counter offer.   |
| rateWarning is advisory.                                              |
+-----------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| // Example: TALENT submits counter offer on a PENDING offer           |
|                                                                       |
| {                                                                     |
|                                                                       |
| \"eventId\": \"uuid\",                                                |
|                                                                       |
| \"eventType\": \"offer.countered\",                                   |
|                                                                       |
| \"schemaVersion\": \"1\",                                             |
|                                                                       |
| \"occurredAt\": \"2025-02-03T16:00:00.000Z\",                         |
|                                                                       |
| \"actor\": \"TALENT\",                                                |
|                                                                       |
| \"actorId\": \"20000000-0000-4000-a000-000000000001\",                |
|                                                                       |
| \"offerId\": \"40000000-0000-4000-a000-000000000001\",                |
|                                                                       |
| \"clientId\": \"10000000-0000-4000-a000-000000000001\",               |
|                                                                       |
| \"talentId\": \"20000000-0000-4000-a000-000000000001\",               |
|                                                                       |
| \"jobListingId\": \"30000000-0000-4000-a000-000000000001\",           |
|                                                                       |
| \"contractType\": \"PROJECT\",                                        |
|                                                                       |
| \"contractTitle\": \"Alpha Platform Rebuild\",                        |
|                                                                       |
| \"counterOfferId\": \"50000000-0000-4000-a000-000000000001\",         |
|                                                                       |
| \"submittedBy\": \"TALENT\",                                          |
|                                                                       |
| \"submittedById\": \"20000000-0000-4000-a000-000000000001\",          |
|                                                                       |
| \"parentOfferTerms\": {                                               |
|                                                                       |
| \"rate\": 95, \"currencyCode\": \"USD\", \"durationMonths\": 6,       |
|                                                                       |
| \"workSchedule\": { \"type\": \"FULL_TIME\" },                        |
|                                                                       |
| \"startDate\": \"2025-03-01\", \"message\": null                      |
|                                                                       |
| },                                                                    |
|                                                                       |
| \"counterOfferTerms\": {                                              |
|                                                                       |
| \"rate\": 120, \"currencyCode\": \"USD\", \"durationMonths\": 6,      |
|                                                                       |
| \"workSchedule\": { \"type\": \"FULL_TIME\" },                        |
|                                                                       |
| \"startDate\": \"2025-03-01\",                                        |
|                                                                       |
| \"message\": \"\$120/hr is my current rate for this level of work.\"  |
|                                                                       |
| },                                                                    |
|                                                                       |
| \"rateWarning\": true, // 120 \> 95 \* 1.25 (\>25% above original)    |
|                                                                       |
| \"counterExpiresAt\": \"2025-02-17T16:00:00.000Z\"                    |
|                                                                       |
| }                                                                     |
+-----------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| **Event 10 offer.counter_edited \[BOTH\]**                            |
|                                                                       |
| CO submitter edits their CO in-place. expiresAt unchanged.            |
| previousTerms shows what changed.                                     |
+-----------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| {                                                                     |
|                                                                       |
| \"eventId\": \"uuid\",                                                |
|                                                                       |
| \"eventType\": \"offer.counter_edited\",                              |
|                                                                       |
| \"schemaVersion\": \"1\",                                             |
|                                                                       |
| \"occurredAt\": \"2025-02-04T10:00:00.000Z\",                         |
|                                                                       |
| \"actor\": \"TALENT\",                                                |
|                                                                       |
| \"actorId\": \"20000000-0000-4000-a000-000000000001\",                |
|                                                                       |
| \"offerId\": \"40000000-0000-4000-a000-000000000001\",                |
|                                                                       |
| \"clientId\": \"10000000-0000-4000-a000-000000000001\",               |
|                                                                       |
| \"talentId\": \"20000000-0000-4000-a000-000000000001\",               |
|                                                                       |
| \"jobListingId\": \"30000000-0000-4000-a000-000000000001\",           |
|                                                                       |
| \"contractType\": \"PROJECT\",                                        |
|                                                                       |
| \"contractTitle\": \"Alpha Platform Rebuild\",                        |
|                                                                       |
| \"counterOfferId\": \"50000000-0000-4000-a000-000000000001\",         |
|                                                                       |
| \"submittedBy\": \"TALENT\",                                          |
|                                                                       |
| \"submittedById\": \"20000000-0000-4000-a000-000000000001\",          |
|                                                                       |
| \"counterOfferTerms\": {                                              |
|                                                                       |
| \"rate\": 115, \"currencyCode\": \"USD\", \"durationMonths\": 6,      |
|                                                                       |
| \"workSchedule\": { \"type\": \"FULL_TIME\" },                        |
|                                                                       |
| \"startDate\": \"2025-03-01\",                                        |
|                                                                       |
| \"message\": \"Revised to \$115 after further consideration.\"        |
|                                                                       |
| },                                                                    |
|                                                                       |
| \"previousTerms\": {                                                  |
|                                                                       |
| \"rate\": 120, \"currencyCode\": \"USD\", \"durationMonths\": 6,      |
|                                                                       |
| \"workSchedule\": { \"type\": \"FULL_TIME\" },                        |
|                                                                       |
| \"startDate\": \"2025-03-01\",                                        |
|                                                                       |
| \"message\": \"\$120/hr is my current rate.\"                         |
|                                                                       |
| },                                                                    |
|                                                                       |
| \"counterExpiresAt\": \"2025-02-17T16:00:00.000Z\" // UNCHANGED ---   |
| not reset on edit                                                     |
|                                                                       |
| }                                                                     |
+-----------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| **Event 11 offer.counter_accepted \[BOTH\]**                          |
|                                                                       |
| NON-submitter accepts counter offer. contracts-service creates        |
| ContractGroup from counterOfferTerms.                                 |
+-----------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| offer.counter_accepted is also consumed by contracts-service.         |
|                                                                       |
| contracts-service uses counterOfferTerms (not originalOfferTerms) as  |
| the contract terms.                                                   |
|                                                                       |
| The counter offer terms are the agreed-upon terms for the contract.   |
|                                                                       |
| Never remove counterOfferTerms or change its structure without a      |
| schemaVersion bump.                                                   |
+-----------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| // Example: CLIENT accepts TALENT\'s counter offer                    |
|                                                                       |
| {                                                                     |
|                                                                       |
| \"eventId\": \"uuid\",                                                |
|                                                                       |
| \"eventType\": \"offer.counter_accepted\",                            |
|                                                                       |
| \"schemaVersion\": \"1\",                                             |
|                                                                       |
| \"occurredAt\": \"2025-02-05T11:00:00.000Z\",                         |
|                                                                       |
| \"actor\": \"CLIENT\", // The NON-submitter accepts                   |
|                                                                       |
| \"actorId\": \"10000000-0000-4000-a000-000000000001\",                |
|                                                                       |
| \"offerId\": \"40000000-0000-4000-a000-000000000001\",                |
|                                                                       |
| \"clientId\": \"10000000-0000-4000-a000-000000000001\",               |
|                                                                       |
| \"talentId\": \"20000000-0000-4000-a000-000000000001\",               |
|                                                                       |
| \"jobListingId\": \"30000000-0000-4000-a000-000000000001\",           |
|                                                                       |
| \"contractType\": \"PROJECT\",                                        |
|                                                                       |
| \"contractTitle\": \"Alpha Platform Rebuild\",                        |
|                                                                       |
| \"counterOfferId\": \"50000000-0000-4000-a000-000000000001\",         |
|                                                                       |
| \"submittedBy\": \"TALENT\", // Who submitted the CO                  |
|                                                                       |
| \"acceptedBy\": \"CLIENT\", // Who accepted (the other party)         |
|                                                                       |
| \"acceptedById\": \"10000000-0000-4000-a000-000000000001\",           |
|                                                                       |
| \"acceptedAt\": \"2025-02-05T11:00:00.000Z\",                         |
|                                                                       |
| \"counterOfferTerms\": {                                              |
|                                                                       |
| \"rate\": 115, \"currencyCode\": \"USD\", \"durationMonths\": 6,      |
|                                                                       |
| \"workSchedule\": { \"type\": \"FULL_TIME\" },                        |
|                                                                       |
| \"startDate\": \"2025-03-01\",                                        |
|                                                                       |
| \"message\": \"Revised to \$115.\"                                    |
|                                                                       |
| },                                                                    |
|                                                                       |
| \"originalOfferTerms\": {                                             |
|                                                                       |
| \"rate\": 95, \"currencyCode\": \"USD\", \"durationMonths\": 6,       |
|                                                                       |
| \"workSchedule\": { \"type\": \"FULL_TIME\" },                        |
|                                                                       |
| \"startDate\": \"2025-03-01\", \"message\": null                      |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
+-----------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| **Event 12 offer.counter_declined \[BOTH\]**                          |
|                                                                       |
| NON-submitter declines CO. Parent offer restored to PENDING.          |
+-----------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| {                                                                     |
|                                                                       |
| \"eventId\": \"uuid\",                                                |
|                                                                       |
| \"eventType\": \"offer.counter_declined\",                            |
|                                                                       |
| \"schemaVersion\": \"1\",                                             |
|                                                                       |
| \"occurredAt\": \"2025-02-05T09:00:00.000Z\",                         |
|                                                                       |
| \"actor\": \"CLIENT\",                                                |
|                                                                       |
| \"actorId\": \"10000000-0000-4000-a000-000000000001\",                |
|                                                                       |
| \"offerId\": \"40000000-0000-4000-a000-000000000001\",                |
|                                                                       |
| \"clientId\": \"10000000-0000-4000-a000-000000000001\",               |
|                                                                       |
| \"talentId\": \"20000000-0000-4000-a000-000000000001\",               |
|                                                                       |
| \"jobListingId\": \"30000000-0000-4000-a000-000000000001\",           |
|                                                                       |
| \"contractType\": \"PROJECT\",                                        |
|                                                                       |
| \"contractTitle\": \"Alpha Platform Rebuild\",                        |
|                                                                       |
| \"counterOfferId\": \"50000000-0000-4000-a000-000000000001\",         |
|                                                                       |
| \"declinedBy\": \"CLIENT\", // NON-submitter                          |
|                                                                       |
| \"declinedById\": \"10000000-0000-4000-a000-000000000001\",           |
|                                                                       |
| \"declinedAt\": \"2025-02-05T09:00:00.000Z\",                         |
|                                                                       |
| \"counterOfferTerms\": {                                              |
|                                                                       |
| \"rate\": 120, \"currencyCode\": \"USD\", \"durationMonths\": 6,      |
|                                                                       |
| \"workSchedule\": { \"type\": \"FULL_TIME\" },                        |
|                                                                       |
| \"startDate\": \"2025-03-01\", \"message\": \"\$120/hr is my rate.\"  |
|                                                                       |
| },                                                                    |
|                                                                       |
| \"parentOfferStatus\": \"PENDING\" // Always PENDING after CO decline |
|                                                                       |
| }                                                                     |
+-----------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| **Event 13 offer.counter_withdrawn \[BOTH\]**                         |
|                                                                       |
| CO submitter withdraws their own CO. Parent offer restored to         |
| PENDING.                                                              |
+-----------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| {                                                                     |
|                                                                       |
| \"eventId\": \"uuid\",                                                |
|                                                                       |
| \"eventType\": \"offer.counter_withdrawn\",                           |
|                                                                       |
| \"schemaVersion\": \"1\",                                             |
|                                                                       |
| \"occurredAt\": \"2025-02-06T08:00:00.000Z\",                         |
|                                                                       |
| \"actor\": \"TALENT\",                                                |
|                                                                       |
| \"actorId\": \"20000000-0000-4000-a000-000000000001\",                |
|                                                                       |
| \"offerId\": \"40000000-0000-4000-a000-000000000001\",                |
|                                                                       |
| \"clientId\": \"10000000-0000-4000-a000-000000000001\",               |
|                                                                       |
| \"talentId\": \"20000000-0000-4000-a000-000000000001\",               |
|                                                                       |
| \"jobListingId\": \"30000000-0000-4000-a000-000000000001\",           |
|                                                                       |
| \"contractType\": \"PROJECT\",                                        |
|                                                                       |
| \"contractTitle\": \"Alpha Platform Rebuild\",                        |
|                                                                       |
| \"counterOfferId\": \"50000000-0000-4000-a000-000000000001\",         |
|                                                                       |
| \"submittedBy\": \"TALENT\",                                          |
|                                                                       |
| \"withdrawnBy\": \"TALENT\", // Same as submittedBy                   |
|                                                                       |
| \"withdrawnById\": \"20000000-0000-4000-a000-000000000001\",          |
|                                                                       |
| \"withdrawnAt\": \"2025-02-06T08:00:00.000Z\",                        |
|                                                                       |
| \"withdrawalMessage\": \"Let me reconsider the terms.\",              |
|                                                                       |
| \"counterOfferTerms\": {                                              |
|                                                                       |
| \"rate\": 120, \"currencyCode\": \"USD\", \"durationMonths\": 6,      |
|                                                                       |
| \"workSchedule\": { \"type\": \"FULL_TIME\" },                        |
|                                                                       |
| \"startDate\": \"2025-03-01\", \"message\": \"\$120/hr.\"             |
|                                                                       |
| },                                                                    |
|                                                                       |
| \"parentOfferStatus\": \"PENDING\"                                    |
|                                                                       |
| }                                                                     |
+-----------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| **Event 14 offer.counter_expired \[SYSTEM\]**                         |
|                                                                       |
| Scheduler expires a PENDING CO. parentOfferStatus may be PENDING or   |
| EXPIRED.                                                              |
+-----------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| {                                                                     |
|                                                                       |
| \"eventId\": \"uuid\",                                                |
|                                                                       |
| \"eventType\": \"offer.counter_expired\",                             |
|                                                                       |
| \"schemaVersion\": \"1\",                                             |
|                                                                       |
| \"occurredAt\": \"2025-02-17T16:00:00.000Z\",                         |
|                                                                       |
| \"actor\": \"SYSTEM\",                                                |
|                                                                       |
| \"actorId\": null,                                                    |
|                                                                       |
| \"offerId\": \"40000000-0000-4000-a000-000000000001\",                |
|                                                                       |
| \"clientId\": \"10000000-0000-4000-a000-000000000001\",               |
|                                                                       |
| \"talentId\": \"20000000-0000-4000-a000-000000000001\",               |
|                                                                       |
| \"jobListingId\": \"30000000-0000-4000-a000-000000000001\",           |
|                                                                       |
| \"contractType\": \"PROJECT\",                                        |
|                                                                       |
| \"contractTitle\": \"Alpha Platform Rebuild\",                        |
|                                                                       |
| \"counterOfferId\": \"50000000-0000-4000-a000-000000000001\",         |
|                                                                       |
| \"submittedBy\": \"TALENT\",                                          |
|                                                                       |
| \"expiredAt\": \"2025-02-17T16:00:00.000Z\",                          |
|                                                                       |
| \"counterOfferTerms\": {                                              |
|                                                                       |
| \"rate\": 120, \"currencyCode\": \"USD\", \"durationMonths\": 6,      |
|                                                                       |
| \"workSchedule\": { \"type\": \"FULL_TIME\" },                        |
|                                                                       |
| \"startDate\": \"2025-03-01\", \"message\": \"\$120/hr.\"             |
|                                                                       |
| },                                                                    |
|                                                                       |
| \"parentOfferStatus\": \"PENDING\"                                    |
|                                                                       |
| // parentOfferStatus = \"EXPIRED\" if the parent offer also expired   |
| independently                                                         |
|                                                                       |
| // during the counter offer window (rare, but handled)                |
|                                                                       |
| }                                                                     |
+-----------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| **Step 4 Consumer Parsing Guide**                                     |
|                                                                       |
| How downstream services should handle these events                    |
+-----------------------------------------------------------------------+

This section is the reference for engineers building on
contracts-service, notification-service, and messaging-service. It
defines: which events each consumer receives, how to parse the payload,
and the critical idempotency requirement.

**Idempotency --- the most important rule**

The outbox processor retries failed publishes. A consumer may receive
the same event more than once. Every consumer MUST implement idempotency
by storing processed eventIds.

+-----------------------------------------------------------------------+
| // Consumer idempotency pattern (TypeScript):                         |
|                                                                       |
| async function handleOfferEvent(payload: AnyOfferEventPayload):       |
| Promise\<void\> {                                                     |
|                                                                       |
| // Step 1: Check if this eventId was already processed.               |
|                                                                       |
| const alreadyProcessed = await processedEventsRepo.exists({           |
|                                                                       |
| where: { eventId: payload.eventId },                                  |
|                                                                       |
| });                                                                   |
|                                                                       |
| if (alreadyProcessed) {                                               |
|                                                                       |
| logger.debug(\`Duplicate event ignored: \${payload.eventId}\`);       |
|                                                                       |
| channel.ack(message); // Ack so it leaves the queue                   |
|                                                                       |
| return;                                                               |
|                                                                       |
| }                                                                     |
|                                                                       |
| try {                                                                 |
|                                                                       |
| // Step 2: Process the event.                                         |
|                                                                       |
| await processEvent(payload);                                          |
|                                                                       |
| // Step 3: Record the eventId.                                        |
|                                                                       |
| await processedEventsRepo.save({ eventId: payload.eventId });         |
|                                                                       |
| // Step 4: Ack the message.                                           |
|                                                                       |
| channel.ack(message);                                                 |
|                                                                       |
| } catch (err) {                                                       |
|                                                                       |
| // Step 5: Nack on failure (with requeue=false if max retries         |
| reached).                                                             |
|                                                                       |
| // This sends the message to the DLQ.                                 |
|                                                                       |
| channel.nack(message, false, false);                                  |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
+-----------------------------------------------------------------------+

**contracts-service --- Receives: offer.accepted,
offer.counter_accepted**

+-----------------------------------------------------------------------+
| // contracts-service event handler:                                   |
|                                                                       |
| switch (payload.eventType) {                                          |
|                                                                       |
| case \'offer.accepted\': {                                            |
|                                                                       |
| // Create ContractGroup from offer.accepted terms.                    |
|                                                                       |
| // The terms in payload.terms are the final agreed terms.             |
|                                                                       |
| await contractGroupService.createFromOffer({                          |
|                                                                       |
| offerId: payload.offerId,                                             |
|                                                                       |
| clientId: payload.clientId,                                           |
|                                                                       |
| talentId: payload.talentId,                                           |
|                                                                       |
| jobListingId: payload.jobListingId,                                   |
|                                                                       |
| contractType: payload.contractType,                                   |
|                                                                       |
| contractTitle: payload.contractTitle, // Uniqueness checked HERE      |
|                                                                       |
| rate: payload.terms.rate,                                             |
|                                                                       |
| currencyCode: payload.terms.currencyCode,                             |
|                                                                       |
| durationMonths:payload.terms.durationMonths,                          |
|                                                                       |
| workSchedule: payload.terms.workSchedule,                             |
|                                                                       |
| startDate: payload.terms.startDate,                                   |
|                                                                       |
| acceptedAt: payload.acceptedAt,                                       |
|                                                                       |
| });                                                                   |
|                                                                       |
| break;                                                                |
|                                                                       |
| }                                                                     |
|                                                                       |
| case \'offer.counter_accepted\': {                                    |
|                                                                       |
| // Same as offer.accepted but use counterOfferTerms (not              |
| originalOfferTerms).                                                  |
|                                                                       |
| await contractGroupService.createFromOffer({                          |
|                                                                       |
| offerId: payload.offerId,                                             |
|                                                                       |
| clientId: payload.clientId,                                           |
|                                                                       |
| talentId: payload.talentId,                                           |
|                                                                       |
| jobListingId: payload.jobListingId,                                   |
|                                                                       |
| contractType: payload.contractType,                                   |
|                                                                       |
| contractTitle: payload.contractTitle,                                 |
|                                                                       |
| rate: payload.counterOfferTerms.rate,                                 |
|                                                                       |
| currencyCode: payload.counterOfferTerms.currencyCode,                 |
|                                                                       |
| durationMonths:payload.counterOfferTerms.durationMonths,              |
|                                                                       |
| workSchedule: payload.counterOfferTerms.workSchedule,                 |
|                                                                       |
| startDate: payload.counterOfferTerms.startDate,                       |
|                                                                       |
| acceptedAt: payload.acceptedAt,                                       |
|                                                                       |
| });                                                                   |
|                                                                       |
| break;                                                                |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
+-----------------------------------------------------------------------+

**notification-service --- Receives: all 14 events (offer.# binding)**

+-----------------------------------------------------------------------+
| // notification-service: determine recipient from actor               |
|                                                                       |
| function getNotificationRecipient(payload: AnyOfferEventPayload):     |
| string {                                                              |
|                                                                       |
| // SYSTEM events: notify BOTH parties                                 |
|                                                                       |
| if (payload.actor === \'SYSTEM\') return \'BOTH\';                    |
|                                                                       |
| // CLIENT action: notify TALENT                                       |
|                                                                       |
| if (payload.actor === \'CLIENT\') return payload.talentId;            |
|                                                                       |
| // TALENT action: notify CLIENT                                       |
|                                                                       |
| return payload.clientId;                                              |
|                                                                       |
| }                                                                     |
|                                                                       |
| // Example notification bodies by event:                              |
|                                                                       |
| // offer.created → TALENT: \"@clientUsername sent you an offer for    |
| projectTitle\"                                                        |
|                                                                       |
| // offer.edited → TALENT: \"@clientUsername updated their offer for   |
| projectTitle\"                                                        |
|                                                                       |
| // offer.accepted → CLIENT: \"@talentUsername accepted your offer for |
| projectTitle\"                                                        |
|                                                                       |
| // offer.declined → CLIENT: \"@talentUsername declined your offer\"   |
| (no reason shown)                                                     |
|                                                                       |
| // offer.withdrawn → TALENT: \"@clientUsername withdrew their offer\" |
|                                                                       |
| // offer.expired → BOTH: \"Your offer for projectTitle has expired\"  |
|                                                                       |
| // offer.expiring_soon → BOTH: \"Your offer for projectTitle expires  |
| in \~47 hours\"                                                       |
|                                                                       |
| // offer.resent → TALENT: \"@clientUsername resent their offer for    |
| projectTitle\"                                                        |
|                                                                       |
| // offer.countered → OTHER PARTY: \"@user sent a counter offer\"      |
|                                                                       |
| // offer.counter_edited → OTHER PARTY: \"@user updated their counter  |
| offer\"                                                               |
|                                                                       |
| // offer.counter_accepted → OTHER PARTY: \"@user accepted the counter |
| offer\"                                                               |
|                                                                       |
| // offer.counter_declined → SUBMITTER: \"@user declined your counter  |
| offer\"                                                               |
|                                                                       |
| // offer.counter_withdrawn→ OTHER PARTY: \"@user withdrew their       |
| counter offer\"                                                       |
|                                                                       |
| // offer.counter_expired → BOTH: \"Counter offer expired\"            |
+-----------------------------------------------------------------------+

**Handling unknown event types**

Consumers should handle unknown eventType values gracefully. If
offer-service adds a 15th event and the consumer is deployed before its
handler is updated, the consumer must not crash or DLQ the message.

+-----------------------------------------------------------------------+
| // Graceful unknown event handling:                                   |
|                                                                       |
| switch (payload.eventType) {                                          |
|                                                                       |
| case \'offer.created\':                                               |
|                                                                       |
| // \... handle                                                        |
|                                                                       |
| break;                                                                |
|                                                                       |
| // \... all known events \...                                         |
|                                                                       |
| default:                                                              |
|                                                                       |
| // Unknown event type. Ack it (do not DLQ) and log for monitoring.    |
|                                                                       |
| logger.warn(\`Unknown offer event type: \${payload.eventType}.        |
| Skipping.\`);                                                         |
|                                                                       |
| channel.ack(message);                                                 |
|                                                                       |
| break;                                                                |
|                                                                       |
| }                                                                     |
+-----------------------------------------------------------------------+
