**[MARKETEQ PLATFORM --- BACKEND DOCUMENTATION]{.smallcaps}**

**payout-service**

PS-21 --- Compliance & Regulatory Reference (Engineering)

  -----------------------------------------------------------------------
  **Property**        **Value**
  ------------------- ---------------------------------------------------
  **Document**        PS-21 --- Compliance & Regulatory Reference
                      (Engineering)

  **Version**         1.0

  **Audience**        Engineers and technical leads. Not legal advice.

  **Applies to**      All payout flows. All deposit method types. All
                      contractor jurisdictions.

  **Legal review      Yes --- before launch and before any jurisdiction
  required**          expansion.

  **Regulations       NACHA ACH rules, Stripe compliance, FinCEN BSA, IRS
  covered**           1099, OFAC, jurisdiction payout timing, W-9/W-8BEN,
                      crypto regulatory classification.

  **Prerequisites**   PS-02, PS-12, PS-15, PS-20, earnings-service
                      (ES-10, ES-14)
  -----------------------------------------------------------------------

# **1. Overview**

This document maps every applicable regulation to the exact code,
database field, service call, or process that enforces it in the
Marketeq payout stack. It is written for engineers --- not lawyers. For
each regulation it answers: what the rule requires, where in
payout-service the rule is enforced, what data is stored to prove
compliance, and what fails if the enforcement code is removed or
bypassed. Legal counsel must review this document before launch. Nothing
here is a legal opinion.

+-----------------------------------------------------------------------+
| **This document describes engineering enforcement --- not legal       |
| compliance certification**                                            |
|                                                                       |
| Implementing the code described here does not guarantee regulatory    |
| compliance.                                                           |
|                                                                       |
| Regulations change. Enforcement interpretations vary by jurisdiction. |
|                                                                       |
| This document must be reviewed by legal counsel before launch and     |
| updated whenever                                                      |
|                                                                       |
| a regulation changes or Marketeq expands to a new jurisdiction.       |
|                                                                       |
| Engineers must not make compliance determinations based on this       |
| document alone.                                                       |
+=======================================================================+

# **2. NACHA ACH Rules --- Bank Transfer Compliance**

## **2.1 What NACHA requires**

NACHA (the National Automated Clearinghouse Association) governs ACH
transfers in the United States. For Marketeq, ACH rules apply to
BANK_STRIPE and BANK_MANUAL deposit methods that use ACH for payout
settlement. Key requirements: account ownership verification before
first debit or credit, return rate monitoring, transaction
authorisation, and re-presentment limits.

  -------------------------------------------------------------------------------------
  **NACHA rule**     **Engineering            **Where in code**
                     enforcement**            
  ------------------ ------------------------ -----------------------------------------
  **Account          Micro-deposit            PS-08 §3.
  ownership must be  verification (PS-08) or  PayoutValidator.assertMethodVerified().
  verified before    Stripe Financial         ERR_METHOD_NOT_VERIFIED blocks payout
  ACH credit**       Connections instant      initiation.
                     verification required.   
                     verificationStatus must  
                     be VERIFIED before any   
                     payout is routed to the  
                     method.                  

  **ACH credit entry PPD (Prearranged Payment deposit_methods.entityType column
  class code**       and Deposit) for         (INDIVIDUAL \| BUSINESS). Passed to
                     individual contractors.  Stripe payout API call.
                     CCD for business         
                     entities. Stripe handles 
                     entry class selection    
                     --- Marketeq must pass   
                     the correct entity type. 

  **Return rate ---  payout-service monitors  ACH return event handler. See §2.3.
  must stay below    ACH return codes from    
  NACHA thresholds   Stripe webhooks. High    
  (0.5% admin, 3%    return rate from a       
  overall)**         contractor\'s bank       
                     triggers method          
                     deactivation and         
                     contractor notification. 

  **Re-presentment   After an R01             ACH retry policy in RetryService. See
  after return       (insufficient funds)     §2.3.
  limited to 2       return: payout retried   
  additional         max 2 additional times   
  attempts**         with 5-business-day gap. 
                     No re-presentment after  
                     R02 (account closed) or  
                     R03 (no account).        

  **Authorisation    Contractor accepts ToS   contractor_tos_acceptances table.
  --- contractor     which includes ACH       tosVersion + acceptedAt. Must include
  must authorise     credit authorisation     NACHA-compliant authorisation text (legal
  recurring ACH      language. Timestamp of   counsel to draft).
  credits**          ToS acceptance stored.   
  -------------------------------------------------------------------------------------

## **2.2 Stripe ACH return code handling**

  -------------------------------------------------------------------------
  **Return   **Meaning**        **Action in payout-service**
  code**                        
  ---------- ------------------ -------------------------------------------
  **R01**    Insufficient funds Mark payout failed. Retry up to 2x with
                                5-business-day gap. Notify contractor.

  **R02**    Account closed     Mark payout failed. Deactivate deposit
                                method (isActive=false). Notify contractor
                                to add a new bank account. No retry.

  **R03**    No account /       Same as R02 --- deactivate and notify. No
             unable to locate   retry.

  **R04**    Invalid account    Same as R02. No retry.
             number             ERR_ACH_INVALID_ACCOUNT.

  **R07**    Authorisation      Deactivate method. Notify contractor. Flag
             revoked by         for trust & safety review.
             customer           

  **R10**    Customer advises   Deactivate method. Notify contractor.
             unauthorised       Escalate to trust & safety.

  **R16**    Account frozen     Mark payout failed. No retry. Notify
                                contractor. ERR_ACH_ACCOUNT_FROZEN.

  **R20**    Non-transaction    Deactivate method. Notify contractor to use
             account            a checking account.
  -------------------------------------------------------------------------

