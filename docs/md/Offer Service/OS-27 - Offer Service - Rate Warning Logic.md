**OS-27**

**Offer Service --- Rate Warning Logic**

**Talent CO threshold:** coRate \> parentRate × 1.25 **Client CO
threshold:** coRate \< parentRate × 0.80 **Nature:** Advisory only ---
never blocks submission

This document covers the complete rate warning implementation. When a
counter offer rate deviates significantly from the parent offer rate, a
rateWarning flag is set. This flag surfaces in the API response, the
Ably real-time payload, and the RabbitMQ event payload. The warning is
advisory --- it never blocks a counter offer from being submitted.

**File Map**

  ---------- ---------------------------------------------------- ----------------------
  **Step**   **File Path**                                        **Purpose**

  **1**      src/offers/offer-state-machine.ts (update)           computeRateWarning()
                                                                  is already here ---
                                                                  verify the
                                                                  implementation

  **2**      src/counter-offers/counter-offers.service.ts         Where
             (update)                                             computeRateWarning()
                                                                  is called during CO
                                                                  creation and edit

  **3**      src/counter-offers/dto/create-counter-offer.dto.ts   CounterOfferResponse
                                                                  includes rateWarning
                                                                  field

  **4**      (reference)                                          Threshold examples:
                                                                  all edge cases with
                                                                  expected results

  **5**      (reference)                                          Advisory response
                                                                  format in API, Ably
                                                                  payload, and RabbitMQ
                                                                  event

  **6**      (reference)                                          Frontend rendering
                                                                  rules for the rate
                                                                  warning banner
  ---------- ---------------------------------------------------- ----------------------

+-----------------------------------------------------------------------+
| **Overview Business Rules --- Confirmed Decisions**                   |
|                                                                       |
| All rate warning rules in one place                                   |
+-----------------------------------------------------------------------+

  --------------------- -------------------------------------------------
  **What triggers it**  A counter offer rate that deviates significantly
                        from the parent offer rate, in the direction that
                        favours the submitter.

  **Talent CO           STRICTLY greater than: coRate \> parentRate ×
  threshold**           1.25 (talent asking \>25% above the offer rate)

  **Client CO           STRICTLY less than: coRate \< parentRate × 0.80
  threshold**           (client offering \>20% below the offer rate)

  **Strict comparison** The comparison is \> and \< (not \>= and \<=). A
                        rate of exactly 125% does NOT trigger the
                        warning.

  **Direction flip**    The direction of the threshold flips depending on
                        who submitted the CO. Talent asking too much vs
                        client offering too little.

  **When computed**     Server-side only, in CounterOffersService,
                        immediately before the database transaction.

  **Stored where**      rateWarning is NOT stored in the database. It is
                        computed at write time and included in: the API
                        response, the Ably payload, and the RabbitMQ
                        offer.countered event.

  **Effect on           None. The CO is always saved regardless of
  submission**          rateWarning value. The warning is advisory
                        information only.

  **Effect on CO edit** rateWarning is recomputed on every edit (PATCH
                        \.../counter-offers/:id). The new value is
                        included in the edit response and events.

  **Shown to whom**     Both parties see the warning. Talent sees it
                        after submitting their CO. Client sees it when
                        reviewing the CO.
  --------------------- -------------------------------------------------

+-----------------------------------------------------------------------+
| **Step 1 computeRateWarning() in offer-state-machine.ts**             |
|                                                                       |
| The single function that evaluates the threshold                      |
+-----------------------------------------------------------------------+

computeRateWarning() is already defined in offer-state-machine.ts
(OS-25). Verify the implementation exactly matches what is documented
here. This is the canonical source of truth for the threshold logic.

  -----------------------------------------------------------------------
  **FILE: apps/offer-service/src/offers/offer-state-machine.ts --- verify
  this function exists exactly as shown**

  -----------------------------------------------------------------------

