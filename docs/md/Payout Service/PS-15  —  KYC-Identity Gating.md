**[MARKETEQ PLATFORM --- BACKEND DOCUMENTATION]{.smallcaps}**

**payout-service**

PS-15 --- KYC-Identity Gating

  -----------------------------------------------------------------------
  **Property**        **Value**
  ------------------- ---------------------------------------------------
  **Document**        PS-15 --- KYC-Identity Gating

  **Version**         1.0

  **Applies to**      All withdrawal initiations. All deposit method
                      types.

  **KYC tiers**       Tier 1: government ID. Tier 2: tax identity. Tier
                      3: bank account ownership.

  **Gating service**  kyc-identity-service. Called via internal HTTP at
                      withdrawal initiation.

  **First-payout      5 business days. Applied on first-ever payout per
  hold**              contractor regardless of tier.

  **EDD trigger**     \$10,000 single transaction. Enhanced due diligence
                      check before execution.

  **Prerequisites**   PS-02, PS-14, kyc-identity-service
  -----------------------------------------------------------------------

# **1. Overview**

payout-service gates every withdrawal initiation against
kyc-identity-service before creating a payout_requests row. The gate
checks the contractor\'s completion status across three tiers:
government ID verification (Tier 1), tax identity verification (Tier 2),
and bank account ownership verification (Tier 3). Each tier must be
fully verified before the contractor can withdraw. If any tier is
incomplete, payout-service returns a structured gate response to the
frontend --- not a generic error --- so the contractor can be directed
to the exact screen they need to complete. In addition, a 5-business-day
hold applies to the contractor\'s very first payout, and any single
withdrawal of \$10,000 or more triggers enhanced due diligence before
execution.

# **2. KYC Tier Definitions**

  --------------------------------------------------------------------------------------
  **Tier**   **Name**     **What it verifies**   **Who it applies   **Blocking
                                                 to**               behaviour**
  ---------- ------------ ---------------------- ------------------ --------------------
  **Tier 1** Government   Contractor is a real   All contractors    Hard block. No
             ID           person. Name, date of  globally           withdrawals until
                          birth,                                    passed.
                          government-issued                         
                          photo ID.                                 

  **Tier 2** Tax identity Contractor\'s tax      All contractors    Hard block. No
                          filing identity. US                       withdrawals until
                          contractors: SSN or                       passed.
                          ITIN. International                       
                          contractors: W-8BEN                       
                          form (certifies non-US                    
                          status and applicable                     
                          tax treaty).                              

  **Tier 3** Bank account Contractor owns the    Contractors using  Method-scoped block.
             ownership    bank account added as  BANK_STRIPE or     Withdrawal to
                          a deposit method.      BANK_MANUAL        unverified bank
                          Verified via           deposit methods    account blocked.
                          micro-deposits (PS-08) only               Withdrawal to
                          or Stripe Financial                       verified
                          Connections instant                       crypto/PayPal/etc.
                          verification.                             allowed while bank
                                                                    verification is
                                                                    pending.
  --------------------------------------------------------------------------------------

+-----------------------------------------------------------------------+
| **Tier 3 is method-scoped --- not account-scoped**                    |
|                                                                       |
| Tier 1 and Tier 2 are account-level gates: they block ALL withdrawals |
| until cleared.                                                        |
|                                                                       |
| Tier 3 is method-level: it blocks withdrawal to the specific          |
| unverified bank account only.                                         |
|                                                                       |
| A contractor who has not completed Tier 3 for their bank account can  |
| still withdraw                                                        |
|                                                                       |
| to a verified crypto wallet, PayPal, Wise, or Payoneer method.        |
|                                                                       |
| Tier 3 does not block the account --- it blocks the specific method.  |
+=======================================================================+

# **3. KYC Gate Check --- Integration with kyc-identity-service**

## **3.1 Internal endpoint called**