+-----------------------------------------------------------------------+
| typescript                                                            |
+-----------------------------------------------------------------------+
| // src/webhooks/stripe-ach-return.handler.ts                          |
|                                                                       |
| // Stripe sends payment_intent.payment_failed or payout.failed with   |
| failure_code                                                          |
|                                                                       |
| async handleACHReturn(                                                |
|                                                                       |
| payoutId: string,                                                     |
|                                                                       |
| returnCode: string, // R01, R02, etc.                                 |
|                                                                       |
| ): Promise\<void\> {                                                  |
|                                                                       |
| const DEACTIVATE_CODES =                                              |
| \[\"R02\",\"R03\",\"R04\",\"R07\",\"R10\",\"R16\",\"R20\"\];          |
|                                                                       |
| const RETRY_CODES = \[\"R01\"\];                                      |
|                                                                       |
| const ESCALATE_CODES = \[\"R07\",\"R10\"\];                           |
|                                                                       |
| const payout = await this.payoutRequestRepo.findOneOrFail({           |
|                                                                       |
| where: { externalTransactionId: payoutId },                           |
|                                                                       |
| });                                                                   |
|                                                                       |
| if (DEACTIVATE_CODES.includes(returnCode)) {                          |
|                                                                       |
| await this.methodRepo.update(payout.depositMethodId, { isActive:      |
| false });                                                             |
|                                                                       |
| await this.rabbitMQ.publish(\"payout.method.deactivated\", {          |
|                                                                       |
| contractorId: payout.contractorId,                                    |
|                                                                       |
| depositMethodId: payout.depositMethodId,                              |
|                                                                       |
| reason: \`ACH_RETURN\_\${returnCode}\`,                               |
|                                                                       |
| });                                                                   |
|                                                                       |
| }                                                                     |
|                                                                       |
| if (ESCALATE_CODES.includes(returnCode)) {                            |
|                                                                       |
| await this.rabbitMQ.publish(\"payout.trust_safety.escalation\", {     |
|                                                                       |
| contractorId: payout.contractorId,                                    |
|                                                                       |
| reason: \`ACH_RETURN\_\${returnCode}\`,                               |
|                                                                       |
| payoutRequestId: payout.id,                                           |
|                                                                       |
| });                                                                   |
|                                                                       |
| }                                                                     |
|                                                                       |
| const retryable = RETRY_CODES.includes(returnCode) &&                 |
| (payout.retryCount ?? 0) \< 2;                                        |
|                                                                       |
| await this.payoutRequestRepo.update(payout.id, {                      |
|                                                                       |
| status: retryable ? PayoutStatus.PENDING_RETRY : PayoutStatus.FAILED, |
|                                                                       |
| failureCode: \`ACH_RETURN\_\${returnCode}\`,                          |
|                                                                       |
| retryCount: (payout.retryCount ?? 0) + 1,                             |
|                                                                       |
| });                                                                   |
|                                                                       |
| }                                                                     |
+=======================================================================+

# **3. Stripe Payout Compliance Requirements**

  -----------------------------------------------------------------------------
  **Stripe           **Engineering enforcement** **Failure if bypassed**
  requirement**                                  
  ------------------ --------------------------- ------------------------------
  **Stripe account   Marketeq business account   All Stripe API calls return
  must be verified   --- not contractor-level.   403 if account not verified.
  (Stripe KYB on     One-time Stripe onboarding. Payouts fail at execution.
  Marketeq platform  Engineering must ensure     
  account)**         Stripe account is in        
                     \"charges_enabled\" and     
                     \"payouts_enabled\" state   
                     before processing any live  
                     transactions.               

  **Payout           Bank accounts must be in a  Stripe returns
  destination must   country supported by Stripe stripe_invalid_request_error
  match              for payouts. Validate       at payout execution. Payout
  Stripe-supported   country against Stripe\'s   fails.
  methods in the     supported bank transfer     
  platform           list before allowing method 
  account\'s         creation.                   
  country**                                      

  **Stripe Connect   Not currently used.         N/A for v1.
  --- if used for    Marketeq uses a single      
  split payouts on   corporate Stripe account,   
  platform**         not Stripe Connect. If      
                     Connect is added in future: 
                     contractor-level KYC,       
                     restricted accounts, and    
                     Connect payout rules apply. 

  **Idempotency keys Every Stripe payout API     Without idempotency keys:
  on all Stripe API  call includes an            duplicate charges/payouts
  calls**            idempotency key. Pattern:   possible on retry. Funds sent
                     payout-{payoutRequestId}.   twice.
                     Prevents duplicate payouts  
                     if Stripe call is retried.  

  **Stripe webhook   All inbound Stripe webhooks Without signature check:
  signature          validated with              malicious actors could send
  validation**       Stripe-Signature header     fake Stripe events to trigger
                     using                       false payout completions.
                     STRIPE_WEBHOOK_SECRET.      
                     Reject unsigned or          
                     incorrectly signed          
                     webhooks.                   
  -----------------------------------------------------------------------------

+-----------------------------------------------------------------------+
| typescript                                                            |
+-----------------------------------------------------------------------+
| // Stripe API call with idempotency key --- all payout execution      |
| calls must follow this pattern                                        |
|                                                                       |
| const payout = await this.stripe.payouts.create({                     |
|                                                                       |
| amount: amountCents,                                                  |
|                                                                       |
| currency: \"usd\",                                                    |
|                                                                       |
| method: \"standard\", // or \"instant\" if supported                  |
|                                                                       |
| destination: stripeExternalAccountId,                                 |
|                                                                       |
| }, {                                                                  |
|                                                                       |
| idempotencyKey: \`payout-\${payoutRequestId}\`, // UUID from          |
| payout_requests.id                                                    |
|                                                                       |
| });                                                                   |
|                                                                       |
| // Stripe webhook validation                                          |
|                                                                       |
| validateStripeWebhook(rawBody: Buffer, signature: string):            |
| Stripe.Event {                                                        |
|                                                                       |
| return this.stripe.webhooks.constructEvent(                           |
|                                                                       |
| rawBody,                                                              |
|                                                                       |
| signature,                                                            |
|                                                                       |
| process.env.STRIPE_WEBHOOK_SECRET!,                                   |
|                                                                       |
| );                                                                    |
|                                                                       |
| // Throws Stripe.errors.StripeSignatureVerificationError if invalid   |
|                                                                       |
| // Caller must catch and return 400 to Stripe (prevents retry storm)  |
|                                                                       |
| }                                                                     |
+=======================================================================+

# **4. FinCEN BSA --- \$10,000 Single-Transaction Threshold**

## **4.1 What the rule requires**

The Bank Secrecy Act (BSA) and FinCEN regulations require financial
institutions and money services businesses to file a Currency
Transaction Report (CTR) for cash transactions exceeding \$10,000. For
Marketeq, which processes ACH, card, and crypto payouts (not cash), the
direct CTR filing obligation depends on whether Marketeq is classified
as an MSB. Regardless, the \$10,000 threshold is a standard
anti-money-laundering (AML) trigger. Marketeq implements enhanced due
diligence (EDD) for any single payout of \$10,000 or more. See PS-15 §6
for the full EDD flow.

  -------------------------------------------------------------------------------
  **Requirement**      **Engineering            **Data stored for compliance**
                       enforcement**            
  -------------------- ------------------------ ---------------------------------
  **Detect             checkEDD() in            payout_requests.status =
  single-transaction   PayoutInitiator. Called  awaiting_edd. audit_log entry
  amount \>=           before payout_requests   with action=edd.triggered.
  \$10,000**           row is created. If       
                       threshold met:           
                       status=awaiting_edd.     

  **Route to           payout.edd.triggered     payout_requests.eddTriggeredAt.
  compliance review    RabbitMQ event           Compliance review record in
  queue**              published. Compliance    edd_reviews table.
                       dashboard consumes and   
                       presents for review.     

  **Require compliance payout_requests.status   edd_reviews.approvedBy (admin
  team approval before must be manually         userId). edd_reviews.approvedAt.
  execution**          advanced from            
                       awaiting_edd to          
                       processing by a          
                       compliance officer. No   
                       automatic approval.      

  **Re-verify identity New magic link sent      new magic_link_verifications row
  after EDD approval   after EDD approval       created after
  delay**              (PS-14). Contractor must edd_reviews.approvedAt.
                       re-confirm withdrawal.   

  **Audit trail for    audit_log entries for:   payout_audit_log. Retained 7
  all EDD events**     edd.triggered,           years per BSA record-keeping
                       edd.approved,            requirements.
                       edd.rejected, each with  
                       actorId, timestamp,      
                       amount.                  

  **Structuring        Not implemented in v1.   Future:
  detection ---        Roadmap: rolling 24-hour contractor_daily_payout_totals
  multiple             window sum check. If sum table.
  transactions just    of transactions for same 
  below \$10,000**     contractor in 24h        
                       approaches \$9,500: flag 
                       for review.              
  -------------------------------------------------------------------------------

+-----------------------------------------------------------------------+
| typescript                                                            |
+-----------------------------------------------------------------------+
| // edd_reviews table --- stores compliance officer decisions          |
|                                                                       |
| CREATE TABLE edd_reviews (                                            |
|                                                                       |
| id UUID PRIMARY KEY DEFAULT gen_random_uuid(),                        |
|                                                                       |
| payout_request_id UUID NOT NULL REFERENCES payout_requests(id),       |
|                                                                       |
| contractor_id UUID NOT NULL,                                          |
|                                                                       |
| amount_usd NUMERIC(12,2) NOT NULL,                                    |
|                                                                       |
| triggered_at TIMESTAMPTZ NOT NULL,                                    |
|                                                                       |
| reviewed_by UUID, \-- admin userId                                    |
|                                                                       |
| reviewed_at TIMESTAMPTZ,                                              |
|                                                                       |
| decision VARCHAR(16), \-- APPROVED \| REJECTED                        |
|                                                                       |
| rejection_reason TEXT,                                                |
|                                                                       |
| notes TEXT,                                                           |
|                                                                       |
| created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()                         |
|                                                                       |
| );                                                                    |
|                                                                       |
| CREATE INDEX idx_edd_payout ON edd_reviews(payout_request_id);        |
|                                                                       |
| CREATE INDEX idx_edd_contractor ON edd_reviews(contractor_id);        |
|                                                                       |
| \-- Retained 7 years: add created_at \>= NOW() - INTERVAL \'7 years\' |
| to purge job exclusion                                                |
+=======================================================================+

# **5. IRS 1099 --- \$600 YTD Threshold**

## **5.1 What the rule requires**

IRS regulations require Marketeq to issue a Form 1099-NEC to any US
contractor who earns \$600 or more in a calendar year. Marketeq must
also file a copy with the IRS. The \$600 threshold is based on total
earnings credited --- not total payouts received. Engineering must track
YTD earnings per contractor in earnings-service and expose the YTD total
to payout-service for compliance checks.

  --------------------------------------------------------------------------------------------------
  **Requirement**    **Engineering enforcement**  **Data stored**
  ------------------ ---------------------------- --------------------------------------------------
  **Track YTD        earnings-service maintains   earnings_annual_summary table: contractor_id,
  earnings per       ytd_earnings_usd per         tax_year, ytd_earnings_usd, ytd_as_of.
  contractor**       contractor per calendar      
                     year. Updated on every       
                     transaction.credited event.  

  **Detect \$600 YTD earnings-service publishes   earnings_annual_summary.threshold_600_reached_at
  threshold breach** earnings.threshold.reached   --- timestamp of first breach.
                     event when ytd_earnings_usd  
                     crosses \$600.               
                     payout-service subscribes.   

  **Gate payouts     After threshold breach:      payout_requests blocked with
  above \$600 YTD on payout-service checks        ERR_KYC_TIER2_REQUIRED.
  W-9/W-8BEN         kyc-identity-service Tier 2  kyc-identity-service.tier2.status.
  completion**       (tax identity) status before 
                     every payout. US contractor  
                     without SSN/ITIN: blocked.   
                     International without        
                     W-8BEN: blocked.             

  **W-9 withholding  If a US contractor has not   withholding_records table. Not implemented in v1
  --- backup         provided a valid TIN         --- legal counsel must advise on implementation
  withholding if no  (SSN/ITIN) and earnings      before v1 launch if backup withholding is
  TIN**              exceed \$600 YTD: IRS        required.
                     requires 24% backup          
                     withholding on further       
                     payments. Marketeq must      
                     withhold and remit.          

  **1099-NEC filing  Annual batch job exports all earnings_annual_summary. 1099 filing managed
  by January 31**    contractors with             externally --- engineering provides data export.
                     ytd_earnings_usd \>= 600 for 
                     the prior tax year. Sent to  
                     1099 filing vendor (e.g.     
                     Track1099, Tax1099).         

  **7-year record    All 1099-related records     earnings_annual_summary. W-9/W-8BEN stored in
  retention**        (earnings summaries, tax     kyc-identity-service with retention policy.
                     filings, W-9/W-8BEN forms)   
                     retained 7 years minimum.    
  --------------------------------------------------------------------------------------------------

+-----------------------------------------------------------------------+
| typescript                                                            |
+-----------------------------------------------------------------------+
| // earnings_annual_summary table --- owned by earnings-service        |
|                                                                       |
| CREATE TABLE earnings_annual_summary (                                |
|                                                                       |
| id UUID PRIMARY KEY DEFAULT gen_random_uuid(),                        |
|                                                                       |
| contractor_id UUID NOT NULL,                                          |
|                                                                       |
| tax_year SMALLINT NOT NULL, \-- e.g. 2025                             |
|                                                                       |
| ytd_earnings_usd NUMERIC(12,2) NOT NULL DEFAULT 0,                    |
|                                                                       |
| threshold_600_reached_at TIMESTAMPTZ, \-- NULL until \$600 breached   |
|                                                                       |
| form_1099_required BOOLEAN NOT NULL DEFAULT false,                    |
|                                                                       |
| form_1099_issued_at TIMESTAMPTZ,                                      |
|                                                                       |
| form_1099_amount_usd NUMERIC(12,2),                                   |
|                                                                       |
| tin_status VARCHAR(16), \-- VALID \| MISSING \| INVALID --- from      |
| kyc-identity-service                                                  |
|                                                                       |
| backup_withholding_active BOOLEAN NOT NULL DEFAULT false,             |
|                                                                       |
| created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),                        |
|                                                                       |
| updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),                        |
|                                                                       |
| UNIQUE (contractor_id, tax_year)                                      |
|                                                                       |
| );                                                                    |
+=======================================================================+

# **6. OFAC Screening --- Every Payout Attempt**

## **6.1 What OFAC requires**

The Office of Foreign Assets Control (OFAC) administers US sanctions.
Marketeq must not process payments to individuals or entities on OFAC\'s
Specially Designated Nationals (SDN) list, or to contractors in
sanctioned countries and regions. OFAC screening must occur on every
payout attempt --- not just at onboarding. The SDN list updates
frequently.

  ---------------------------------------------------------------------------------
  **Screening        **What is screened**     **How it is enforced**
  point**                                     
  ------------------ ------------------------ -------------------------------------
  **At deposit       Contractor\'s country    PS-07 §6 (bank methods), PS-12 §9.1
  method creation**  (from profile) checked   (crypto). ERR_PAYOUT_OFAC_BLOCKED if
                     against sanctioned       match.
                     country list.            

  **At every payout  Contractor\'s current    checkOFACAtExecution() in
  initiation**       country re-checked       PayoutExecutor. Runs before bridge
                     against OFAC sanctioned  API call.
                     country list.            

  **At crypto payout Wallet address screened  chainalysisService.screenAddress().
  execution**        against OFAC SDN list    ERR_PAYOUT_OFAC_BLOCKED if flagged.
                     via Chainalysis KYT API. 

  **SDN name         Contractor name screened Handled by kyc-identity-service. Sets
  screening**        against SDN list at KYC  ofacFlagged=true in gate status if
                     verification.            match.

  **Country list     OFAC_BLOCKED_COUNTRIES   Hard-coded list reviewed quarterly or
  maintenance**      constant in              on OFAC country change notification.
                     payout-service           
                     environment config.      
                     Updated when OFAC        
                     adds/removes countries.  
  ---------------------------------------------------------------------------------

+--------------------------------------------------------------------------------------------------------+
| typescript                                                                                             |
+--------------------------------------------------------------------------------------------------------+
| // src/compliance/ofac.service.ts                                                                      |
|                                                                                                        |
| // Current OFAC blocked countries --- v1 list                                                          |
|                                                                                                        |
| // Must be reviewed and updated quarterly. Source:                                                     |
| https://home.treasury.gov/policy-issues/financial-sanctions/sanctions-programs-and-country-information |
|                                                                                                        |
| const OFAC_BLOCKED_COUNTRIES: string\[\] = \[                                                          |
|                                                                                                        |
| \"CU\", // Cuba                                                                                        |
|                                                                                                        |
| \"IR\", // Iran                                                                                        |
|                                                                                                        |
| \"KP\", // North Korea                                                                                 |
|                                                                                                        |
| \"RU\", // Russia (partial --- specific programs)                                                      |
|                                                                                                        |
| \"SY\", // Syria                                                                                       |
|                                                                                                        |
| \"UA-43\", // Crimea region (Ukraine)                                                                  |
|                                                                                                        |
| \"VE\", // Venezuela (specific SDN programs)                                                           |
|                                                                                                        |
| \"BY\", // Belarus                                                                                     |
|                                                                                                        |
| \"MM\", // Myanmar                                                                                     |
|                                                                                                        |
| \"ZW\", // Zimbabwe                                                                                    |
|                                                                                                        |
| \"SD\", // Sudan                                                                                       |
|                                                                                                        |
| \"SO\", // Somalia                                                                                     |
|                                                                                                        |
| \"YE\", // Yemen                                                                                       |
|                                                                                                        |
| \"LY\", // Libya                                                                                       |
|                                                                                                        |
| \"CD\", // Democratic Republic of Congo                                                                |
|                                                                                                        |
| \"CF\", // Central African Republic                                                                    |
|                                                                                                        |
| \];                                                                                                    |
|                                                                                                        |
| // Note: Russia, Venezuela, Belarus blocks are program-specific --- legal counsel must                 |
|                                                                                                        |
| // confirm full vs partial block for Marketeq\'s transaction types.                                    |
|                                                                                                        |
| async screenAddress(walletAddress: string): Promise\<void\> {                                          |
|                                                                                                        |
| const response = await fetch(                                                                          |
|                                                                                                        |
| \`\${process.env.CHAINALYSIS_API_BASE}/v1/address/\${walletAddress}\`,                                 |
|                                                                                                        |
| { headers: { \"X-API-Key\": process.env.CHAINALYSIS_API_KEY! } }                                       |
|                                                                                                        |
| );                                                                                                     |
|                                                                                                        |
| const data = await response.json();                                                                    |
|                                                                                                        |
| if (data.risk === \"severe\" \|\| data.ofacDesignated === true)                                        |
|                                                                                                        |
| throw new PayoutError(                                                                                 |
|                                                                                                        |
| \"Payout cannot be processed due to regulatory restrictions.\",                                        |
|                                                                                                        |
| HttpStatus.FORBIDDEN,                                                                                  |
|                                                                                                        |
| \"ERR_PAYOUT_OFAC_BLOCKED\",                                                                           |
|                                                                                                        |
| );                                                                                                     |
|                                                                                                        |
| }                                                                                                      |
+========================================================================================================+

# **7. Jurisdiction-Specific Payout Timing Laws**

+-----------------------------------------------------------------------+
| **Payout timing laws vary by state and country --- legal counsel      |
| required per jurisdiction**                                           |
|                                                                       |
| The table below reflects general principles. Specific obligations     |
| depend on whether                                                     |
|                                                                       |
| Marketeq is classified as an employer, platform, or marketplace in    |
| each jurisdiction.                                                    |
|                                                                       |
| California AB5, FLSA contractor classification, and EU Platform Work  |
| Directive                                                             |
|                                                                       |
| may impose mandatory payout timing requirements. Legal counsel must   |
| advise.                                                               |
+=======================================================================+

  ---------------------------------------------------------------------------------
  **Jurisdiction**   **Applicable law** **Timing           **Engineering
                                        requirement**      enforcement**
  ------------------ ------------------ ------------------ ------------------------
  **United States    No federal         No minimum         No automatic enforcement
  (general)**        mandatory payout   frequency          required. Schedule is
                     timing law for     required. Market   contractor-configured.
                     independent        standard.          
                     contractors.                          

  **California       CA Labor Code §    If reclassified as Not enforced in v1 ---
  (CA)**             204 (if workers    employees:         contractor
                     reclassified as    bi-weekly or       classification assumed.
                     employees under    semi-monthly       Legal counsel must
                     AB5). For          required.          monitor AB5 exposure.
                     contractors: no                       
                     mandatory timing.                     

  **New York (NY)**  NY Labor Law §     Manual workers:    Not enforced for
                     191. Employees     weekly. Clerical:  contractors in v1.
                     only.              semi-monthly.      
                                        Contractors: none. 

  **European Union** EU Platform Work   Varies by country. Not enforced in v1. EU
                     Directive (in      Monthly minimum in expansion requires legal
                     progress).         many EU states if  review before launch.
                     National labour    classified as      
                     law if workers     workers.           
                     reclassified.                         

  **United Kingdom** UK National        Monthly minimum    Not enforced in v1. UK
                     Minimum Wage Act / for workers. No    launch requires legal
                     Employment Rights  requirement for    review.
                     Act (if            self-employed.     
                     reclassified as                       
                     workers).                             

  **Australia**      Fair Work Act (if  Weekly or          Not enforced in v1. AU
                     workers            fortnightly for    launch requires legal
                     reclassified).     employees.         review.
  ---------------------------------------------------------------------------------

Engineering must build a jurisdiction flag on contractor profiles that
allows future enforcement rules to be applied per region without a full
code rewrite. The payout execution engine must be able to block a
scheduled payout if it would violate a future mandatory timing rule
(e.g. block monthly schedule if contractor\'s jurisdiction requires
weekly minimum payout).

# **8. W-9 and W-8BEN Collection Requirements**

## **8.1 What each form is for**

  ---------------------------------------------------------------------------
  **Form**         **Who provides     **What it           **When required**
                   it**               certifies**         
  ---------------- ------------------ ------------------- -------------------
  **W-9 (Request   US contractors     Certifies SSN or    Required before
  for Taxpayer     (individuals or    EIN. Certifies not  Marketeq can issue
  Identification   entities)          subject to backup   a 1099-NEC. Must be
  Number)**                           withholding.        collected before
                                                          YTD earnings reach
                                                          \$600.

  **W-8BEN         Non-US individual  Certifies non-US    Required from all
  (Certificate of  contractors        person status.      non-US individual
  Foreign Status                      Claims applicable   contractors before
  ---                                 tax treaty          any payout is
  Individuals)**                      benefits. Provides  processed.
                                      foreign TIN.        

  **W-8BEN-E       Non-US entity      Same as W-8BEN but  Required from
  (Certificate of  contractors        for legal entities. non-US company
  Foreign Status   (companies)                            contractors before
  --- Entities)**                                         any payout.
  ---------------------------------------------------------------------------

## **8.2 Engineering enforcement**

  -----------------------------------------------------------------------------------
  **Rule**              **Enforcement point**            **Error / gate**
  --------------------- -------------------------------- ----------------------------
  **US contractor must  kyc-identity-service Tier 2      ERR_KYC_TIER2_REQUIRED at
  provide W-9           check. payout-service gates on   payout initiation.
  (SSN/ITIN) before     Tier 2 status once               
  cumulative earnings   threshold_600_reached_at is set. 
  hit \$600**                                            

  **Non-US contractor   kyc-identity-service Tier 2      ERR_KYC_TIER2_REQUIRED at
  must provide W-8BEN   check. payout-service gates on   payout initiation.
  before any payout**   Tier 2 status from first payout. 

  **W-9/W-8BEN data     All tax identity data stored in  Architectural rule.
  must not be stored in kyc-identity-service only.       payout-service schema has no
  payout-service**      payout-service only reads a      SSN, ITIN, or W-8BEN fields.
                        status flag                      
                        (verified/pending/not_started)   
                        via internal API.                

  **W-9 validity ---    IRS TIN matching performed by    kyc-identity-service sets
  TIN must be verified  kyc-identity-service. If TIN     tier2.status = failed.
  against IRS TIN       does not match IRS records: Tier Backup withholding logic to
  Matching program**    2 status = failed. 24% backup    be implemented (see §5.1).
                        withholding required.            

  **W-8BEN              kyc-identity-service tracks      ERR_KYC_TIER2_REQUIRED with
  re-certification      w8ben_expires_at. Notifies       sub-reason W8BEN_EXPIRED.
  every 3 years**       contractor before expiry. If     
                        expired: Tier 2 status → expired 
                        → same gate as not_started.      

  **Secure storage of   W-9 and W-8BEN signed PDFs       kyc-identity-service
  signed forms**        stored in Cloudflare R2 (same as storage. Not payout-service
                        other KYC documents). AES-256    responsibility.
                        encrypted. 7-year retention.     
                        Access-logged.                   
  -----------------------------------------------------------------------------------

+-----------------------------------------------------------------------+
| typescript                                                            |
+-----------------------------------------------------------------------+
| // payout-service checks Tier 2 tax identity --- never reads the      |
| actual tax data                                                       |
|                                                                       |
| // Internal call to kyc-identity-service                              |
|                                                                       |
| // GET /internal/kyc/gate-status/:contractorId response (relevant     |
| Tier 2 fields):                                                       |
|                                                                       |
| {                                                                     |
|                                                                       |
| \"tier2\": {                                                          |
|                                                                       |
| \"status\": \"verified\" \| \"pending\" \| \"failed\" \|              |
| \"not_started\" \| \"expired\",                                       |
|                                                                       |
| \"subType\": \"ssn\" \| \"itin\" \| \"w8ben\" \| \"w8ben_e\" \| null, |
|                                                                       |
| \"blocksWithdrawal\": true \| false,                                  |
|                                                                       |
| \"subReason\": \"W8BEN_EXPIRED\" \| \"TIN_MISMATCH\" \| null //       |
| additional detail                                                     |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
|                                                                       |
| // payout-service reads blocksWithdrawal only --- never the actual    |
| TIN, SSN, or form data                                                |
+=======================================================================+

# **9. Crypto Payout Regulatory Classification by Jurisdiction**

+-----------------------------------------------------------------------+
| **Crypto regulation is rapidly evolving --- legal counsel review      |
| required before every jurisdiction expansion**                        |
|                                                                       |
| The table below reflects Marketeq\'s current understanding as of the  |
| document version date.                                                |
|                                                                       |
| Crypto regulations change frequently. MiCA implementation timelines,  |
| SEC enforcement actions,                                              |
|                                                                       |
| and new FinCEN guidance can materially change what is required.       |
|                                                                       |
| This section must be reviewed before any new jurisdiction is added to |
| the platform.                                                         |
+=======================================================================+

  --------------------------------------------------------------------------------
  **Jurisdiction**   **Classification of   **Regulatory     **Engineering
                     crypto payouts**      body**           implication**
  ------------------ --------------------- ---------------- ----------------------
  **United States**  Crypto payouts to     FinCEN           OFAC screening on all
                     contractors are       (federal). State crypto payouts (§6).
                     property transfers.   MTL requirements EDD for \>= \$10,000
                     If Marketeq converts  vary.            (§4). IRS: crypto
                     USD to crypto at                       payout FMV treated as
                     payout time: Marketeq                  ordinary income ---
                     may be acting as an                    1099-NEC issued for
                     MSB (money                             total USD equivalent.
                     transmitter) under                     No separate crypto tax
                     FinCEN rules. Legal                    form in v1.
                     counsel must                           
                     determine if a Money                   
                     Transmitter Licence                    
                     (MTL) is required per                  
                     state.                                 

  **European Union** MiCA (Markets in      European         Ramp and Transak hold
                     Crypto Assets         Securities and   MiCA authorisation ---
                     Regulation) ---       Markets          Marketeq relies on
                     effective Dec 2024.   Authority        bridge licensing. If
                     Marketeq issuing or   (ESMA) +         Marketeq uses direct
                     transferring crypto   national         treasury wallet: MiCA
                     to contractors may    competent        CASP registration may
                     require MiCA          authorities.     be required. Legal
                     authorisation as a                     counsel must advise
                     Crypto Asset Service                   before EU launch.
                     Provider (CASP).                       

  **United Kingdom** FCA registered VASP   Financial        Same as EU ---
                     (Virtual Asset        Conduct          Ramp/Transak hold FCA
                     Service Provider)     Authority (FCA). registration. Direct
                     required for crypto                    treasury wallet
                     activities. Marketeq                   transfers may require
                     must register with                     separate FCA
                     FCA if providing                       registration. Legal
                     crypto transfer                        counsel required.
                     services.                              

  **Canada**         FINTRAC VASP          FINTRAC.         Ramp/Transak hold
                     registration required                  FINTRAC registration.
                     for dealing in                         Marketeq must
                     virtual currency.                      determine if platform
                                                            activity triggers
                                                            independent FINTRAC
                                                            obligations.

  **Australia**      AUSTRAC registration  AUSTRAC.         Ramp/Transak hold
                     required for digital                   AUSTRAC registration.
                     currency exchange                      Same analysis as
                     providers.                             Canada.

  **All              Any crypto payout     OFAC (US).       Chainalysis wallet
  jurisdictions ---  from or to a                           screening at every
  OFAC**             sanctioned address or                  execution. Country
                     jurisdiction is                        block at method
                     prohibited under OFAC                  creation AND execution
                     regardless of local                    (§6).
                     crypto                                 
                     classification.                        
  --------------------------------------------------------------------------------

## **9.1 Contractor income tax reporting for crypto payouts**

  ------------------------------------------------------------------------------
  **Jurisdiction**   **Tax treatment of crypto   **Marketeq reporting
                     payout received**           obligation**
  ------------------ --------------------------- -------------------------------
  **United States**  Crypto received as          1099-NEC issued for total USD
                     compensation is ordinary    earnings including crypto
                     income at FMV on receipt    equivalent. Crypto payout USD
                     date (IRS Notice 2014-21).  value at execution date used.
                     Contractor reports on       FMV sourced from provider rate
                     Schedule C. Capital         at execution --- not
                     gains/losses on later       fawazahmed0 display rate.
                     disposal are the            
                     contractor\'s               
                     responsibility.             

  **European Union** Income tax on FMV at        No additional Marketeq
                     receipt. CGT on future      reporting obligation beyond
                     disposal. Varies by member  standard contractor payment
                     state.                      records. VAT implications may
                                                 apply --- legal counsel to
                                                 advise.

  **United Kingdom** Income tax on GBP FMV at    No additional Marketeq filing.
                     receipt. CGT on disposal    Contractor self-reports.
                     (HMRC Cryptoassets Manual). 

  **Canada**         Business income on CAD FMV  T4A issued for total earnings
                     at receipt (CRA).           equivalent.
  ------------------------------------------------------------------------------

# **10. Audit Log Requirements for Compliance**

Every regulated action must produce an immutable audit log entry. The
payout_audit_log table is the compliance record of everything
payout-service does. It must never be deleted or updated --- only
appended. Retention: 7 years minimum (BSA, IRS, and most state
requirements).

  ------------------------------------------------------------------------
  **Action**            **audit_log entry           **Retention**
                        required**                  
  --------------------- --------------------------- ----------------------
  **Payout initiated**  actorId, contractorId,      7 years
                        amount, methodType,         
                        initiatedAt                 

  **Payout completed**  payoutRequestId,            7 years
                        externalTransactionId,      
                        settledAt, bridgeUsed       

  **Payout failed**     payoutRequestId,            7 years
                        failureCode, failedAt       

  **EDD triggered**     payoutRequestId, amount,    7 years
                        triggeredAt                 

  **EDD reviewed**      payoutRequestId,            7 years
                        reviewerId, decision,       
                        reviewedAt                  

  **OFAC blocked**      contractorId, blockedAt,    7 years
                        blockReason (no PII about   
                        the specific SDN match)     

  **ACH return          payoutRequestId,            7 years
  received**            returnCode, receivedAt      

  **Magic link          payoutRequestId, verifiedAt 7 years
  verified**            (no token value ever        
                        logged)                     

  **Method deactivated  contractorId,               7 years
  (any reason)**        depositMethodId, reason,    
                        deactivatedAt               

  **First-payout hold   contractorId, appliedAt,    7 years
  applied / released**  releasedAt                  

  **Dispute lock        contractorId, earningsId,   7 years
  applied / released**  lockReason, appliedAt,      
                        releasedAt                  

  **Backup withholding  contractorId, amount,       7 years
  applied (if           taxYear, appliedAt          
  implemented)**                                    
  ------------------------------------------------------------------------

+-----------------------------------------------------------------------+
| typescript                                                            |
+-----------------------------------------------------------------------+
| // payout_audit_log --- append-only, never update or delete           |
|                                                                       |
| CREATE TABLE payout_audit_log (                                       |
|                                                                       |
| id UUID PRIMARY KEY DEFAULT gen_random_uuid(),                        |
|                                                                       |
| contractor_id UUID NOT NULL,                                          |
|                                                                       |
| actor_type VARCHAR(16) NOT NULL, \-- system \| admin \| contractor    |
|                                                                       |
| actor_id VARCHAR(64) NOT NULL, \-- userId or service name             |
|                                                                       |
| action VARCHAR(64) NOT NULL, \-- edd.triggered \| ofac.blocked \|     |
| ach.return \| etc.                                                    |
|                                                                       |
| payout_request_id UUID, \-- nullable --- not all events relate to a   |
| payout                                                                |
|                                                                       |
| metadata JSONB, \-- action-specific detail. NEVER include raw tokens, |
| TINs, SSNs.                                                           |
|                                                                       |
| occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW()                        |
|                                                                       |
| );                                                                    |
|                                                                       |
| \-- Partition by occurred_at year for performance at scale            |
|                                                                       |
| \-- Index for compliance queries                                      |
|                                                                       |
| CREATE INDEX idx_pal_contractor ON payout_audit_log(contractor_id,    |
| occurred_at);                                                         |
|                                                                       |
| CREATE INDEX idx_pal_action ON payout_audit_log(action, occurred_at); |
|                                                                       |
| \-- Row-level security: audit log is readable by compliance role only |
|                                                                       |
| \-- No application user or admin can DELETE from this table           |
|                                                                       |
| \-- Retention enforced by data retention job that archives to cold    |
| storage after 7 years                                                 |
|                                                                       |
| \-- Never purges --- archives only                                    |
+=======================================================================+

# **11. Pre-Launch Compliance Checklist --- Engineering**

  ------------------------------------------------------------------------
  **Item**                    **Owner**          **Status**
  --------------------------- ------------------ -------------------------
  **OFAC blocked country list Engineering +      Required before launch
  reviewed and confirmed with Legal              
  legal counsel**                                

  **Chainalysis API           Engineering        Required before crypto
  integrated and tested for                      payout launch
  wallet screening**                             

  **EDD \$10,000 threshold    Engineering +      Required before launch
  routing tested end-to-end   Compliance         
  with compliance dashboard**                    

  **IRS 1099 data export      Engineering +      Required before first tax
  pipeline built and tested   Finance            year end
  with 1099 filing vendor**                      

  **W-9/W-8BEN gate enforced  Engineering        Required before launch
  at \$600 YTD threshold ---                     
  tested**                                       

  **Backup withholding logic  Engineering +      Required before first
  implemented for TIN         Legal              \$600 YTD contractor ---
  mismatch (24%)**                               legal counsel to confirm
                                                 timeline

  **ACH return code handler   Engineering        Required before bank
  implemented and tested for                     payout launch
  all return codes in §2.2**                     

  **Stripe webhook signature  Engineering        Required before any live
  validation enabled in                          transaction
  production**                                   

  **payout_audit_log          Engineering / DBA  Required before launch
  append-only enforcement (no                    
  DELETE/UPDATE grants)**                        

  **7-year audit log          Engineering /      Required before launch
  retention and cold storage  Infra              
  archive configured**                           

  **Contractor ToS includes   Legal + Product    Required before
  all P0 disclosures from                        contractor onboarding
  PS-20 §11**                                    

  **MSB licence determination Legal              Required before launch
  completed by legal counsel                     
  for all launch states**                        

  **Unclaimed property        Finance + Legal +  Required before first
  compliance programme        Engineering        dormancy threshold
  established (PS-20 §8)**                       

  **Stripe account KYB        Finance / Ops      Required before first
  completed and account in                       live transaction
  charges_enabled +                              
  payouts_enabled state**                        
  ------------------------------------------------------------------------

# **12. References**

  --------------------------------------------------------------------------------------------------------------------------------------------
  **Document /           **Relevant to**
  Resource**             
  ---------------------- ---------------------------------------------------------------------------------------------------------------------
  **PS-15 ---            EDD trigger. W-9/W-8BEN Tier 2 gate. First-payout hold.
  KYC-Identity Gating**  

  **PS-20 --- Fund       Fund holding legal classification. Unclaimed property. ToS requirements.
  Custody & Business     
  Rules**                

  **PS-12 --- Crypto     OFAC wallet screening implementation. Bridge provider licensing.
  Payout Settlement**    

  **PS-08 ---            NACHA account ownership verification.
  Micro-Deposit          
  Verification**         

  **FinCEN BSA / CTR     https://www.fincen.gov/resources/statutes-regulations/guidance/currency-transaction-report
  requirements**         

  **OFAC SDN list**      https://home.treasury.gov/policy-issues/financial-sanctions/specially-designated-nationals-and-blocked-persons-list

  **IRS 1099-NEC         https://www.irs.gov/instructions/i1099mec
  instructions**         

  **IRS Notice 2014-21   https://www.irs.gov/pub/irs-drop/n-14-21.pdf
  (crypto)**             

  **NACHA Operating      https://www.nacha.org/rules
  Rules**                

  **Chainalysis KYT      https://docs.chainalysis.com/api/kyt
  API**                  

  **MiCA regulation      https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32023R1114
  (EU)**                 
  --------------------------------------------------------------------------------------------------------------------------------------------

CONFIDENTIAL --- Marketeq Internal Engineering Documentation \|
payout-service PS-21 \| v1.0
