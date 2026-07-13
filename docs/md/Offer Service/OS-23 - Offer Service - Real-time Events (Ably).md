**OS-23**

**Offer Service --- Real-time Events (Ably)**

**Channel:** offer:{offerId} **Event:** offer.updated (always full
state) **Auth:** Server-issued token, subscribe-only

This document covers the complete Ably real-time implementation for
offer-service. When any offer state changes, offer-service publishes an
offer.updated event to the Ably channel for that offer. The frontend
subscribes to this channel and updates its UI immediately without
polling. This document covers: channel naming, what is published and
when, which clients subscribe, Ably auth token generation, the
AblyService implementation, and the reconnection policy.

**File Map**

  ---------- --------------------------------------------- ---------------------------
  **Step**   **File Path**                                 **Purpose**

  **0**      (install)                                     npm install ably

  **1**      src/realtime/ably.service.ts                  AblyService: publish() and
                                                           createToken()

  **2**      src/realtime/realtime.module.ts               RealtimeModule: provides
                                                           AblyService

  **3**      src/realtime/dto/ably-token-response.dto.ts   Response shape for the
                                                           token endpoint

  **4**      src/offers/offers.controller.ts (update)      Add GET
                                                           /v1/offers/:id/ably-token
                                                           endpoint

  **5**      src/offers/offers.module.ts (update)          Import RealtimeModule

  **6**      (reference)                                   When publish() is called in
                                                           service methods

  **7**      (reference)                                   Ably payload shape for
                                                           every trigger

  **8**      (reference)                                   Reconnection policy and
                                                           frontend integration
                                                           contract

  **9**      (reference)                                   Environment variables and
                                                           verification
  ---------- --------------------------------------------- ---------------------------

+-----------------------------------------------------------------------+
| **Overview How Ably Fits into the Architecture**                      |
|                                                                       |
| Ably is for live UI updates --- NOT inter-service communication       |
+-----------------------------------------------------------------------+

offer-service uses two event systems that serve different purposes.
Understanding this distinction is critical before writing any
event-related code.

  ----------------- --------------------------- ---------------------------
                    **RabbitMQ (OS-19 --        **Ably (this document)**
                    OS-22)**                    

  **Purpose**       Inter-service communication Frontend UI updates
                    (offer-service →            (offer-service → browser)
                    contracts-service,          
                    notification-service,       
                    messaging-service)          

  **Transport**     AMQP over TCP to the        WebSocket (managed by Ably)
                    RabbitMQ broker             

  **Consumers**     Backend microservices only  Frontend clients (browser,
                                                mobile app)

  **Reliability**   Guaranteed delivery via     Best-effort. Frontend
                    outbox pattern + publisher  re-fetches on reconnect.
                    confirms                    

  **Payload**       Full event payloads (OS-20) Always: offer.updated with
                    --- structured per event    full current offer state
                    type                        

  **If down?**      Outbox retries for up to 34 Frontend polls REST API or
                    hours                       shows stale state

  **Auth**          Internal network (no auth   JWT-backed Ably token,
                    on broker)                  scoped to one offer channel
  ----------------- --------------------------- ---------------------------

+-----------------------------------------------------------------------+
| Ably publish is BEST-EFFORT. It is NOT a replacement for RabbitMQ.    |
|                                                                       |
| Every state change that needs inter-service communication MUST go     |
| through the outbox.                                                   |
|                                                                       |
| Ably publish happens AFTER the state change is committed to the       |
| database.                                                             |
|                                                                       |
| Ably publish failures never cause the API to return an error to the   |
| client.                                                               |
|                                                                       |
| If Ably is down: the state change still happens, RabbitMQ event still |
| fires,                                                                |
|                                                                       |
| the API returns 200/201. The frontend just does not get a real-time   |
| push.                                                                 |
|                                                                       |
| The frontend always has a fallback: reload via REST API.              |
+-----------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| **Section 1 Channel Naming Convention**                               |
|                                                                       |
| offer:{offerId} --- one channel per offer                             |
+-----------------------------------------------------------------------+

Every offer has its own dedicated Ably channel. The channel name is
constructed by combining the prefix \"offer:\" with the offer\'s UUID.
Both the client and talent who are parties to the offer subscribe to
this channel when they are viewing the offer.

