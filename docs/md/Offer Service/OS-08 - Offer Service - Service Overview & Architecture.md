**OS-08**

**Offer Service --- Service Overview & Architecture**

**Repo:** marketeq-projects-nestjs **Service:** offer-service **Type:**
NestJS microservice within monorepo

+-----------------------------------------------------------------------+
| **1 Service Purpose**                                                 |
|                                                                       |
| What offer-service owns and what it does not                          |
+-----------------------------------------------------------------------+

offer-service owns the complete offer negotiation lifecycle on the
Marketeq platform --- from the moment a client clicks Hire Me on a
talent profile through to the point where an accepted offer is handed
off to contracts-service for contract creation. It is the authoritative
source of truth for all offer and counter offer state.

**Owned by offer-service**

  ------------------ ----------------------------------------------------
  **Offer creation** Client sends a PENDING offer to a talent via the
                     Hire Me flow

  **Offer editing**  Client edits a PENDING offer in-place --- updates
                     terms, resets expiry clock

  **Offer            Talent accepts an offer --- transitions to ACCEPTED,
  acceptance**       emits offer.accepted

  **Offer decline**  Talent declines an offer with a reason ---
                     transitions to DECLINED

  **Offer            Client withdraws a PENDING or COUNTERED offer ---
  withdrawal**       transitions to WITHDRAWN

  **Offer expiry**   System expires offers after 14 days of inactivity
                     --- transitions to EXPIRED

  **Offer resend**   Client resends a terminal offer --- creates a new
                     PENDING offer record

  **Counter offers** Full counter offer lifecycle: create, edit
                     (in-place), withdraw, decline, accept

  **Offer history**  Immutable event log of every action taken on an
                     offer and its counter offers

  **TTL management** expiresAt calculation, clock resets on activity, 48h
                     expiry warning scheduling

  **Rate warning**   Advisory check when counter offer rate exceeds 1.25x
                     threshold

  **Active offer     One active offer per client-talent pair at all times
  enforcement**      

  **NDA status       Reads NDA signed status from legal-service --- does
  check**            not own NDA logic
  ------------------ ----------------------------------------------------

**NOT owned by offer-service**

  ------------------- ----------------------------------------------------
  **Contract          contracts-service creates the ContractGroup when
  creation**          offer.accepted is consumed

  **Contract title    contracts-service enforces uniqueness across all
  uniqueness**        contracts at offer.accepted time

  **NDA generation &  legal-service owns NDA document generation, signing,
  signing**           and storage

  **Chat messages**   messaging-service owns the chat thread ---
                      offer-service posts cards to it via events

  **Notifications**   notification-service consumes offer events and sends
                      all user notifications

  **FX rates**        pricing-service owns currency conversion ---
                      offer-service reads rates for display

  **Suggested start   listings-service owns project scope and phase data
  dates**             --- offer-service reads it

  **Invite balances** invite-service owns invite quota management

  **Job listings**    listings-service owns all listing data
  ------------------- ----------------------------------------------------

+-----------------------------------------------------------------------+
| **2 Position in the Monorepo**                                        |
|                                                                       |
| How offer-service sits within marketeq-projects-nestjs                |
+-----------------------------------------------------------------------+

offer-service is a standalone NestJS application within the
marketeq-projects-nestjs monorepo. It follows the same structural
conventions as all other services in the monorepo.

**Monorepo App Registration**

// nest-cli.json

\"projects\": {

\"offer-service\": {

\"type\": \"application\",

\"root\": \"apps/offer-service\",

\"entryFile\": \"main\",

\"sourceRoot\": \"apps/offer-service/src\",

\"compilerOptions\": {

\"tsConfigPath\": \"apps/offer-service/tsconfig.app.json\"

}

}

}