+-----------------------------------------------------------------------+
| typescript                                                            |
+-----------------------------------------------------------------------+
| // Internal HTTP call from payout-service to kyc-identity-service     |
|                                                                       |
| // GET /internal/kyc/gate-status/:contractorId                        |
|                                                                       |
| //                                                                    |
|                                                                       |
| // Request headers:                                                   |
|                                                                       |
| // x-service-name: payout-service                                     |
|                                                                       |
| // x-service-secret: {INTERNAL_SERVICE_SECRET}                        |
|                                                                       |
| //                                                                    |
|                                                                       |
| // Response 200:                                                      |
|                                                                       |
| {                                                                     |
|                                                                       |
| \"contractorId\": \"uuid\",                                           |
|                                                                       |
| \"tier1\": {                                                          |
|                                                                       |
| \"status\": \"verified\" \| \"pending\" \| \"failed\" \|              |
| \"not_started\",                                                      |
|                                                                       |
| \"blocksWithdrawal\": true \| false                                   |
|                                                                       |
| },                                                                    |
|                                                                       |
| \"tier2\": {                                                          |
|                                                                       |
| \"status\": \"verified\" \| \"pending\" \| \"failed\" \|              |
| \"not_started\",                                                      |
|                                                                       |
| \"subType\": \"ssn\" \| \"itin\" \| \"w8ben\" \| null,                |
|                                                                       |
| \"blocksWithdrawal\": true \| false                                   |
|                                                                       |
| },                                                                    |
|                                                                       |
| \"tier3\": {                                                          |
|                                                                       |
| // keyed by depositMethodId --- Tier 3 is method-scoped               |
|                                                                       |
| \"methods\": {                                                        |
|                                                                       |
| \"{depositMethodId}\": {                                              |
|                                                                       |
| \"status\": \"verified\" \| \"pending\" \| \"failed\" \|              |
| \"not_started\",                                                      |
|                                                                       |
| \"blocksWithdrawal\": true \| false                                   |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
|                                                                       |
| },                                                                    |
|                                                                       |
| \"firstPayoutHoldActive\": true \| false,                             |
|                                                                       |
| \"firstPayoutHoldReleasesAt\": \"ISO 8601\" \| null                   |
|                                                                       |
| }                                                                     |
+=======================================================================+

## **3.2 Gate check service**

+-----------------------------------------------------------------------+
| typescript                                                            |
+-----------------------------------------------------------------------+
| // src/kyc/kyc-gate.service.ts                                        |
|                                                                       |
| // Folder: /apps/payout-service/src/kyc/                              |
|                                                                       |
| async checkGate(                                                      |
|                                                                       |
| contractorId: string,                                                 |
|                                                                       |
| depositMethodId: string,                                              |
|                                                                       |
| ): Promise\<KycGateResult\> {                                         |
|                                                                       |
| const gateStatus = await                                              |
| this.kycIdentityClient.getGateStatus(contractorId);                   |
|                                                                       |
| // Tier 1 --- hard account block                                      |
|                                                                       |
| if (gateStatus.tier1.blocksWithdrawal) {                              |
|                                                                       |
| return {                                                              |
|                                                                       |
| allowed: false,                                                       |
|                                                                       |
| blockedBy: \"TIER_1\",                                                |
|                                                                       |
| tier1Status: gateStatus.tier1.status,                                 |
|                                                                       |
| };                                                                    |
|                                                                       |
| }                                                                     |
|                                                                       |
| // Tier 2 --- hard account block                                      |
|                                                                       |
| if (gateStatus.tier2.blocksWithdrawal) {                              |
|                                                                       |
| return {                                                              |
|                                                                       |
| allowed: false,                                                       |
|                                                                       |
| blockedBy: \"TIER_2\",                                                |
|                                                                       |
| tier2Status: gateStatus.tier2.status,                                 |
|                                                                       |
| tier2SubType: gateStatus.tier2.subType,                               |
|                                                                       |
| };                                                                    |
|                                                                       |
| }                                                                     |
|                                                                       |
| // Tier 3 --- method-scoped block                                     |
|                                                                       |
| const methodTier3 = gateStatus.tier3.methods\[depositMethodId\];      |
|                                                                       |
| if (methodTier3?.blocksWithdrawal) {                                  |
|                                                                       |
| return {                                                              |
|                                                                       |
| allowed: false,                                                       |
|                                                                       |
| blockedBy: \"TIER_3\",                                                |
|                                                                       |
| tier3Status: methodTier3.status,                                      |
|                                                                       |
| depositMethodId,                                                      |
|                                                                       |
| };                                                                    |
|                                                                       |
| }                                                                     |
|                                                                       |
| // First-payout hold                                                  |
|                                                                       |
| if (gateStatus.firstPayoutHoldActive) {                               |
|                                                                       |
| return {                                                              |
|                                                                       |
| allowed: false,                                                       |
|                                                                       |
| blockedBy: \"FIRST_PAYOUT_HOLD\",                                     |
|                                                                       |
| holdReleasesAt: gateStatus.firstPayoutHoldReleasesAt,                 |
|                                                                       |
| };                                                                    |
|                                                                       |
| }                                                                     |
|                                                                       |
| return { allowed: true };                                             |
|                                                                       |
| }                                                                     |
+=======================================================================+

