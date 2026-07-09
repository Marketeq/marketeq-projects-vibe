**CR-01 --- Contracts Service**

**Service Boundary Correction: Remove Offer Negotiation**

**Type:** Change Request **Affects:** contracts-service (remove) →
offer-service (receive) **Status:** Pending Review

**1. Purpose**

This change request formally documents the service boundary correction
between contracts-service and the new offer-service. The
contracts-service documentation currently includes the offer negotiation
lifecycle, the Hire Me entry point, and the talent accept/reject flow.
These responsibilities belong entirely to offer-service. This document
identifies exactly what must be removed from contracts-service, explains
why the boundary was drawn incorrectly, and defines what
contracts-service should receive instead.

+-----------------------------------------------------------------------+
| *⚠ This is not a code rewrite. Contracts-service may already have     |
| working code for these flows.*                                        |
|                                                                       |
| The purpose of this CR is to correct the documentation first, then    |
| drive the code to match.                                              |
|                                                                       |
| All removed documentation items must be tracked and absorbed by       |
| offer-service (OS series docs).                                       |
+-----------------------------------------------------------------------+

**2. Background & Boundary Decision**

The platform uses the term \'offer\' in two distinct ways that were
conflated in the original contracts-service documentation:

  ----------------------- -----------------------------------------------
  **Term**                **Correct Owner & Meaning**

  **Offer (marketplace)** listings-service --- a published job listing
                          available on the marketplace. A marketing and
                          sales object. Never means talent outreach.

  **Invite**              invite-service --- outreach sent to a specific
                          talent member asking them to apply or join.

  **Offer (negotiation)** offer-service --- the mutable negotiation
                          record created after an invite is sent. Tracks
                          rate, duration, schedule, start date, counter
                          offers, and final acceptance.

  **Contract**            contracts-service --- a formal individual
                          agreement created ONLY after offer.accepted is
                          emitted. Owns the contract lifecycle: PENDING,
                          ACTIVE, ENDED, CANCELED, DISPUTED.
  ----------------------- -----------------------------------------------

The correct handoff sequence is:

> **invite-service → offer-service → \[offer.accepted event\] →
> contracts-service → checkout-service**

Contracts-service must not be aware of negotiation rounds, counter
offers, offer terms editing, or the Hire Me flow. It receives the agreed
terms via the offer.accepted event payload and creates the ContractGroup
from that data.

**3. What to Remove from Contracts-Service**

The following items must be removed from contracts-service documentation
and the corresponding code must be relocated to offer-service.

**3.1 Doc 2 --- Data Model & Entities**

The Contract entity fields title, rate, schedule, and duration must stay
on the Contract entity. They are needed by billing-service (rate,
schedule), time-tracking-service (schedule), and contracts-service
itself (duration for end-date calculations, title for display). Removing
them from the entity would break downstream services that depend on
them.

The only correction here is to how these fields get populated. Currently
the contracts-service docs show these values being submitted by the
frontend during the Hire Me flow. After the boundary correction, they
are never submitted by the frontend. They arrive exclusively via the
offer.accepted event payload and contracts-service populates the
Contract entity from that payload internally.

+-----------------------------------------------------------------------+
| No fields are removed from the Contract entity.                       |
|                                                                       |
| title, rate, schedule, and duration all stay exactly as they are.     |
|                                                                       |
| The only change: they are populated server-side from the              |
| offer.accepted payload,                                               |
|                                                                       |
| never submitted directly from the frontend.                           |
+-----------------------------------------------------------------------+

**Comment to add to the Contract entity (sourcing clarification only):**

> // title, rate, schedule, duration
>
> // These fields are populated from the offer.accepted event payload at
> group creation time.
>
> // They are never submitted directly by the frontend.
>
> // Do NOT add them back to CreateGroupDto or any frontend-facing DTO.

**DTO correction --- ContractInput inside CreateGroupDto:**

- Remove: title, rate, schedule, duration from ContractInput. These are
  no longer accepted from the frontend.

- Keep: talentId.

- Add: offerId --- so contracts-service can resolve the agreed terms
  from the offer.accepted payload.

- After the correction, contracts-service reads title, rate, schedule,
  and duration from the offer.accepted event payload and writes them
  directly to the Contract entity. The frontend never submits these
  fields to contracts-service.