**Shared Libraries Used**

  --------------------- ------------------ ----------------------------------
  **Library**           **Path**           **Used For**

  **\@app/common**      libs/common        Shared DTOs, guards, interceptors,
                                           pipes

  **\@app/auth**        libs/auth          JWT validation, role decorators,
                                           auth guards

  **\@app/database**    libs/database      TypeORM base config, base entity,
                                           migration helpers

  **\@app/messaging**   libs/messaging     RabbitMQ publisher/consumer base
                                           classes

  **\@app/realtime**    libs/realtime      Ably client wrapper
  --------------------- ------------------ ----------------------------------

+-----------------------------------------------------------------------+
| **3 Service Dependencies**                                            |
|                                                                       |
| All upstream and downstream service relationships                     |
+-----------------------------------------------------------------------+

**Upstream --- Services offer-service calls**

  ---------------------- --------- ----------------------------------------------- ---------------------
  **Service**            **Call    **What Is Called**                              **When**
                         Type**                                                    

  **listings-service**   HTTP GET  GET /v1/listings/:id/start-date --- suggested   During Hire Me offer
                                   start date from scope phases                    creation for scoped
                                                                                   projects

  **pricing-service**    HTTP GET  GET /v1/fx/rates --- FX rates for currency      On offer modal render
                                   display conversion                              when currency differs
                                                                                   from base

  **legal-service**      HTTP GET  GET                                             When talent clicks
                                   /v1/nda/status?clientId=&talentId=&projectId=   View Job on
                                   --- NDA signed status                           NDA-required listing
  ---------------------- --------- ----------------------------------------------- ---------------------

**Downstream --- Services that consume offer-service events**

  -------------------------- ------------------ ----------------------- -----------------
  **Service**                **Event Consumed** **What It Does**        **Exchange**

  **contracts-service**      offer.accepted     Creates ContractGroup   marketeq.offers
                                                with offer terms.       
                                                Enforces contract title 
                                                uniqueness.             

  **notification-service**   All 14 offer       Sends bell              marketeq.offers
                             events             notifications and inbox 
                                                messages to relevant    
                                                parties.                

  **messaging-service**      offer.created,     Posts offer cards and   marketeq.offers
                             offer.edited,      event cards into the    
                             offer.countered,   client-talent chat      
                             offer.accepted,    thread.                 
                             offer.declined,                            
                             offer.withdrawn,                           
                             offer.expired,                             
                             offer.resent                               
  -------------------------- ------------------ ----------------------- -----------------

**Real-time --- Ably**

offer-service publishes real-time events directly to Ably for immediate
frontend updates. This is separate from the RabbitMQ event bus --- Ably
is for live UI updates, RabbitMQ is for inter-service communication.

  ------------------ ----------------------------------------------------
  **Channel format** offer:{offerId}

  **Auth**           Ably token issued server-side --- only parties to
                     the offer can subscribe

  **Events           offer.updated --- fired on every state change.
  published**        Payload contains the full current offer state.

  **Reconnection**   Ably buffers events for disconnected clients for up
                     to 2 minutes. Frontend re-fetches full offer state
                     via REST on reconnect to catch any missed events.
  ------------------ ----------------------------------------------------

+-----------------------------------------------------------------------+
| **4 Architecture Diagram**                                            |
|                                                                       |
| System context --- offer-service and its relationships                |
+-----------------------------------------------------------------------+

The following diagram shows offer-service at the centre of its
dependency network. Solid arrows indicate synchronous HTTP calls. Dashed
arrows indicate asynchronous RabbitMQ events. Double arrows indicate
real-time Ably publish.

