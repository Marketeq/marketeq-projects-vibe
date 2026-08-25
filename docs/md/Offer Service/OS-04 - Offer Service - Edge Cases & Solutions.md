**EC-OS --- Offer Service**

**Edge Cases & Solutions**

**Service:** offer-service **Severity:** CRITICAL · HIGH · MEDIUM · LOW
**Sources:** Designs · Industry standards · Platform benchmarks ·
Engineering best practices

This document covers every edge case identified for the offer service
--- from race conditions and state machine conflicts to network
failures, data integrity issues, and UI/UX edge cases. Each edge case
includes a severity rating and the exact solution to implement.

**Severity Key**

  --------- -------------- ------------------- ---------------------------------------
  **EC \#** **Severity**   **Edge Case**       **Solution**

  **---**   **CRITICAL**   **System integrity  Must be solved before any feature
                           or data corruption  ships. Blocking.
                           risk**              

  **---**   **HIGH**       **Major user-facing Must be solved before feature is
                           breakage or         considered production-ready.
                           security issue**    

  **---**   **MEDIUM**     **Degraded          Should be solved in the same sprint.
                           experience or       Not blocking.
                           incorrect           
                           behavior**          

  **---**   **LOW**        **Minor             Can be deferred but should be tracked.
                           inconsistency or    
                           edge path**         
  --------- -------------- ------------------- ---------------------------------------

+-----------------------------------------------------------------------+
| **Group 1 --- Race Conditions**                                       |
|                                                                       |
| Simultaneous actions by both parties or rapid repeat submissions      |
+-----------------------------------------------------------------------+

  ------------ -------------- ------------------- ---------------------------------------
  **EC \#**    **Severity**   **Edge Case**       **Solution**

  **EC-001**   **CRITICAL**   **Talent accepts    Last write wins at the database level
                              offer at the same   using an atomic compare-and-swap (CAS)
                              moment client       operation on the offer status field.
                              withdraws it**      Only one transition succeeds. The loser
                                                  receives 409 OFFER_NOT_ACTIONABLE.
                                                  Frontend surfaces the correct error
                                                  message for each party based on the
                                                  error code returned.

  **EC-002**   **CRITICAL**   **Client accepts    Same CAS pattern. Counter offer status
                              counter offer at    checked atomically before transition.
                              the same moment     If CO has already moved to WITHDRAWN,
                              talent withdraws    client receives 409. Frontend shows:
                              it**                \"This counter offer has been
                                                  withdrawn.\" Client is returned to the
                                                  chat thread.

  **EC-003**   **CRITICAL**   **Offer expires at  Server-side: offer status checked
                              the exact same      inside a transaction before setting
                              moment talent       ACCEPTED. If expiresAt has passed at
                              clicks Accept**     read time, offer is EXPIRED, not
                                                  ACCEPTED. Frontend receives 409
                                                  OFFER_EXPIRED. Shows: \"This offer has
                                                  expired and can no longer be
                                                  accepted.\"

  **EC-004**   **HIGH**       **Client edits an   Edit is only permitted when status =
                              offer at the exact  PENDING. Counter offer submission also
                              same moment talent  checks status = PENDING. Whichever hits
                              submits a counter   the DB first wins. Loser receives 409.
                              offer**             For the client: \"This offer has
                                                  already been responded to.\" For the
                                                  talent: \"This offer is no longer
                                                  pending.\"

  **EC-005**   **HIGH**       **Two clients       Unique constraint on (clientId,
                              attempt to send an  talentId, status=PENDING) in the offers
                              offer to the same   table. Second insert returns a unique
                              talent              constraint violation → 409
                              simultaneously      OFFER_ALREADY_EXISTS. Extremely rare
                              (impossible by      but must be handled.
                              design but          
                              defensive handling  
                              needed)**           

  **EC-006**   **HIGH**       **User              Frontend disables the button
                              double-clicks Send  immediately on first click and applies
                              Offer, Edit &       a CSS pointer-events: none.
                              Resend, or Submit   Server-side: idempotency key (UUID
                              Counter Offer**     generated client-side, sent in
                                                  X-Idempotency-Key header) ensures only
                                                  one record is created even if two
                                                  requests arrive within the dedup window
                                                  (24h). Second request returns the
                                                  original response.

  **EC-007**   **MEDIUM**     **Client opens the  Second action will fail with 409
                              same offer in two   because the first action already
                              browser tabs and    changed the offer state. Frontend in
                              performs different  the second tab should poll or receive a
                              actions in each**   real-time update via Ably to reflect
                                                  the new state before allowing further
                                                  actions. On stale state: show banner
                                                  \"This offer has been updated.
                                                  Refreshing\...\"

  **EC-008**   **MEDIUM**     **Talent\'s offer   Ably event received → offer card in
                              modal is open and   chat updates → if modal is open, the
                              the offer gets      action buttons (Counter Offer, Decline,
                              withdrawn by the    Accept) are immediately hidden and
                              client in real      replaced with \"This offer has been
                              time**              withdrawn.\" Banner shown inline
                                                  without requiring a modal close/reopen.

  **EC-009**   **MEDIUM**     **Client\'s counter Ably event received → modal updates in
                              offer modal is open place. The three action buttons
                              and the talent      disappear. Footer updates to: \"This
                              withdraws the       counter offer has been withdrawn.\"
                              counter offer in    Inline, no modal close required.
                              real time**         

  **EC-010**   **MEDIUM**     **Offer expiry      Ably emits offer.expired → both modals
                              clock reaches zero  update. Talent sees footer change from
                              while both parties  action buttons to recovery action
                              have the offer      (Request Extension or Ask Now). Client
                              modal open**        sees footer change to Edit Offer +
                                                  Resend Offer. No page refresh required.
  ------------ -------------- ------------------- ---------------------------------------

