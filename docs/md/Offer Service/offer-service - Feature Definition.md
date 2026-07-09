# **offer-service --- Feature Definition**

**Service scope:** Owns the complete offer negotiation lifecycle between
a client and a talent member. Begins when an offer is created from an
invite, ends when the offer is accepted (handing off to
contracts-service), declined, withdrawn, or permanently expired.

Looking at the Hire Me screens you uploaded earlier --- here\'s what
needs to be added to the offer-service feature definition as a new
section covering the offer creation entry point:

## **1. OFFER CREATION (Hire Me Flow)**

This is the first step in the offer lifecycle, triggered when a client
clicks "Hire Me" on a talent profile.

**Flow:**

1.  Client clicks Hire Me on talent profile

2.  Modal opens showing talent info and any existing pending invites
    (avatar stack builds as more talent are invited --- 1 through 6+
    shown)

3.  Client chooses: **Add to an existing contract** (search and select
    from list) or **Invite to a new contract**

4.  If existing contract: searchable list of contracts shown (project
    name + phase + team member avatars)

5.  If new contract: select Work Schedule → select Contract Duration →
    select Rate → confirm Start Date → optional message → Send Offer

6.  On Send: **Offer Sent** confirmation screen with two paths ---
    Review Your Offer or Continue Browsing. Team member panel shows
    pending invite avatar added to the stack.

**Inputs offer-service must accept at creation:**

- talentId and clientId

- contractType: new or existing

- existingContractId (if adding to existing)

- workSchedule: Part Time / Full Time / custom (enter total hours per
  day, per week, or per month)

- duration: 3, 6, 12, 18, 24 months, Ongoing, or custom entry in
  months/years

- rate: preset options sourced from job listing service types, or custom
  rate entry

- startDate: confirmed or selected (see Estimated Start Date flow
  already documented)

- message: optional, max 500 characters

**Validations:**

- All of rate, duration, schedule, startDate required before Send Offer
  is enabled

- Custom schedule requires numeric hours + time unit (per day / per week
  / per month)

- Custom duration requires numeric entry + unit (months or years)

- Custom rate requires numeric entry with cancel option

**Post-send:**

- Offer-service sets status to PENDING and starts the 2-week expiry
  clock

- Pending invite avatar immediately appears in the team member stack on
  the confirmation screen

- offer.created event emitted → invite-service and notification-service
  consume

## **2. OFFER RECORD & DATA MODEL**

The offer-service owns and persists the Offer entity. Every offer must
store:

- **Offer terms:** rate (hourly, with preset and custom options),
  contract duration (preset or custom months), work schedule (Part Time
  / Full Time / custom hours per day), start date

- **Contract type context:** Project / Service / Team / Contract
  (Individual) --- inherited from the originating job listing via
  invite-service; offer-service stores this as a read-only reference

- **Ownership identifiers:** clientId, talentId, jobListingId, inviteId

- **Offer message:** optional free-text string, max 500 characters

- **Status:** current state in the offer state machine (see Section 2)

- **Round tracking:** which negotiation round this offer belongs to;
  full history of all prior rounds stored and accessible

- **Expiry timestamp:** calculated at creation time; drives TTL
  enforcement

- **Decline reason:** structured reason code + optional free-text
  explanation (stored when talent declines)

- **Timestamps:** createdAt, updatedAt, acceptedAt, declinedAt,
  withdrawnAt, expiredAt

## **3. OFFER STATE MACHINE**

offer-service owns and enforces all state transitions for both the
primary offer and counter offers.

**Primary Offer States:**

- PENDING --- sent by client, awaiting talent response

- ACCEPTED --- talent accepted; triggers offer.accepted event →
  contracts-service creates ContractGroup

- DECLINED --- talent declined with reason; offer is closed

- WITHDRAWN --- client withdrew before talent responded; offer is closed

- EXPIRED --- auto-expired after 2 weeks of no significant activity (no
  accept, decline, or counter)

- COUNTERED --- talent submitted a counter offer; original offer becomes
  inactive but remains accessible in history

**Counter Offer States:**

- PENDING --- submitted by talent, awaiting client response

- ACCEPTED --- client accepted counter offer terms; triggers
  offer.accepted event

- DECLINED --- client declined; original offer is restored to active
  unless it has independently expired

- WITHDRAWN --- talent withdrew their counter offer; original offer is
  restored to active