+-----------------------------------------------------------------------+
| ┌─────────────────────────────────┐                                   |
|                                                                       |
| │ CLIENT / TALENT │                                                   |
|                                                                       |
| │ (Frontend / Ably) │                                                 |
|                                                                       |
| └───────────────┬─────────────────┘                                   |
|                                                                       |
| │ REST API (JWT)                                                      |
|                                                                       |
| ▼                                                                     |
|                                                                       |
| ┌────────────────────────────────────────────────────────┐            |
|                                                                       |
| **│ offer-service │**                                                 |
|                                                                       |
| │ │                                                                   |
|                                                                       |
| │ ┌──────────────┐ ┌──────────────┐ ┌────────────┐ │                  |
|                                                                       |
| │ │ offers │ │counter-offers│ │offer-history│ │                       |
|                                                                       |
| │ └──────────────┘ └──────────────┘ └────────────┘ │                  |
|                                                                       |
| │ ┌──────────────┐ ┌──────────────┐ ┌────────────┐ │                  |
|                                                                       |
| │ │ outbox │ │ scheduler │ │ realtime │ │                             |
|                                                                       |
| │ └──────────────┘ └──────────────┘ └────────────┘ │                  |
|                                                                       |
| └────────┬───────────────────┬──────────────────────────┘             |
|                                                                       |
| │ │                                                                   |
|                                                                       |
| HTTP calls RabbitMQ (marketeq.offers)                                 |
|                                                                       |
| │ ┌────┴──────────────────────┐                                       |
|                                                                       |
| ┌───────┼────────┐ │ │                                                |
|                                                                       |
| ▼ ▼ ▼ ▼ ▼                                                             |
|                                                                       |
| listings pricing legal contracts- notification- messaging-            |
|                                                                       |
| service service service service service service                       |
|                                                                       |
| ┌──────────────────────────────────────┐                              |
|                                                                       |
| │ PostgreSQL Redis RabbitMQ Ably │                                    |
|                                                                       |
| │ (offer_svc (idempotency (events) │                                  |
|                                                                       |
| │ schema) keys) │                                                     |
|                                                                       |
| └──────────────────────────────────────┘                              |
+-----------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| **5 Tech Stack**                                                      |
|                                                                       |
| All technologies, libraries, and third-party services                 |
+-----------------------------------------------------------------------+

**Core Framework**

  ------------------------------- ------------- --------------------- --------------------
  **Package**                     **Version**   **Purpose**           **Notes**

  **\@nestjs/core**               existing      NestJS application    Consistent with all
                                  monorepo      framework             other services in
                                  version                             monorepo

  **\@nestjs/common**             existing      Decorators, pipes,    
                                  monorepo      guards, interceptors  
                                  version                             

  **\@nestjs/platform-express**   existing      HTTP server adapter   Express under the
                                  monorepo                            hood
                                  version                             

  **typescript**                  existing      Language --- strict   tsconfig inherits
                                  monorepo      mode enabled          from monorepo base
                                  version                             
  ------------------------------- ------------- --------------------- --------------------

**Database**

  ---------------------- ------------- --------------------- --------------------
  **Package**            **Version**   **Purpose**           **Notes**

  **\@nestjs/typeorm**   existing      TypeORM integration   Consistent with
                                       for NestJS            monorepo ORM choice

  **typeorm**            existing      ORM --- entities,     
                                       migrations,           
                                       repositories          

  **pg**                 existing      PostgreSQL driver     
  ---------------------- ------------- --------------------- --------------------

**Message Broker**

  ---------------------------- ------------- --------------------- --------------------
  **Package**                  **Version**   **Purpose**           **Notes**

  **\@nestjs/microservices**   existing      RabbitMQ transport    Uses existing
                                             layer                 marketeq.offers
                                                                   exchange

  **amqplib**                  existing      AMQP client for       Already in monorepo
                                             RabbitMQ              
  ---------------------------- ------------- --------------------- --------------------

**Real-time**

  ---------------- ------------- --------------------- --------------------
  **Package**      **Version**   **Purpose**           **Notes**

  **ably**         existing      Ably SDK ---          Already provisioned
                                 real-time event       on platform
                                 publishing to         
                                 connected clients     
  ---------------- ------------- --------------------- --------------------