+-----------------------------------------------------------------------+
| **Group 2 --- State Machine Conflicts**                               |
|                                                                       |
| Invalid or unexpected state transitions                               |
+-----------------------------------------------------------------------+

  ------------ -------------- ------------------- ---------------------------------------
  **EC \#**    **Severity**   **Edge Case**       **Solution**

  **EC-011**   **CRITICAL**   **Direct API call   Server-side: strict allowedTransitions
                              attempting to       map enforced before every write.
                              accept an           ACCEPTED → anything is not in the map.
                              already-ACCEPTED    Returns 409 OFFER_NOT_ACTIONABLE. No
                              offer**             idempotent pass-through --- even a
                                                  duplicate accept returns 409 to prevent
                                                  double-contract creation.

  **EC-012**   **CRITICAL**   **offer.accepted    contracts-service must implement an
                              emitted twice       idempotency check on offerId before
                              (retry or duplicate creating a ContractGroup. If a
                              delivery from       ContractGroup already exists for this
                              RabbitMQ)**         offerId, the consumer ACKs the message
                                                  and does nothing. Offer-service logs
                                                  the duplicate emission.

  **EC-013**   **CRITICAL**   **offer.accepted    Use an outbox pattern: write both the
                              fails to emit after status change and the pending event to
                              offer status is set the database in the same transaction. A
                              to ACCEPTED**       separate poller picks up unpublished
                                                  events and emits them. This guarantees
                                                  the event is eventually published even
                                                  if RabbitMQ is temporarily unavailable.

  **EC-014**   **HIGH**       **Partial database  All offer status changes are wrapped in
                              write: offer status a single database transaction that
                              updated but         updates: status, the relevant timestamp
                              timestamps not      (acceptedAt, declinedAt, etc.), and any
                              recorded**          related fields. If any part fails, the
                                                  entire transaction rolls back.

  **EC-015**   **HIGH**       **Counter offer     Unique constraint on (parentOfferId,
                              supersession race:  status=PENDING) in the counter_offers
                              two counter offers  table. Only one can be PENDING at a
                              submitted           time. The second insert fails with a
                              simultaneously      constraint violation → 409. First
                              (e.g. client and    submitter wins.
                              talent both submit  
                              at the same         
                              millisecond)**      

  **EC-016**   **HIGH**       **Primary offer and The expiry job processes all expired
                              its counter offer   records. For the counter offer: set CO
                              both expire at the  → EXPIRED. For the primary offer: since
                              same expiresAt      the CO is already EXPIRED (not
                              timestamp**         PENDING), the primary offer also sets
                                                  to EXPIRED. No restoration logic fires
                                                  because the CO was not PENDING at
                                                  resolution time.

  **EC-017**   **HIGH**       **Client declines a CO → DECLINED. Primary offer status
                              counter offer but   check: if already EXPIRED, leave it
                              the primary offer   EXPIRED. Do not attempt to restore to
                              has also            PENDING. Return CO DECLINED response
                              independently       normally.
                              expired between the 
                              counter offer being 
                              submitted and the   
                              decline**           

  **EC-018**   **MEDIUM**     **Talent withdraws  Primary offer is restored to PENDING
                              counter offer and   synchronously within the same
                              immediately tries   transaction that sets the CO to
                              to accept the       WITHDRAWN. The acceptance can proceed
                              original offer      immediately. No eventual consistency
                              before the state    gap.
                              propagates**        

  **EC-019**   **MEDIUM**     **Client resends a  Frontend hides Resend Offer button for
                              PENDING offer       PENDING, ACCEPTED, and COUNTERED
                              (which is not       offers. Server-side: validate that
                              allowed --- resend  offer status ∈ \[EXPIRED, DECLINED,
                              only available on   WITHDRAWN\] before creating a new offer
                              terminal states)**  record. Returns 409
                                                  OFFER_NOT_RESENDABLE if attempted on a
                                                  non-terminal status.

  **EC-020**   **MEDIUM**     **Offer edited      Frontend hides Edit Offer when status =
                              while status =      COUNTERED. Server-side: edit only
                              COUNTERED (client   allowed when status = PENDING. Returns
                              tries to edit but   409 OFFER_NOT_ACTIONABLE if attempted
                              talent has already  on COUNTERED status.
                              sent a counter      
                              offer)**            

  **EC-021**   **LOW**        **Talent tries to   The Edit Counter Offer flow handles
                              submit a second     this correctly via a PATCH on the
                              counter offer while existing counter offer record. A POST
                              their first one is  /counter-offers on a COUNTERED primary
                              still PENDING       offer where a PENDING CO already exists
                              (should be an       should be rejected with 409
                              in-place edit, not  COUNTER_OFFER_ALREADY_PENDING. Frontend
                              a new submission)** should route to Edit Counter Offer, not
                                                  Make Counter Offer, if a PENDING CO
                                                  exists for this talent.
  ------------ -------------- ------------------- ---------------------------------------

+-----------------------------------------------------------------------+
| **Group 3 --- Expiry and TTL Edge Cases**                             |
|                                                                       |
| Clock resets, boundary conditions, and timing issues                  |
+-----------------------------------------------------------------------+

  ------------ -------------- ------------------- ---------------------------------------
  **EC \#**    **Severity**   **Edge Case**       **Solution**

  **EC-022**   **HIGH**       **Offer edited on   expiresAt is recalculated as NOW() + 14
                              day 13.9 (hours     days on every PATCH to the offer
                              before expiry) ---  record. The edit is the activity, so
                              clock must reset to the clock resets regardless of how
                              14 days from now**  close to expiry the edit occurs.
                                                  warningSentAt is also reset to NULL so
                                                  the 48h warning fires again for the new
                                                  expiry window.

  **EC-023**   **HIGH**       **48h expiry        warningSentAt field on the Offer record
                              warning fires for   tracks whether the warning has been
                              an offer that was   sent for the current expiry window.
                              already edited and  When expiresAt is reset (due to edit,
                              has a fresh clock** counter offer, etc.), warningSentAt is
                                                  set to NULL. The warning scheduler only
                                                  fires if warningSentAt IS NULL AND
                                                  (expiresAt - NOW()) \<= 48h.

  **EC-024**   **HIGH**       **48h warning fires warningSentAt is set atomically when
                              twice for the same  the warning is sent. The scheduler uses
                              offer (duplicate    an UPDATE WHERE warningSentAt IS NULL
                              emission)**         query --- only one scheduler instance
                                                  can claim the record. RabbitMQ message
                                                  deduplication also applies.

  **EC-025**   **HIGH**       **Offer expires at  All expiry timestamps are stored and
                              midnight boundary   evaluated in UTC. expiresAt = createdAt
                              --- timezone        (UTC) + exactly 14 \* 86400 seconds. No
                              ambiguity**         timezone conversion at the expiry
                                                  evaluation step. Frontend displays
                                                  expiry dates converted to the user\'s
                                                  local timezone for display only.

  **EC-026**   **HIGH**       **Expiry scheduler  expiredAt is set to the original
                              runs late (e.g. job expiresAt timestamp, not the time the
                              delayed by 30       job ran. The UI derives expiry state
                              minutes) --- offer  from comparing NOW() to expiresAt
                              shows as active in  client-side as well as from the status
                              UI but is actually  field. If expiresAt \< NOW() and status
                              expired**           is still PENDING, the frontend renders
                                                  the expired state immediately without
                                                  waiting for the scheduler.

  **EC-027**   **MEDIUM**     **Counter offer     Restoration logic: SET
                              expires and primary primary_offer.status = PENDING WHERE id
                              offer is already    = :parentOfferId AND status =
                              EXPIRED ---         \'PENDING\' (note: checks current
                              restoration must    status before writing). If primary is
                              not fire**          already EXPIRED, the WHERE clause
                                                  matches zero rows --- no update occurs.
                                                  Safe by design.

  **EC-028**   **MEDIUM**     **Offer expires     Frontend uses Math.floor() on the
                              exactly on the      elapsed days calculation. A value of
                              30-day boundary for 30.0 days floors to 30 --- shows
                              the extension       Request Extension. A value of 30.001
                              window**            floors to 30 --- still shows Request
                                                  Extension. The switch to Ask Now
                                                  happens at 31 days (floor value = 31).
                                                  This avoids a boundary flip on the
                                                  exact day.

  **EC-029**   **MEDIUM**     **Client edits an   Ably emits offer.edited → frontend
                              offer and the       updates the expiresAt display in real
                              talent has the      time. The talent\'s open modal
                              offer modal open    refreshes the expiry line: \"This offer
                              --- talent\'s       expires \[new date\].\"
                              expiry display is   
                              now stale**         

  **EC-030**   **LOW**        **Offer expires     No impact. expiresAt is set at creation
                              during the Hire Me  time (POST /v1/offers), not when the
                              modal creation flow modal opens. The clock only starts when
                              before the client   the offer record is created.
                              submits**           
  ------------ -------------- ------------------- ---------------------------------------