- EXPIRED --- counter offer auto-expired; original offer is restored to
  active unless it has independently expired

- SUPERSEDED --- a new counter offer from either party replaced this one

**State transition rules:**

- A new counter offer from either party supersedes all previous pending
  counter offers for that negotiation

- Declining a counter offer does NOT close the original offer ---
  original remains active

- Withdrawing a counter offer does NOT close the original offer ---
  talent can still accept the original

- Once an offer reaches ACCEPTED, DECLINED, WITHDRAWN, or permanently
  EXPIRED it cannot be revived --- a new offer record must be created
  via Resend

## **4. OFFER CREATION (CLIENT --- SEND OFFER)**

The offer-service receives an offer creation request, originating from
the client hiring flow (triggered from invite-service after invite is
sent).

**Responsibilities:**

- Accept and persist the initial offer terms: rate, duration, work
  schedule, start date, optional message, contract type

- Calculate and store the expiry timestamp (2 weeks from creation)

- Set initial status to PENDING

- For scoped contracts (Project type): accept the system-calculated
  start date derived from project phases (provided by listings-service
  via invite-service); store as suggestedStartDate

- For no-scope contracts (Team / Service Ongoing / Individual): default
  start date to the next Monday from creation date; client may override

- Enforce contract title requirement for no-scope contracts; scoped
  contracts inherit the project name

- Support preset rate options (tied to job listing service types) and
  custom rate entry

- Support preset duration options (3, 6, 12, 18, 24 months, Ongoing) and
  custom month entry

- Support Part Time, Full Time, and custom hours-per-day work schedule
  entry

- Validate all required fields before persisting

- Return the created Offer record to the caller

## **5. OFFER TERMS EDITING (CLIENT --- EDIT OFFER)**

The client can edit a PENDING offer before talent has responded.

**Responsibilities:**

- Accept updated values for any of: rate, duration, work schedule, start
  date, message

- Preserve the original values alongside the new values --- both must be
  queryable so the frontend can display \"(was \$X)\" diff notation

- Reset the expiry timestamp on edit (new offer terms = new 2-week
  window)

- Maintain the same Offer record ID --- this is an edit, not a new offer

- Return a review payload showing original vs. updated values before the
  client confirms

- Only allow edits when offer status is PENDING; reject edit requests on
  any other status

## **6. COUNTER OFFER (TALENT --- MAKE COUNTER OFFER)**

Talent can propose new terms in response to any active PENDING offer.

**Responsibilities:**

- Accept proposed counter offer terms: rate, duration, work schedule,
  start date, optional message

- Store counter offer as a new negotiation round linked to the parent
  offer

- Set primary offer status to COUNTERED; set counter offer status to
  PENDING

- Supersede any existing pending counter offer (set prior counter to
  SUPERSEDED)

- Enforce rate guidance: when the talent\'s proposed rate significantly
  exceeds the original offer rate, include a threshold-based warning in
  the response (required by frontend to display the advisory tooltip)

- Support all the same rate, duration, schedule, and date input variants
  as the primary offer creation

- Return a review payload for talent to confirm before submitting

**Counter offer editing (before submission):**

- Talent can return to the Make Counter Offer form from the review
  screen and modify terms before submitting

- Once submitted, the counter offer is immutable; talent must withdraw
  and resubmit to change terms

**Counter offer re-send:**

- If a client asks talent to resend an expired counter offer (via chat,
  outside offer-service), offer-service must support a resend counter
  offer action that creates a new counter offer record with the same
  terms and a fresh expiry

- The resent counter offer is a new record; the original expired counter
  offer remains in history with EXPIRED status

## **7. CLIENT RESPONSE TO COUNTER OFFER**

The client can respond to a PENDING counter offer with one of three
actions.

**Accept counter offer:**

- Set counter offer status to ACCEPTED

- Set primary offer status to ACCEPTED

- Emit offer.accepted event with the agreed terms payload →
  contracts-service consumes this to create ContractGroup

- Record acceptedAt timestamp

**Decline counter offer:**

- Set counter offer status to DECLINED

- Restore primary offer to PENDING (active) unless primary offer has
  independently expired

- Record declinedAt timestamp on counter offer

**Counter the counter offer (client counter):**

- Client can submit a new offer with updated terms in response to the
  counter offer

- This creates a new primary offer round, superseding the prior counter
  offer