**3.2 Doc 3 --- API Endpoints**

**Endpoint to remove: PUT /contracts/:id/respond**

This endpoint handles talent accepting or rejecting an offer via
AcceptRejectDto { accepted: boolean, talentId: string }. This is the
offer acceptance flow and belongs entirely to offer-service.
Contracts-service must not expose an accept/reject endpoint. The
respondToOffer() method in contracts.service.ts must be removed.

+-----------------------------------------------------------------------+
| Important distinction: contracts-service does have a legitimate POST  |
| /contracts/:id/respond that handles                                   |
|                                                                       |
| talent responding AFTER a contract record already exists (e.g.        |
| confirming start date post-deposit).                                  |
|                                                                       |
| That endpoint is NOT removed. Only the offer acceptance flow is       |
| removed.                                                              |
|                                                                       |
| If these are the same endpoint in the current code, they must be      |
| split: offer-service owns pre-contract                                |
|                                                                       |
| acceptance; contracts-service owns post-contract-creation responses.  |
+-----------------------------------------------------------------------+

**DTO to remove:**

- accept-reject.dto.ts --- AcceptRejectDto { accepted: boolean,
  talentId: string }. Move to offer-service.

**POST /contract-groups --- input shape correction:**

This endpoint is NOT removed. It is the correct entry point for
contracts-service after offer.accepted fires. However, the request
payload shape must change. The current payload accepts raw offer terms
from the frontend (rate, schedule, duration, title). After the
correction, this endpoint is called internally by the event consumer
that processes offer.accepted, not by the frontend directly.

**Current (incorrect) payload:**

> POST /contract-groups
>
> {
>
> \"type\": \"project\",
>
> \"ownerClientId\": \"cli-123\",
>
> \"contracts\": \[
>
> { \"talentId\": \"tal-1\", \"title\": \"UX Designer\", \"rate\": 85,
> \"schedule\": \"part-time\", \"duration\": \"6 months\" }
>
> \]
>
> }

**Corrected payload (event-driven, no frontend negotiation terms):**

> // Triggered internally by offer.accepted consumer, not by frontend
>
> {
>
> \"type\": \"project\",
>
> \"ownerClientId\": \"cli-123\",
>
> \"offerId\": \"off-789\",
>
> \"contracts\": \[
>
> { \"talentId\": \"tal-1\", \"offerId\": \"off-789\" }
>
> \]
>
> }
>
> // title, rate, schedule, duration are resolved from the
> offer.accepted payload
>
> // and written to the Contract entity by contracts-service internally.
>
> // They are never re-submitted by the frontend.

**3.3 Doc 4 --- Contract Start Flow**

**Section to remove: \'Client submits a request\' framing**

The start flow doc currently describes the flow as: \'Client submits a
request with multiple talent (e.g. POST /contract-groups). Contracts are
created in PENDING state.\' This framing implies the client triggers
contract creation directly from the UI, which is incorrect after the
boundary correction.

The corrected flow description must replace step 1 as follows:

- Step 1 (remove): \'Client submits a request with multiple talent (e.g.
  POST /contract-groups). Contracts are created in PENDING state. A
  contract.group.created event is emitted.\'

- Step 1 (replace with): \'offer-service emits offer.accepted after
  talent accepts the negotiated offer terms. contracts-service consumes
  this event and calls createGroup() internally, creating the
  ContractGroup and individual Contract records in PENDING state. The
  fields title, rate, schedule, and duration are sourced from the
  offer.accepted event payload and written directly to the Contract
  entity. A contract.group.created event is emitted to checkout-service
  to initiate the deposit flow.\'

**New event to add to the Consumed section of Doc 4 and Doc 6:**

> offer.accepted
>
> {
>
> \"offerId\": \"off-789\",
>
> \"clientId\": \"cli-123\",
>
> \"talentId\": \"tal-1\",
>
> \"rate\": 85,
>
> \"schedule\": \"full-time\",
>
> \"duration\": \"6 months\",
>
> \"title\": \"UX Designer\",
>
> \"startDate\": \"2025-10-01\",
>
> \"jobListingId\": \"jl-456\",
>
> \"contractType\": \"project\"
>
> }

**3.4 Doc 6 --- Events & Integrations**

**Event to add to the Consumed section:**