+-----------------------------------------------------------------------+
| /\*\*                                                                 |
|                                                                       |
| \* computeRateWarning()                                               |
|                                                                       |
| \*                                                                    |
|                                                                       |
| \* Evaluates whether a counter offer rate triggers the advisory       |
| warning.                                                              |
|                                                                       |
| \*                                                                    |
|                                                                       |
| \* Rules:                                                             |
|                                                                       |
| \* Talent submits CO: warn if coRate \> parentRate \* 1.25            |
|                                                                       |
| \* (talent is asking more than 25% above the original offer rate)     |
|                                                                       |
| \* Client submits CO: warn if coRate \< parentRate \* 0.80            |
|                                                                       |
| \* (client is offering more than 20% below the original offer rate)   |
|                                                                       |
| \*                                                                    |
|                                                                       |
| \* The comparison is STRICTLY \> and \< (not \>= and \<=).            |
|                                                                       |
| \* coRate = parentRate \* 1.25 exactly: no warning.                   |
|                                                                       |
| \* coRate = parentRate \* 0.80 exactly: no warning.                   |
|                                                                       |
| \*                                                                    |
|                                                                       |
| \* \@param parentRate The rate on the primary offer (integer)         |
|                                                                       |
| \* \@param coRate The rate on the counter offer (integer)             |
|                                                                       |
| \* \@param submittedBy Who submitted the counter offer                |
|                                                                       |
| \* \@returns true if the warning should be shown, false otherwise     |
|                                                                       |
| \*/                                                                   |
|                                                                       |
| static computeRateWarning(                                            |
|                                                                       |
| parentRate: number,                                                   |
|                                                                       |
| coRate: number,                                                       |
|                                                                       |
| submittedBy: \'CLIENT\' \| \'TALENT\',                                |
|                                                                       |
| ): boolean {                                                          |
|                                                                       |
| if (submittedBy === \'TALENT\') {                                     |
|                                                                       |
| // Talent asking above 1.25x the offer rate.                          |
|                                                                       |
| return coRate \> parentRate \* 1.25;                                  |
|                                                                       |
| } else {                                                              |
|                                                                       |
| // Client offering below 0.80x the offer rate.                        |
|                                                                       |
| return coRate \< parentRate \* 0.80;                                  |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
|                                                                       |
| // Unit-testable examples:                                            |
|                                                                       |
| // computeRateWarning(100, 126, \"TALENT\") =\> true (126 \> 100 \*   |
| 1.25 = 125)                                                           |
|                                                                       |
| // computeRateWarning(100, 125, \"TALENT\") =\> false (125 = 100 \*   |
| 1.25 = 125, not strictly \>)                                          |
|                                                                       |
| // computeRateWarning(100, 124, \"TALENT\") =\> false (124 \< 125)    |
|                                                                       |
| // computeRateWarning(100, 79, \"CLIENT\") =\> true (79 \< 100 \*     |
| 0.80 = 80)                                                            |
|                                                                       |
| // computeRateWarning(100, 80, \"CLIENT\") =\> false (80 = 100 \*     |
| 0.80 = 80, not strictly \<)                                           |
|                                                                       |
| // computeRateWarning(100, 81, \"CLIENT\") =\> false (81 \> 80)       |
|                                                                       |
| // computeRateWarning(95, 120, \"TALENT\") =\> true (120 \> 95 \*     |
| 1.25 = 118.75)                                                        |
|                                                                       |
| // computeRateWarning(95, 118, \"TALENT\") =\> false (118 \< 118.75)  |
+-----------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| **Step 2 Where computeRateWarning() is Called**                       |
|                                                                       |
| In CounterOffersService on create and edit                            |
+-----------------------------------------------------------------------+

computeRateWarning() is called in two places: when a CO is created and
when a CO is edited in-place. In both cases, the computation happens
before the database transaction so the result is available for both the
outbox event payload and the API response.

  -----------------------------------------------------------------------
  **FILE: apps/offer-service/src/counter-offers/counter-offers.service.ts
  --- create()**

  -----------------------------------------------------------------------