**Caching**

  ------------------------------- ------------- --------------------- --------------------
  **Package**                     **Version**   **Purpose**           **Notes**

  **\@nestjs/cache-manager**      existing      Cache module          
                                                integration           

  **cache-manager-redis-store**   existing      Redis adapter for     Used for idempotency
                                                cache manager         key storage (24h
                                                                      TTL)

  **redis**                       existing      Redis client          
  ------------------------------- ------------- --------------------- --------------------

**Scheduling**

  ----------------------- ------------- --------------------- --------------------
  **Package**             **Version**   **Purpose**           **Notes**

  **\@nestjs/schedule**   existing      Cron job scheduling   Two jobs: expiry
                                                              processor + 48h
                                                              warning processor
  ----------------------- ------------- --------------------- --------------------

**Validation & Transformation**

  ----------------------- ------------- --------------------- --------------------
  **Package**             **Version**   **Purpose**           **Notes**

  **class-validator**     existing      DTO field validation  \@IsInt(), \@Min(),
                                        decorators            \@MaxLength(), etc.

  **class-transformer**   existing      DTO serialization and Used with
                                        transformation        ValidationPipe
                                                              globally
  ----------------------- ------------- --------------------- --------------------

**HTTP Client (Internal Service Calls)**

  -------------------- ------------- --------------------- --------------------
  **Package**          **Version**   **Purpose**           **Notes**

  **\@nestjs/axios**   existing      HTTP client for       Wraps axios with
                                     calling               NestJS DI
                                     listings-service,     
                                     pricing-service,      
                                     legal-service         
  -------------------- ------------- --------------------- --------------------

**Testing**

  ---------------------- ------------- --------------------- --------------------
  **Package**            **Version**   **Purpose**           **Notes**

  **jest**               existing      Test runner           Consistent with
                                                             monorepo

  **\@nestjs/testing**   existing      NestJS testing        
                                       utilities ---         
                                       TestingModule         

  **supertest**          existing      E2E HTTP testing      
  ---------------------- ------------- --------------------- --------------------