- offer.accepted --- Source: offer-service. Purpose: Triggers contract
  group creation. Contracts-service consumes this event to call
  createGroup() internally. This replaces the direct POST
  /contract-groups call from the frontend.

**Remove from section 5 integration table:**

- Any reference to the Hire Me UI screen triggering POST
  /contract-groups directly.

- Any reference to talent accepting an offer via PUT
  /contracts/:id/respond.

**3.5 Doc 7 --- Security & Permissions**

**Role rule to remove:**

- \'Talent: Can accept or reject contract offers (PUT
  /contracts/:id/respond).\' This rule belongs in offer-service security
  docs, not contracts-service. The endpoint and rule must be removed.

**Role rule to add:**

- \'Contracts-service internal endpoints (e.g. createGroup) are not
  accessible from the frontend. They are called only from within the
  platform via event consumers after offer.accepted fires. No role guard
  required on internal event-driven paths; JWT validation applies only
  to public-facing read endpoints.\'

**3.6 Doc 9 --- API Documentation for Frontend Integration**

**Mapping to remove:**

- \'Hire Me screen (Hire Me.pdf) → POST /contract-groups.\' The Hire Me
  screen no longer calls contracts-service directly. It calls
  offer-service to initiate the offer.

- \'Accept/Reject flow for talent (PUT /contracts/:id/respond).\'
  Replaced by offer-service endpoint.

**Mapping to add:**

- \'After talent accepts an offer in offer-service, offer.accepted
  fires. contracts-service creates the group internally. The frontend is
  redirected to the deposit/checkout flow by listening for the
  contract.group.created event or polling contract status.\'

- \'GET /contracts/:id and GET /contracts/client/:id remain valid
  frontend endpoints for reading contract status after group creation.\'

**4. Removal Summary**

The following table summarises every item to remove or correct across
the contracts-service documentation set.

  ----------------------- ------------------------ -----------------------
  **Document**            **Item**                 **Action**

  **Doc 2 --- Data        Contract entity: title,  Fields STAY on entity.
  Model**                 rate, schedule, duration Remove only from
                          fields as frontend       ContractInput DTO.
                          inputs                   These are now populated
                                                   server-side from
                                                   offer.accepted payload,
                                                   never submitted by
                                                   frontend.

  **Doc 2 --- Data        ContractInput DTO:       Remove from DTO only.
  Model**                 title, rate, schedule,   Keep on Contract
                          duration                 entity. Add offerId to
                                                   DTO instead.

  **Doc 2 --- Data        accept-reject.dto.ts     Remove entirely. Move
  Model**                 (AcceptRejectDto)        to offer-service.

  **Doc 3 --- API         PUT                      Remove. Belongs to
  Endpoints**             /contracts/:id/respond   offer-service. See
                          (offer accept/reject)    distinction note in
                                                   section 3.2.

  **Doc 3 --- API         respondToOffer() in      Remove. Move to
  Endpoints**             contracts.service.ts     offer-service.

  **Doc 3 --- API         POST /contract-groups    Correct payload: remove
  Endpoints**             --- frontend payload     rate, schedule,
                          shape                    duration, title. Add
                                                   offerId. Trigger via
                                                   event consumer, not
                                                   frontend.

  **Doc 4 --- Start       Step 1: \'Client submits Replace with
  Flow**                  request\' framing        offer.accepted event
                                                   consumption
                                                   description.

  **Doc 6 --- Events**    Consumed events section  Add offer.accepted as a
                                                   consumed event with
                                                   full payload schema.

  **Doc 6 --- Events**    Integration table        Remove Hire Me UI
                                                   direct link to
                                                   contracts-service.
                                                   Remove talent
                                                   accept/reject
                                                   reference.

  **Doc 7 --- Security**  Talent role:             Remove. Move to
                          accept/reject offers via offer-service security
                          contracts-service        docs.

  **Doc 9 --- Frontend    Hire Me screen → POST    Remove. Hire Me calls
  API**                   /contract-groups mapping offer-service, not
                                                   contracts-service.

  **Doc 9 --- Frontend    Accept/Reject offer      Remove. Belongs to
  API**                   endpoint for talent      offer-service.
  ----------------------- ------------------------ -----------------------

**5. What Stays in Contracts-Service**