+-----------------------------------------------------------------------+
| // In CounterOffersService.create():                                  |
|                                                                       |
| // Load parent offer (needed for rate comparison)                     |
|                                                                       |
| const offer = await this.offersService.findByIdOrThrow(offerId);      |
|                                                                       |
| // Compute rate warning BEFORE the transaction.                       |
|                                                                       |
| // Pure computation --- no I/O, no side effects.                      |
|                                                                       |
| // Uses the PARENT OFFER rate as the baseline, not any previous CO    |
| rate.                                                                 |
|                                                                       |
| const rateWarning = OfferStateMachine.computeRateWarning(             |
|                                                                       |
| offer.rate, // parentRate: the original offer rate                    |
|                                                                       |
| dto.rate, // coRate: the rate the CO submitter is proposing           |
|                                                                       |
| role, // submittedBy: \"TALENT\" or \"CLIENT\"                        |
|                                                                       |
| );                                                                    |
|                                                                       |
| // The rateWarning value flows to three places:                       |
|                                                                       |
| // 1. RabbitMQ event payload (written inside the transaction):        |
|                                                                       |
| await this.outboxService.create(em, {                                 |
|                                                                       |
| aggregateId: offerId,                                                 |
|                                                                       |
| eventType: OFFER_EVENTS.COUNTERED,                                    |
|                                                                       |
| routingKey: OFFER_EVENTS.COUNTERED,                                   |
|                                                                       |
| exchange: OFFER_EXCHANGE,                                             |
|                                                                       |
| payload: buildOfferCounteredPayload(updatedOffer, savedCO,            |
| rateWarning),                                                         |
|                                                                       |
| // \^\^\^\^\^\^\^\^\^\^\^                                             |
|                                                                       |
| // included in payload                                                |
|                                                                       |
| });                                                                   |
|                                                                       |
| // 2. Ably real-time push (after the transaction):                    |
|                                                                       |
| this.ablyService.publish(offerId, updatedOffer, newCO, rateWarning);  |
|                                                                       |
| // \^\^\^\^\^\^\^\^\^\^\^                                             |
|                                                                       |
| // 3. API response (returned from the service method):                |
|                                                                       |
| return { counterOffer: newCO, rateWarning };                          |
|                                                                       |
| // \^\^\^\^\^\^\^\^\^\^\^                                             |
+-----------------------------------------------------------------------+

  -----------------------------------------------------------------------
  **FILE: apps/offer-service/src/counter-offers/counter-offers.service.ts
  --- editCO()**

  -----------------------------------------------------------------------

+-----------------------------------------------------------------------+
| // In CounterOffersService.editCO():                                  |
|                                                                       |
| // rateWarning is recomputed on every edit.                           |
|                                                                       |
| const offer = await this.offersService.findByIdOrThrow(offerId);      |
|                                                                       |
| // Use the PARENT OFFER rate as baseline (not the old CO rate).       |
|                                                                       |
| // The warning compares the NEW proposed rate against the original    |
| offer rate.                                                           |
|                                                                       |
| const rateWarning = OfferStateMachine.computeRateWarning(             |
|                                                                       |
| offer.rate,                                                           |
|                                                                       |
| dto.rate, // new rate after edit                                      |
|                                                                       |
| co.submittedBy,                                                       |
|                                                                       |
| );                                                                    |
|                                                                       |
| // Flows to:                                                          |
|                                                                       |
| // 1. Outbox event payload (offer.counter_edited)                     |
|                                                                       |
| // 2. Ably publish (updatedOffer, updatedCO, rateWarning)             |
|                                                                       |
| // 3. API response: { counterOffer: updatedCO, rateWarning }          |
+-----------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| **Step 3 API Response Format**                                        |
|                                                                       |
| rateWarning in counter offer API responses                            |
+-----------------------------------------------------------------------+

The rateWarning flag is included in the API response for POST (create
CO) and PATCH (edit CO). It is not stored in the database and is not
returned from GET endpoints (the flag is only meaningful at write time
when the comparison can be made).

  ---------------------------------------------------------------------------
  **FILE:
  apps/offer-service/src/counter-offers/dto/counter-offer-response.dto.ts**

  ---------------------------------------------------------------------------