+-----------------------------------------------------------------------+
| **6 Folder Structure**                                                |
|                                                                       |
| Complete directory layout for offer-service                           |
+-----------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| apps/                                                                 |
|                                                                       |
| └── offer-service/                                                    |
|                                                                       |
| ├── src/                                                              |
|                                                                       |
| │ ├── main.ts \# Bootstrap --- starts the NestJS app                  |
|                                                                       |
| │ ├── app.module.ts \# Root module --- imports all feature modules    |
|                                                                       |
| │ │                                                                   |
|                                                                       |
| │ ├── offers/ \# Primary offer CRUD and lifecycle                     |
|                                                                       |
| │ │ ├── offers.module.ts                                              |
|                                                                       |
| │ │ ├── offers.controller.ts \# REST endpoints for offer operations   |
|                                                                       |
| │ │ ├── offers.service.ts \# Business logic --- state transitions     |
|                                                                       |
| │ │ ├── offers.repository.ts \# TypeORM queries --- offers table      |
|                                                                       |
| │ │ ├── dto/                                                          |
|                                                                       |
| │ │ │ ├── create-offer.dto.ts                                         |
|                                                                       |
| │ │ │ ├── edit-offer.dto.ts                                           |
|                                                                       |
| │ │ │ ├── resend-offer.dto.ts                                         |
|                                                                       |
| │ │ │ ├── withdraw-offer.dto.ts                                       |
|                                                                       |
| │ │ │ ├── decline-offer.dto.ts                                        |
|                                                                       |
| │ │ │ └── accept-offer.dto.ts                                         |
|                                                                       |
| │ │ ├── entities/                                                     |
|                                                                       |
| │ │ │ └── offer.entity.ts \# TypeORM entity --- offers table          |
|                                                                       |
| │ │ └── enums/                                                        |
|                                                                       |
| │ │ ├── offer-status.enum.ts \#                                       |
| PENDING\|ACCEPTED\|DECLINED\|WITHDRAWN\|EXPIRED\|COUNTERED            |
|                                                                       |
| │ │ └── contract-type.enum.ts \# PROJECT\|SERVICE\|TEAM\|CONTRACT     |
|                                                                       |
| │ │                                                                   |
|                                                                       |
| │ ├── counter-offers/ \# Counter offer lifecycle                      |
|                                                                       |
| │ │ ├── counter-offers.module.ts                                      |
|                                                                       |
| │ │ ├── counter-offers.controller.ts                                  |
|                                                                       |
| │ │ ├── counter-offers.service.ts                                     |
|                                                                       |
| │ │ ├── counter-offers.repository.ts                                  |
|                                                                       |
| │ │ ├── dto/                                                          |
|                                                                       |
| │ │ │ ├── create-counter-offer.dto.ts                                 |
|                                                                       |
| │ │ │ ├── edit-counter-offer.dto.ts                                   |
|                                                                       |
| │ │ │ └── withdraw-counter-offer.dto.ts                               |
|                                                                       |
| │ │ ├── entities/                                                     |
|                                                                       |
| │ │ │ └── counter-offer.entity.ts                                     |
|                                                                       |
| │ │ └── enums/                                                        |
|                                                                       |
| │ │ └── counter-offer-status.enum.ts \#                               |
| PENDING\|ACCEPTED\|DECLINED\|WITHDRAWN\|EXPIRED\|SUPERSEDED           |
|                                                                       |
| │ │                                                                   |
|                                                                       |
| │ ├── offer-history/ \# Immutable event log                           |
|                                                                       |
| │ │ ├── offer-history.module.ts                                       |
|                                                                       |
| │ │ ├── offer-history.service.ts                                      |
|                                                                       |
| │ │ ├── offer-history.repository.ts                                   |
|                                                                       |
| │ │ └── entities/                                                     |
|                                                                       |
| │ │ └── offer-history.entity.ts                                       |
|                                                                       |
| │ │                                                                   |
|                                                                       |
| │ ├── outbox/ \# Outbox pattern --- guaranteed event delivery         |
|                                                                       |
| │ │ ├── outbox.module.ts                                              |
|                                                                       |
| │ │ ├── outbox.service.ts \# Write events atomically with state       |
| changes                                                               |
|                                                                       |
| │ │ ├── outbox.processor.ts \# Poller --- publishes pending outbox    |
| events                                                                |
|                                                                       |
| │ │ └── entities/                                                     |
|                                                                       |
| │ │ └── outbox.entity.ts                                              |
|                                                                       |
| │ │                                                                   |
|                                                                       |
| │ ├── scheduler/ \# TTL and expiry cron jobs                          |
|                                                                       |
| │ │ ├── scheduler.module.ts                                           |
|                                                                       |
| │ │ ├── expiry.processor.ts \# Cron: sets EXPIRED on offers past      |
| expiresAt                                                             |
|                                                                       |
| │ │ └── warning.processor.ts \# Cron: fires offer.expiring_soon at    |
| 48h                                                                   |
|                                                                       |
| │ │                                                                   |
|                                                                       |
| │ ├── messaging/ \# RabbitMQ publisher                                |
|                                                                       |
| │ │ ├── messaging.module.ts                                           |
|                                                                       |
| │ │ ├── rabbitmq.publisher.ts                                         |
|                                                                       |
| │ │ └── events/                                                       |
|                                                                       |
| │ │ └── offer-events.ts \# All 14 event type constants + payload      |
| types                                                                 |
|                                                                       |
| │ │                                                                   |
|                                                                       |
| │ ├── realtime/ \# Ably real-time publishing                          |
|                                                                       |
| │ │ ├── realtime.module.ts                                            |
|                                                                       |
| │ │ └── ably.service.ts                                               |
|                                                                       |
| │ │                                                                   |
|                                                                       |
| │ ├── guards/                                                         |
|                                                                       |
| │ │ ├── jwt-auth.guard.ts \# Validates JWT from \@app/auth            |
|                                                                       |
| │ │ └── offer-party.guard.ts \# Verifies requester is clientId or     |
| talentId                                                              |
|                                                                       |
| │ │                                                                   |
|                                                                       |
| │ ├── interceptors/                                                   |
|                                                                       |
| │ │ └── idempotency.interceptor.ts \# X-Idempotency-Key deduplication |
| via Redis                                                             |
|                                                                       |
| │ │                                                                   |
|                                                                       |
| │ ├── filters/                                                        |
|                                                                       |
| │ │ └── offer-exception.filter.ts \# Global exception → standard      |
| error envelope                                                        |
|                                                                       |
| │ │                                                                   |
|                                                                       |
| │ ├── common/                                                         |
|                                                                       |
| │ │ ├── constants/                                                    |
|                                                                       |
| │ │ │ └── offer.constants.ts \# TTL, thresholds, max values           |
|                                                                       |
| │ │ └── types/                                                        |
|                                                                       |
| │ │ └── offer-payload.types.ts \# Shared TypeScript types             |
|                                                                       |
| │ │                                                                   |
|                                                                       |
| │ └── config/                                                         |
|                                                                       |
| │ └── offer.config.ts \# ConfigService schema for offer-service env   |
| vars                                                                  |
|                                                                       |
| │                                                                     |
|                                                                       |
| ├── test/                                                             |
|                                                                       |
| │ ├── unit/                                                           |
|                                                                       |
| │ └── e2e/                                                            |
|                                                                       |
| │                                                                     |
|                                                                       |
| ├── migrations/ \# TypeORM migration files                            |
|                                                                       |
| ├── seeds/ \# Dev seed data                                           |
|                                                                       |
| ├── Dockerfile                                                        |
|                                                                       |
| ├── tsconfig.app.json                                                 |
|                                                                       |
| └── package.json                                                      |
+-----------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| **7 Service Constants**                                               |
|                                                                       |
| All configurable constants defined in offer.constants.ts              |
+-----------------------------------------------------------------------+

  ------------------------------------------ ----------------- ---------- ------------------------------------
  **Constant**                               **Value**         **Type**   **Description**

  **OFFER_TTL_DAYS**                         14                number     Number of days before an offer
                                                                          expires if no activity

  **OFFER_WARNING_HOURS**                    48                number     Hours before expiry at which the
                                                                          warning notification fires

  **OFFER_EXTENSION_THRESHOLD_DAYS**         30                number     Days since expiry --- at or below
                                                                          shows Request Extension, above shows
                                                                          Ask Now

  **COUNTER_OFFER_RATE_WARNING_THRESHOLD**   1.25              number     Multiplier --- counter rate warning
                                                                          fires when counterRate \>
                                                                          originalRate × 1.25

  **IDEMPOTENCY_KEY_TTL_HOURS**              24                number     Hours idempotency keys are stored in
                                                                          Redis

  **MAX_CONTRACT_TITLE_LENGTH**              200               number     Maximum characters for a contract
                                                                          title

  **MAX_MESSAGE_LENGTH**                     500               number     Maximum characters for all message
                                                                          fields

  **MAX_DECLINE_REASON_LENGTH**              500               number     Maximum characters for the decline
                                                                          reason text

  **MAX_RATE**                               9999              number     Maximum whole-number hourly rate

  **MIN_RATE**                               1                 number     Minimum whole-number hourly rate

  **MAX_DURATION_MONTHS**                    60                number     Maximum contract duration in months
                                                                          (5 years)

  **MIN_DURATION_MONTHS**                    1                 number     Minimum contract duration in months

  **MAX_SCHEDULE_HOURS_PER_WEEK**            80                number     Maximum custom work schedule hours
                                                                          per week

  **MIN_SCHEDULE_HOURS**                     1                 number     Minimum custom work schedule hours

  **START_DATE_MAX_YEARS_OUT**               5                 number     Maximum years in the future a start
                                                                          date can be set

  **OFFER_HISTORY_PAGE_SIZE**                50                number     Number of history events returned
                                                                          per page

  **OUTBOX_MAX_RETRY_ATTEMPTS**              10                number     Maximum retry attempts before
                                                                          dead-lettering an outbox event

  **ABLY_CHANNEL_PREFIX**                    offer:            string     Prefix for all Ably channel names
                                                                          --- full format: offer:{offerId}

  **RABBITMQ_EXCHANGE**                      marketeq.offers   string     RabbitMQ exchange name for all offer
                                                                          events
  ------------------------------------------ ----------------- ---------- ------------------------------------

