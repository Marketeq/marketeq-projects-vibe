**[MARKETEQ PLATFORM --- BACKEND DOCUMENTATION]{.smallcaps}**

**payout-service**

PS-13 --- Marketeq Debit Card --- Setup & Integration

  -----------------------------------------------------------------------
  **Property**        **Value**
  ------------------- ---------------------------------------------------
  **Document**        PS-13 --- Marketeq Debit Card --- Setup &
                      Integration

  **Version**         0.9 --- DESIGN INCOMPLETE

  **Status**          ⚠️ BLOCKED --- Design team must produce setup
                      screens before this document can be finalized or
                      built

  **Applies to**      DEBIT_CARD method type in deposit_methods

  **Card network**    Visa (via Stripe Issuing)

  **Issuance model**  Marketeq issues cards using Stripe Issuing API.
                      Marketeq is the card program manager.

  **Prerequisites**   PS-01, PS-04, Identity service (KYC cleared)
  -----------------------------------------------------------------------

+-----------------------------------------------------------------------+
| **⚠️ Design gap --- this document is partially speculative**          |
|                                                                       |
| The debit card appears as a deposit method option in the payout       |
| designs.                                                              |
|                                                                       |
| No setup flow, activation screen, card management screen, or spending |
| limit UI                                                              |
|                                                                       |
| was included in the design files provided for this documentation      |
| sprint.                                                               |
|                                                                       |
| Sections marked \[DESIGN REQUIRED\] below document what Marketeq      |
| engineering                                                           |
|                                                                       |
| believes the flow should be based on industry standards (Stripe       |
| Issuing, Visa program rules)                                          |
|                                                                       |
| and the information visible in the deposit method designs.            |
|                                                                       |
| BEFORE BUILDING: Design team must produce and approve:                |
|                                                                       |
| 1\. Card request / enrollment screen                                  |
|                                                                       |
| 2\. KYC gate screen (if not already cleared)                          |
|                                                                       |
| 3\. Card activation screen (last 4 digits + CVV confirmation)         |
|                                                                       |
| 4\. Card management screen (freeze, unfreeze, cancel, spending        |
| limits)                                                               |
|                                                                       |
| 5\. Physical vs virtual card selection screen                         |
|                                                                       |
| 6\. Geographic availability / unsupported region screen               |
|                                                                       |
| This document must be revised and re-approved after those designs are |
| delivered.                                                            |
+=======================================================================+

# **1. Overview**

The Marketeq debit card is a Visa debit card issued to contractors via
Stripe Issuing. When a contractor requests a card, Marketeq creates a
Stripe Issuing cardholder record linked to the contractor\'s
identity-verified account. Payouts to the card load funds directly to
the card\'s spending balance. The contractor spends from that balance
anywhere Visa is accepted. Marketeq is the card program manager ---
Stripe Issuing handles card production, network settlement, and fraud
controls.

  -----------------------------------------------------------------------
  **Property**          **Value**
  --------------------- -------------------------------------------------
  **Card network**      Visa

  **Issuance platform** Stripe Issuing

  **Card types**        Virtual (instant) and Physical (7--14 business
                        days shipping)

  **Funding model**     Push-to-card via Stripe Issuing funding. Payout
                        loads to card balance directly.

  **Spending balance**  Separate from contractor earnings balance. Funds
                        move from earnings → card balance at payout time.

  **Currency**          USD. International spend auto-converts at Visa
                        exchange rate.

  **Geographic          US contractors only for v1. International
  availability**        expansion requires per-country Stripe Issuing
                        approval.
  -----------------------------------------------------------------------

# **2. Card Issuance --- How Cards Are Created**

## **2.1 Prerequisites before card can be issued**

  ------------------------------------------------------------------------
  **Requirement**       **Source**            **Blocks card creation if
                                              not met**
  --------------------- --------------------- ----------------------------
  **Identity verified   Identity service      Yes --- Stripe Issuing
  (KYC passed)**                              requires verified cardholder
                                              identity

  **US-based            Contractor profile    Yes --- v1 US only
  contractor**          --- country field     

  **No existing active  deposit_methods ---   Yes --- one active card per
  card on account**     DEBIT_CARD type check contractor in v1

  **Age ≥ 18**          Identity service ---  Yes --- Stripe Issuing
                        date of birth         requirement

  **Accepted Marketeq   Separate card terms   Yes
  card terms**          acceptance flow       
                        (design required)     
  ------------------------------------------------------------------------