# **4. Screen Content Per Tier --- When Contractor Hits Withdraw Funds**

When the KYC gate blocks a withdrawal, payout-service returns a
structured gate response. The frontend renders a dedicated intercept
screen per tier --- not a generic error toast. Each screen explains
exactly what the contractor must complete and provides a direct CTA to
the relevant verification flow.

## **4.1 Tier 1 block --- Government ID**

  -----------------------------------------------------------------------
  **Screen element**    **Content**
  --------------------- -------------------------------------------------
  **Screen title**      Verify your identity to withdraw

  **Body**              Before you can withdraw your earnings, we need to
                        verify your identity. This is a one-time step
                        required by financial regulations.

  **What you need**     Government-issued photo ID (passport, national ID
                        card, or driver\'s licence)

  **Primary CTA**       Verify my identity

  **CTA destination**   Identity verification flow in
                        kyc-identity-service / identity-service UI

  **Secondary option**  Cancel --- returns contractor to Earnings tab

  **Status shown if     Your identity verification is in progress. This
  pending**             typically takes 1--2 business days. You\'ll be
                        notified when it\'s complete.

  **Status shown if     Your identity verification was unsuccessful.
  failed**              Please try again with a valid government-issued
                        ID.
  -----------------------------------------------------------------------

## **4.2 Tier 2 block --- Tax identity (US contractor: SSN/ITIN)**

  -----------------------------------------------------------------------
  **Screen element**    **Content**
  --------------------- -------------------------------------------------
  **Screen title**      Add your tax information to withdraw

  **Body**              US contractors must provide a Social Security
                        Number (SSN) or Individual Taxpayer
                        Identification Number (ITIN) before withdrawing.
                        This is required for IRS 1099 reporting.

  **What you need**     Your SSN or ITIN. If you don\'t have one, select
                        \"I have an ITIN\" to learn more.

  **Primary CTA**       Add tax information

  **CTA destination**   Tax identity form in kyc-identity-service UI

  **Secondary option**  Cancel --- returns to Earnings tab

  **Status shown if     Your tax information is being reviewed. You\'ll
  pending**             be notified once it\'s confirmed.
  -----------------------------------------------------------------------

## **4.3 Tier 2 block --- Tax identity (international contractor: W-8BEN)**

  -----------------------------------------------------------------------
  **Screen element**    **Content**
  --------------------- -------------------------------------------------
  **Screen title**      Complete your tax certification to withdraw

  **Body**              International contractors must complete a W-8BEN
                        form to certify their non-US tax status. This is
                        required by US tax law before any payments can be
                        made.

  **What you need**     Your country of residence, tax identification
                        number from your home country (if applicable),
                        and signature.

  **Primary CTA**       Complete W-8BEN

  **CTA destination**   W-8BEN form in kyc-identity-service UI

  **Secondary option**  Cancel --- returns to Earnings tab

  **Note on treaty**    If your country has a US tax treaty, you may be
                        eligible for a reduced withholding rate. The form
                        will guide you through this.
  -----------------------------------------------------------------------

## **4.4 Tier 3 block --- Bank account ownership**

  -----------------------------------------------------------------------
  **Screen element**    **Content**
  --------------------- -------------------------------------------------
  **Screen title**      Verify your bank account to withdraw

  **Body**              Before sending funds to your bank account, we
                        need to confirm you own it. Two small test
                        deposits were sent to your account ending in
                        {last4}.

  **What you need**     Check your bank account (allow 1--3 business
                        days). Return here to enter the two deposit
                        amounts.

  **Primary CTA**       Enter deposit amounts

  **CTA destination**   Micro-deposit verification screen (PS-08)

  **Secondary option    Withdraw to a different method --- returns
  (if other methods     contractor to method selector with Tier-3-blocked
  verified)**           method greyed out

  **Status shown if     Waiting for test deposits to arrive. This usually
  pending               takes 1--3 business days. You\'ll receive an
  micro-deposits**      email when they\'re ready to verify.
  -----------------------------------------------------------------------

## **4.5 First-payout hold screen**

  -----------------------------------------------------------------------
  **Screen element**    **Content**
  --------------------- -------------------------------------------------
  **Screen title**      Your first withdrawal is on its way

  **Body**              For your security, your first withdrawal from
                        Marketeq is held for 5 business days before being
                        released. This is a one-time step.

  **Hold release date   Your funds will be available to withdraw on
  shown**               {holdReleasesAt formatted as \"Monday, June
                        16\"}.

  **Body line 2**       After this first hold, all future withdrawals
                        will process on your normal schedule.

  **Primary CTA**       Got it --- takes contractor back to Earnings tab

  **No secondary CTA**  Hold cannot be waived by contractor. Admin
                        override only.
  -----------------------------------------------------------------------

# **5. First-Payout 5-Business-Day Hold Logic**

## **5.1 What triggers the hold**

The hold applies to a contractor\'s very first payout request --- the
first time their payout_requests table would ever have a row in
PROCESSING status. It applies regardless of payout method, amount, or
KYC tier status (all tiers must already be clear for the hold to be the
only remaining gate). The hold is a financial risk control, not a KYC
control.

## **5.2 Hold calculation**

+-----------------------------------------------------------------------+
| typescript                                                            |
+-----------------------------------------------------------------------+
| // src/kyc/first-payout-hold.service.ts                               |
|                                                                       |
| async checkAndApplyFirstPayoutHold(                                   |
|                                                                       |
| contractorId: string,                                                 |
|                                                                       |
| ): Promise\<{ holdActive: boolean; releasesAt: Date \| null }\> {     |
|                                                                       |
| // Check if contractor has ever had a completed payout                |
|                                                                       |
| const previousPayout = await this.payoutRequestRepo.findOne({         |
|                                                                       |
| where: {                                                              |
|                                                                       |
| contractorId,                                                         |
|                                                                       |
| status: In(\[PayoutStatus.COMPLETED, PayoutStatus.PROCESSING\]),      |
|                                                                       |
| },                                                                    |
|                                                                       |
| order: { createdAt: \"ASC\" },                                        |
|                                                                       |
| });                                                                   |
|                                                                       |
| if (previousPayout) {                                                 |
|                                                                       |
| // Not their first --- no hold                                        |
|                                                                       |
| return { holdActive: false, releasesAt: null };                       |
|                                                                       |
| }                                                                     |
|                                                                       |
| // First payout --- calculate release date (5 business days from now) |
|                                                                       |
| const releasesAt = this.addBusinessDays(new Date(), 5);               |
|                                                                       |
| // Persist hold record so kyc-identity-service can report it          |
|                                                                       |
| await this.firstPayoutHoldRepo.upsert({                               |
|                                                                       |
| contractorId,                                                         |
|                                                                       |
| appliedAt: new Date(),                                                |
|                                                                       |
| releasesAt,                                                           |
|                                                                       |
| released: false,                                                      |
|                                                                       |
| }, \[\"contractorId\"\]);                                             |
|                                                                       |
| return { holdActive: true, releasesAt };                              |
|                                                                       |
| }                                                                     |
|                                                                       |
| // Business day calculator --- skips Saturday (6) and Sunday (0)      |
|                                                                       |
| // Does not account for public holidays in v1 --- roadmap item        |
|                                                                       |
| private addBusinessDays(from: Date, days: number): Date {             |
|                                                                       |
| const result = new Date(from);                                        |
|                                                                       |
| let added = 0;                                                        |
|                                                                       |
| while (added \< days) {                                               |
|                                                                       |
| result.setDate(result.getDate() + 1);                                 |
|                                                                       |
| const day = result.getDay();                                          |
|                                                                       |
| if (day !== 0 && day !== 6) added++;                                  |
|                                                                       |
| }                                                                     |
|                                                                       |
| return result;                                                        |
|                                                                       |
| }                                                                     |
+=======================================================================+

  -------------------------------------------------------------------------
  **Scenario**          **Behaviour**
  --------------------- ---------------------------------------------------
  **Contractor          Hold release: following Monday (5 business days).
  initiates first       Funds cannot be withdrawn before that date.
  withdrawal on         
  Monday**              

  **Contractor          Hold release: following Friday (5 business days,
  initiates first       skipping weekend).
  withdrawal on         
  Friday**              

  **Contractor cancels  Hold release date is recalculated from the new
  first withdrawal      request date. The clock restarts.
  request and tries     
  again**               

  **Admin waives the    POST
  hold**                /internal/admin/contractors/:id/waive-first-hold.
                        Sets released=true. Immediate withdrawal allowed.
                        Audit log written. Requires admin role.

  **Second and all      No hold. Processed per normal schedule.
  subsequent            
  withdrawals**         
  -------------------------------------------------------------------------

# **6. \$10,000 Enhanced Due Diligence Trigger**

## **6.1 What triggers EDD**

Any single payout_requests row with amountUSD \>= 10000.00 triggers
enhanced due diligence (EDD) before execution. This threshold is set by
FinCEN CTR (Currency Transaction Report) rules and Marketeq\'s BSA
compliance policy. EDD does not block the payout automatically --- it
routes it to a compliance review queue before execution.

## **6.2 EDD flow**

  -------------------------------------------------------------------------------------
  **Step**     **Actor**        **Action**
  ------------ ---------------- -------------------------------------------------------
  **1**        payout-service   Detects amountUSD \>= 10000 on POST
                                /v1/payouts/initiate. All standard KYC gates must
                                already be clear.

  **2**        payout-service   payout_requests row created with status=awaiting_edd
                                (new status --- not in base PS-02 state machine without
                                this doc).

  **3**        payout-service   Publishes payout.edd.triggered event to RabbitMQ.
                                compliance-service or admin dashboard consumes.

  **4**        Contractor       Receives notification: \"Your withdrawal is under
                                review. Large withdrawals are reviewed by our
                                compliance team before processing. This typically takes
                                1--2 business days.\"

  **5**        Compliance team  Reviews in admin dashboard. Approves or rejects.

  **6a ---     payout-service   status → processing. Magic link step re-runs (new
  Approved**                    verification required post-EDD). Payout executes
                                normally.

  **6b ---     payout-service   status → failed with failureReason=EDD_REJECTED.
  Rejected**                    Contractor notified. Balance restored.
  -------------------------------------------------------------------------------------

+-----------------------------------------------------------------------+
| typescript                                                            |
+-----------------------------------------------------------------------+
| // EDD check injected into withdrawal initiation before               |
| payout_requests row is created                                        |
|                                                                       |
| // src/edd/edd.service.ts                                             |
|                                                                       |
| async checkEDD(                                                       |
|                                                                       |
| amountUSD: number,                                                    |
|                                                                       |
| contractorId: string,                                                 |
|                                                                       |
| ): Promise\<{ requiresEDD: boolean }\> {                              |
|                                                                       |
| const EDD_THRESHOLD = 10_000;                                         |
|                                                                       |
| if (amountUSD \< EDD_THRESHOLD)                                       |
|                                                                       |
| return { requiresEDD: false };                                        |
|                                                                       |
| // Log EDD trigger for compliance audit trail                         |
|                                                                       |
| await this.auditService.log({                                         |
|                                                                       |
| contractorId,                                                         |
|                                                                       |
| actorType: \"system\",                                                |
|                                                                       |
| actorId: \"payout-service\",                                          |
|                                                                       |
| action: \"edd.triggered\",                                            |
|                                                                       |
| metadata: { amountUSD, threshold: EDD_THRESHOLD },                    |
|                                                                       |
| });                                                                   |
|                                                                       |
| return { requiresEDD: true };                                         |
|                                                                       |
| }                                                                     |
|                                                                       |
| // RabbitMQ event payload --- payout.edd.triggered                    |
|                                                                       |
| {                                                                     |
|                                                                       |
| payoutRequestId: string,                                              |
|                                                                       |
| contractorId: string,                                                 |
|                                                                       |
| amountUSD: number,                                                    |
|                                                                       |
| depositMethodId: string,                                              |
|                                                                       |
| methodType: string,                                                   |
|                                                                       |
| triggeredAt: string, // ISO 8601                                      |
|                                                                       |
| }                                                                     |
+=======================================================================+

## **6.3 EDD state in payout_requests**

  ---------------------------------------------------------------------------------
  **Status value**                 **Meaning**
  -------------------------------- ------------------------------------------------
  **awaiting_edd**                 Payout is pending compliance review. No
                                   execution yet. Magic link already verified.

  **processing**                   EDD approved. Payout execution in progress.

  **failed                         Compliance team rejected the payout. Balance
  (failureReason=EDD_REJECTED)**   restored to contractor earnings.
  ---------------------------------------------------------------------------------

+-----------------------------------------------------------------------+
| **Magic link re-verification required after EDD approval**            |
|                                                                       |
| When a payout is approved after EDD review, a fresh magic link is     |
| sent to the contractor.                                               |
|                                                                       |
| The original magic link (sent at initiation) is consumed and cannot   |
| be reused.                                                            |
|                                                                       |
| This ensures the contractor re-confirms the withdrawal after the      |
| compliance delay,                                                     |
|                                                                       |
| in case the contractor\'s intent has changed during the review        |
| period.                                                               |
+=======================================================================+

# **7. Full Gate Sequence at Withdrawal Initiation**

  ----------------------------------------------------------------------------------
  **Check   **Gate**          **Result if failed**            **Continue if passed**
  order**                                                     
  --------- ----------------- ------------------------------- ----------------------
  **1**     Tier 1 ---        Return TIER_1_INCOMPLETE.       Proceed to check 2
            Government ID     Render §4.1 screen. No          
                              payout_requests row created.    

  **2**     Tier 2 --- Tax    Return TIER_2_INCOMPLETE.       Proceed to check 3
            identity          Render §4.2 or §4.3 screen. No  
                              row created.                    

  **3**     Tier 3 --- Bank   Return TIER_3_INCOMPLETE for    Proceed to check 4
            ownership         this method. Render §4.4        
            (method-scoped)   screen. No row created.         

  **4**     First-payout hold Return FIRST_PAYOUT_HOLD.       Proceed to check 5
                              Render §4.5 screen. No row      
                              created.                        

  **5**     EDD (\$10,000     Create payout_requests row with Proceed to check 6
            threshold)        status=awaiting_edd. Route to   
                              compliance queue. Return 202    
                              with edd_review message.        

  **6**     Magic link email  payout_requests row created     Payout execution
            verification      with                            proceeds (PS-02)
                              status=awaiting_verification.   
                              Return 202.                     
  ----------------------------------------------------------------------------------

# **8. Error Code Reference**

  ----------------------------------------------------------------------------------
  **Error code**                    **HTTP     **When thrown**
                                    status**   
  --------------------------------- ---------- -------------------------------------
  **ERR_KYC_TIER1_REQUIRED**        403        Tier 1 government ID not verified.
                                               Withdrawal blocked.

  **ERR_KYC_TIER2_REQUIRED**        403        Tier 2 tax identity not verified.
                                               Withdrawal blocked.

  **ERR_KYC_TIER3_REQUIRED**        403        Tier 3 bank account ownership not
                                               verified for the selected method.

  **ERR_FIRST_PAYOUT_HOLD**         403        First-payout 5-business-day hold
                                               active. holdReleasesAt in response
                                               metadata.

  **ERR_KYC_SERVICE_UNAVAILABLE**   503        Internal HTTP call to
                                               kyc-identity-service failed or timed
                                               out. Withdrawal blocked as safe
                                               default. Retry after 60 seconds.
  ----------------------------------------------------------------------------------

# **9. References**

  ---------------------------------------------------------------------------------------------------------------------
  **Document / Resource**  **Relevant to**
  ------------------------ --------------------------------------------------------------------------------------------
  **PS-02 --- Withdrawal   payout_requests status values including awaiting_edd. Base state machine.
  Flow & Payout State      
  Machine**                

  **PS-08 ---              Tier 3 bank account ownership verification detail
  Micro-Deposit            
  Verification**           

  **PS-14 --- Magic Link   Magic link step that follows KYC gate clearance. Re-verification after EDD.
  Email Verification**     

  **kyc-identity-service   GET /internal/kyc/gate-status/:contractorId
  --- internal endpoint**  

  **FinCEN CTR rules**     https://www.fincen.gov/resources/statutes-regulations/guidance/currency-transaction-report
  ---------------------------------------------------------------------------------------------------------------------

CONFIDENTIAL --- Marketeq Internal Engineering Documentation \|
payout-service PS-15 \| v1.0