+-----------------------------------------------------------------------+
| // Channel name format:                                               |
|                                                                       |
| offer:{offerId}                                                       |
|                                                                       |
| // Examples:                                                          |
|                                                                       |
| offer:f47ac10b-58cc-4372-a567-0e02b2c3d479                            |
|                                                                       |
| offer:40000000-0000-4000-a000-000000000001                            |
|                                                                       |
| // The constant is defined in OS-19 rabbitmq.constants.ts:            |
|                                                                       |
| export const ABLY_CHANNEL_PREFIX = \'offer:\';                        |
|                                                                       |
| // Helper used inside AblyService:                                    |
|                                                                       |
| function channelName(offerId: string): string {                       |
|                                                                       |
| return \`\${ABLY_CHANNEL_PREFIX}\${offerId}\`;                        |
|                                                                       |
| }                                                                     |
|                                                                       |
| // Result: \"offer:f47ac10b-58cc-4372-a567-0e02b2c3d479\"             |
+-----------------------------------------------------------------------+

**Why one channel per offer (not one per user)?**

  --------------------- -------------------------------------------------
  **Scoped security**   A token issued for offer:{offerId} cannot be
                        reused to subscribe to a different offer. The
                        token is mathematically bound to that channel
                        name.

  **Targeted delivery** Only the two parties (client + talent) subscribe.
                        No broadcast to unrelated users.

  **Simple              The frontend subscribes to exactly one channel
  subscription**        per offer modal it has open.

  **Independent         Different offers for the same user have different
  channels**            channels. One offer expiring does not affect the
                        channel for another.

  **Ably capacity**     Ably channels are cheap. One channel per active
                        offer is well within platform limits.
  --------------------- -------------------------------------------------

**Who subscribes to the channel?**

  --------------------- -------------------------------------------------
  **Offer CLIENT**      Subscribes when viewing the Sent Offers section
                        or the offer detail modal.

  **Offer TALENT**      Subscribes when viewing the Received Offers
                        section or the offer detail modal.

  **No one else**       No other user can subscribe. The token endpoint
                        validates party membership before issuing tokens.

  **Both                When both parties have the offer modal open, both
  simultaneously**      receive the same real-time event. The UI updates
                        for both instantly.
  --------------------- -------------------------------------------------

+-----------------------------------------------------------------------+
| **Section 2 What is Published and When**                              |
|                                                                       |
| offer.updated is the only Ably event. It fires on every state change. |
+-----------------------------------------------------------------------+

offer-service publishes exactly one Ably event type: offer.updated. This
fires every time any offer state changes. The payload always contains
the full current offer state. The frontend does not need to inspect the
event type --- it simply applies the received state to its local view.

+-----------------------------------------------------------------------+
| Design decision: single event type, full state payload.               |
|                                                                       |
| Alternative considered: one event per action (offer_accepted,         |
| offer_declined, etc.)                                                 |
|                                                                       |
| Problem: the frontend must handle every possible action type. Complex |
| switch logic.                                                         |
|                                                                       |
| Also: ordering matters. If two rapid events arrive out of order, UI   |
| is inconsistent.                                                      |
|                                                                       |
| Chosen approach: offer.updated with full current state.               |
|                                                                       |
| Benefit: frontend always has the authoritative current state.         |
|                                                                       |
| Benefit: ordering is irrelevant --- any received event is the truth.  |
|                                                                       |
| Benefit: new actions do not require frontend changes.                 |
|                                                                       |
| Tradeoff: slightly larger payload per event. Acceptable.              |
+-----------------------------------------------------------------------+

**Complete trigger table --- when offer.updated is published**

  ---------------------------------- ------------------ ----------------------------
  **Action (API Call)**              **State Change**   **Ably Publish:
                                                        offer.updated on channel**

  POST /v1/offers                    Offer created      offer:{newOfferId} --- Both
                                     (PENDING)          parties notified

  PATCH /v1/offers/:id               Offer terms edited offer:{offerId} --- Both
                                                        parties (talent sees updated
                                                        terms)

  POST /v1/offers/:id/accept         Offer ACCEPTED     offer:{offerId} --- Both
                                                        parties (UI transitions to
                                                        accepted state)

  POST /v1/offers/:id/decline        Offer DECLINED     offer:{offerId} --- Both
                                                        parties

  POST /v1/offers/:id/withdraw       Offer WITHDRAWN    offer:{offerId} --- Both
                                                        parties

  POST /v1/offers/:id/resend         New offer PENDING  offer:{newOfferId} --- Both
                                                        parties (new offer channel)

  POST \.../counter-offers           CO created, offer  offer:{offerId} --- Both
                                     COUNTERED          parties

  PATCH \.../counter-offers/:id      CO terms edited    offer:{offerId} --- Both
                                                        parties

  POST                               CO + offer         offer:{offerId} --- Both
  \.../counter-offers/:id/accept     ACCEPTED           parties

  POST                               CO DECLINED, offer offer:{offerId} --- Both
  \.../counter-offers/:id/decline    PENDING            parties (parent offer
                                                        restored)

  POST                               CO WITHDRAWN,      offer:{offerId} --- Both
  \.../counter-offers/:id/withdraw   offer PENDING      parties

  Expiry scheduler (offer)           Offer EXPIRED      offer:{offerId} --- Both
                                                        parties (timer fires, UI
                                                        shows expired)

  Expiry scheduler (counter offer)   CO EXPIRED, offer  offer:{offerId} --- Both
                                     PENDING            parties
  ---------------------------------- ------------------ ----------------------------

+-----------------------------------------------------------------------+
| **Section 3 Ably Event Payload Shape**                                |
|                                                                       |
| What the frontend receives on every offer.updated event               |
+-----------------------------------------------------------------------+

Every Ably message published from offer-service uses the event name
\"offer.updated\" and carries the full current offer state in its data
property. The payload includes the offer, the current active counter
offer (if any), and an optional rate warning flag. The frontend applies
this state directly without a REST API call.

+-----------------------------------------------------------------------+
| // Ably message shape received by the frontend:                       |
|                                                                       |
| {                                                                     |
|                                                                       |
| \"name\": \"offer.updated\",                                          |
|                                                                       |
| \"data\": {                                                           |
|                                                                       |
| // Full current offer state                                           |
|                                                                       |
| \"offer\": {                                                          |
|                                                                       |
| \"id\": \"uuid\",                                                     |
|                                                                       |
| \"clientId\": \"uuid\",                                               |
|                                                                       |
| \"talentId\": \"uuid\",                                               |
|                                                                       |
| \"jobListingId\": \"uuid\",                                           |
|                                                                       |
| \"contractType\": \"PROJECT\",                                        |
|                                                                       |
| \"contractTitle\": \"Alpha Platform Rebuild\",                        |
|                                                                       |
| \"status\": \"COUNTERED\",                                            |
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
| \"message\": null,                                                    |
|                                                                       |
| \"expiresAt\": \"2025-02-14T10:00:00.000Z\",                          |
|                                                                       |
| \"acceptedAt\": null,                                                 |
|                                                                       |
| \"declinedAt\": null,                                                 |
|                                                                       |
| \"withdrawnAt\": null,                                                |
|                                                                       |
| \"expiredAt\": null,                                                  |
|                                                                       |
| \"createdAt\": \"2025-01-30T10:00:00.000Z\",                          |
|                                                                       |
| \"updatedAt\": \"2025-02-03T16:00:00.000Z\"                           |
|                                                                       |
| },                                                                    |
|                                                                       |
| // Current active counter offer (null if none)                        |
|                                                                       |
| \"counterOffer\": {                                                   |
|                                                                       |
| \"id\": \"uuid\",                                                     |
|                                                                       |
| \"offerId\": \"uuid\",                                                |
|                                                                       |
| \"submittedBy\": \"TALENT\",                                          |
|                                                                       |
| \"submittedById\": \"uuid\",                                          |
|                                                                       |
| \"status\": \"PENDING\",                                              |
|                                                                       |
| \"rate\": 115,                                                        |
|                                                                       |
| \"currencyCode\": \"USD\",                                            |
|                                                                       |
| \"durationMonths\": 6,                                                |
|                                                                       |
| \"workSchedule\": { \"type\": \"FULL_TIME\" },                        |
|                                                                       |
| \"startDate\": \"2025-03-01\",                                        |
|                                                                       |
| \"message\": \"\$115/hr is my rate.\",                                |
|                                                                       |
| \"expiresAt\": \"2025-02-17T16:00:00.000Z\",                          |
|                                                                       |
| \"createdAt\": \"2025-02-03T16:00:00.000Z\",                          |
|                                                                       |
| \"updatedAt\": \"2025-02-03T16:00:00.000Z\"                           |
|                                                                       |
| },                                                                    |
|                                                                       |
| // Rate warning flag (for counter offers only)                        |
|                                                                       |
| \"rateWarning\": true,                                                |
|                                                                       |
| // Timestamp of when this update was generated server-side            |
|                                                                       |
| \"updatedAt\": \"2025-02-03T16:00:00.000Z\"                           |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
|                                                                       |
| // counterOffer is null when:                                         |
|                                                                       |
| // - No counter offer exists for this offer                           |
|                                                                       |
| // - The counter offer is in a terminal state (ACCEPTED, DECLINED,    |
| etc.)                                                                 |
|                                                                       |
| // - offer.status is PENDING (no active CO)                           |
|                                                                       |
| // rateWarning is:                                                    |
|                                                                       |
| // - true if the most recent CO rate exceeds the 1.25x threshold      |
|                                                                       |
| // - false if it does not                                             |
|                                                                       |
| // - false when no CO is active                                       |
+-----------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| **Step 0 Install Dependencies**                                       |
|                                                                       |
| npm install ably                                                      |
+-----------------------------------------------------------------------+

The Ably Node.js SDK provides both REST and Realtime clients.
offer-service uses only the REST client (Ably.Rest) for publishing and
token generation. The Realtime client is for browsers and is not used
server-side.

  -----------------------------------------------------------------------
  **FILE: Terminal --- run from monorepo root**

  -----------------------------------------------------------------------

+-----------------------------------------------------------------------+
| \# Check if already installed                                         |
|                                                                       |
| cat package.json \| grep ably                                         |
|                                                                       |
| \# Install if missing                                                 |
|                                                                       |
| npm install ably                                                      |
|                                                                       |
| \# Verify                                                             |
|                                                                       |
| cat package.json \| grep ably                                         |
|                                                                       |
| \# Expected: \"ably\": \"\^2.x.x\"                                    |
|                                                                       |
| \# Note: The ably package ships TypeScript types. \@types/ably is not |
| needed.                                                               |
+-----------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| **Step 1 AblyService --- ably.service.ts**                            |
|                                                                       |
| Two methods: publish() and createToken()                              |
+-----------------------------------------------------------------------+

AblyService is the core Ably integration. It provides two methods used
throughout offer-service: publish() pushes a real-time update to all
clients watching a specific offer, and createToken() generates a
short-lived, scoped Ably token for the frontend to use when subscribing.

+-----------------------------------------------------------------------+
| Server-side uses Ably.Rest (not Ably.Realtime):                       |
|                                                                       |
| Ably.Rest makes standard HTTP REST API calls to the Ably service.     |
|                                                                       |
| It does not hold a persistent WebSocket connection.                   |
|                                                                       |
| This is the correct choice for server-side publishing:                |
|                                                                       |
| \- Lower resource usage (no persistent connection)                    |
|                                                                       |
| \- Stateless (each publish is an independent HTTP call)               |
|                                                                       |
| \- Ably.Realtime is for browser clients that need to subscribe        |
|                                                                       |
| ABLY_API_KEY security:                                                |
|                                                                       |
| The full ABLY_API_KEY is only used server-side (this file).           |
|                                                                       |
| The frontend NEVER has the API key.                                   |
|                                                                       |
| The frontend gets a short-lived token via GET                         |
| /v1/offers/:id/ably-token.                                            |
|                                                                       |
| That token is scoped to subscribe-only on one specific channel.       |
+-----------------------------------------------------------------------+

  -----------------------------------------------------------------------
  **FILE: apps/offer-service/src/realtime/ably.service.ts**

  -----------------------------------------------------------------------

+-----------------------------------------------------------------------+
| import { Injectable, Logger } from \'@nestjs/common\';                |
|                                                                       |
| import { ConfigService } from \'@nestjs/config\';                     |
|                                                                       |
| import \* as Ably from \'ably\';                                      |
|                                                                       |
| import { OfferConfig } from \'../config/offer.config\';               |
|                                                                       |
| import { ABLY_CHANNEL_PREFIX } from                                   |
| \'../messaging/constants/rabbitmq.constants\';                        |
|                                                                       |
| import { Offer } from \'../offers/entities/offer.entity\';            |
|                                                                       |
| import { CounterOffer } from                                          |
| \'../counter-offers/entities/counter-offer.entity\';                  |
|                                                                       |
| /\*\*                                                                 |
|                                                                       |
| \* Payload pushed to the frontend on every offer.updated event.       |
|                                                                       |
| \* Always contains the full current offer state.                      |
|                                                                       |
| \*/                                                                   |
|                                                                       |
| export interface AblyOfferUpdatedPayload {                            |
|                                                                       |
| offer: Record\<string, unknown\>; // Serialized Offer entity          |
|                                                                       |
| counterOffer: Record\<string, unknown\> \| null; // Active CO or null |
|                                                                       |
| rateWarning: boolean;                                                 |
|                                                                       |
| updatedAt: string; // ISO 8601 UTC                                    |
|                                                                       |
| }                                                                     |
|                                                                       |
| /\*\*                                                                 |
|                                                                       |
| \* Ably token response returned to the frontend.                      |
|                                                                       |
| \*/                                                                   |
|                                                                       |
| export interface AblyTokenDetails {                                   |
|                                                                       |
| token: string;                                                        |
|                                                                       |
| expires: number; // Unix timestamp (ms) when the token expires        |
|                                                                       |
| issued: number; // Unix timestamp (ms) when the token was issued      |
|                                                                       |
| capability: string; // JSON string of channel permissions             |
|                                                                       |
| }                                                                     |
|                                                                       |
| /\*\*                                                                 |
|                                                                       |
| \* AblyService --- Handles real-time publishing and token generation. |
|                                                                       |
| \*                                                                    |
|                                                                       |
| \* Used by: OffersService, CounterOffersService, Scheduler (expiry    |
| events).                                                              |
|                                                                       |
| \*                                                                    |
|                                                                       |
| \* publish() --- Called after every successful state change.          |
|                                                                       |
| \* createToken() --- Called by GET /v1/offers/:id/ably-token in       |
| OffersController.                                                     |
|                                                                       |
| \*/                                                                   |
|                                                                       |
| \@Injectable()                                                        |
|                                                                       |
| export class AblyService {                                            |
|                                                                       |
| private readonly logger = new Logger(AblyService.name);               |
|                                                                       |
| private readonly client: Ably.Rest;                                   |
|                                                                       |
| private readonly tokenTtlSeconds: number;                             |
|                                                                       |
| constructor(private readonly config: ConfigService) {                 |
|                                                                       |
| const cfg = config.get\<OfferConfig\>(\'offer\').ably;                |
|                                                                       |
| // Ably.Rest: HTTP-only client. No persistent WebSocket.              |
|                                                                       |
| // Correct for server-side use (publishing and token generation).     |
|                                                                       |
| this.client = new Ably.Rest({                                         |
|                                                                       |
| key: cfg.apiKey,                                                      |
|                                                                       |
| environment: cfg.environment ?? \'production\',                       |
|                                                                       |
| });                                                                   |
|                                                                       |
| // Token TTL: how long frontend tokens are valid.                     |
|                                                                       |
| // Default 3600s (1 hour). Confirm with ABLY_TOKEN_TTL_SECONDS in     |
| .env.                                                                 |
|                                                                       |
| this.tokenTtlSeconds = cfg.tokenTtlSeconds ?? 3600;                   |
|                                                                       |
| }                                                                     |
|                                                                       |
| // ============================================================       |
|                                                                       |
| // publish() --- Push offer.updated to the offer channel              |
|                                                                       |
| // ============================================================       |
|                                                                       |
| /\*\*                                                                 |
|                                                                       |
| \* Publish an offer.updated event to the offer channel.               |
|                                                                       |
| \*                                                                    |
|                                                                       |
| \* Called after every offer state change:                             |
|                                                                       |
| \* - In OffersService: after create, edit, accept, decline, withdraw, |
| resend                                                                |
|                                                                       |
| \* - In CounterOffersService: after create CO, edit CO, accept CO,    |
| decline CO, withdraw CO                                               |
|                                                                       |
| \* - In ExpiryProcessor: after expiring offers and counter offers     |
|                                                                       |
| \*                                                                    |
|                                                                       |
| \* IMPORTANT: This is called OUTSIDE the database transaction.        |
|                                                                       |
| \* The state change is already committed before this runs.            |
|                                                                       |
| \* Ably publish failure does NOT affect the API response.             |
|                                                                       |
| \*                                                                    |
|                                                                       |
| \* \@param offerId The offer ID --- determines the channel name       |
|                                                                       |
| \* \@param offer The current Offer entity after the state change      |
|                                                                       |
| \* \@param counterOffer The current active CounterOffer (if any)      |
|                                                                       |
| \* \@param rateWarning Whether the current CO rate triggers the       |
| warning                                                               |
|                                                                       |
| \*/                                                                   |
|                                                                       |
| async publish(                                                        |
|                                                                       |
| offerId: string,                                                      |
|                                                                       |
| offer: Offer,                                                         |
|                                                                       |
| counterOffer: CounterOffer \| null,                                   |
|                                                                       |
| rateWarning = false,                                                  |
|                                                                       |
| ): Promise\<void\> {                                                  |
|                                                                       |
| const channelName = \`\${ABLY_CHANNEL_PREFIX}\${offerId}\`;           |
|                                                                       |
| const payload: AblyOfferUpdatedPayload = {                            |
|                                                                       |
| offer: this.serializeOffer(offer),                                    |
|                                                                       |
| counterOffer: counterOffer ? this.serializeCounterOffer(counterOffer) |
| : null,                                                               |
|                                                                       |
| rateWarning,                                                          |
|                                                                       |
| updatedAt: new Date().toISOString(),                                  |
|                                                                       |
| };                                                                    |
|                                                                       |
| try {                                                                 |
|                                                                       |
| const channel = this.client.channels.get(channelName);                |
|                                                                       |
| await channel.publish(\'offer.updated\', payload);                    |
|                                                                       |
| this.logger.debug(\`Ably published offer.updated to                   |
| \${channelName}\`);                                                   |
|                                                                       |
| } catch (err) {                                                       |
|                                                                       |
| // Log but do NOT throw. Ably failure never fails the API request.    |
|                                                                       |
| this.logger.error(                                                    |
|                                                                       |
| \`Ably publish failed for channel \${channelName}:\`,                 |
|                                                                       |
| err instanceof Error ? err.message : String(err),                     |
|                                                                       |
| );                                                                    |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
|                                                                       |
| // ============================================================       |
|                                                                       |
| // createToken() --- Generate a scoped frontend token                 |
|                                                                       |
| // ============================================================       |
|                                                                       |
| /\*\*                                                                 |
|                                                                       |
| \* Generate a short-lived Ably token for a specific offer channel.    |
|                                                                       |
| \*                                                                    |
|                                                                       |
| \* The token grants:                                                  |
|                                                                       |
| \* - Subscribe permission on offer:{offerId} only                     |
|                                                                       |
| \* - No publish permission (read-only)                                |
|                                                                       |
| \* - No access to any other channel                                   |
|                                                                       |
| \*                                                                    |
|                                                                       |
| \* Called by: GET /v1/offers/:id/ably-token in OffersController.      |
|                                                                       |
| \* The endpoint validates that the requesting user is a party to this |
| offer                                                                 |
|                                                                       |
| \* before calling this method (OfferPartyGuard).                      |
|                                                                       |
| \*                                                                    |
|                                                                       |
| \* \@param offerId The offer ID. Scopes the token to offer:{offerId}. |
|                                                                       |
| \* \@param userId The requesting user ID. Embedded in the token       |
| clientId.                                                             |
|                                                                       |
| \* \@returns The token string and its metadata.                       |
|                                                                       |
| \*/                                                                   |
|                                                                       |
| async createToken(                                                    |
|                                                                       |
| offerId: string,                                                      |
|                                                                       |
| userId: string,                                                       |
|                                                                       |
| ): Promise\<AblyTokenDetails\> {                                      |
|                                                                       |
| const channelName = \`\${ABLY_CHANNEL_PREFIX}\${offerId}\`;           |
|                                                                       |
| return new Promise((resolve, reject) =\> {                            |
|                                                                       |
| this.client.auth.requestToken(                                        |
|                                                                       |
| {                                                                     |
|                                                                       |
| // clientId: embedded in the token. Allows Ably to identify this      |
| user.                                                                 |
|                                                                       |
| // The frontend can use this for presence features if needed.         |
|                                                                       |
| clientId: userId,                                                     |
|                                                                       |
| // capability: JSON object defining channel permissions.              |
|                                                                       |
| // Format: { \"channelName\": \[\"operation1\", \"operation2\"\] }    |
|                                                                       |
| // subscribe: can receive messages from this channel.                 |
|                                                                       |
| // NOT granted: publish, presence, history.                           |
|                                                                       |
| capability: JSON.stringify({                                          |
|                                                                       |
| \[channelName\]: \[\'subscribe\'\],                                   |
|                                                                       |
| }),                                                                   |
|                                                                       |
| // TTL in milliseconds. Default: 1 hour.                              |
|                                                                       |
| ttl: this.tokenTtlSeconds \* 1000,                                    |
|                                                                       |
| },                                                                    |
|                                                                       |
| (err, tokenDetails) =\> {                                             |
|                                                                       |
| if (err \|\| !tokenDetails) {                                         |
|                                                                       |
| this.logger.error(                                                    |
|                                                                       |
| \`Ably token generation failed for offer \${offerId}:\`,              |
|                                                                       |
| err instanceof Error ? err.message : String(err),                     |
|                                                                       |
| );                                                                    |
|                                                                       |
| reject(err ?? new Error(\'Ably token generation failed\'));           |
|                                                                       |
| return;                                                               |
|                                                                       |
| }                                                                     |
|                                                                       |
| resolve({                                                             |
|                                                                       |
| token: tokenDetails.token,                                            |
|                                                                       |
| expires: tokenDetails.expires ?? Date.now() + this.tokenTtlSeconds \* |
| 1000,                                                                 |
|                                                                       |
| issued: tokenDetails.issued ?? Date.now(),                            |
|                                                                       |
| capability: JSON.stringify({ \[channelName\]: \[\'subscribe\'\] }),   |
|                                                                       |
| });                                                                   |
|                                                                       |
| },                                                                    |
|                                                                       |
| );                                                                    |
|                                                                       |
| });                                                                   |
|                                                                       |
| }                                                                     |
|                                                                       |
| // ============================================================       |
|                                                                       |
| // isReady() --- Used by /ready health check                          |
|                                                                       |
| // ============================================================       |
|                                                                       |
| /\*\*                                                                 |
|                                                                       |
| \* Verify the Ably client can reach the Ably service.                 |
|                                                                       |
| \* Called by HealthService for the /ready endpoint.                   |
|                                                                       |
| \*/                                                                   |
|                                                                       |
| async isReady(): Promise\<boolean\> {                                 |
|                                                                       |
| try {                                                                 |
|                                                                       |
| // Use the time endpoint --- lightweight check that verifies          |
| connectivity.                                                         |
|                                                                       |
| await this.client.time();                                             |
|                                                                       |
| return true;                                                          |
|                                                                       |
| } catch {                                                             |
|                                                                       |
| return false;                                                         |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
|                                                                       |
| // ============================================================       |
|                                                                       |
| // Private serializers                                                |
|                                                                       |
| // ============================================================       |
|                                                                       |
| private serializeOffer(offer: Offer): Record\<string, unknown\> {     |
|                                                                       |
| return {                                                              |
|                                                                       |
| id: offer.id,                                                         |
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
| status: offer.status,                                                 |
|                                                                       |
| rate: offer.rate,                                                     |
|                                                                       |
| currencyCode: offer.currencyCode,                                     |
|                                                                       |
| durationMonths: offer.durationMonths,                                 |
|                                                                       |
| workSchedule: offer.workSchedule,                                     |
|                                                                       |
| startDate: offer.startDate,                                           |
|                                                                       |
| message: offer.message,                                               |
|                                                                       |
| expiresAt: offer.expiresAt.toISOString(),                             |
|                                                                       |
| acceptedAt: offer.acceptedAt?.toISOString() ?? null,                  |
|                                                                       |
| declinedAt: offer.declinedAt?.toISOString() ?? null,                  |
|                                                                       |
| withdrawnAt: offer.withdrawnAt?.toISOString() ?? null,                |
|                                                                       |
| expiredAt: offer.expiredAt?.toISOString() ?? null,                    |
|                                                                       |
| createdAt: offer.createdAt.toISOString(),                             |
|                                                                       |
| updatedAt: offer.updatedAt.toISOString(),                             |
|                                                                       |
| };                                                                    |
|                                                                       |
| }                                                                     |
|                                                                       |
| private serializeCounterOffer(co: CounterOffer): Record\<string,      |
| unknown\> {                                                           |
|                                                                       |
| return {                                                              |
|                                                                       |
| id: co.id,                                                            |
|                                                                       |
| offerId: co.offerId,                                                  |
|                                                                       |
| submittedBy: co.submittedBy,                                          |
|                                                                       |
| submittedById: co.submittedById,                                      |
|                                                                       |
| status: co.status,                                                    |
|                                                                       |
| rate: co.rate,                                                        |
|                                                                       |
| currencyCode: co.currencyCode,                                        |
|                                                                       |
| durationMonths: co.durationMonths,                                    |
|                                                                       |
| workSchedule: co.workSchedule,                                        |
|                                                                       |
| startDate: co.startDate,                                              |
|                                                                       |
| message: co.message,                                                  |
|                                                                       |
| expiresAt: co.expiresAt.toISOString(),                                |
|                                                                       |
| acceptedAt: co.acceptedAt?.toISOString() ?? null,                     |
|                                                                       |
| declinedAt: co.declinedAt?.toISOString() ?? null,                     |
|                                                                       |
| withdrawnAt: co.withdrawnAt?.toISOString() ?? null,                   |
|                                                                       |
| expiredAt: co.expiredAt?.toISOString() ?? null,                       |
|                                                                       |
| supersededAt: co.supersededAt?.toISOString() ?? null,                 |
|                                                                       |
| createdAt: co.createdAt.toISOString(),                                |
|                                                                       |
| updatedAt: co.updatedAt.toISOString(),                                |
|                                                                       |
| };                                                                    |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
+-----------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| **Step 2 RealtimeModule --- realtime.module.ts**                      |
|                                                                       |
| NestJS module that provides AblyService                               |
+-----------------------------------------------------------------------+

RealtimeModule bundles AblyService into a NestJS module. It is decorated
with \@Global() so any module can inject AblyService without
re-importing RealtimeModule. Import it once in AppModule.

  -----------------------------------------------------------------------
  **FILE: apps/offer-service/src/realtime/realtime.module.ts**

  -----------------------------------------------------------------------

+-----------------------------------------------------------------------+
| import { Module, Global } from \'@nestjs/common\';                    |
|                                                                       |
| import { AblyService } from \'./ably.service\';                       |
|                                                                       |
| /\*\*                                                                 |
|                                                                       |
| \* RealtimeModule --- Provides AblyService to the entire application. |
|                                                                       |
| \*                                                                    |
|                                                                       |
| \* \@Global() means AblyService is injectable in any module without   |
|                                                                       |
| \* importing RealtimeModule explicitly.                               |
|                                                                       |
| \*                                                                    |
|                                                                       |
| \* Import once in AppModule.                                          |
|                                                                       |
| \*/                                                                   |
|                                                                       |
| \@Global()                                                            |
|                                                                       |
| \@Module({                                                            |
|                                                                       |
| providers: \[AblyService\],                                           |
|                                                                       |
| exports: \[AblyService\],                                             |
|                                                                       |
| })                                                                    |
|                                                                       |
| export class RealtimeModule {}                                        |
+-----------------------------------------------------------------------+

Then add to AppModule:

+-----------------------------------------------------------------------+
| // In apps/offer-service/src/app.module.ts:                           |
|                                                                       |
| import { RealtimeModule } from \'./realtime/realtime.module\';        |
|                                                                       |
| \@Module({                                                            |
|                                                                       |
| imports: \[                                                           |
|                                                                       |
| ConfigModule.forRoot(\...),                                           |
|                                                                       |
| TypeOrmModule.forRootAsync(\...),                                     |
|                                                                       |
| AuthModule,                                                           |
|                                                                       |
| RedisModule,                                                          |
|                                                                       |
| MessagingModule,                                                      |
|                                                                       |
| AlertModule,                                                          |
|                                                                       |
| RealtimeModule, // \<\-- ADD THIS. \@Global() makes AblyService       |
| injectable everywhere.                                                |
|                                                                       |
| OffersModule,                                                         |
|                                                                       |
| CounterOffersModule,                                                  |
|                                                                       |
| HealthModule,                                                         |
|                                                                       |
| \],                                                                   |
|                                                                       |
| \...                                                                  |
|                                                                       |
| })                                                                    |
|                                                                       |
| export class AppModule {}                                             |
+-----------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| **Step 3 Ably Token Endpoint --- GET /v1/offers/:id/ably-token**      |
|                                                                       |
| Add to OffersController                                               |
+-----------------------------------------------------------------------+

The frontend calls this endpoint when it opens the offer detail view.
The endpoint validates that the requesting user is a party to the offer
(via OfferPartyGuard), then generates a short-lived Ably token scoped to
that offer\'s channel. The frontend uses this token to subscribe to the
channel via the Ably JavaScript SDK.

+-----------------------------------------------------------------------+
| Token endpoint security:                                              |
|                                                                       |
| 1\. JwtAuthGuard validates the JWT (user must be logged in)           |
|                                                                       |
| 2\. OfferPartyGuard loads the offer and confirms the user is clientId |
| or talentId                                                           |
|                                                                       |
| 3\. AblyService.createToken() issues a token with capability:         |
|                                                                       |
| { \"offer:{offerId}\": \[\"subscribe\"\] }                            |
|                                                                       |
| 4\. The token is scoped to subscribe-only on one channel              |
|                                                                       |
| 5\. The token expires after tokenTtlSeconds (default 1 hour)          |
|                                                                       |
| The frontend cannot reuse this token for other offers.                |
|                                                                       |
| If the offer ID in the token does not match, Ably rejects the         |
| subscription.                                                         |
+-----------------------------------------------------------------------+

  -----------------------------------------------------------------------
  **FILE: apps/offer-service/src/offers/offers.controller.ts (add this
  endpoint)**

  -----------------------------------------------------------------------

+------------------------------------------------------------------------+
| // Add this endpoint to the existing OffersController:                 |
|                                                                        |
| import { AblyService } from \'../realtime/ably.service\';              |
|                                                                        |
| // In the constructor, inject AblyService:                             |
|                                                                        |
| constructor(                                                           |
|                                                                        |
| private readonly offersService: OffersService,                         |
|                                                                        |
| private readonly ablyService: AblyService, // \<\-- ADD                |
|                                                                        |
| ) {}                                                                   |
|                                                                        |
| /\*\*                                                                  |
|                                                                        |
| \* GET /v1/offers/:id/ably-token                                       |
|                                                                        |
| \*                                                                     |
|                                                                        |
| \* Generates a short-lived Ably token for the frontend to subscribe    |
|                                                                        |
| \* to the real-time channel for this offer.                            |
|                                                                        |
| \*                                                                     |
|                                                                        |
| \* Auth: JWT required. Must be offer.clientId or offer.talentId.       |
|                                                                        |
| \* Guards: JwtAuthGuard (global), OfferPartyGuard (validates party     |
| membership).                                                           |
|                                                                        |
| \*                                                                     |
|                                                                        |
| \* Returns: Ably token details for the frontend Ably SDK.              |
|                                                                        |
| \*                                                                     |
|                                                                        |
| \* The token capability is: { \"offer:{offerId}\": \[\"subscribe\"\] } |
|                                                                        |
| \* The token expires after ABLY_TOKEN_TTL_SECONDS (default 1 hour).    |
|                                                                        |
| \*/                                                                    |
|                                                                        |
| \@Get(\':id/ably-token\')                                              |
|                                                                        |
| \@UseGuards(OfferPartyGuard)                                           |
|                                                                        |
| \@HttpCode(HttpStatus.OK)                                              |
|                                                                        |
| async getAblyToken(                                                    |
|                                                                        |
| \@Param(\'id\', ParseUUIDPipe) id: string,                             |
|                                                                        |
| \@Req() req: AuthenticatedRequest,                                     |
|                                                                        |
| ) {                                                                    |
|                                                                        |
| return this.ablyService.createToken(id, req.user.sub);                 |
|                                                                        |
| }                                                                      |
|                                                                        |
| // Response example:                                                   |
|                                                                        |
| // {                                                                   |
|                                                                        |
| // \"token\": \"xVLyHw.D14EXg\...\", // Ably token string              |
|                                                                        |
| // \"expires\": 1706695200000, // Unix ms timestamp                    |
|                                                                        |
| // \"issued\": 1706691600000,                                          |
|                                                                        |
| // \"capability\":                                                     |
| \"{\"offer:f47ac10b-58cc-4372-a567-0e02b2c3d479\":\[\"subscribe\"\]}\" |
|                                                                        |
| // }                                                                   |
+------------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| **Step 4 (Pattern) How publish() is Called in Service Methods**       |
|                                                                       |
| Copy this pattern into every service method that changes offer state  |
+-----------------------------------------------------------------------+

Every service method that changes offer state must call
ablyService.publish() after the database transaction commits. The
publish call is always outside the transaction so that: (1) the state is
guaranteed to be in the DB before the frontend receives the
notification, and (2) a slow Ably call does not hold a DB transaction
open.

+-----------------------------------------------------------------------+
| publish() is always called AFTER the transaction commits.             |
|                                                                       |
| Never call publish() inside a database transaction.                   |
|                                                                       |
| publish() is fire-and-forget: it catches its own errors and never     |
| throws.                                                               |
|                                                                       |
| The API response is sent to the client regardless of whether          |
| publish() succeeds.                                                   |
|                                                                       |
| publish() is async but you do NOT need to await it in most cases.     |
|                                                                       |
| If you await it, a slow Ably call adds latency to the API response.   |
|                                                                       |
| Recommendation: call publish() without await to avoid blocking the    |
| response.                                                             |
+-----------------------------------------------------------------------+

**Pattern A --- accept(), decline(), withdraw() (no counter offer)**

+-----------------------------------------------------------------------+
| // In OffersService.accept():                                         |
|                                                                       |
| async accept(offerId: string, requesterId: string, dto:               |
| AcceptOfferDto): Promise\<Offer\> {                                   |
|                                                                       |
| // 1. Load the offer                                                  |
|                                                                       |
| const offer = await this.findById(offerId);                           |
|                                                                       |
| // 2. State machine validation                                        |
|                                                                       |
| if (offer.status !== OfferStatus.PENDING) {                           |
|                                                                       |
| throw new OfferNotActionableException(offer.status);                  |
|                                                                       |
| }                                                                     |
|                                                                       |
| // 3. Atomic CAS update + outbox write in ONE transaction             |
|                                                                       |
| const updatedOffer = await this.dataSource.transaction(async (em) =\> |
| {                                                                     |
|                                                                       |
| const result = await em.query(                                        |
|                                                                       |
| \`UPDATE offer_service.offers SET status=\'ACCEPTED\',                |
| accepted_at=NOW()                                                     |
|                                                                       |
| WHERE id=\$1 AND status=\'PENDING\' RETURNING \*\`,                   |
|                                                                       |
| \[offerId\]                                                           |
|                                                                       |
| );                                                                    |
|                                                                       |
| if (result\[1\] === 0) throw new OfferAlreadyAcceptedException();     |
|                                                                       |
| // Write outbox event inside same transaction                         |
|                                                                       |
| await this.outboxService.create(em, {                                 |
|                                                                       |
| aggregateId: offerId,                                                 |
|                                                                       |
| eventType: OFFER_EVENTS.ACCEPTED,                                     |
|                                                                       |
| routingKey: OFFER_EVENTS.ACCEPTED,                                    |
|                                                                       |
| payload: buildOfferAcceptedPayload(result\[0\]),                      |
|                                                                       |
| });                                                                   |
|                                                                       |
| return result\[0\] as Offer;                                          |
|                                                                       |
| });                                                                   |
|                                                                       |
| // 4. Ably publish OUTSIDE the transaction (fire-and-forget)          |
|                                                                       |
| // No counter offer on ACCEPTED state.                                |
|                                                                       |
| this.ablyService.publish(offerId, updatedOffer, null, false);         |
|                                                                       |
| // Note: no await --- Ably latency does not block the API response    |
|                                                                       |
| return updatedOffer;                                                  |
|                                                                       |
| }                                                                     |
+-----------------------------------------------------------------------+

**Pattern B --- createCounterOffer() (has active counter offer)**

+-----------------------------------------------------------------------+
| // In CounterOffersService.create():                                  |
|                                                                       |
| async create(                                                         |
|                                                                       |
| offerId: string,                                                      |
|                                                                       |
| requesterId: string,                                                  |
|                                                                       |
| role: UserRole,                                                       |
|                                                                       |
| dto: CreateCounterOfferDto,                                           |
|                                                                       |
| ): Promise\<CounterOffer\> {                                          |
|                                                                       |
| // \... validation, active-CO check \...                              |
|                                                                       |
| const { updatedOffer, newCO } = await                                 |
| this.dataSource.transaction(async (em) =\> {                          |
|                                                                       |
| // \... create CO, update parent offer status to COUNTERED, write     |
| outbox \...                                                           |
|                                                                       |
| });                                                                   |
|                                                                       |
| // Compute rate warning AFTER transaction                             |
|                                                                       |
| const rateWarning = computeRateWarning(updatedOffer.rate, newCO.rate, |
| role);                                                                |
|                                                                       |
| // Ably publish: offer state + active CO + rate warning               |
|                                                                       |
| this.ablyService.publish(offerId, updatedOffer, newCO, rateWarning);  |
|                                                                       |
| return newCO;                                                         |
|                                                                       |
| }                                                                     |
|                                                                       |
| // Rate warning computation:                                          |
|                                                                       |
| // Talent submits CO: warn if coRate \> parentRate \* 1.25            |
|                                                                       |
| // Client submits CO: warn if coRate \< parentRate \* 0.8 (direction  |
| flips)                                                                |
|                                                                       |
| function computeRateWarning(                                          |
|                                                                       |
| parentRate: number,                                                   |
|                                                                       |
| coRate: number,                                                       |
|                                                                       |
| submittedByRole: \'CLIENT\' \| \'TALENT\',                            |
|                                                                       |
| ): boolean {                                                          |
|                                                                       |
| if (submittedByRole === \'TALENT\') {                                 |
|                                                                       |
| return coRate \> parentRate \* 1.25;                                  |
|                                                                       |
| } else {                                                              |
|                                                                       |
| return coRate \< parentRate \* 0.8;                                   |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
+-----------------------------------------------------------------------+

**Pattern C --- Expiry scheduler (batch)**

+-----------------------------------------------------------------------+
| // In ExpiryProcessor (scheduler/expiry.processor.ts):                |
|                                                                       |
| for (const expiredOffer of expiredOffers) {                           |
|                                                                       |
| // Write outbox event and update status in transaction                |
|                                                                       |
| await this.expireOffer(expiredOffer);                                 |
|                                                                       |
| // Ably publish AFTER transaction (fire-and-forget)                   |
|                                                                       |
| this.ablyService.publish(expiredOffer.id, expiredOffer, null, false); |
|                                                                       |
| }                                                                     |
+-----------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| **Section 5 Reconnection Policy & Frontend Contract**                 |
|                                                                       |
| What happens when the frontend reconnects after a disconnection       |
+-----------------------------------------------------------------------+

Ably buffers messages for disconnected clients for up to 2 minutes. If
the frontend reconnects within 2 minutes, it receives any missed events
automatically. After 2 minutes, buffered messages are lost. The frontend
must re-fetch the current offer state via REST API on reconnect.

**The 2-minute Ably buffer window**

  --------------------- -------------------------------------------------
  **0 -- 2 minutes      Ably buffers events. Frontend reconnects and
  disconnected**        receives missed offer.updated events
                        automatically. No REST call needed.

  **\> 2 minutes        Buffer expired. Frontend reconnects but Ably has
  disconnected**        no history. Frontend MUST call GET /v1/offers/:id
                        to get current state.

  **Token expired (\> 1 Frontend needs a new token: GET
  hour)**               /v1/offers/:id/ably-token. Then re-subscribe.
  --------------------- -------------------------------------------------

**Frontend reconnection implementation contract**

This is the pattern the frontend team must implement. offer-service does
not control the frontend reconnection code, but this is the agreed
contract:

+-----------------------------------------------------------------------+
| // Frontend (TypeScript/React) --- Ably reconnection contract:        |
|                                                                       |
| // 1. On initial offer modal open:                                    |
|                                                                       |
| const token = await fetch(\`/v1/offers/\${offerId}/ably-token\`, {    |
|                                                                       |
| headers: { Authorization: \`Bearer \${jwt}\` }                        |
|                                                                       |
| }).then(r =\> r.json());                                              |
|                                                                       |
| const ably = new Ably.Realtime({ token: token.token });               |
|                                                                       |
| const channel = ably.channels.get(\`offer:\${offerId}\`);             |
|                                                                       |
| channel.subscribe(\'offer.updated\', (message) =\> {                  |
|                                                                       |
| // Apply the full current state to the UI.                            |
|                                                                       |
| setOfferState(message.data.offer);                                    |
|                                                                       |
| setCounterOfferState(message.data.counterOffer);                      |
|                                                                       |
| });                                                                   |
|                                                                       |
| // 2. Handle Ably connection state changes:                           |
|                                                                       |
| ably.connection.on(\'suspended\', async () =\> {                      |
|                                                                       |
| // Disconnected for \> 2 minutes. Re-fetch state from REST.           |
|                                                                       |
| const currentState = await fetch(\`/v1/offers/\${offerId}\`,          |
|                                                                       |
| { headers: { Authorization: \`Bearer \${jwt}\` } }                    |
|                                                                       |
| ).then(r =\> r.json());                                               |
|                                                                       |
| setOfferState(currentState);                                          |
|                                                                       |
| });                                                                   |
|                                                                       |
| ably.connection.on(\'connected\', async () =\> {                      |
|                                                                       |
| // Reconnected. Check if we were suspended (missed events).           |
|                                                                       |
| // Ably fires this event even after brief disconnects where buffering |
| applies.                                                              |
|                                                                       |
| // Safe to always re-fetch to guarantee correct state.                |
|                                                                       |
| const currentState = await fetch(\`/v1/offers/\${offerId}\`,          |
|                                                                       |
| { headers: { Authorization: \`Bearer \${jwt}\` } }                    |
|                                                                       |
| ).then(r =\> r.json());                                               |
|                                                                       |
| setOfferState(currentState);                                          |
|                                                                       |
| });                                                                   |
|                                                                       |
| // 3. Token renewal (before token expires):                           |
|                                                                       |
| // Ably SDK handles this automatically if you implement the           |
| authCallback:                                                         |
|                                                                       |
| const ably = new Ably.Realtime({                                      |
|                                                                       |
| authCallback: async (tokenParams, callback) =\> {                     |
|                                                                       |
| const newToken = await fetch(\`/v1/offers/\${offerId}/ably-token\`,   |
|                                                                       |
| { headers: { Authorization: \`Bearer \${jwt}\` } }                    |
|                                                                       |
| ).then(r =\> r.json());                                               |
|                                                                       |
| callback(null, newToken.token);                                       |
|                                                                       |
| }                                                                     |
|                                                                       |
| });                                                                   |
|                                                                       |
| // With authCallback: Ably automatically renews the token before it   |
| expires.                                                              |
|                                                                       |
| // No manual token management needed.                                 |
|                                                                       |
| // 4. On modal close: unsubscribe and close connection.               |
|                                                                       |
| channel.unsubscribe();                                                |
|                                                                       |
| ably.close();                                                         |
+-----------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| **Section 6 Environment Variables**                                   |
|                                                                       |
| Ably settings required in .env                                        |
+-----------------------------------------------------------------------+

  -----------------------------------------------------------------------
  **FILE: .env (add to offer-service environment)**

  -----------------------------------------------------------------------

+-----------------------------------------------------------------------+
| \# ============================================================       |
|                                                                       |
| \# Ably Configuration                                                 |
|                                                                       |
| \# ============================================================       |
|                                                                       |
| \# Full Ably API key (from the Ably dashboard).                       |
|                                                                       |
| \# Format: {appId}.{keyId}:{keySecret}                                |
|                                                                       |
| \# Example: a1b2c3.aBcDeF:tHiSiSaFaKeKeY\...                          |
|                                                                       |
| \# NEVER expose this to the frontend. Server-side only.               |
|                                                                       |
| ABLY_API_KEY=your-app-id.key-id:key-secret                            |
|                                                                       |
| \# Ably environment. Default: production.                             |
|                                                                       |
| \# Use \"sandbox\" for local testing with a free Ably account.        |
|                                                                       |
| \# Use \"production\" in staging and production.                      |
|                                                                       |
| ABLY_ENVIRONMENT=production                                           |
|                                                                       |
| \# How long frontend tokens are valid (seconds). Default: 3600 (1     |
| hour).                                                                |
|                                                                       |
| \# Frontend must request a new token before expiry.                   |
|                                                                       |
| \# With authCallback in Ably SDK: this is automatic.                  |
|                                                                       |
| ABLY_TOKEN_TTL_SECONDS=3600                                           |
|                                                                       |
| \# ============================================================       |
|                                                                       |
| \# Add these to offer.config.ts (OS-09):                              |
|                                                                       |
| \# ============================================================       |
|                                                                       |
| \# ably: {                                                            |
|                                                                       |
| \# apiKey: process.env.ABLY_API_KEY,                                  |
|                                                                       |
| \# environment: process.env.ABLY_ENVIRONMENT ?? \"production\",       |
|                                                                       |
| \# tokenTtlSeconds: parseInt(process.env.ABLY_TOKEN_TTL_SECONDS ??    |
| \"3600\", 10),                                                        |
|                                                                       |
| \# }                                                                  |
|                                                                       |
| \# Add to Joi validation schema:                                      |
|                                                                       |
| \# ABLY_API_KEY: Joi.string().required(),                             |
|                                                                       |
| \# ABLY_ENVIRONMENT: Joi.string().default(\'production\'),            |
|                                                                       |
| \# ABLY_TOKEN_TTL_SECONDS: Joi.number().default(3600),                |
+-----------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| **Step 7 Verification --- Test Ably End-to-End**                      |
|                                                                       |
| Confirm tokens, channels, and real-time updates work                  |
+-----------------------------------------------------------------------+

**Test 1 --- Token endpoint returns correct capability**

+------------------------------------------------------------------------+
| \# Get a token for a pending offer:                                    |
|                                                                        |
| OFFER_ID=40000000-0000-4000-a000-000000000001                          |
|                                                                        |
| TOKEN=\$(curl -s                                                       |
| http://localhost:3005/v1/offers/\${OFFER_ID}/ably-token \\             |
|                                                                        |
| -H \"Authorization: Bearer \<CLIENT_JWT\>\" \| jq -r .token)           |
|                                                                        |
| echo \"Token: \$TOKEN\"                                                |
|                                                                        |
| \# Expected: a long JWT-like string                                    |
|                                                                        |
| CAPABILITY=\$(curl -s                                                  |
| http://localhost:3005/v1/offers/\${OFFER_ID}/ably-token \\             |
|                                                                        |
| -H \"Authorization: Bearer \<CLIENT_JWT\>\" \| jq .capability)         |
|                                                                        |
| echo \"Capability: \$CAPABILITY\"                                      |
|                                                                        |
| \# Expected:                                                           |
| \"{\"offer:40000000-0000-4000-a000-000000000001\":\[\"subscribe\"\]}\" |
|                                                                        |
| \# Confirm expires is \~1 hour from now:                               |
|                                                                        |
| EXPIRES=\$(curl -s                                                     |
| http://localhost:3005/v1/offers/\${OFFER_ID}/ably-token \\             |
|                                                                        |
| -H \"Authorization: Bearer \<CLIENT_JWT\>\" \| jq .expires)            |
|                                                                        |
| echo \"Expires: \$EXPIRES (\$(date -d @\$((EXPIRES/1000))))\"          |
|                                                                        |
| \# Expected: \~1 hour in the future                                    |
+------------------------------------------------------------------------+

**Test 2 --- Confirm party guard blocks non-parties**

+-----------------------------------------------------------------------+
| \# A user who is NOT the client or talent on this offer should get    |
| 403:                                                                  |
|                                                                       |
| curl -s http://localhost:3005/v1/offers/\${OFFER_ID}/ably-token \\    |
|                                                                       |
| -H \"Authorization: Bearer \<UNRELATED_USER_JWT\>\" \| jq .statusCode |
|                                                                       |
| \# Expected: 403                                                      |
|                                                                       |
| \# The talent on the offer should get a valid token:                  |
|                                                                       |
| curl -s http://localhost:3005/v1/offers/\${OFFER_ID}/ably-token \\    |
|                                                                       |
| -H \"Authorization: Bearer \<TALENT_JWT\>\" \| jq .capability         |
|                                                                       |
| \# Expected: same capability as the client                            |
+-----------------------------------------------------------------------+

**Test 3 --- End-to-end real-time update**

+-----------------------------------------------------------------------+
| \# Open two browser tabs in your frontend dev environment:            |
|                                                                       |
| \# Tab 1: logged in as the CLIENT, viewing the offer detail modal     |
|                                                                       |
| \# Tab 2: logged in as the TALENT, viewing the same offer             |
|                                                                       |
| \# Both tabs should be subscribed to offer:{offerId} channel.         |
|                                                                       |
| \# Trigger a state change (from Talent tab):                          |
|                                                                       |
| \# Decline the offer in the UI.                                       |
|                                                                       |
| \# Observe in both tabs:                                              |
|                                                                       |
| \# - The offer status transitions to DECLINED without page reload.    |
|                                                                       |
| \# - Client tab: shows declined state in the offer modal.             |
|                                                                       |
| \# - Talent tab: shows declined state.                                |
|                                                                       |
| \# Confirm in offer-service logs:                                     |
|                                                                       |
| grep \"Ably published offer.updated\" /var/log/offer-service/app.log  |
|                                                                       |
| \# Expected: \"Ably published offer.updated to offer:{offerId}\"      |
|                                                                       |
| \# If Ably is not running (local testing without Ably):               |
|                                                                       |
| \# The API still returns 200. The log shows \"Ably publish failed\".  |
|                                                                       |
| \# The state change still happened in the DB and via RabbitMQ.        |
+-----------------------------------------------------------------------+

**Test 4 --- Ably connectivity check via /ready**

+-----------------------------------------------------------------------+
| \# The /ready endpoint checks Ably connectivity:                      |
|                                                                       |
| curl -s http://localhost:3005/ready \| jq .checks.ably                |
|                                                                       |
| \# Expected when Ably is reachable: \"connected\"                     |
|                                                                       |
| \# Expected when Ably is unreachable: \"disconnected\" (ready returns |
| 503)                                                                  |
|                                                                       |
| \# The isReady() check uses client.time() to verify connectivity.     |
|                                                                       |
| \# This is a lightweight HTTP call to the Ably REST API.              |
+-----------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| If token endpoint returns 500:                                        |
|                                                                       |
| Check that ABLY_API_KEY is set correctly in .env.                     |
|                                                                       |
| Format must be: {appId}.{keyId}:{keySecret}                           |
|                                                                       |
| Verify the key is active in the Ably dashboard.                       |
|                                                                       |
| If publish() fails silently:                                          |
|                                                                       |
| Check offer-service logs for \"Ably publish failed\".                 |
|                                                                       |
| Verify ABLY_API_KEY has publish permissions in the Ably dashboard.    |
|                                                                       |
| In the Ably dashboard: App -\> API Keys -\> check \"Publish\"         |
| capability.                                                           |
|                                                                       |
| If frontend cannot subscribe with the token:                          |
|                                                                       |
| Decode the token at jwt.io and check the x-ably-capability field.     |
|                                                                       |
| It should contain the exact channel name:                             |
| \"offer:{offerId}\":\[\"subscribe\"\].                                |
|                                                                       |
| If the channel name in the token does not match what the frontend     |
| subscribes to:                                                        |
|                                                                       |
| the subscription will be rejected by Ably.                            |
|                                                                       |
| If /ready returns \"disconnected\" for Ably:                          |
|                                                                       |
| The Ably REST API is unreachable from this server.                    |
|                                                                       |
| Check network connectivity: curl https://rest.ably.io/time            |
|                                                                       |
| Check if ABLY_ENVIRONMENT matches your Ably account region.           |
+-----------------------------------------------------------------------+