+-----------------------------------------------------------------------+
| **Group 4 --- Data Integrity**                                        |
|                                                                       |
| Invalid inputs, missing data, and storage correctness                 |
+-----------------------------------------------------------------------+

  ------------ -------------- ------------------- ---------------------------------------
  **EC \#**    **Severity**   **Edge Case**       **Solution**

  **EC-031**   **CRITICAL**   **offer.accepted    contracts-service validates all
                              payload missing     required fields on the offer.accepted
                              required fields     payload before creating the
                              (e.g. rate,         ContractGroup. If any field is missing
                              duration, schedule, or null, contracts-service publishes an
                              title, startDate)** offer.accepted_failed event, logs the
                                                  error, and does not create the
                                                  contract. offer-service monitors for
                                                  this failure event and can alert the
                                                  engineering team. The offer status is
                                                  not rolled back --- a human
                                                  intervention may be needed.

  **EC-032**   **CRITICAL**   **Contract title    contracts-service checks uniqueness of
                              already exists for  the title within the client\'s existing
                              this client at the  contracts before creating the
                              moment              ContractGroup. If conflict:
                              offer.accepted      contracts-service returns an error to
                              fires ---           the client via notification: \"A
                              uniqueness          contract with this title already
                              conflict**          exists. Please update the title to
                                                  proceed.\" The offer remains ACCEPTED
                                                  --- only contract creation is blocked
                                                  pending title resolution.

  **EC-033**   **HIGH**       **Whitespace-only   Server-side: trim() the title before
                              or empty contract   validation. If the trimmed result is an
                              title submitted**   empty string, return 422 with
                                                  TITLE_REQUIRED. This applies at offer
                                                  creation (POST /v1/offers) and edit
                                                  (PATCH /v1/offers/:id).

  **EC-034**   **HIGH**       **Custom rate       Server-side validation: rate must be a
                              entered as 0 or     number \> 0. Returns 422 INVALID_RATE.
                              negative**          Frontend also enforces this inline
                                                  before submission.

  **EC-035**   **HIGH**       **Custom duration   Duration must be a positive integer
                              entered as 0 or     ≥ 1. Decimals are rejected at the
                              decimal (e.g. 0.5   frontend input level (numeric input,
                              months)**           step=1). Server-side also validates
                                                  integer constraint. Returns 422
                                                  INVALID_DURATION.

  **EC-036**   **HIGH**       **Start date in the Server-side: validate startDate \>=
                              past submitted via  today (UTC date, not datetime). Returns
                              direct API call     422 INVALID_START_DATE. The frontend
                              (bypassing frontend calendar disables past dates as a UX
                              calendar            guard, but server-side is the
                              enforcement)**      authoritative check.

  **EC-037**   **HIGH**       **Message field     Trim the message value before storage.
                              contains only       If the trimmed result is empty, store
                              whitespace          NULL rather than a whitespace string.
                              characters**        This prevents the \"No message was
                                                  sent.\" fallback from incorrectly
                                                  rendering.

  **EC-038**   **HIGH**       **Decline reason    Server-side enforces max 500 chars on
                              text exceeds 500    declineReasonText. Returns 422 with
                              characters via      field-level error. Frontend counter
                              direct API call**   stops input at 500 as UX guard.

  **EC-039**   **MEDIUM**     **Currency dropdown The rate stored on an offer record is
                              changes             always stored with a currencyCode field
                              mid-negotiation     alongside the numeric value. The
                              (client changes     currencyCode is set at offer creation
                              from USD to another and does not change for the lifetime of
                              currency after an   that offer record. Currency changes in
                              offer is already    the user\'s account settings apply only
                              PENDING)**          to new offers going forward.

  **EC-040**   **MEDIUM**     **FX rate changes   The rate on the offer record is stored
                              between offer send  as a fixed numeric value in the
                              and offer           offer\'s currency. FX conversion for
                              acceptance**        display purposes is computed at render
                                                  time using the current pricing-service
                                                  FX rate. The agreed rate passed in
                                                  offer.accepted is the original numeric
                                                  value with its currency code ---
                                                  contracts-service stores and bills from
                                                  this fixed value.

  **EC-041**   **MEDIUM**     **Offer history     On offer creation, the first history
                              event log is empty  event (offer.created) is always written
                              (should always have atomically with the offer record. The
                              at least one        history cannot be empty if the offer
                              entry)**            record exists. Defensive: if history
                                                  API returns zero results, show
                                                  fallback: \"No history available.\" but
                                                  log this as a data anomaly.

  **EC-042**   **LOW**        **Very long         Enforce a server-side max of 200
                              contract title (no  characters on the contractTitle field.
                              explicit max length Returns 422 CONTRACT_TITLE_TOO_LONG.
                              defined in          Frontend input max is set to 200
                              designs)**          characters.
  ------------ -------------- ------------------- ---------------------------------------