+-----------------------------------------------------------------------+
| import { CounterOffer } from \'../entities/counter-offer.entity\';    |
|                                                                       |
| /\*\*                                                                 |
|                                                                       |
| \* Response from POST /v1/offers/:offerId/counter-offers (create)     |
|                                                                       |
| \* Response from PATCH /v1/offers/:offerId/counter-offers/:id (edit)  |
|                                                                       |
| \*/                                                                   |
|                                                                       |
| export class CounterOfferWithWarningResponse {                        |
|                                                                       |
| /\*\* The saved counter offer record. \*/                             |
|                                                                       |
| counterOffer: CounterOffer;                                           |
|                                                                       |
| /\*\*                                                                 |
|                                                                       |
| \* Advisory rate warning flag.                                        |
|                                                                       |
| \*                                                                    |
|                                                                       |
| \* true: The counter offer rate deviates significantly from the offer |
| rate.                                                                 |
|                                                                       |
| \* Talent CO: rate is \>25% above the offer rate.                     |
|                                                                       |
| \* Client CO: rate is \>20% below the offer rate.                     |
|                                                                       |
| \*                                                                    |
|                                                                       |
| \* false: Rate is within the expected range.                          |
|                                                                       |
| \*                                                                    |
|                                                                       |
| \* This flag is ADVISORY. The counter offer was saved regardless.     |
|                                                                       |
| \* The frontend shows a warning banner when this is true.             |
|                                                                       |
| \* The warning does NOT prevent submission.                           |
|                                                                       |
| \*/                                                                   |
|                                                                       |
| rateWarning: boolean;                                                 |
|                                                                       |
| }                                                                     |
|                                                                       |
| // ============================================================       |
|                                                                       |
| // Example API responses:                                             |
|                                                                       |
| // ============================================================       |
|                                                                       |
| // POST /v1/offers/\.../counter-offers --- Talent asks \$120 on a     |
| \$90 offer                                                            |
|                                                                       |
| // (120 \> 90 \* 1.25 = 112.5)                                        |
|                                                                       |
| {                                                                     |
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
| \"rate\": 120,                                                        |
|                                                                       |
| \"currencyCode\": \"USD\",                                            |
|                                                                       |
| \"durationMonths\": 6,                                                |
|                                                                       |
| \"workSchedule\": { \"type\": \"FULL_TIME\" },                        |
|                                                                       |
| \"startDate\": \"2025-03-01\",                                        |
|                                                                       |
| \"message\": \"This is my market rate.\",                             |
|                                                                       |
| \"expiresAt\": \"2025-02-14T10:00:00.000Z\",                          |
|                                                                       |
| \"createdAt\": \"2025-01-31T10:00:00.000Z\",                          |
|                                                                       |
| \"updatedAt\": \"2025-01-31T10:00:00.000Z\"                           |
|                                                                       |
| },                                                                    |
|                                                                       |
| \"rateWarning\": true // 120 \> 90 \* 1.25                            |
|                                                                       |
| }                                                                     |
|                                                                       |
| // POST /v1/offers/\.../counter-offers --- Talent asks \$110 on a     |
| \$90 offer                                                            |
|                                                                       |
| // (110 \< 90 \* 1.25 = 112.5, NOT triggered)                         |
|                                                                       |
| {                                                                     |
|                                                                       |
| \"counterOffer\": { \... \"rate\": 110 \... },                        |
|                                                                       |
| \"rateWarning\": false // 110 \<= 112.5, no warning                   |
|                                                                       |
| }                                                                     |
+-----------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| GET /v1/offers/:id does NOT include rateWarning in the response.      |
|                                                                       |
| The rateWarning is only meaningful at write time when a CO is         |
| submitted or edited.                                                  |
|                                                                       |
| On GET, the frontend gets the rateWarning from the Ably offer.updated |
| event payload                                                         |
|                                                                       |
| which includes rateWarning in its data field.                         |
|                                                                       |
| If the frontend needs rateWarning on initial page load (before any    |
| Ably event),                                                          |
|                                                                       |
| it should compute it client-side using the same formula:              |
|                                                                       |
| talent CO: counterOffer.rate \> offer.rate \* 1.25                    |
|                                                                       |
| client CO: counterOffer.rate \< offer.rate \* 0.80                    |
+-----------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| **Step 4 Threshold Examples --- All Edge Cases**                      |
|                                                                       |
| Every scenario with the expected rateWarning result                   |
+-----------------------------------------------------------------------+

  -------------- --------------- ---------------- ------------ --------------------- ------------
  **Scenario**   **Submitter**   **parentRate**   **coRate**   **Formula**           **Result**

  Talent asks    **TALENT**      \$90             \$120        120 \> 90 × 1.25 =    **WARN**
  \>25% above                                                  112.5 → YES           

  Talent at      **TALENT**      \$100            \$125        125 \> 100 × 1.25 =   **no warn**
  EXACTLY 125%                                                 125.0 → NO (not       
                                                               strict \>)            

  Talent asks 1  **TALENT**      \$100            \$126        126 \> 100 × 1.25 =   **WARN**
  above limit                                                  125.0 → YES           

  Talent asks 1  **TALENT**      \$100            \$124        124 \> 125.0 → NO     **no warn**
  below limit                                                                        

  Talent asks    **TALENT**      \$100            \$85         85 \> 125.0 → NO      **no warn**
  below offer                                                  (talent conceding)    

  Talent asks    **TALENT**      \$95             \$95         95 \> 118.75 → NO     **no warn**
  same as offer                                                                      

  Non-integer    **TALENT**      \$95             \$120        120 \> 95 × 1.25 =    **WARN**
  parent rate                                                  118.75 → YES          

  Non-integer    **TALENT**      \$95             \$118        118 \> 118.75 → NO    **no warn**
  parent rate 2                                                                      

  Client offers  **CLIENT**      \$100            \$79         79 \< 100 × 0.80 =    **WARN**
  \>20% below                                                  80.0 → YES            

  Client at      **CLIENT**      \$100            \$80         80 \< 100 × 0.80 =    **no warn**
  EXACTLY 80%                                                  80.0 → NO (not strict 
                                                               \<)                   

  Client 1 below **CLIENT**      \$100            \$79         79 \< 80.0 → YES      **WARN**
  limit                                                                              

  Client 1 above **CLIENT**      \$100            \$81         81 \< 80.0 → NO       **no warn**
  limit                                                                              

  Client offers  **CLIENT**      \$100            \$110        110 \< 80.0 → NO      **no warn**
  above offer                                                  (client increasing)   

  Non-integer    **CLIENT**      \$95             \$75         75 \< 95 × 0.80 =     **WARN**
  client case                                                  76.0 → YES            

  Non-integer    **CLIENT**      \$95             \$77         77 \< 76.0 → NO       **no warn**
  client 2                                                                           
  -------------- --------------- ---------------- ------------ --------------------- ------------