The following responsibilities are correctly owned by contracts-service
and must not be moved.

- ContractGroup and Contract entity definitions --- including title,
  rate, schedule, and duration fields which stay on the Contract entity,
  populated from the offer.accepted payload at group creation time.

- POST /contract-groups --- internal endpoint triggered by
  offer.accepted event consumer.

- Activation saga: consuming checkout.deposit.cleared, atomically
  activating all PENDING contracts in a group.

- PUT /contracts/:id/end --- client ending an individual active
  contract.

- PUT /contracts/:id/dispute --- dispute flow, DISPUTED status, billing
  pause.

- GET /contracts/:id, GET /contracts/client/:id, GET
  /contracts/talent/:id --- read endpoints.

- Events emitted: contract.group.created, contract.activated,
  contract.group.activated, contract.ended, contract.canceled,
  contract.disputed.

- Events consumed: checkout.deposit.cleared, checkout.deposit.failed,
  billing.finalized, timetracking.hours.approved, offer.accepted (new).

- Audit logging, JWT validation, role guards on public endpoints.

- Failed deposit handling, retry window, auto-cancel CRON.

- Partial termination logic: group ends only when last contract ends.

**6. Where Removed Items Go**

Every item removed from contracts-service must be absorbed by
offer-service. The OS documentation series will cover these in full. The
table below maps each removed item to its new home.

  ------------------------ -----------------------------------------------
  **Removed from           **New home in offer-service**
  contracts-service**      

  **Contract entity:       These fields stay on the Contract entity. The
  title, rate, schedule,   DTO correction (removing them from
  duration as              ContractInput) means offer-service owns the
  frontend-submitted       source of truth during negotiation;
  fields**                 contracts-service receives the final values via
                           offer.accepted and writes them to the entity at
                           group creation time.

  **AcceptRejectDto and    POST /v1/offers/:id/accept in offer-service.
  respondToOffer()**       See OS-04 API Endpoints.

  **ContractInput DTO:     Offer creation DTO in offer-service. See OS-04
  rate, schedule,          API Endpoints.
  duration, title**        

  **PUT                    POST /v1/offers/:id/accept and POST
  /contracts/:id/respond   /v1/offers/:id/decline in offer-service.
  (talent accept/reject)** 

  **Hire Me UI → POST      Hire Me UI → POST /v1/offers (offer-service).
  /contract-groups         After offer.accepted: contracts-service
  mapping**                createGroup() fires internally.

  **Talent role:           offer-service security: talent can accept,
  accept/reject offers**   decline, counter, or withdraw offers. See OS-07
                           Security.
  ------------------------ -----------------------------------------------

**7. Updated End-to-End Event Flow**

The corrected flow from Hire Me to active contract:

> 1\. Client clicks Hire Me on talent profile.
>
> 2\. invite-service creates an Invite record and emits invite.sent.
>
> 3\. offer-service creates an Offer record in PENDING state with the
> initial terms (rate, duration, schedule, start date).
>
> 4\. Negotiation rounds occur in offer-service (edit offer, counter
> offer, withdraw, decline) until one party accepts.
>
> 5\. offer-service sets Offer status to ACCEPTED and emits
> offer.accepted with the full agreed terms payload.
>
> 6\. contracts-service consumes offer.accepted, calls createGroup()
> internally, creates ContractGroup and Contract(s) in PENDING state,
> emits contract.group.created.
>
> 7\. checkout-service receives contract.group.created, generates
> deposit session, client pays.
>
> 8\. contracts-service consumes checkout.deposit.cleared, atomically
> activates all PENDING contracts, emits contract.activated and
> contract.group.activated.
>
> 9\. billing-service and time-tracking-service begin their respective
> flows.

**8. References**

- MARKETEQ_SPRINT_MEMORY.md --- canonical service ownership definitions
  and invite/offer/contract terminology

- OS Series (offer-service) --- documentation for all items removed from
  contracts-service

- IS Series (invite-service) --- documentation for the Hire Me entry
  point and invite lifecycle

- Contracts Service Doc 1 through Doc 9 --- source documents this CR
  modifies

- Hire_Me.pdf --- design screens confirming the Hire Me entry point flow

- Figma: https://www.figma.com/design/UNFdrf7JtG2aDH6FeijxKT --- offer
  negotiation flow canvas