+-----------------------------------------------------------------------+
| **Group 5 --- Network and System Failures**                           |
|                                                                       |
| API timeouts, partial failures, and infrastructure issues             |
+-----------------------------------------------------------------------+

  ------------ -------------- ----------------------- ---------------------------------------
  **EC \#**    **Severity**   **Edge Case**           **Solution**

  **EC-043**   **CRITICAL**   **offer-service is      Frontend shows: \"Could not connect.
                              temporarily unavailable Please try again.\" The offer is not
                              when talent tries to    changed. The client\'s offer remains
                              accept**                PENDING. The talent can retry
                                                      immediately. No state corruption.

  **EC-044**   **CRITICAL**   **Database write        The frontend shows an error. On retry
                              succeeds but response   with the same idempotency key, the
                              times out before        server detects the already-processed
                              returning to the        request and returns the original
                              client**                success response (HTTP 200 or 201 with
                                                      the existing record). The user sees a
                                                      success result on the second attempt
                                                      without a duplicate record being
                                                      created.

  **EC-045**   **HIGH**       **RabbitMQ is down when Outbox pattern: the pending event is
                              offer.accepted needs to written to an outbox table in the same
                              be emitted**            transaction as the status change. A
                                                      background poller retries publishing
                                                      unpublished outbox events with
                                                      exponential backoff. The offer remains
                                                      ACCEPTED and the event is eventually
                                                      published when RabbitMQ recovers. Max
                                                      retry: configurable, default 10
                                                      attempts before dead-lettering and
                                                      alerting engineering.

  **EC-046**   **HIGH**       **Ably WebSocket        Frontend implements Ably connection
                              disconnects             state monitoring. On disconnect: show a
                              mid-negotiation         subtle \"Reconnecting\...\" indicator.
                              (real-time updates      On reconnect: re-fetch current offer
                              stop)**                 state from offer-service REST API to
                                                      catch any missed state changes. No data
                                                      loss --- Ably buffers events for
                                                      disconnected clients for up to 2
                                                      minutes.

  **EC-047**   **HIGH**       **File upload fails     Legal-service returns an error.
                              during NDA signature    Frontend shows inline error: \"Upload
                              image upload            failed. Please try a different file or
                              (legal-service          use Type or Draw instead.\" The modal
                              interaction)**          stays open. No partial state saved.
                                                      Retry is available.

  **EC-048**   **MEDIUM**     **Partial NDA signing:  No state is saved to legal-service
                              name entered but        until Sign NDA is confirmed. Closing
                              signature not completed the modal discards all entered values.
                              when user closes        On next open, the modal starts fresh.
                              modal**                 No incomplete NDA records created.

  **EC-049**   **MEDIUM**     **listings-service is   Offer creation form falls back to
                              unavailable when        manual start date entry (calendar
                              offer-service needs to  picker, next Monday default). No
                              fetch the suggested     blocking error. A warning is shown:
                              start date for a scoped \"We couldn\'t retrieve the estimated
                              project**               start date for this project. Please
                                                      select a start date manually.\"

  **EC-050**   **MEDIUM**     **Notification delivery notification-service has its own retry
                              fails                   logic via RabbitMQ dead-letter queue.
                              (notification-service   If all retries are exhausted, the
                              unavailable when        notification is dropped but the offer
                              offer.created or        state is not affected. The recipient
                              offer.declined is       can still see the offer card in chat.
                              emitted)**              Notifications are informational ---
                                                      missing one is not catastrophic.

  **EC-051**   **LOW**        **Chat thread does not  messaging-service creates a new thread
                              exist when Ask Now or   between the client-talent pair if one
                              Request Extension       does not exist. The message is then
                              message needs to be     sent into the new thread. This is
                              sent**                  handled by messaging-service ---
                                                      offer-service simply calls the send
                                                      message endpoint with the recipient
                                                      IDs.
  ------------ -------------- ----------------------- ---------------------------------------