+-----------------------------------------------------------------------+
| The non-integer cases (e.g. 95 \* 1.25 = 118.75) are important.       |
|                                                                       |
| Since rates are always integers, the effective threshold is the       |
| ceiling of parentRate \* 1.25.                                        |
|                                                                       |
| For parentRate = 95: threshold is 118.75, so coRate must be \>= 119   |
| to trigger the warning.                                               |
|                                                                       |
| The formula itself (coRate \> parentRate \* 1.25) handles this        |
| correctly without rounding.                                           |
+-----------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| **Step 5 rateWarning in All Event Payloads**                          |
|                                                                       |
| Where rateWarning appears in RabbitMQ and Ably events                 |
+-----------------------------------------------------------------------+

**In offer.countered (RabbitMQ event)**

rateWarning is included in the offer.countered event payload.
notification-service and messaging-service receive this event and can
use the flag to customise notification content.

+-----------------------------------------------------------------------+
| // offer.countered payload (from OS-20):                              |
|                                                                       |
| {                                                                     |
|                                                                       |
| \"eventId\": \"uuid\",                                                |
|                                                                       |
| \"eventType\": \"offer.countered\",                                   |
|                                                                       |
| \"schemaVersion\": \"1\",                                             |
|                                                                       |
| \"occurredAt\": \"2025-01-31T10:00:00.000Z\",                         |
|                                                                       |
| \"actor\": \"TALENT\",                                                |
|                                                                       |
| \"actorId\": \"uuid\",                                                |
|                                                                       |
| \"offerId\": \"uuid\",                                                |
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
| \"counterOfferId\": \"uuid\",                                         |
|                                                                       |
| \"submittedBy\": \"TALENT\",                                          |
|                                                                       |
| \"submittedById\": \"uuid\",                                          |
|                                                                       |
| \"parentOfferTerms\": { \"rate\": 90, \"currencyCode\": \"USD\", \... |
| },                                                                    |
|                                                                       |
| \"counterOfferTerms\":{ \"rate\": 120, \"currencyCode\": \"USD\",     |
| \... },                                                               |
|                                                                       |
| \"rateWarning\": true, // \<\-- included here                         |
|                                                                       |
| \"counterExpiresAt\": \"2025-02-14T10:00:00.000Z\"                    |
|                                                                       |
| }                                                                     |
|                                                                       |
| // offer.counter_edited payload also includes rateWarning:            |
|                                                                       |
| {                                                                     |
|                                                                       |
| \"eventType\": \"offer.counter_edited\",                              |
|                                                                       |
| \"counterOfferTerms\": { \"rate\": 115, \... },                       |
|                                                                       |
| \"previousTerms\": { \"rate\": 120, \... },                           |
|                                                                       |
| \"rateWarning\": true, // recomputed against parentOfferTerms.rate    |
|                                                                       |
| \...                                                                  |
|                                                                       |
| }                                                                     |
|                                                                       |
| // NOTE: rateWarning is NOT in offer.counter_accepted,                |
| offer.counter_declined,                                               |
|                                                                       |
| // offer.counter_withdrawn, or offer.counter_expired.                 |
|                                                                       |
| // Once the CO is resolved, the warning is no longer relevant.        |
+-----------------------------------------------------------------------+