+-----------------------------------------------------------------------+
| **8 Key Data Flows**                                                  |
|                                                                       |
| Critical paths through the service                                    |
+-----------------------------------------------------------------------+

**Flow 1 --- Offer Creation (Happy Path)**

  -------------------------- ----------------------------------------------------
  **1. Client → REST**       POST /v1/offers with offer terms and
                             X-Idempotency-Key header

  **2.                       Checks Redis for existing key. If found: return
  IdempotencyInterceptor**   cached response. If not: proceed.

  **3. JwtAuthGuard**        Validates JWT. Extracts userId and role.

  **4. ValidationPipe**      Validates CreateOfferDto --- all required fields,
                             types, constraints.

  **5. OffersService**       Checks one-active-offer constraint. Calls
                             listings-service for start date if scoped. Creates
                             Offer record + OutboxEvent in a single DB
                             transaction.

  **6. OutboxProcessor**     Picks up pending outbox event. Publishes
                             offer.created to marketeq.offers exchange.

  **7. AblyService**         Publishes offer.updated to offer:{offerId} channel
                             --- both client and talent receive real-time update.

  **8. Response**            201 Created with full offer record. Idempotency key
                             stored in Redis for 24h.
  -------------------------- ----------------------------------------------------

**Flow 2 --- Offer Acceptance (Happy Path)**

  --------------------- ----------------------------------------------------
  **1. Talent → REST**  POST /v1/offers/:id/accept with X-Idempotency-Key
                        header

  **2.                  Verifies requesting userId = offer.talentId. Rejects
  OfferPartyGuard**     if not.

  **3. OffersService**  Atomic CAS: UPDATE offers SET status=ACCEPTED WHERE
                        id=:id AND status=PENDING. If 0 rows updated: 409.
                        If 1 row: write OutboxEvent in same transaction.

  **4.                  Publishes offer.accepted with full offer payload to
  OutboxProcessor**     marketeq.offers.

  **5.                  Consumes offer.accepted. Creates ContractGroup.
  contracts-service**   Checks title uniqueness.

  **6. AblyService**    Publishes offer.updated --- both parties receive
                        real-time accepted state.

  **7. Response**       200 OK with updated offer record including
                        acceptedAt timestamp.
  --------------------- ----------------------------------------------------

**Flow 3 --- Expiry (Scheduled)**

  ------------------- ----------------------------------------------------
  **1.                Runs every minute. SELECT \* FROM offers WHERE
  ExpiryProcessor     status=PENDING AND expires_at \<= NOW()
  (cron)**            

  **2. Batch update** UPDATE offers SET status=EXPIRED,
                      expired_at=expires_at WHERE id IN (\...) --- batch
                      atomic update

  **3. OutboxEvents** One offer.expired outbox event written per expired
                      offer.

  **4.                Publishes all offer.expired events to RabbitMQ.
  OutboxProcessor**   

  **5. AblyService**  Publishes offer.updated for each expired offer ---
                      frontend modals update in real time.

  **6.                Separate cron: SELECT offers WHERE status=PENDING
  WarningProcessor    AND expires_at \<= NOW()+48h AND warning_sent_at IS
  (cron)**            NULL. Publishes offer.expiring_soon.
  ------------------- ----------------------------------------------------