+-----------------------------------------------------------------------+
| **Group 6 --- Permissions and Security**                              |
|                                                                       |
| Unauthorised access, role violations, and injection attempts          |
+-----------------------------------------------------------------------+

  ------------ -------------- ---------------------------- ---------------------------------------
  **EC \#**    **Severity**   **Edge Case**                **Solution**

  **EC-052**   **CRITICAL**   **Talent attempts to         Server-side: extract userId and role
                              withdraw a client\'s offer   from JWT. Verify that the requesting
                              via direct API call (e.g.    user\'s role = client AND their userId
                              DELETE                       = offer.clientId. If either check
                              /v1/offers/:id/withdraw)**   fails, return 403 OFFER_ACCESS_DENIED.
                                                           Never trust role information from the
                                                           request body.

  **EC-053**   **CRITICAL**   **Client attempts to accept  Server-side: Accept endpoint verifies
                              their own offer (bypass      that the requesting user\'s role =
                              talent acceptance)**         talent AND userId = offer.talentId. A
                                                           client attempting to accept returns 403
                                                           regardless of any other conditions.

  **EC-054**   **CRITICAL**   **Third party constructs a   Every offer operation verifies that the
                              request with a valid JWT for requesting user is either the clientId
                              a different user and         or the talentId on the offer record.
                              attempts to access an offer  Being authenticated is not sufficient
                              they have no relation to**   --- you must be a party to the offer.
                                                           Returns 403 OFFER_ACCESS_DENIED.

  **EC-055**   **HIGH**       **JWT is expired mid-session offer-service returns 401 UNAUTHORIZED.
                              (user has been logged in for Frontend intercepts 401 responses
                              a long time)**               globally, attempts a silent token
                                                           refresh via the auth-service refresh
                                                           endpoint. If refresh succeeds, the
                                                           original request is retried
                                                           transparently. If refresh fails (e.g.
                                                           refresh token also expired), user is
                                                           redirected to login.

  **EC-056**   **HIGH**       **Admin user tries to        Admin role is read-only for
                              perform state-changing       offer-service. Endpoint guards check
                              actions on an offer (e.g.    that only talent role can accept and
                              accept on behalf of          only client role can withdraw/edit.
                              talent)**                    Admin attempting a write action returns
                                                           403 FORBIDDEN_FOR_ROLE.

  **EC-057**   **HIGH**       **Rate or duration field     All inputs are validated as their
                              submitted with a script      expected types (number for rate,
                              injection attempt (e.g.      integer for duration). Non-numeric
                              rate: \"0; DROP TABLE        values for numeric fields return 422
                              offers;\")**                 before reaching any database query. ORM
                                                           parameterized queries prevent SQL
                                                           injection at the persistence layer
                                                           regardless.

  **EC-058**   **MEDIUM**     **Client sends a Hire Me     Business rule: a user cannot send an
                              request to their own talent  offer to themselves. Enforce: clientId
                              account (if a user has both  ≠ talentId at the offer creation
                              roles on the platform)**     validation layer. Returns 422
                                                           SELF_OFFER_NOT_ALLOWED.

  **EC-059**   **MEDIUM**     **Offer ID is a valid UUID   The 403 OFFER_ACCESS_DENIED response is
                              but belongs to a different   returned for both \"not found\" and
                              client-talent pair           \"found but not yours\" cases. Do not
                              (enumeration attack)**       distinguish between the two in the
                                                           response body --- this prevents
                                                           enumeration.

  **EC-060**   **LOW**        **User pastes a direct link  API returns 403. Frontend shows error
                              to an offer modal URL for an screen: \"You don\'t have access to
                              offer they are not a party   this offer.\" with a link back to the
                              to**                         inbox.
  ------------ -------------- ---------------------------- ---------------------------------------

+-----------------------------------------------------------------------+
| **Group 7 --- UI and Frontend Edge Cases**                            |
|                                                                       |
| Browser behaviour, session issues, and UI state inconsistencies       |
+-----------------------------------------------------------------------+

  ------------ -------------- ------------------- ---------------------------------------
  **EC \#**    **Severity**   **Edge Case**       **Solution**

  **EC-061**   **HIGH**       **User presses      Offer modals are rendered as modal
                              browser Back button overlays, not as separate routes. The
                              from within an      back button should close the modal (pop
                              offer modal**       the modal from the history stack)
                                                  rather than navigate to the previous
                                                  page. Implement using history.pushState
                                                  when modal opens and popstate listener
                                                  to close on back navigation.

  **EC-062**   **HIGH**       **User refreshes    Modal state is not persisted in
                              the page while an   localStorage (not supported in
                              offer modal is      Claude.ai artifacts context). On
                              open**              refresh, the page reloads to the
                                                  underlying view (chat/inbox). The modal
                                                  closes. This is acceptable and expected
                                                  browser behaviour. The offer card in
                                                  chat provides the re-entry point.

  **EC-063**   **HIGH**       **Session expires   Frontend detects the 401 from the next
                              while user has an   API call (e.g. on submit). Prompts
                              offer modal open**  re-authentication. After re-auth, user
                                                  is returned to the page they were on.
                                                  The modal may need to be re-opened
                                                  manually from the chat thread.

  **EC-064**   **HIGH**       **Offer Sent        The confirmation screen is static (no
                              confirmation screen live data). It is informational only.
                              left open for a     The client dismisses it and navigates
                              long time ---       to the chat to see the updated offer
                              talent responds and state. The confirmation screen does not
                              accepts before      need to reflect real-time offer status.
                              client dismisses    
                              the confirmation**  

  **EC-065**   **HIGH**       **Calendar picker:  The start date is independent of the
                              client selects a    duration field. It is the client\'s
                              start date, then    responsibility to set a coherent start
                              changes the         date. The platform does not auto-adjust
                              contract duration   the start date when duration changes.
                              --- start date      No validation on the combination of
                              remains but may now start date + duration is required.
                              be illogical**      

  **EC-066**   **HIGH**       **Character counter Use the actual string length of the
                              for message field   textarea value (str.length) for the
                              shows incorrect     counter, not the number of keystrokes.
                              count if the user   On paste event, trim the value to 500
                              pastes content      characters immediately and update the
                              exceeding 500       counter to 500/500. Do not silently
                              characters**        truncate --- highlight the truncation
                                                  visually.

  **EC-067**   **MEDIUM**     **Offer History     The offer history list renders with
                              modal has 50+       virtual scrolling for lists exceeding
                              events (very long   20 items. Rows are expanded/collapsed
                              negotiation) ---    individually. The full event log is
                              performance and     fetched in a single paginated request
                              scroll**            (page size: 50). A \"Load more\"
                                                  control appears if the history exceeds
                                                  50 events.

  **EC-068**   **MEDIUM**     **Avatar chip       Show up to 5 avatars. Any additional
                              overflow on Offer   invites are represented as a numeric
                              Sent confirmation   overflow badge (e.g. \"+3\"). The
                              --- more than 5     overflow count is calculated as
                              pending invites in  totalPendingInvites - 5. Clicking the
                              flight**            overflow badge navigates to the My Team
                                                  page.

  **EC-069**   **MEDIUM**     **Decline reason    The Decline offer button\'s enabled
                              chip selected but   state is derived from: selectedChip !==
                              user then manually  null OR textarea.trim().length \> 0. If
                              clears the textarea the user clears the textarea and no
                              --- Decline button  chip is selected, the button disables.
                              should disable      The chip selection persists
                              again**             independently of the textarea value.

  **EC-070**   **MEDIUM**     **Rate warning      The warning triggers when counterRate
                              appears but user    \> originalRate \* 1.25. At exactly
                              enters a rate       \$125 (100 \* 1.25), counterRate is NOT
                              exactly at the 25%  greater than the threshold --- it is
                              threshold (e.g.     equal. No warning shown. Warning only
                              original \$100,     fires when counterRate \> threshold
                              counter \$125)**    (strictly greater than).

  **EC-071**   **MEDIUM**     **User opens Offer  Show skeleton loader rows (3--4
                              History modal and   placeholder rows with animated
                              the list has not    shimmer). If load fails, show: \"Could
                              loaded yet (slow    not load offer history. Please try
                              network)**          again.\" with a Retry button.

  **EC-072**   **MEDIUM**     **Offer modal       Frontend detects offline state
                              opened while        (navigator.onLine = false). Shows
                              offline (no network inline banner: \"You\'re offline. Some
                              connection)**       actions may not be available.\" Action
                                                  buttons (Accept, Decline, Counter) are
                                                  disabled. Read-only content (terms,
                                                  history) may still render from cached
                                                  state if available.

  **EC-073**   **LOW**        **User switches     Debounce the rate warning API call by
                              between Rate        300ms. Only the last selected rate
                              presets rapidly --- triggers the threshold check. Previous
                              multiple API calls  in-flight requests are cancelled.
                              fired for rate      
                              warning check**     

  **EC-074**   **LOW**        **Offer creation    Form state is held in component memory
                              form partially      only. Navigating away clears the form.
                              filled --- user     There is no draft saving for the Hire
                              navigates away and  Me offer creation flow. This is
                              returns**           intentional --- the flow is short
                                                  enough that a restart is not a
                                                  significant burden.

  **EC-075**   **LOW**        **Offer History     Each modal instance maintains its own
                              modal opened from   scroll position. Closing and reopening
                              two different       the history modal resets scroll to the
                              screens in the same top. This is standard modal behaviour.
                              session --- scroll  
                              position differs**  
  ------------ -------------- ------------------- ---------------------------------------

+-----------------------------------------------------------------------+
| **Group 8 --- Account and Profile Edge Cases**                        |
|                                                                       |
| Deactivated accounts, deleted listings, and profile changes           |
+-----------------------------------------------------------------------+

  ------------ -------------- ------------------- ---------------------------------------
  **EC \#**    **Severity**   **Edge Case**       **Solution**

  **EC-076**   **HIGH**       **Talent\'s account Offer-service checks account status
                              is deactivated      before allowing accept/decline/counter
                              after an offer is   actions. If talent account is
                              sent but before     deactivated: return 422
                              they respond**      TALENT_NOT_AVAILABLE. Client sees
                                                  notification: \"This talent is no
                                                  longer available on the platform.\"
                                                  Client can withdraw the offer. The
                                                  offer card in chat updates to a system
                                                  message explaining the situation.

  **EC-077**   **HIGH**       **Client\'s account Offer automatically transitions to
                              is deactivated      WITHDRAWN (system withdrawal). Talent
                              after a PENDING     receives notification: \"The offer from
                              offer is sent**     @\[client\] has been withdrawn.\" The
                                                  chat thread and offer history remain
                                                  readable for the talent.

  **EC-078**   **HIGH**       **Job listing is    The View Job link in the offer modal
                              archived or deleted navigates to the listing page. If the
                              after an offer      listing no longer exists,
                              referencing it is   listings-service returns 404. Frontend
                              created**           shows: \"This listing is no longer
                                                  available.\" The offer itself is
                                                  unaffected --- all negotiation can
                                                  continue. The jobListingId on the offer
                                                  record is retained for history purposes
                                                  even though the listing is gone.

  **EC-079**   **HIGH**       **Talent changes    Offer records reference the talentId
                              their username      (UUID), not the username. The username
                              (@handle) after an  displayed in offer modals and chat
                              offer is created    cards is fetched dynamically from the
                              that references     user profile at render time. If the
                              it**                username changes, all subsequent
                                                  renders reflect the new username
                                                  automatically.

  **EC-080**   **HIGH**       **Client changes    The rate is stored as a fixed numeric
                              their hourly rate   value on the offer record at creation
                              presets (job        time. It does not reference the listing
                              listing updates)    rate dynamically. Rate preset changes
                              after a PENDING     in listings-service do not affect
                              offer already uses  active offers. The offer displays the
                              one of the old      agreed rate, not the current listing
                              presets**           rate.

  **EC-081**   **MEDIUM**     **Talent\'s profile Profile photos are fetched dynamically
                              photo changes       by userId. The updated photo appears
                              mid-negotiation**   the next time any screen rendering that
                                                  avatar makes a profile fetch. No
                                                  caching concern if profile images are
                                                  fetched with short cache TTLs
                                                  (recommended: 5 minutes max-age).

  **EC-082**   **MEDIUM**     **Both the client   Offer is set to WITHDRAWN (system).
                              and talent accounts Both parties\' data is retained for
                              are deactivated     audit purposes. History remains
                              simultaneously      readable to internal admin. No further
                              (edge case in bulk  state transitions are possible.
                              deactivation)**     

  **EC-083**   **LOW**        **Client has no     Existing contract selector shows empty
                              active contracts    state: \"You have no active contracts.
                              when they open the  Invite this talent to a new contract
                              \"Add to an         instead.\" The \"Invite to a new
                              existing contract\" contract\" path remains available and
                              path**              functional.

  **EC-084**   **LOW**        **Talent profile    Hire Me modal renders with fallback:
                              has incomplete data default avatar placeholder for missing
                              (missing avatar,    photo, \"Location not specified\" for
                              missing location)   missing location. Missing data does not
                              when Hire Me modal  block the offer creation flow.
                              opens**             
  ------------ -------------- ------------------- ---------------------------------------

+-----------------------------------------------------------------------+
| **Group 9 --- NDA Edge Cases**                                        |
|                                                                       |
| Signature lifecycle, scope access, and re-sign scenarios              |
+-----------------------------------------------------------------------+

  ------------ -------------- ------------------- ---------------------------------------
  **EC \#**    **Severity**   **Edge Case**       **Solution**

  **EC-085**   **HIGH**       **Client removes    The NDA signature record is permanent
                              the NDA requirement and is never deleted. The listing no
                              from a listing      longer requires an NDA, but the
                              after a talent has  talent\'s signature is retained on the
                              already signed it** legal-service for the lifetime of the
                                                  contract. The talent is not prompted to
                                                  sign again for any future offers from
                                                  the same client on the same contract.

  **EC-086**   **HIGH**       **Talent attempts   The scope tab content is served by
                              to view the project listings-service which checks ndaSigned
                              scope without       status for the requesting
                              signing the NDA     talent-client-project combination
                              (direct URL         before returning scope data. If
                              manipulation to     unsigned: returns 403. Frontend shows
                              scope tab)**        the locked scope view with Sign NDA
                                                  prompt regardless of URL.

  **EC-087**   **HIGH**       **NDA signing page  The signature canvas is entirely
                              times out           client-side. The session timeout only
                              mid-signature (user affects the Sign NDA API call, not the
                              is drawing their    drawing action. If the Sign NDA call
                              signature and the   returns 401 (session expired), frontend
                              session expires)**  prompts re-authentication and retries
                                                  the Sign NDA submission with the same
                                                  signature data (held in component
                                                  state).

  **EC-088**   **MEDIUM**     **Talent uploads a  legal-service validates the uploaded
                              signature image     file before accepting it. If the file
                              that is technically is corrupt or unreadable, return 422
                              valid (JPEG) but    INVALID_SIGNATURE_FILE. Frontend shows:
                              corrupt or          \"We couldn\'t process this signature
                              unreadable**        image. Please try a different file or
                                                  use Type or Draw instead.\"

  **EC-089**   **MEDIUM**     **Talent            No state is persisted to legal-service.
                              accidentally closes The talent must restart the signing
                              the NDA signing     flow from the View Job link or the NDA
                              modal before        Required badge. The modal opens fresh
                              clicking Sign NDA** each time.

  **EC-090**   **LOW**        **Client generates  legal-service regenerates the NDA
                              an NDA for a        document with the updated company name.
                              project but then    Existing signed NDAs are not affected
                              changes the company --- they retain the company name at the
                              name before any     time of signing for legal integrity.
                              talent has signed** New signers see the updated name.

  **EC-091**   **LOW**        **Talent signs NDA  The Sign NDA button remains disabled
                              using \"Type my     until both Full Name and Initials
                              signature\" but     fields contain non-empty,
                              does not enter      non-whitespace values AND a signature
                              their initials**    preview is present. All three fields
                                                  are required regardless of signature
                                                  entry mode.
  ------------ -------------- ------------------- ---------------------------------------

+-----------------------------------------------------------------------+
| **Group 10 --- Resend and Extension Edge Cases**                      |
|                                                                       |
| Resend limits, extension window logic, and recovery flows             |
+-----------------------------------------------------------------------+

  ------------ -------------- --------------------------- ---------------------------------------
  **EC \#**    **Severity**   **Edge Case**               **Solution**

  **EC-092**   **HIGH**       **Client resends an expired The original expired offer card retains
                              offer and the new offer     its EXPIRED status and its View Details
                              immediately receives a      CTA. The new PENDING offer appears as a
                              counter offer --- original  separate card below it. Both are
                              expired offer card still    independently navigable. The chat
                              visible in chat**           thread shows both in chronological
                                                          order. This is expected and correct ---
                                                          history is never hidden.

  **EC-093**   **HIGH**       **Talent requests extension Ask Now is just a plain chat message.
                              (sends chat message) and    No state constraint prevents sending
                              then also clicks Ask Now    it. Both messages appear in the chat
                              (\>30 days path) because UI thread. The client receives both and
                              auto-switched**             can choose to respond. No deduplication
                                                          needed at the offer-service level.

  **EC-094**   **HIGH**       **Client approves extension Both actions are independent. The Ask
                              (resends offer) but talent  Now message is a chat message with no
                              has already sent an Ask Now offer-service state. The resent offer
                              message in the same         is a new PENDING offer card that
                              window**                    appears in the chat. The talent sees
                                                          the new offer card and can act on it
                                                          normally.

  **EC-095**   **MEDIUM**     **Client clicks \"Edit &    There should be no existing PENDING
                              Resend Offer\" from the     offer at this point (the original
                              extension request message   expired). The one-active-offer check
                              card but the new offer      passes. If somehow a PENDING offer
                              would violate the           exists (e.g. client had already resent
                              one-active-offer-per-pair   before seeing the extension message),
                              rule**                      return 409 OFFER_ALREADY_EXISTS. Client
                                                          sees: \"You already have an active
                                                          offer for this talent.\"

  **EC-096**   **MEDIUM**     **Talent sends multiple Ask Each click on Ask Now or Request
                              Now or extension request    Extension sends a plain chat message.
                              messages (spamming)**       No rate limiting on the offer-service
                                                          side for these messages specifically
                                                          --- they are governed by the general
                                                          messaging rate limits of
                                                          messaging-service. No additional
                                                          throttle needed at the offer level.

  **EC-097**   **MEDIUM**     **Client resends an offer   POST /v1/offers validates that both
                              but the talent\'s account   clientId and talentId refer to active
                              has been deactivated in the accounts. If talent is deactivated: 422
                              meantime**                  TALENT_NOT_AVAILABLE. Client sees:
                                                          \"This talent is no longer available on
                                                          the platform.\"

  **EC-098**   **LOW**        **View Terms link on the    The Resend modal is kept open
                              Resend Offer modal          underneath (z-index layering). Closing
                              navigates to the original   the details modal returns the user to
                              details modal --- user      the Resend modal with their optional
                              closes details modal and    message preserved. This is standard
                              expects to return to Resend stacked modal behaviour.
                              modal**                     
  ------------ -------------- --------------------------- ---------------------------------------

+-----------------------------------------------------------------------+
| **Group 11 --- Contract Title and Uniqueness Edge Cases**             |
|                                                                       |
| Title conflicts at acceptance, enforcement scope, and fallbacks       |
+-----------------------------------------------------------------------+

  ------------ -------------- ------------------- ---------------------------------------
  **EC \#**    **Severity**   **Edge Case**       **Solution**

  **EC-099**   **HIGH**       **Two offers to two contracts-service uses a unique
                              different talents   constraint on (clientId, contractTitle)
                              for the same        scoped to ALL contracts regardless of
                              project are both    status. The second acceptance hits the
                              accepted            constraint and fails. contracts-service
                              simultaneously ---  emits a contract.title_conflict event.
                              both would create a The client is notified and must update
                              ContractGroup with  the title for the second contract.
                              the same title**    Offer remains ACCEPTED --- only
                                                  contract creation is blocked.

  **EC-100**   **HIGH**       **Offer accepted    Uniqueness is enforced across ALL
                              but contract title  contracts for that client ---
                              matches a           regardless of status. A title used by
                              previously          any past or present contract is
                              CANCELLED,          permanently reserved for that client
                              COMPLETED, or       and cannot be reused. Client must
                              EXPIRED contract**  choose a new title. Returns 409
                                                  CONTRACT_TITLE_CONFLICT.

  **EC-101**   **MEDIUM**     **Contract title    Trimmed to empty string on the server.
                              entered as all      Returns 422 TITLE_REQUIRED. Frontend
                              whitespace (spaces  trims and validates before enabling
                              only)**             Send Offer.

  **EC-102**   **LOW**        **Contract title    Accepted as-is. No character
                              contains special    restriction beyond max length (200
                              characters or       chars) and non-empty. The database
                              emoji**             stores UTF-8. Emoji and special
                                                  characters are valid.
  ------------ -------------- ------------------- ---------------------------------------

+-----------------------------------------------------------------------+
| **Group 12 --- Notification Edge Cases**                              |
|                                                                       |
| Delivery, deduplication, and routing                                  |
+-----------------------------------------------------------------------+

  ------------ -------------- ----------------------------- ---------------------------------------
  **EC \#**    **Severity**   **Edge Case**                 **Solution**

  **EC-103**   **HIGH**       **Notification is sent for an The notification CTA navigates to the
                              event but the offer status    offer by ID. offer-service returns the
                              has already changed again by  current state of the offer, not the
                              the time the user taps the    state at the time the notification was
                              notification CTA**            sent. The correct modal or details view
                                                            is rendered for the current status. The
                                                            notification is effectively a pointer
                                                            --- it always leads to the current
                                                            state.

  **EC-104**   **HIGH**       **User has notifications      The offer card in the chat thread also
                              disabled at the OS/browser    shows the expiry date inline (\"This
                              level --- they miss a 48h     offer expires \[date\]\"). Expiry
                              expiry warning**              information is always visible in the
                                                            chat without requiring notifications.
                                                            Notifications are supplementary.

  **EC-105**   **MEDIUM**     **Notification fires for      notification-service should check
                              offer.expiring_soon but the   current offer status before displaying
                              offer was already             the notification. If status is no
                              accepted/declined/withdrawn   longer PENDING at display time,
                              in the window between the     suppress the notification or update its
                              warning being queued and      copy to \"This offer has been
                              delivered**                   \[accepted/declined/withdrawn\].\"

  **EC-106**   **MEDIUM**     **Both client and talent      The notification scheduler runs against
                              receive separate              the offers table. It only selects
                              offer.expiring_soon           offers where status = PENDING AND
                              notifications --- the         warningSentAt IS NULL AND (expiresAt -
                              notification should not fire  NOW()) \<= 48h. Terminal status offers
                              for terminal statuses**       are excluded by the WHERE clause.

  **EC-107**   **LOW**        **Notification badge count    Notification read/unread state is
                              (bell icon) does not          managed by notification-service, not
                              decrement after user reads a  offer-service. The bell badge count
                              notification**                reflects unread notifications. Reading
                                                            a notification marks it as read and
                                                            decrements the badge. This is outside
                                                            offer-service scope but documented for
                                                            context.
  ------------ -------------- ----------------------------- ---------------------------------------

+-----------------------------------------------------------------------+
| **Group 13 --- Multi-Round Negotiation Edge Cases**                   |
|                                                                       |
| Unlimited rounds, supersession logic, and history integrity           |
+-----------------------------------------------------------------------+

  ------------ -------------- ------------------- ---------------------------------------
  **EC \#**    **Severity**   **Edge Case**       **Solution**

  **EC-108**   **HIGH**       **Offer history has The Offer History modal uses virtual
                              100+ rounds of      list rendering for large sets. The GET
                              back-and-forth      /v1/offers/:id/history endpoint is
                              negotiation ---     paginated (page size: 50,
                              history modal       cursor-based). The history modal loads
                              performance**       the first page and appends on scroll.
                                                  Each expanded row shows the full terms
                                                  snapshot stored at event creation time
                                                  --- no re-fetching.

  **EC-109**   **HIGH**       **Terms snapshot    Each history event row shows available
                              for a history event fields only. If a field is NULL:
                              is missing or NULL  display \"---\" as a placeholder. The
                              (data gap from a    row remains expandable. Missing fields
                              prior system        do not collapse the row or throw a
                              version or          render error.
                              migration)**        

  **EC-110**   **MEDIUM**     **Superseded        The offer history modal labels each row
                              counter offer still clearly: \"\[Actor\] sent a
                              shown in history    counteroffer\", \"\[Actor\] sent a
                              --- user confused   counteroffer (superseded)\",
                              about which counter \"\[Actor\] edited their
                              offer is active**   counteroffer\". The ACTIVE counter
                                                  offer is the most recent PENDING one.
                                                  SUPERSEDED counter offers are visually
                                                  muted (greyed text or \"superseded\"
                                                  badge) in the history list.

  **EC-111**   **MEDIUM**     **Client counters   The diff is computed relative to the
                              back to talent\'s   immediately prior round, not the
                              counter offer ---   original offer. Implementation: when
                              the \"(was \$X)\"   rendering the review screen, compare
                              diff on the         the proposed terms against the previous
                              client\'s counter   PENDING counter offer terms (the one
                              offer review screen being responded to), not against the
                              should reference    root offer terms.
                              the talent\'s       
                              counter offer rate, 
                              not the original    
                              offer rate**        

  **EC-112**   **LOW**        **No hard cap on    By design, there is no artificial round
                              negotiation rounds  limit. This mirrors real-world
                              --- could           negotiation. The natural throttle is
                              theoretically loop  the 14-day expiry clock which resets on
                              indefinitely**      each round. If both parties keep
                                                  countering indefinitely the offer stays
                                                  active as long as they remain engaged.
                                                  No engineering action needed.
  ------------ -------------- ------------------- ---------------------------------------

+-----------------------------------------------------------------------+
| **Group 14 --- Platform-Level Edge Cases (Industry Standards)**       |
|                                                                       |
| Drawn from comparable platforms: Upwork, Fiverr, LinkedIn, eBay       |
+-----------------------------------------------------------------------+

  ------------ -------------- ------------------- -----------------------------------------
  **EC \#**    **Severity**   **Edge Case**       **Solution**

  **EC-113**   **HIGH**       **Client sends an   The accepted offer creates a PENDING
                              offer immediately   contract in contracts-service. The
                              after a previous    PENDING contract counts as an \"existing
                              offer to the same   active contract\" for the uniqueness
                              talent was accepted check. The client cannot send a second
                              and a contract is   offer to the same talent while a contract
                              being created ---   (even PENDING) exists for this pair.
                              deposit not yet     Returns 409 CONTRACT_ALREADY_IN_PROGRESS.
                              paid**              This aligns with Upwork\'s behaviour
                                                  where an accepted contract prevents
                                                  duplicate hiring.

  **EC-114**   **HIGH**       **Talent applies    These are two separate flows (application
                              for a job and is    vs direct offer). The offer from Hire Me
                              also sent a Hire Me is the authoritative hiring action. The
                              offer by the same   application is a separate record managed
                              client for the same by listings-service. Having both in
                              listing             flight simultaneously is possible and is
                              simultaneously**    resolved when one action (offer accept or
                                                  application hire) completes first.

  **EC-115**   **HIGH**       **Rate entered on   No validation or warning is applied for
                              offer is higher     this case. The offer rate is a negotiated
                              than the talent\'s  value and may exceed or be below the
                              stated maximum      talent\'s stated range. The rate warning
                              hourly rate on      only applies to counter offers (talent
                              their profile**     asking for more than 25% above the
                                                  offered rate). Analogous to eBay where
                                                  you can make a Best Offer above the
                                                  listing price.

  **EC-116**   **HIGH**       **Offer sent to a   The platform should warn the client
                              talent who has set  (availability badge shown on talent
                              their availability  profile). The offer can still be sent ---
                              to \"Not            availability is informational, not a hard
                              available\"**       block. This mirrors LinkedIn InMail
                                                  behaviour. The talent may have updated
                                                  their availability but not refreshed it.

  **EC-117**   **MEDIUM**     **Talent receives   Each offer is independent.
                              offers from         notification-service delivers each
                              multiple clients    notification. The talent\'s notification
                              simultaneously ---  bell aggregates all unread notifications.
                              notification        The inbox thread per client is separate.
                              overload**          No offer-service action needed --- this
                                                  is a notification-service and UX concern.

  **EC-118**   **MEDIUM**     **Client deletes    Covered in EC-077. Account deactivation
                              their Marketeq      triggers system withdrawal of all PENDING
                              account             offers. Talent is notified. This is
                              mid-negotiation --- consistent with how Upwork and Fiverr
                              analogy: seller     handle contract closure on account
                              deletes eBay        deletion.
                              account while Best  
                              Offer is pending**  

  **EC-119**   **MEDIUM**     **Talent\'s counter Confirmed in EC-070. Rate warning fires
                              offer rate is       only when counterRate \> originalRate \*
                              exactly 25% above   THRESHOLD. At exactly the threshold, no
                              the original ---    warning. Consistent with eBay\'s Best
                              rate warning should Offer advisory which warns only when
                              NOT fire (strictly  significantly above/below, not at the
                              greater than        exact boundary.
                              threshold)**        

  **EC-120**   **LOW**        **Client sends a    The
                              Hire Me offer to a  one-active-offer-per-client-talent-pair
                              talent they have an rule applies. But what if they already
                              existing active     have an ACTIVE contract? This should be
                              contract with**     allowed --- a client can hire the same
                                                  talent for a new separate contract. The
                                                  uniqueness check is on PENDING offers,
                                                  not on contracts. Two ACTIVE contracts
                                                  between the same pair for different
                                                  projects is valid.
  ------------ -------------- ------------------- -----------------------------------------

+-----------------------------------------------------------------------+
| **Group 15 --- Idempotency and Retry Patterns**                       |
|                                                                       |
| Ensuring safe retries across all offer operations                     |
+-----------------------------------------------------------------------+

  ------------ -------------- ------------------- ---------------------------------------
  **EC \#**    **Severity**   **Edge Case**       **Solution**

  **EC-121**   **CRITICAL**   **Send Offer        The client generates a UUID idempotency
                              submitted, server   key before the first attempt and sends
                              responds with 201,  it in X-Idempotency-Key. The server
                              but response is     stores the key and result for 24 hours.
                              lost in transit --- On retry with the same key, the server
                              client thinks it    returns the cached 201 response and the
                              failed and          original offer record. No duplicate
                              retries**           offer created.

  **EC-122**   **CRITICAL**   **Accept Offer      POST /v1/offers/:id/accept is
                              submitted, 200      idempotent only if the offer is already
                              returned, but       ACCEPTED. On the second call: offer
                              frontend never      status is already ACCEPTED → return 409
                              received it ---     OFFER_ALREADY_ACCEPTED (a specific
                              talent hits Accept  non-error 409 that the frontend handles
                              again**             by navigating to the accepted state ---
                                                  not an error toast).

  **EC-123**   **HIGH**       **Withdraw Offer    POST /v1/offers/:id/withdraw: if offer
                              submitted but       is already WITHDRAWN, return 409
                              network drops       OFFER_ALREADY_WITHDRAWN. Frontend
                              before response --- handles this 409 by checking the error
                              user retries**      code and navigating to the WITHDRAWN
                                                  state --- same outcome as a successful
                                                  first withdrawal.

  **EC-124**   **HIGH**       **Decline Offer     POST /v1/offers/:id/decline: if offer
                              submitted but       is already DECLINED, return 409
                              network drops ---   OFFER_ALREADY_DECLINED. Frontend
                              user retries**      handles this 409 as a successful
                                                  decline --- no error toast, navigate to
                                                  DECLINED state.

  **EC-125**   **MEDIUM**     **Edit Offer        The second PATCH arrives after the
                              submitted twice due first has succeeded. The offer is
                              to lag --- two      already updated. The second PATCH is
                              PATCH requests with processed against the now-updated
                              different           record. If the second PATCH has the
                              timestamps**        same body as the first (retry), the
                                                  result is the same. If the second PATCH
                                                  has different values (user changed
                                                  their mind very quickly), the second
                                                  update wins --- this is acceptable
                                                  last-write-wins behaviour.
  ------------ -------------- ------------------- ---------------------------------------