**In Ably offer.updated event**

When offer.updated is published via Ably, the rateWarning field is
included in the data payload. The frontend uses this to decide whether
to show the warning banner on the counter offer card.

+-----------------------------------------------------------------------+
| // Ably offer.updated data payload (from OS-23):                      |
|                                                                       |
| {                                                                     |
|                                                                       |
| \"offer\": { \"id\": \"\...\", \"status\": \"COUNTERED\", \"rate\":   |
| 90, \... },                                                           |
|                                                                       |
| \"counterOffer\": { \"id\": \"\...\", \"status\": \"PENDING\",        |
| \"rate\": 120, \... },                                                |
|                                                                       |
| \"rateWarning\": true, // \<\-- included here                         |
|                                                                       |
| \"updatedAt\": \"2025-01-31T10:00:00.000Z\"                           |
|                                                                       |
| }                                                                     |
|                                                                       |
| // rateWarning = false when:                                          |
|                                                                       |
| // - No active counter offer (counterOffer is null)                   |
|                                                                       |
| // - CO rate is within the expected range                             |
|                                                                       |
| // - Offer just accepted or declined (CO resolved)                    |
+-----------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| **Step 6 Frontend Rendering Rules**                                   |
|                                                                       |
| How the warning banner is displayed --- contract for the frontend     |
+-----------------------------------------------------------------------+

The frontend receives rateWarning in two places: the API response
(POST/PATCH) and the Ably offer.updated event. On initial modal load
(before any Ably event), the frontend computes rateWarning client-side
from the loaded offer and counter offer data. This section defines the
exact frontend contract.