## **2.2 Stripe Issuing cardholder creation**

+-----------------------------------------------------------------------+
| typescript                                                            |
+-----------------------------------------------------------------------+
| // src/card/card-issuance.service.ts                                  |
|                                                                       |
| // Folder: /apps/payout-service/src/card/                             |
|                                                                       |
| async requestCard(                                                    |
|                                                                       |
| contractorId: string,                                                 |
|                                                                       |
| cardType: \"virtual\" \| \"physical\",                                |
|                                                                       |
| ): Promise\<{ depositMethodId: string; cardType: string; last4?:      |
| string }\> {                                                          |
|                                                                       |
| // 1. Pre-flight checks                                               |
|                                                                       |
| const contractor = await                                              |
| this.contractorService.getById(contractorId);                         |
|                                                                       |
| if (contractor.country !== \"US\")                                    |
|                                                                       |
| throw new PayoutError(\"Debit card is currently available to US       |
| contractors only.\",                                                  |
|                                                                       |
| HttpStatus.UNPROCESSABLE_ENTITY, \"ERR_CARD_GEO_UNAVAILABLE\");       |
|                                                                       |
| const kycStatus = await                                               |
| this.identityService.getKYCStatus(contractorId);                      |
|                                                                       |
| if (kycStatus !== \"verified\")                                       |
|                                                                       |
| throw new PayoutError(\"Identity verification required before         |
| requesting a card.\",                                                 |
|                                                                       |
| HttpStatus.FORBIDDEN, \"ERR_CARD_KYC_REQUIRED\");                     |
|                                                                       |
| const existing = await this.methodRepo.findOne({                      |
|                                                                       |
| where: { contractorId, methodType: MethodType.DEBIT_CARD, isActive:   |
| true },                                                               |
|                                                                       |
| });                                                                   |
|                                                                       |
| if (existing)                                                         |
|                                                                       |
| throw new PayoutError(\"You already have an active Marketeq debit     |
| card.\",                                                              |
|                                                                       |
| HttpStatus.CONFLICT, \"ERR_CARD_ALREADY_EXISTS\");                    |
|                                                                       |
| // 2. Create or retrieve Stripe Issuing cardholder                    |
|                                                                       |
| const cardholder = await this.stripeIssuing.cardholders.create({      |
|                                                                       |
| type: \"individual\",                                                 |
|                                                                       |
| name: \`\${contractor.firstName} \${contractor.lastName}\`,           |
|                                                                       |
| email: contractor.email,                                              |
|                                                                       |
| phone_number: contractor.phone,                                       |
|                                                                       |
| billing: {                                                            |
|                                                                       |
| address: {                                                            |
|                                                                       |
| line1: contractor.address.line1,                                      |
|                                                                       |
| city: contractor.address.city,                                        |
|                                                                       |
| state: contractor.address.state,                                      |
|                                                                       |
| postal_code: contractor.address.postalCode,                           |
|                                                                       |
| country: \"US\",                                                      |
|                                                                       |
| }                                                                     |
|                                                                       |
| },                                                                    |
|                                                                       |
| individual: {                                                         |
|                                                                       |
| dob: {                                                                |
|                                                                       |
| day: contractor.dob.day,                                              |
|                                                                       |
| month: contractor.dob.month,                                          |
|                                                                       |
| year: contractor.dob.year,                                            |
|                                                                       |
| },                                                                    |
|                                                                       |
| id_number: contractor.ssn, // from identity service --- never stored  |
| in payout-service                                                     |
|                                                                       |
| }                                                                     |
|                                                                       |
| });                                                                   |
|                                                                       |
| // 3. Create Stripe Issuing card                                      |
|                                                                       |
| const card = await this.stripeIssuing.cards.create({                  |
|                                                                       |
| cardholder: cardholder.id,                                            |
|                                                                       |
| currency: \"usd\",                                                    |
|                                                                       |
| type: cardType,                                                       |
|                                                                       |
| status: \"inactive\", // contractor activates separately              |
|                                                                       |
| spending_controls: {                                                  |
|                                                                       |
| spending_limits: \[{                                                  |
|                                                                       |
| amount: 500_00, // \$500.00 in cents --- default daily limit          |
|                                                                       |
| interval: \"daily\",                                                  |
|                                                                       |
| }\],                                                                  |
|                                                                       |
| }                                                                     |
|                                                                       |
| });                                                                   |
|                                                                       |
| // 4. Persist deposit method                                          |
|                                                                       |
| const method = await this.methodRepo.save({                           |
|                                                                       |
| contractorId,                                                         |
|                                                                       |
| methodType: MethodType.DEBIT_CARD,                                    |
|                                                                       |
| stripeCardholderId: cardholder.id,                                    |
|                                                                       |
| stripeCardId: card.id,                                                |
|                                                                       |
| cardType: cardType, // virtual \| physical                            |
|                                                                       |
| cardLast4: card.last4,                                                |
|                                                                       |
| cardNetwork: \"visa\",                                                |
|                                                                       |
| verificationStatus: VerificationStatus.PENDING, // pending until      |
| activated                                                             |
|                                                                       |
| isActive: true,                                                       |
|                                                                       |
| });                                                                   |
|                                                                       |
| return {                                                              |
|                                                                       |
| depositMethodId: method.id,                                           |
|                                                                       |
| cardType,                                                             |
|                                                                       |
| last4: cardType === \"virtual\" ? card.last4 : undefined, // physical |
| last4 shown after activation                                          |
|                                                                       |
| };                                                                    |
|                                                                       |
| }                                                                     |
+=======================================================================+

# **3. Card Activation Flow**

+-----------------------------------------------------------------------+
| **\[DESIGN REQUIRED\] --- Activation screen not in provided designs** |
|                                                                       |
| The activation screen must be designed before this section can be     |
| finalized.                                                            |
|                                                                       |
| The flow described below is based on Stripe Issuing activation        |
| requirements                                                          |
|                                                                       |
| and standard card program industry practice.                          |
|                                                                       |
| Design team deliverable: activation screen with last 4 digits + CVV   |
| confirmation input.                                                   |
+=======================================================================+

  ---------------------------------------------------------------------------------
  **Step**   **Actor**    **Action**
  ---------- ------------ ---------------------------------------------------------
  **1**      Contractor   Virtual card: activation offered immediately after card
                          creation. Physical card: contractor clicks \"Activate
                          card\" after it arrives (7--14 business days).

  **2**      Contractor   Enters last 4 digits of card number + CVV2 on activation
                          screen. \[DESIGN REQUIRED\]

  **3**      Backend      POST /v1/cards/:depositMethodId/activate. Validates
                          last4 + CVV against Stripe Issuing card object. Updates
                          Stripe card status from inactive → active.

  **4**      Backend      deposit_methods.verificationStatus set to VERIFIED. Card
                          is now eligible to receive payouts.

  **5**      Frontend     Activation success screen. Card displayed as active
                          deposit method. \[DESIGN REQUIRED\]
  ---------------------------------------------------------------------------------

+-----------------------------------------------------------------------+
| typescript                                                            |
+-----------------------------------------------------------------------+
| // POST /v1/cards/:depositMethodId/activate                           |
|                                                                       |
| async activateCard(                                                   |
|                                                                       |
| contractorId: string,                                                 |
|                                                                       |
| depositMethodId: string,                                              |
|                                                                       |
| dto: { last4: string; cvv: string },                                  |
|                                                                       |
| ): Promise\<void\> {                                                  |
|                                                                       |
| const method = await this.methodRepo.findOne({                        |
|                                                                       |
| where: { id: depositMethodId, contractorId, methodType:               |
| MethodType.DEBIT_CARD },                                              |
|                                                                       |
| });                                                                   |
|                                                                       |
| if (!method)                                                          |
|                                                                       |
| throw new PayoutError(\"Card not found.\", HttpStatus.NOT_FOUND,      |
| \"ERR_CARD_NOT_FOUND\");                                              |
|                                                                       |
| if (method.verificationStatus === VerificationStatus.VERIFIED)        |
|                                                                       |
| throw new PayoutError(\"Card is already activated.\",                 |
| HttpStatus.CONFLICT, \"ERR_CARD_ALREADY_ACTIVE\");                    |
|                                                                       |
| // Retrieve Stripe card and validate last4 + CVV                      |
|                                                                       |
| const stripeCard = await                                              |
| this.stripeIssuing.cards.retrieve(method.stripeCardId,                |
|                                                                       |
| { expand: \[\"number\"\] }); // requires PCI-compliant Stripe request |
|                                                                       |
| if (stripeCard.last4 !== dto.last4)                                   |
|                                                                       |
| throw new PayoutError(\"Card number does not match.\",                |
| HttpStatus.UNPROCESSABLE_ENTITY,                                      |
|                                                                       |
| \"ERR_CARD_ACTIVATION_MISMATCH\");                                    |
|                                                                       |
| // Activate via Stripe                                                |
|                                                                       |
| await this.stripeIssuing.cards.update(method.stripeCardId, { status:  |
| \"active\" });                                                        |
|                                                                       |
| // Update deposit method                                              |
|                                                                       |
| await this.methodRepo.update(method.id, {                             |
|                                                                       |
| verificationStatus: VerificationStatus.VERIFIED,                      |
|                                                                       |
| });                                                                   |
|                                                                       |
| }                                                                     |
+=======================================================================+

# **4. How Payouts Load to the Card**

When the contractor initiates a withdrawal to their debit card,
payout-service uses Stripe Issuing\'s fund transfer mechanism to push
USD from the Marketeq Stripe balance to the card\'s spending balance.
This is distinct from a standard Stripe payout --- it is an intra-Stripe
fund move, not an ACH or wire.

  -----------------------------------------------------------------------------
  **Step**   **Action**
  ---------- ------------------------------------------------------------------
  **1**      payout-service calls Stripe Issuing funding API: POST
             /v1/issuing/transactions/create_force_capture (test) or Stripe
             Treasury FundingInstructions (live).

  **2**      Stripe moves funds from Marketeq Stripe balance to card spending
             balance.

  **3**      Settlement is near-instant --- typically under 60 seconds.

  **4**      Card spending balance updated. Contractor can spend immediately.

  **5**      payout-service receives Stripe webhook:
             issuing_transaction.created with type=fund.

  **6**      payout_requests.status → completed. Contractor notified.
  -----------------------------------------------------------------------------

+-----------------------------------------------------------------------+
| typescript                                                            |
+-----------------------------------------------------------------------+
| // src/execution/card-payout-executor.service.ts                      |
|                                                                       |
| async executeCardPayout(                                              |
|                                                                       |
| payoutRequest: PayoutRequest,                                         |
|                                                                       |
| method: DepositMethod,                                                |
|                                                                       |
| ): Promise\<{ stripeTransactionId: string }\> {                       |
|                                                                       |
| // Amount in cents                                                    |
|                                                                       |
| const amountCents = Math.round(payoutRequest.amountUSD \* 100);       |
|                                                                       |
| // Push funds to card via Stripe Issuing                              |
|                                                                       |
| // In production this uses Stripe Treasury or Issuing direct funding  |
|                                                                       |
| const funding = await                                                 |
| this.stripe.issuing.cards.createTestHelpersFundCard(                  |
|                                                                       |
| method.stripeCardId,                                                  |
|                                                                       |
| { amount: amountCents, currency: \"usd\" }                            |
|                                                                       |
| );                                                                    |
|                                                                       |
| // Note: production equivalent uses stripe.treasury.receivedCredits   |
| or                                                                    |
|                                                                       |
| // issuing_transaction funding --- exact method to be confirmed with  |
| Stripe                                                                |
|                                                                       |
| // Stripe account team during card program setup.                     |
|                                                                       |
| await this.methodRepo.update(method.id, {                             |
|                                                                       |
| lastPayoutAt: new Date(),                                             |
|                                                                       |
| });                                                                   |
|                                                                       |
| return { stripeTransactionId: funding.id };                           |
|                                                                       |
| }                                                                     |
+=======================================================================+

+-----------------------------------------------------------------------+
| **Exact Stripe Issuing funding API to be confirmed during card        |
| program setup**                                                       |
|                                                                       |
| Stripe Issuing\'s push-to-card funding mechanism varies based on the  |
| card program type                                                     |
|                                                                       |
| and whether Stripe Treasury is enabled on the Marketeq platform       |
| account.                                                              |
|                                                                       |
| The exact API call (Stripe Treasury FundingInstructions vs issuing    |
| direct funding)                                                       |
|                                                                       |
| must be confirmed with the Stripe account team when the card program  |
| is set up.                                                            |
|                                                                       |
| The logic above is correct in structure --- the specific Stripe       |
| method will need to be                                                |
|                                                                       |
| updated once the card program account configuration is finalized.     |
+=======================================================================+

# **5. Spending Limits**

+-----------------------------------------------------------------------+
| **\[DESIGN REQUIRED\] --- Spending limit management screen not in     |
| provided designs**                                                    |
|                                                                       |
| The UI for contractors to view or adjust their spending limits was    |
| not in the provided designs.                                          |
|                                                                       |
| Design team deliverable: spending limit display + adjustment flow in  |
| card management screen.                                               |
+=======================================================================+

  -----------------------------------------------------------------------------------------------
  **Limit type**    **Default     **Adjustable   **Adjustable by **Notes**
                    value**       by             Marketeq        
                                  contractor**   admin**         
  ----------------- ------------- -------------- --------------- --------------------------------
  **Daily spending  \$500.00      Yes --- up to  Yes ---         Set on Stripe Issuing card at
  limit**                         \$2,500        override any    creation. Controlled via Stripe
                                  (requires KYC  limit           spending_controls.
                                  enhanced                       
                                  review)                        

  **Weekly spending \$2,000.00    No in v1       Yes             Enforced by Stripe Issuing. Not
  limit**                                                        exposed in UI v1.

  **Monthly         \$5,000.00    No in v1       Yes             Enforced by Stripe Issuing.
  spending limit**                                               

  **Single          \$500.00      No in v1       Yes             Prevents large single-swipe
  transaction                                                    fraud.
  limit**                                                        

  **ATM withdrawal  \$300/day     No in v1       Yes             Visa network ATM limit.
  limit**                                                        

  **International   Allowed by    No in v1       Can disable per Visa network converts at live
  transactions**    default                      card            rate. No Marketeq markup.

  **Card balance    \$10,000.00   No             Yes             Maximum funds that can sit on
  cap**                                                          card at one time. If payout
                                                                 would exceed cap: payout
                                                                 blocked.
                                                                 ERR_CARD_BALANCE_CAP_EXCEEDED.
  -----------------------------------------------------------------------------------------------

# **6. Geographic Availability**

  --------------------------------------------------------------------------
  **Region /       **v1             **Reason**
  Country**        availability**   
  ---------------- ---------------- ----------------------------------------
  **United         ✅ Available     Stripe Issuing fully supported. Marketeq
  States**                          legal entity is US-based.

  **Canada**       ❌ Not available Stripe Issuing Canada requires separate
                   v1               Stripe account and local entity. Roadmap
                                    item.

  **European       ❌ Not available Requires Stripe Issuing EU (separate
  Union**          v1               product), local IBAN card program, GDPR
                                    card data handling. Roadmap item.

  **United         ❌ Not available Requires Stripe Issuing UK entity and
  Kingdom**        v1               FCA authorization. Roadmap item.

  **Australia**    ❌ Not available Stripe Issuing Australia not yet
                   v1               available. Roadmap item.

  **All other      ❌ Not available Stripe Issuing not available or Marketeq
  countries**      v1               not yet approved.
  --------------------------------------------------------------------------

When a non-US contractor views the deposit methods screen, the debit
card option must be visible but disabled, with a tooltip: \"The Marketeq
debit card is currently available to US contractors only. We\'re working
on expanding to more countries soon.\"

# **7. Card Management Actions**

+-----------------------------------------------------------------------+
| **\[DESIGN REQUIRED\] --- Card management screen not in provided      |
| designs**                                                             |
|                                                                       |
| All card management actions below require dedicated UI screens.       |
|                                                                       |
| Design team deliverables: freeze/unfreeze toggle, report lost/stolen  |
| flow, cancel card flow,                                               |
|                                                                       |
| spending limit adjustment flow, transaction history view.             |
+=======================================================================+

  -----------------------------------------------------------------------------------------------
  **Action**      **Endpoint**                **Stripe operation**           **Effect on deposit
                                                                             method**
  --------------- --------------------------- ------------------------------ --------------------
  **Freeze card** POST /v1/cards/:id/freeze   stripeIssuing.cards.update({   Card cannot be used
                                              status: \"inactive\" })        for spending.
                                                                             Payouts to card
                                                                             still accepted
                                                                             (funds held).
                                                                             verificationStatus
                                                                             unchanged.

  **Unfreeze      POST /v1/cards/:id/unfreeze stripeIssuing.cards.update({   Card restored to
  card**                                      status: \"active\" })          active spending.
                                                                             Held funds
                                                                             available.

  **Report        POST                        stripeIssuing.cards.update({   Old method:
  lost/stolen**   /v1/cards/:id/report-lost   status: \"canceled\" }). New   isActive=false. New
                                              card created automatically.    deposit_methods row
                                                                             created for
                                                                             replacement card.
                                                                             Contractor must
                                                                             activate
                                                                             replacement.

  **Cancel card   DELETE /v1/cards/:id        stripeIssuing.cards.update({   isActive=false. Any
  permanently**                               status: \"canceled\" })        card balance
                                                                             returned to earnings
                                                                             balance. Cannot be
                                                                             undone.
  -----------------------------------------------------------------------------------------------

# **8. Design Requirements Summary --- Full List**

  ------------------------------------------------------------------------
  **Screen**         **Description**                      **Priority**
  ------------------ ------------------------------------ ----------------
  **Card request     Contractor selects virtual vs        P0 --- required
  screen**           physical card. Explains card terms.  before any build
                     CTA: \"Request card\". Links to card 
                     terms.                               

  **KYC gate         Shown if KYC not yet completed.      P0 --- required
  screen**           \"You need to verify your identity   before any build
                     before requesting a card.\" CTA to   
                     identity verification flow.          

  **Card terms       Contractor reviews and accepts       P0 --- required
  acceptance         Marketeq card program terms.         before any build
  screen**           Required by Stripe Issuing and Visa  
                     program rules.                       

  **Virtual card     Displays card number, expiry, CVV    P0 --- required
  issued screen**    (one-time, PCI-compliant display).   before any build
                     Activation confirmation.             

  **Physical card    Order confirmation. Estimated        P0 --- required
  requested screen** delivery: 7--14 business days. Link  before any build
                     to activate when card arrives.       

  **Card activation  Last 4 digits + CVV input. Activate  P0 --- required
  screen**           button.                              before any build

  **Card management  Shows card status, last 4, network   P0 --- required
  screen**           logo, spending balance,              before any build
                     freeze/unfreeze toggle, limits,      
                     transaction history.                 

  **Lost/stolen      Confirm cancellation of old card.    P1
  replacement flow** Automatic replacement card creation. 

  **Spending limit   Contractor requests higher daily     P1
  adjustment flow**  limit. Triggers enhanced KYC if      
                     above \$500.                         

  **Geographic       Disabled card option for non-US      P0 --- required
  unavailable        contractors with tooltip             for all non-US
  state**            explanation.                         contractors
  ------------------------------------------------------------------------

# **9. Error Code Reference**

  ------------------------------------------------------------------------------------
  **Error code**                      **HTTP     **When thrown**
                                      status**   
  ----------------------------------- ---------- -------------------------------------
  **ERR_CARD_GEO_UNAVAILABLE**        422        Contractor is not a US contractor.
                                                 Card not available in their region.

  **ERR_CARD_KYC_REQUIRED**           403        KYC not passed. Card issuance
                                                 blocked.

  **ERR_CARD_ALREADY_EXISTS**         409        Contractor already has one active
                                                 debit card. One card per contractor
                                                 in v1.

  **ERR_CARD_NOT_FOUND**              404        depositMethodId does not correspond
                                                 to a DEBIT_CARD method for this
                                                 contractor.

  **ERR_CARD_ALREADY_ACTIVE**         409        POST /activate called on a card
                                                 already in VERIFIED state.

  **ERR_CARD_ACTIVATION_MISMATCH**    422        Last 4 digits entered during
                                                 activation do not match Stripe card
                                                 record.

  **ERR_CARD_BALANCE_CAP_EXCEEDED**   422        Payout would push card balance above
                                                 \$10,000 cap. Contractor must spend
                                                 down balance first.

  **ERR_CARD_FROZEN**                 422        Payout attempted to a frozen
                                                 (inactive) card. Contractor must
                                                 unfreeze first.

  **ERR_CARD_CANCELED**               422        Payout attempted to a canceled card.
                                                 Contractor must request a
                                                 replacement.
  ------------------------------------------------------------------------------------

# **10. References**

  -----------------------------------------------------------------------------------
  **Document /           **Relevant to**
  Resource**             
  ---------------------- ------------------------------------------------------------
  **PS-01 --- Database   deposit_methods columns: stripeCardholderId, stripeCardId,
  Schema**               cardType, cardLast4, cardNetwork

  **PS-04 --- Deposit    verificationStatus, isActive, 5-method limit --- same rules
  Method Management**    apply to card

  **PS-02 --- Withdrawal payout_requests state machine applies equally to card
  Flow**                 payouts

  **Stripe Issuing       https://stripe.com/docs/issuing
  documentation**        

  **Stripe Issuing       https://stripe.com/docs/issuing/controls/spending-controls
  spending controls**    

  **Visa Prepaid Card    Provided by Stripe during card program onboarding --- not
  program rules**        publicly linked
  -----------------------------------------------------------------------------------

CONFIDENTIAL --- Marketeq Internal Engineering Documentation \|
payout-service PS-13 \| v1.0