- Counter offer status set to SUPERSEDED

## **8. TALENT ACCEPTING THE ORIGINAL OFFER**

Talent can accept the primary offer at any point while it is PENDING ---
including after declining a counter offer or withdrawing their own
counter offer.

**Responsibilities:**

- Validate offer is still in PENDING state and has not expired

- Accept optional message from talent (max 500 characters)

- Require consent checkbox acknowledgement before accepting (\"I agree
  to Marketeq\'s Terms of Service, Privacy Policy, Dispute Policy, and
  Work Protection Guidelines\")

- Set offer status to ACCEPTED

- Record acceptedAt timestamp

- Emit offer.accepted event with full agreed terms → contracts-service

## **9. TALENT DECLINING THE OFFER**

**Responsibilities:**

- Accept a structured decline reason (one of: Budget doesn\'t work,
  Start date doesn\'t work, Requirements are unclear, Not a fit for my
  skills, Too busy right now, Need different terms) plus optional
  free-text explanation (max 500 characters)

- Set offer status to DECLINED

- Record declinedAt timestamp and reason on the Offer record

- Decline reason is stored and readable by the client in the Offer
  Declined Details view

- Expose a pivot action: from the decline flow, talent can switch to
  Make Counter Offer instead of confirming the decline

## **10. OFFER WITHDRAWAL (CLIENT)**

**Primary offer withdrawal:**

- Client can withdraw a PENDING offer at any time before talent responds

- Accept optional message to talent (max 500 characters)

- Set offer status to WITHDRAWN

- Record withdrawnAt timestamp

**Counter offer withdrawal (talent):**

- Talent can withdraw their PENDING counter offer at any time

- Accept optional message (max 500 characters)

- Set counter offer status to WITHDRAWN

- Restore primary offer to PENDING --- talent retains the ability to
  accept the original offer

- This must be enforced: withdrawing a counter offer must never close
  the primary offer

## **11. OFFER EXPIRY & TTL MANAGEMENT**

offer-service owns the expiry clock for both primary offers and counter
offers.

**Auto-expiry rules:**

- An offer auto-expires after 2 weeks (14 days) with no significant
  activity (no accept, decline, or counter)

- A counter offer has its own independent expiry clock, also 2 weeks
  from submission

- When a primary offer expires: status set to EXPIRED, expiredAt
  recorded

- When a counter offer expires: counter offer status set to EXPIRED; if
  primary offer has not independently expired, primary offer is restored
  to PENDING

- An expired offer is permanently inactive --- it cannot be reopened or
  modified. Resend creates a new Offer record.

**Expiry-based recovery actions (offer-service must expose these via
API):**

- GET /offers/:id/recovery-options --- returns the correct recovery
  action based on status and elapsed time since expiry:

  - Status EXPIRED, elapsed ≤ 30 days → recovery action:
    REQUEST_EXTENSION (talent-initiated; requires client approval)

  - Status EXPIRED, elapsed \> 30 days → recovery action:
    ASK_IF_STILL_OPEN (talent-initiated message)

  - Status DECLINED or WITHDRAWN → recovery action: ASK_IF_STILL_OPEN
    only; REQUEST_EXTENSION is never available for declined or withdrawn
    offers

- POST /offers/:id/request-extension --- talent requests extension; sets
  a pending extension flag on the offer; client must approve via POST
  /offers/:id/approve-extension

- On extension approval: create a new Offer record with same terms and
  fresh expiry; link it to the original as reopenedFromOfferId; original
  remains EXPIRED

**Expiry notifications (requirement on notification-service):**

- offer-service must emit offer.expiring_soon event when an offer has 48
  hours remaining --- notification-service consumes this

- offer-service must emit offer.expired event immediately on expiry ---
  notification-service consumes this

## **12. RESEND OFFER (CLIENT)**

Resend is available when an offer is EXPIRED, DECLINED, or WITHDRAWN.

**Responsibilities:**

- POST /offers/:id/resend --- creates a new Offer record with identical
  terms as the original; does not modify the original record

- Accept an optional new message to talent (max 500 characters)

- The new offer gets a fresh expiry timestamp

- The original offer record retains its terminal status (EXPIRED,
  DECLINED, WITHDRAWN)

- The new offer links back to the original via resendOfOfferId for
  history traceability

- Expose GET /offers/:id/terms so the Resend modal can display the terms
  being resent before confirming

## **13. OFFER HISTORY**

offer-service must maintain and serve a complete, ordered history of all
negotiation events for a given offer thread.

**Responsibilities:**

- Store every offer action as an append-only event log: sent, countered,
  declined, withdrawn, accepted, expired, resent, superseded

- Each event must record: actor (client or talent), action type, rate at
  the time of the action, timestamp

- GET /offers/:inviteId/history --- returns the full ordered event log
  for the offer thread associated with an invite

- History entries must be expandable: each event can expose the full
  offer terms at that point in time (rate, duration, schedule, start
  date, message)

- History is accessible to both client and talent at any point in the
  negotiation and after resolution

- When contract is active, history endpoint must return a link reference
  to the resulting contract (resolved by contracts-service, passed
  through)

## **14. OFFER TERM DIFF & REVIEW**

Before any offer action is submitted (send, edit, counter, resend),
offer-service must support a review step.

**Responsibilities:**

- For edit offer and counter offer: return a diff payload that includes
  both original values and proposed values for each changed field

- Changed fields are flagged explicitly (e.g. { field: \"rate\",
  original: 45, proposed: 85, changed: true })

- Unchanged fields are included with changed: false so the frontend can
  render the full terms with diff highlights

- Review payload must include the offer expiry date so the frontend can
  display \"This offer expires \[date\]\"

- Client review of an edited offer must expose a viewPreviousOffer
  reference so the prior terms remain accessible

## **15. OFFER VISIBILITY & READ ACCESS**

**Responsibilities:**

- Both client and talent can read the current active offer at any time

- Both parties can access the full offer history at any time

- Expired, withdrawn, and declined offers remain permanently readable
  --- they are never deleted

- A COUNTERED primary offer is readable in history but no longer
  actionable as the active offer

- When a counter offer is PENDING, the client must be able to see both
  the counter offer terms and the original offer terms side by side

## **16. CROSS-SERVICE REQUIREMENTS (Offer-service as consumer/producer)**

These are direct requirements on offer-service created by integrations
with other services:

**Produces (RabbitMQ events offer-service must emit):**

  **Event**                 **Trigger**                       **Consumer**
  ------------------------- --------------------------------- --------------------------------------------------------------
  offer.accepted            Offer or counter offer accepted   contracts-service --- creates ContractGroup in PENDING state
  offer.expiring_soon       48h before offer expiry           notification-service
  offer.expired             On auto-expiry                    notification-service
  offer.declined            Talent declines                   notification-service
  offer.withdrawn           Client withdraws                  notification-service
  offer.countered           Talent submits counter offer      notification-service
  offer.counter_accepted    Client accepts counter offer      notification-service
  offer.counter_declined    Client declines counter offer     notification-service
  offer.counter_withdrawn   Talent withdraws counter offer    notification-service
  offer.counter_edited      Talent edits a counter offer      notification-service
  offer.resent              Client resends offer              notification-service

**Consumes:**

- invite.sent (from invite-service) --- triggers offer record creation
  with initial terms

- nda.signed (from legal-service) --- no direct state change on offer,
  but offer-service must store ndaSigned: true on the Offer record so
  the frontend can reflect NDA status on the offer view

**Reads (synchronous calls):**

- pricing-service: validate or provide rate guidance context when a rate
  significantly exceeds the job\'s suggested range (drives the rate
  warning threshold in counter offer)

- listings-service: read the suggested start date from project scope
  phases when creating a scoped offer

## **17. VALIDATION RULES**

All enforced by offer-service at the API layer:

- Rate: required, numeric, greater than 0. Custom rate must be a
  positive number.

- Duration: required. Preset values: 3, 6, 12, 18, 24 months, Ongoing.
  Custom: positive integer months.

- Work schedule: required. Part Time, Full Time, or custom positive
  integer hours per day.

- Start date: required. Must not be in the past.

- Message: optional. Max 500 characters across all offer actions (send,
  edit, counter, resend, withdraw, accept, decline).

- Decline reason: at least one structured reason code required;
  free-text is optional.

- Accept offer: consent checkbox must be true; offer must be in PENDING
  status; offer must not be expired.

- Counter offer: only allowed when receiving offer is in PENDING status.

- Withdraw: only allowed when the offer or counter offer is in PENDING
  status.

- Edit offer: only allowed on primary offers in PENDING status.