+-----------------------------------------------------------------------+
| // TypeScript helper for client-side rateWarning computation:         |
|                                                                       |
| // Called on initial offer load and whenever offer/counterOffer state |
| changes.                                                              |
|                                                                       |
| import type { Offer, CounterOffer, PartyRole } from                   |
| \'../types/offer.types\';                                             |
|                                                                       |
| /\*\*                                                                 |
|                                                                       |
| \* computeRateWarning()                                               |
|                                                                       |
| \*                                                                    |
|                                                                       |
| \* Client-side equivalent of OfferStateMachine.computeRateWarning().  |
|                                                                       |
| \* Used to compute the warning on initial page load before any Ably   |
| event.                                                                |
|                                                                       |
| \*                                                                    |
|                                                                       |
| \* Must produce identical results to the server-side function.        |
|                                                                       |
| \*/                                                                   |
|                                                                       |
| export function computeRateWarning(                                   |
|                                                                       |
| offer: Offer,                                                         |
|                                                                       |
| counterOffer: CounterOffer \| null,                                   |
|                                                                       |
| ): boolean {                                                          |
|                                                                       |
| if (!counterOffer \|\| counterOffer.status !== \'PENDING\') return    |
| false;                                                                |
|                                                                       |
| if (counterOffer.submittedBy === \'TALENT\') {                        |
|                                                                       |
| return counterOffer.rate \> offer.rate \* 1.25;                       |
|                                                                       |
| } else {                                                              |
|                                                                       |
| return counterOffer.rate \< offer.rate \* 0.80;                       |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
|                                                                       |
| // ============================================================       |
|                                                                       |
| // UI rendering rules:                                                |
|                                                                       |
| // ============================================================       |
|                                                                       |
| // Show the rate warning banner when:                                 |
|                                                                       |
| // offer.status === \'COUNTERED\'                                     |
|                                                                       |
| // && counterOffer?.status === \'PENDING\'                            |
|                                                                       |
| // && rateWarning === true                                            |
|                                                                       |
| // Warning banner text by role and direction:                         |
|                                                                       |
| // Viewing as CLIENT (talent submitted high CO):                      |
|                                                                       |
| // \"The proposed rate of \$120/hr is more than 25% above your offer  |
| of \$90/hr.\"                                                         |
|                                                                       |
| // Viewing as TALENT (client submitted low CO):                       |
|                                                                       |
| // \"The proposed rate of \$75/hr is more than 20% below the offer    |
| rate of \$95/hr.\"                                                    |
|                                                                       |
| // The banner is INFORMATIONAL only. No action buttons are blocked.   |
|                                                                       |
| // Both parties can still accept, decline, or submit another CO.      |
|                                                                       |
| // Example React component:                                           |
|                                                                       |
| // {offer.status === \'COUNTERED\' && counterOffer && rateWarning &&  |
| (                                                                     |
|                                                                       |
| // \<RateWarningBanner                                                |
|                                                                       |
| // submittedBy={counterOffer.submittedBy}                             |
|                                                                       |
| // coRate={counterOffer.rate}                                         |
|                                                                       |
| // parentRate={offer.rate}                                            |
|                                                                       |
| // currencyCode={offer.currencyCode}                                  |
|                                                                       |
| // /\>                                                                |
|                                                                       |
| // )}                                                                 |
|                                                                       |
| // ============================================================       |
|                                                                       |
| // Hook integration --- rateWarning in useAblyOffer:                  |
|                                                                       |
| // ============================================================       |
|                                                                       |
| // The useAblyOffer hook already exposes rateWarning from state:      |
|                                                                       |
| // const { offer, counterOffer, rateWarning, isConnected } =          |
| useAblyOffer({\...});                                                 |
|                                                                       |
| // On initial load: use client-side computeRateWarning(offer,         |
| counterOffer)                                                         |
|                                                                       |
| // until the first Ably event arrives with the authoritative server   |
| value.                                                                |
|                                                                       |
| // In OfferModal:                                                     |
|                                                                       |
| // const { offer, counterOffer, rateWarning } = useAblyOffer({        |
| offerId, \... });                                                     |
|                                                                       |
| // const effectiveRateWarning = rateWarning ??                        |
| computeRateWarning(offer, counterOffer);                              |
+-----------------------------------------------------------------------+

**Unit tests for computeRateWarning()**

  -----------------------------------------------------------------------
  **FILE: apps/offer-service/src/offers/offer-state-machine.spec.ts ---
  rate warning tests**

  -----------------------------------------------------------------------

+-----------------------------------------------------------------------+
| import { OfferStateMachine } from \'./offer-state-machine\';          |
|                                                                       |
| describe(\'OfferStateMachine.computeRateWarning()\', () =\> {         |
|                                                                       |
| describe(\'Talent counter offers\', () =\> {                          |
|                                                                       |
| it(\'returns true when coRate \> parentRate \* 1.25\', () =\> {       |
|                                                                       |
| expect(OfferStateMachine.computeRateWarning(100, 126,                 |
| \'TALENT\')).toBe(true);                                              |
|                                                                       |
| });                                                                   |
|                                                                       |
| it(\'returns false when coRate = parentRate \* 1.25 exactly (strict   |
| \>)\', () =\> {                                                       |
|                                                                       |
| expect(OfferStateMachine.computeRateWarning(100, 125,                 |
| \'TALENT\')).toBe(false);                                             |
|                                                                       |
| });                                                                   |
|                                                                       |
| it(\'returns false when coRate \< parentRate \* 1.25\', () =\> {      |
|                                                                       |
| expect(OfferStateMachine.computeRateWarning(100, 124,                 |
| \'TALENT\')).toBe(false);                                             |
|                                                                       |
| });                                                                   |
|                                                                       |
| it(\'handles non-integer threshold (95 \* 1.25 = 118.75)\', () =\> {  |
|                                                                       |
| expect(OfferStateMachine.computeRateWarning(95, 119,                  |
| \'TALENT\')).toBe(true);                                              |
|                                                                       |
| expect(OfferStateMachine.computeRateWarning(95, 118,                  |
| \'TALENT\')).toBe(false);                                             |
|                                                                       |
| });                                                                   |
|                                                                       |
| it(\'returns false when talent rate is below offer (conceding)\', ()  |
| =\> {                                                                 |
|                                                                       |
| expect(OfferStateMachine.computeRateWarning(100, 80,                  |
| \'TALENT\')).toBe(false);                                             |
|                                                                       |
| });                                                                   |
|                                                                       |
| });                                                                   |
|                                                                       |
| describe(\'Client counter offers\', () =\> {                          |
|                                                                       |
| it(\'returns true when coRate \< parentRate \* 0.80\', () =\> {       |
|                                                                       |
| expect(OfferStateMachine.computeRateWarning(100, 79,                  |
| \'CLIENT\')).toBe(true);                                              |
|                                                                       |
| });                                                                   |
|                                                                       |
| it(\'returns false when coRate = parentRate \* 0.80 exactly (strict   |
| \<)\', () =\> {                                                       |
|                                                                       |
| expect(OfferStateMachine.computeRateWarning(100, 80,                  |
| \'CLIENT\')).toBe(false);                                             |
|                                                                       |
| });                                                                   |
|                                                                       |
| it(\'returns false when coRate \> parentRate \* 0.80\', () =\> {      |
|                                                                       |
| expect(OfferStateMachine.computeRateWarning(100, 81,                  |
| \'CLIENT\')).toBe(false);                                             |
|                                                                       |
| });                                                                   |
|                                                                       |
| it(\'handles non-integer threshold (95 \* 0.80 = 76.0)\', () =\> {    |
|                                                                       |
| expect(OfferStateMachine.computeRateWarning(95, 75,                   |
| \'CLIENT\')).toBe(true);                                              |
|                                                                       |
| expect(OfferStateMachine.computeRateWarning(95, 76,                   |
| \'CLIENT\')).toBe(false);                                             |
|                                                                       |
| });                                                                   |
|                                                                       |
| it(\'returns false when client rate is above offer (increasing)\', () |
| =\> {                                                                 |
|                                                                       |
| expect(OfferStateMachine.computeRateWarning(100, 110,                 |
| \'CLIENT\')).toBe(false);                                             |
|                                                                       |
| });                                                                   |
|                                                                       |
| });                                                                   |
|                                                                       |
| });                                                                   |
|                                                                       |
| // Run tests:                                                         |
|                                                                       |
| npm run test \--workspace=apps/offer-service \--                      |
| \--testPathPattern=offer-state-machine                                |
|                                                                       |
| \# Expected: all 10 tests pass                                        |
+-----------------------------------------------------------------------+
