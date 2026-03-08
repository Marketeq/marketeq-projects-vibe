**[MARKETEQ PLATFORM --- BACKEND DOCUMENTATION]{.smallcaps}**

**payout-service**

PS-24 --- Error States & HTTP Error Catalog

  -----------------------------------------------------------------------
  **Property**        **Value**
  ------------------- ---------------------------------------------------
  **Document**        PS-24 --- Error States & HTTP Error Catalog

  **Version**         1.0

  **Applies to**      All payout-service API endpoints. All payout flows.

  **Error format**    JSON: { error: { code, message, userMessage,
                      recoveryAction, metadata } }

  **Error code        ERR\_ prefix. SCREAMING_SNAKE_CASE. Service-scoped
  convention**        (no collision with other services).

  **User-facing       Contractor-safe. Never expose internal state, stack
  messages**          traces, or raw third-party errors.

  **Recovery CTAs**   Every user-facing error includes a recovery action
                      the contractor can take.

  **Prerequisites**   PS-02 through PS-23
  -----------------------------------------------------------------------

# **1. Overview**

This document is the definitive error catalog for payout-service. Every
error the service can return is listed here with its HTTP status code,
internal error code string, developer-facing message, contractor-facing
message, recovery CTA, and any metadata fields included in the response
body. Errors are grouped by category. The frontend must map every ERR\_
code to a UI state --- never display the raw internal error code or
developer message to a contractor.

+-----------------------------------------------------------------------+
| **Error response envelope --- all errors use this shape**             |
|                                                                       |
| Every error response from payout-service uses the same JSON envelope: |
|                                                                       |
| {                                                                     |
|                                                                       |
| \"error\": {                                                          |
|                                                                       |
| \"code\": \"ERR_INSUFFICIENT_FUNDS\", // internal code --- for        |
| frontend mapping and logging                                          |
|                                                                       |
| \"message\": \"Contractor balance \...\", // developer message ---    |
| for logs, never shown to contractor                                   |
|                                                                       |
| \"userMessage\": \"Your balance is too low\...\", // contractor-safe  |
| copy                                                                  |
|                                                                       |
| \"recoveryAction\": {                                                 |
|                                                                       |
| \"label\": \"View your balance\",                                     |
|                                                                       |
| \"url\": \"/earnings\"                                                |
|                                                                       |
| },                                                                    |
|                                                                       |
| \"metadata\": { \... } // optional --- error-specific detail          |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
+=======================================================================+

# **2. Standard Error Response Format**

+-----------------------------------------------------------------------+
| typescript                                                            |
+-----------------------------------------------------------------------+
| // src/errors/payout-error.ts                                         |
|                                                                       |
| // Folder: /apps/payout-service/src/errors/                           |
|                                                                       |
| export class PayoutError extends Error {                              |
|                                                                       |
| constructor(                                                          |
|                                                                       |
| public readonly developerMessage: string,                             |
|                                                                       |
| public readonly httpStatus: HttpStatus,                               |
|                                                                       |
| public readonly code: string,                                         |
|                                                                       |
| public readonly metadata?: Record\<string, unknown\>,                 |
|                                                                       |
| ) {                                                                   |
|                                                                       |
| super(developerMessage);                                              |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
|                                                                       |
| // Global exception filter serialises all PayoutError instances to:   |
|                                                                       |
| {                                                                     |
|                                                                       |
| \"error\": {                                                          |
|                                                                       |
| \"code\": string, // ERR\_\* constant                                 |
|                                                                       |
| \"message\": string, // developerMessage --- logged server-side,      |
| excluded from prod response bodies                                    |
|                                                                       |
| \"userMessage\": string, // contractor-safe copy --- looked up from   |
| ERROR_COPY map by code                                                |
|                                                                       |
| \"recoveryAction\": {                                                 |
|                                                                       |
| \"label\": string,                                                    |
|                                                                       |
| \"url\": string                                                       |
|                                                                       |
| } \| null,                                                            |
|                                                                       |
| \"metadata\": object \| null // error-specific fields --- safe for    |
| client consumption                                                    |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
|                                                                       |
| // ERROR_COPY map --- all user messages and recovery actions defined  |
| here                                                                  |
|                                                                       |
| // Never inline user messages in throw statements --- always look up  |
| from this map                                                         |
|                                                                       |
| export const ERROR_COPY: Record\<string, { userMessage: string;       |
| recoveryAction: { label: string; url: string } \| null }\> = {        |
|                                                                       |
| ERR_INSUFFICIENT_FUNDS: {                                             |
|                                                                       |
| userMessage: \"Your available balance is too low for this             |
| withdrawal.\",                                                        |
|                                                                       |
| recoveryAction: { label: \"View your balance\", url: \"/earnings\" }, |
|                                                                       |
| },                                                                    |
|                                                                       |
| // \... all codes below                                               |
|                                                                       |
| };                                                                    |
+=======================================================================+

# **3. Balance & Amount Errors**

  ----------------------------------------------------------------------------------------------------------------------------------
  **Error code**                              **HTTP**   **Developer    **User-facing   **Recovery CTA**     **Metadata fields**
                                                         message**      message**                            
  ------------------------------------------- ---------- -------------- --------------- -------------------- -----------------------
  **ERR_INSUFFICIENT_FUNDS**                  422        Requested      Your available  View your balance →  availableBalanceUSD,
                                                         amount exceeds balance is too  /earnings            requestedAmountUSD,
                                                         contractor     low for this                         reserveAmountUSD
                                                         available      withdrawal.                          
                                                         balance after                                       
                                                         reserve.                                            

  **ERR_INSUFFICIENT_FUNDS_AFTER_FEE**        422        Available      After fees,     View your balance →  availableBalanceUSD,
                                                         balance after  your balance is /earnings            requestedAmountUSD,
                                                         deducting      not enough to                        feeAmountUSD,
                                                         applicable fee complete this                        amountAfterFeeUSD
                                                         is below       withdrawal. Try                      
                                                         requested      a smaller                            
                                                         amount.        amount.                              

  **ERR_BELOW_MINIMUM_AMOUNT**                422        Requested      The minimum     None --- inline form minimumAmountUSD: 50,
                                                         withdrawal     withdrawal      error                requestedAmountUSD
                                                         amount is      amount is                            
                                                         below the      \$50.00. Please                      
                                                         \$50.00        enter a higher                       
                                                         minimum.       amount.                              

  **ERR_BELOW_SCHEDULE_MINIMUM**              422        Schedule       Your minimum    Update schedule →    minimumAllowedUSD: 50,
                                                         threshold      payout          /settings/payouts    requestedThresholdUSD
                                                         amount is      threshold must                       
                                                         below the      be at least                          
                                                         \$50.00        \$50.00.                             
                                                         minimum for                                         
                                                         scheduled                                           
                                                         payouts.                                            

  **ERR_RESERVE_TOO_LOW**                     422        Reserve amount Your reserve    Update schedule →    availableBalanceUSD,
                                                         exceeds        amount is       /settings/payouts    reserveAmountUSD
                                                         contractor     higher than                          
                                                         available      your available                       
                                                         balance --- no balance. Lower                       
                                                         funds          your reserve or                      
                                                         available      earn more to                         
                                                         after reserve. withdraw.                            

  **ERR_INSUFFICIENT_BALANCE_AT_EXECUTION**   422        Balance        Your balance    Start new withdrawal availableBalanceUSD,
                                                         changed        changed before  → /earnings/withdraw requiredAmountUSD
                                                         between        your withdrawal                      
                                                         initiation and could be sent.                       
                                                         execution ---  Please start a                       
                                                         insufficient   new withdrawal.                      
                                                         funds at                                            
                                                         execution                                           
                                                         time.                                               
  ----------------------------------------------------------------------------------------------------------------------------------

# **4. Deposit Method Errors**

  ---------------------------------------------------------------------------------------------------------------------------------------------------------------
  **Error code**                             **HTTP**   **Developer message** **User-facing    **Recovery CTA**                             **Metadata fields**
                                                                              message**                                                     
  ------------------------------------------ ---------- --------------------- ---------------- -------------------------------------------- ---------------------
  **ERR_METHOD_NOT_FOUND**                   404        depositMethodId not   We couldn\'t     View payout methods → /settings/payouts      depositMethodId
                                                        found for this        find that payout                                              
                                                        contractorId.         method on your                                                
                                                                              account.                                                      

  **ERR_METHOD_NOT_VERIFIED**                403        Deposit method exists This payout      Verify method →                              depositMethodId,
                                                        but                   method hasn\'t   /settings/payouts?verify={depositMethodId}   verificationStatus,
                                                        verificationStatus is been verified                                                 methodType
                                                        not VERIFIED.         yet. Please                                                   
                                                                              complete                                                      
                                                                              verification                                                  
                                                                              before                                                        
                                                                              withdrawing.                                                  

  **ERR_METHOD_REAUTH_REQUIRED**             403        OAuth deposit method  Your             Reconnect {providerName} →                   depositMethodId,
                                                        has                   {providerName}   /settings/payouts?reauth={depositMethodId}   methodType,
                                                        reauthRequired=true   connection has                                                providerName
                                                        --- token expired or  expired.                                                      
                                                        revoked.              Reconnect to                                                  
                                                                              resume payouts.                                               

  **ERR_METHOD_DEACTIVATED**                 422        Deposit method        This payout      Update payout method → /settings/payouts     depositMethodId,
                                                        isActive=false.       method is no                                                  methodType
                                                                              longer active.                                                
                                                                              Please add or                                                 
                                                                              select a                                                      
                                                                              different                                                     
                                                                              method.                                                       

  **ERR_DEPOSIT_METHOD_LIMIT_REACHED**       422        Contractor already    You\'ve reached  Manage methods → /settings/payouts           
                                                        has 5 active deposit  the maximum of 5                                              
                                                        methods --- cannot    payout methods.                                               
                                                        add more.             Remove one                                                    
                                                                              before adding                                                 
                                                                              another.                                                      

  **ERR_CANNOT_REMOVE_DEFAULT_WITH_SPLIT**   409        Cannot delete default You can\'t       Add method → /settings/payouts/add           depositMethodId
                                                        method while split is remove your only                                              
                                                        active and no other   active payout                                                 
                                                        verified method       method. Add                                                   
                                                        exists.               another method                                                
                                                                              first.                                                        

  **ERR_CANNOT_REMOVE_ONLY_METHOD**          409        Contractor has only   You must have at Add method → /settings/payouts/add           
                                                        one active deposit    least one payout                                              
                                                        method --- cannot     method. Add                                                   
                                                        remove it.            another method                                                
                                                                              before removing                                               
                                                                              this one.                                                     

  **ERR_NO_DEFAULT_METHOD**                  422        No deposit method is  You don\'t have  Set default → /settings/payouts              contractorId
                                                        marked                a default payout                                              
                                                        is_default=true on    method set. Add                                               
                                                        this account.         or select a                                                   
                                                                              default method                                                
                                                                              to continue.                                                  
  ---------------------------------------------------------------------------------------------------------------------------------------------------------------

# **5. KYC & Identity Gate Errors**

  ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------
  **Error code**                    **HTTP**   **Developer message**  **User-facing   **Recovery CTA**                             **Metadata fields**
                                                                      message**                                                    
  --------------------------------- ---------- ---------------------- --------------- -------------------------------------------- -------------------------------------------
  **ERR_KYC_TIER1_REQUIRED**        403        Contractor has not     You need to     Verify identity → /settings/identity         tier1Status: \"not_started\" \| \"pending\"
                                               passed Tier 1          verify your                                                  \| \"failed\"
                                               government ID          identity before                                              
                                               verification.          withdrawing.                                                 
                                                                      This is a                                                    
                                                                      one-time step.                                               

  **ERR_KYC_TIER2_REQUIRED**        403        Contractor has not     You need to add Add tax info → /settings/identity/tax        tier2Status, subType:
                                               completed Tier 2 tax   your tax                                                     \"ssn\"\|\"itin\"\|\"w8ben\", subReason:
                                               identity. May include  information                                                  \"W8BEN_EXPIRED\"\|\"TIN_MISMATCH\"\|null
                                               subReason for W8BEN    before                                                       
                                               expiry or TIN          withdrawing.                                                 
                                               mismatch.                                                                           

  **ERR_KYC_TIER3_REQUIRED**        403        Tier 3 bank account    Your bank       Verify bank →                                depositMethodId, tier3Status
                                               ownership not verified account hasn\'t /settings/payouts?verify={depositMethodId}   
                                               for the selected       been verified                                                
                                               deposit method.        yet. Complete                                                
                                                                      verification to                                              
                                                                      withdraw to                                                  
                                                                      this account.                                                

  **ERR_KYC_SERVICE_UNAVAILABLE**   503        Internal HTTP call to  We\'re unable   Try again → /earnings/withdraw               retryAfterSeconds: 60
                                               kyc-identity-service   to process your                                              
                                               failed or timed out.   withdrawal                                                   
                                                                      right now due                                                
                                                                      to a temporary                                               
                                                                      issue. Please                                                
                                                                      try again in a                                               
                                                                      few minutes.                                                 
  ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------

# **6. Magic Link Errors**

  -----------------------------------------------------------------------------------------------------------------------
  **Error code**                    **HTTP**   **Developer message**  **User-facing   **Recovery CTA**     **Metadata
                                                                      message**                            fields**
  --------------------------------- ---------- ---------------------- --------------- -------------------- --------------
  **ERR_MAGIC_LINK_EXPIRED**        410        Magic link token not   This            Start new withdrawal 
                                               found in Redis --- TTL verification    → /earnings/withdraw 
                                               elapsed.               link has                             
                                                                      expired. Please                      
                                                                      start your                           
                                                                      withdrawal                           
                                                                      again.                               

  **ERR_MAGIC_LINK_ALREADY_USED**   410        Redis DEL returned 0   This            View payout status → 
                                               or DB used=true ---    verification    /earnings/history    
                                               token already          link has                             
                                               consumed.              already been                         
                                                                      used. Check                          
                                                                      your payout                          
                                                                      status to see                        
                                                                      if your                              
                                                                      withdrawal was                       
                                                                      completed.                           

  **ERR_MAGIC_LINK_INVALID**        422        Token hash produced no This            Start new withdrawal 
                                               Redis or DB record --- verification    → /earnings/withdraw 
                                               malformed or           link is not                          
                                               fabricated token.      valid. Please                        
                                                                      start your                           
                                                                      withdrawal                           
                                                                      again.                               

  **ERR_MAGIC_LINK_RESEND_LIMIT**   429        POST                   You\'ve         Start new withdrawal resendCount:
                                               /resend-verification   requested too   → /earnings/withdraw 3, maxResends:
                                               called more than 3     many                                 3
                                               times for same         verification                         
                                               payoutRequestId.       emails. Please                       
                                                                      start a new                          
                                                                      withdrawal                           
                                                                      instead.                             
  -----------------------------------------------------------------------------------------------------------------------

# **7. Payout Hold & Pause Errors**

  --------------------------------------------------------------------------------------------------------------------------------------------------------------------------
  **Error code**                          **HTTP**   **Developer message**            **User-facing    **Recovery CTA**                             **Metadata fields**
                                                                                      message**                                                     
  --------------------------------------- ---------- -------------------------------- ---------------- -------------------------------------------- ------------------------
  **ERR_PAYOUT_HOLD_ACTIVE**              403        First-payout 5-business-day hold Your first       None --- hold cannot be self-resolved        holdReleasesAt: ISO
                                                     is active for this contractor.   withdrawal is                                                 8601,
                                                                                      being held for                                                businessDaysRemaining:
                                                                                      security                                                      number
                                                                                      verification. It                                              
                                                                                      will be released                                              
                                                                                      on                                                            
                                                                                      {releaseDate}.                                                

  **ERR_PAYOUT_NO_DEFAULT_METHOD**        403        NO_DEFAULT_METHOD pause          Your payouts are Set default method → /settings/payouts       
                                                     condition active.                paused. You                                                   
                                                                                      don\'t have a                                                 
                                                                                      default payout                                                
                                                                                      method set.                                                   

  **ERR_PAYOUT_METHOD_DEACTIVATED**       403        DEFAULT_METHOD_DEACTIVATED pause Your payouts are Update payout method → /settings/payouts     
                                                     condition active.                paused. Your                                                  
                                                                                      default payout                                                
                                                                                      method has been                                               
                                                                                      deactivated.                                                  

  **ERR_PAYOUT_METHOD_REAUTH_REQUIRED**   403        DEFAULT_METHOD_REAUTH_REQUIRED   Your payouts are Reconnect {providerName} →                   providerName,
                                                     pause condition active.          paused. Your     /settings/payouts?reauth={depositMethodId}   depositMethodId
                                                                                      {providerName}                                                
                                                                                      connection has                                                
                                                                                      expired.                                                      

  **ERR_PAYOUT_OFAC_BLOCKED**             403        OFAC flag active --- contractor  Your payout      Contact support →                            
                                                     or wallet address matches        cannot be        https://support.marketeq.com                 
                                                     sanctions screening.             processed due to                                              
                                                                                      regulatory                                                    
                                                                                      restrictions.                                                 
                                                                                      Please contact                                                
                                                                                      support.                                                      

  **ERR_PAYOUT_ACCOUNT_SUSPENDED**        403        ACCOUNT_SUSPENDED pause          Your account has Contact support →                            
                                                     condition active --- set in      been suspended   https://support.marketeq.com                 
                                                     user-service.                    and payouts are                                               
                                                                                      unavailable.                                                  
                                                                                      Please contact                                                
                                                                                      support.                                                      
  --------------------------------------------------------------------------------------------------------------------------------------------------------------------------

# **8. Rate Limit & EDD Errors**

  -----------------------------------------------------------------------------------------------------------------------------------------
  **Error code**                  **HTTP**         **Developer message** **User-facing   **Recovery CTA**    **Metadata fields**
                                                                         message**                           
  ------------------------------- ---------------- --------------------- --------------- ------------------- ------------------------------
  **ERR_WITHDRAWAL_RATE_LIMIT**   429              Contractor has        You\'ve reached Try again later --- retryAfterSeconds: remaining
                                                   exceeded 5 manual     the maximum of  no CTA link         TTL of Redis rate-limit key
                                                   withdrawals in a      5 withdrawals                       
                                                   rolling 60-minute     per hour.                           
                                                   window.               Please try                          
                                                                         again later.                        

  **ERR_EDD_REVIEW_PENDING**      202 (not an      Amount \>= \$10,000   Your withdrawal View status →       payoutRequestId,
                                  error ---        EDD threshold. Payout is under        /earnings/history   estimatedReviewBusinessDays: 2
                                  informational)   created with          review. Large                       
                                                   status=awaiting_edd   withdrawals are                     
                                                   and routed to         reviewed by our                     
                                                   compliance queue.     compliance                          
                                                                         team. This                          
                                                                         usually takes                       
                                                                         1--2 business                       
                                                                         days.                               
  -----------------------------------------------------------------------------------------------------------------------------------------

# **9. Split Payout Configuration Errors**

  -------------------------------------------------------------------------------------------------------------------------------------------------------
  **Error code**                       **HTTP**   **Developer message** **User-facing   **Recovery CTA**                             **Metadata fields**
                                                                        message**                                                    
  ------------------------------------ ---------- --------------------- --------------- -------------------------------------------- --------------------
  **ERR_SPLIT_PERCENT_OUT_OF_RANGE**   422        primarySplitPercent   Each payout     Update split → /settings/payouts             submittedValue,
                                                  not in range          account must                                                 truncatedValue,
                                                  0.01--99.99 after     receive between                                              allowedMin: 0.01,
                                                  truncation to 2dp.    0.01% and                                                    allowedMax: 99.99
                                                                        99.99%.                                                      

  **ERR_SPLIT_SAME_METHOD**            409        primaryMethodId and   You can\'t      Update split → /settings/payouts             primaryMethodId,
                                                  secondaryMethodId are split your                                                   secondaryMethodId
                                                  the same UUID.        payout between                                               
                                                                        the same                                                     
                                                                        account twice.                                               
                                                                        Please choose                                                
                                                                        two different                                                
                                                                        accounts.                                                    

  **ERR_SPLIT_NO_SECONDARY_METHOD**    422        splitEnabled=true     Please select a Update split → /settings/payouts             
                                                  submitted without a   second payout                                                
                                                  secondaryMethodId.    account to                                                   
                                                                        enable split                                                 
                                                                        payouts.                                                     

  **ERR_SPLIT_METHOD_NOT_VERIFIED**    422        secondaryMethodId     Your second     Verify method →                              depositMethodId,
                                                  exists but is not     payout account  /settings/payouts?verify={depositMethodId}   verificationStatus
                                                  active and verified.  hasn\'t been                                                 
                                                                        verified yet.                                                
                                                                        Verify it                                                    
                                                                        before enabling                                              
                                                                        split payouts.                                               

  **ERR_SPLIT_ROUNDING_FAULT**         500        Split amount          We encountered  Try again → /earnings/withdraw               balanceUSD,
                                                  calculation produced  an issue                                                     primaryUSD,
                                                  a sum that does not   calculating                                                  secondaryUSD, sumUSD
                                                  equal the original    your payout                                                  
                                                  balance --- floating  split. Our team                                              
                                                  point fault.          has been                                                     
                                                                        alerted. Please                                              
                                                                        try again.                                                   
  -------------------------------------------------------------------------------------------------------------------------------------------------------

# **10. Crypto-Specific Errors**

  ----------------------------------------------------------------------------------------------------------------------------------------
  **Error code**                         **HTTP**   **Developer       **User-facing    **Recovery CTA**               **Metadata fields**
                                                    message**         message**                                       
  -------------------------------------- ---------- ----------------- ---------------- ------------------------------ --------------------
  **ERR_CRYPTO_ADDRESS_INVALID**         422        Wallet address    The wallet       Inline form error              network,
                                                    failed regex      address you                                     submittedAddress,
                                                    validation or     entered doesn\'t                                validationRule
                                                    EIP-55 checksum   look right for                                  
                                                    for the specified {networkName}.                                  
                                                    network.          Please                                          
                                                                      double-check it.                                

  **ERR_CRYPTO_NETWORK_UNSUPPORTED**     422        Specified network We don\'t        View supported networks →      requestedNetwork,
                                                    is not in the     support payouts  /settings/payouts/crypto       supportedNetworks:
                                                    supported network to {networkName}                                string\[\]
                                                    list for          yet.                                            
                                                    payout-service.                                                   

  **ERR_CRYPTO_WALLETCONNECT_EXPIRED**   410        WalletConnect QR  Your wallet      Try again →                    
                                                    session TTL       connection timed /settings/payouts/add/crypto   
                                                    elapsed ---       out. Please scan                                
                                                    session no longer the QR code                                     
                                                    valid.            again.                                          

  **ERR_GAS_TOO_HIGH**                   422        Estimated gas fee Gas fees are     View status →                  estimatedGasUSD,
                                                    exceeds 10% of    unusually high   /earnings/history              payoutAmountUSD,
                                                    payout amount --- right now and                                   gasPercentage,
                                                    gas spike         would take more                                 retryAfterMinutes:
                                                    protection        than 10% of your                                30
                                                    triggered.        payout. Your                                    
                                                                      withdrawal has                                  
                                                                      been queued and                                 
                                                                      will retry when                                 
                                                                      fees are lower.                                 

  **ERR_CRYPTO_BRIDGE_UNAVAILABLE**      503        Selected bridge   The crypto       Try again → /earnings/withdraw bridgeProvider,
                                                    provider          payout service                                  retryAfterSeconds:
                                                    (Ramp/Transak)    is temporarily                                  300
                                                    returned an error unavailable.                                    
                                                    or is             Please try again                                
                                                    unreachable.      in a few                                        
                                                                      minutes.                                        

  **ERR_CRYPTO_TX_FAILED**               422        On-chain          Your crypto      Try again → /earnings/withdraw txHash: null or
                                                    transaction       transfer failed                                 partial, network,
                                                    rejected or       on the                                          failureReason
                                                    dropped by the    blockchain                                      
                                                    network.          network. Your                                   
                                                                      balance has not                                 
                                                                      been changed.                                   
                                                                      Please try                                      
                                                                      again.                                          
  ----------------------------------------------------------------------------------------------------------------------------------------

# **11. Debit Card Errors**

  -------------------------------------------------------------------------------------------------------------------------------------------
  **Error code**                      **HTTP**   **Developer       **User-facing   **Recovery CTA**                  **Metadata fields**
                                                 message**         message**                                         
  ----------------------------------- ---------- ----------------- --------------- --------------------------------- ------------------------
  **ERR_CARD_NOT_ACTIVATED**          403        Stripe card       Your Marketeq   Activate card →                   depositMethodId
                                                 status is         card hasn\'t    /settings/payouts/card/activate   
                                                 inactive --- card been activated                                    
                                                 not yet activated yet. Activate                                     
                                                 by contractor.    it before                                         
                                                                   withdrawing to                                    
                                                                   it.                                               

  **ERR_CARD_NOT_FOUND**              404        depositMethodId   We couldn\'t    Contact support →                 depositMethodId
                                                 does not map to a find your       https://support.marketeq.com      
                                                 DEBIT_CARD method Marketeq card.                                    
                                                 for this          Please contact                                    
                                                 contractor.       support if this                                   
                                                                   is unexpected.                                    

  **ERR_CARD_ALREADY_EXISTS**         409        Contractor        You already     Manage your card →                
                                                 already has one   have a Marketeq /settings/payouts/card            
                                                 active DEBIT_CARD card. You can                                     
                                                 method. One card  only have one                                     
                                                 per contractor in active card at                                    
                                                 v1.               a time.                                           

  **ERR_CARD_ALREADY_ACTIVE**         409        POST /activate    Your card is    None                              
                                                 called on a card  already active.                                   
                                                 already in                                                          
                                                 VERIFIED state.                                                     

  **ERR_CARD_ACTIVATION_MISMATCH**    422        Last 4 digits     The card        Try again →                       attemptsRemaining:
                                                 entered during    details you     /settings/payouts/card/activate   number
                                                 activation do not entered don\'t                                    
                                                 match Stripe card match. Please                                     
                                                 record.           check and try                                     
                                                                   again.                                            

  **ERR_CARD_FROZEN**                 422        Payout attempted  Your card is    Unfreeze card →                   depositMethodId
                                                 to a frozen       frozen and      /settings/payouts/card            
                                                 (Stripe inactive) can\'t receive                                    
                                                 card.             payouts.                                          
                                                                   Unfreeze your                                     
                                                                   card first.                                       

  **ERR_CARD_CANCELED**               422        Payout attempted  Your card has   Request replacement →             depositMethodId
                                                 to a cancelled    been cancelled  /settings/payouts/card            
                                                 card.             and can\'t                                        
                                                                   receive                                           
                                                                   payouts.                                          
                                                                   Request a                                         
                                                                   replacement                                       
                                                                   card.                                             

  **ERR_CARD_BALANCE_CAP_EXCEEDED**   422        Payout would push Your card       None --- contractor must spend    currentCardBalanceUSD,
                                                 card spending     balance is near down balance                      payoutAmountUSD, capUSD:
                                                 balance above the its limit.                                        10000
                                                 \$10,000 cap.     Spend down your                                   
                                                                   card balance                                      
                                                                   before adding                                     
                                                                   more funds.                                       

  **ERR_CARD_GEO_UNAVAILABLE**        422        Contractor is not The Marketeq    None                              contractorCountry
                                                 a US contractor   card is                                           
                                                 --- debit card    currently                                         
                                                 not available in  available to US                                   
                                                 their region.     contractors                                       
                                                                   only.                                             

  **ERR_CARD_KYC_REQUIRED**           403        KYC not passed    You need to     Verify identity →                 tier1Status
                                                 --- Stripe        complete        /settings/identity                
                                                 Issuing requires  identity                                          
                                                 verified          verification                                      
                                                 cardholder        before                                            
                                                 identity.         requesting a                                      
                                                                   Marketeq card.                                    
  -------------------------------------------------------------------------------------------------------------------------------------------

# **12. Bank Field Validation Errors**

  -------------------------------------------------------------------------------------------------------------
  **Error code**                   **HTTP**   **User-facing   **Recovery   **Applies to**      
                                              message**       CTA**                            
  -------------------------------- ---------- --------------- ------------ ------------------- ----------------
  **ERR_INVALID_ROUTING_NUMBER**   422        Your routing    Inline form  US bank accounts    
                                              number doesn\'t error                            
                                              look right. It                                   
                                              should be 9                                      
                                              digits.                                          

  **ERR_INVALID_ACCOUNT_NUMBER**   422        Your account    Inline form  US bank accounts    
                                              number should   error                            
                                              be between 4                                     
                                              and 17 digits.                                   

  **ERR_INVALID_IBAN**             422        The IBAN you    Inline form  International bank  
                                              entered isn\'t  error        accounts            
                                              valid. Please                                    
                                              check the                                        
                                              format and                                       
                                              check digits.                                    

  **ERR_INVALID_SWIFT**            422        The SWIFT/BIC   Inline form  International bank  
                                              code should be  error        accounts            
                                              8 or 11                                          
                                              characters.                                      

  **ERR_INVALID_IFSC**             422        The IFSC code   Inline form  India bank accounts 
                                              should be 11    error                            
                                              characters                                       
                                              (e.g.                                            
                                              SBIN0001234).                                    

  **ERR_INVALID_SORT_CODE**        422        Your sort code  Inline form  UK bank accounts    
                                              should be 6     error                            
                                              digits (e.g.                                     
                                              12-34-56).                                       

  **ERR_INVALID_BSB**              422        Your BSB number Inline form  Australia bank      
                                              should be 6     error        accounts            
                                              digits (e.g.                                     
                                              123-456).                                        

  **ERR_ACH_INVALID_ACCOUNT**      422        ACH returned    The bank     Re-enter bank       achReturnCode:
                                              R04 --- invalid returned an  details →           \"R04\"
                                              account number  error for    /settings/payouts   
                                              structure.      this account                     
                                                              number.                          
                                                              Please check                     
                                                              your details                     
                                                              or contact                       
                                                              your bank.                       

  **ERR_ACH_ACCOUNT_FROZEN**       422        ACH returned    Your bank    Contact your bank   achReturnCode:
                                              R16 --- account account is                       \"R16\"
                                              frozen.         frozen and                       
                                                              can\'t                           
                                                              receive                          
                                                              transfers.                       
                                                              Please                           
                                                              contact your                     
                                                              bank.                            
  -------------------------------------------------------------------------------------------------------------

# **13. Schedule & System Errors**

  --------------------------------------------------------------------------------------------------------------------------------------------
  **Error code**                       **HTTP**   **Developer message** **User-facing message**  **Recovery CTA**     **Metadata fields**
  ------------------------------------ ---------- --------------------- ------------------------ -------------------- ------------------------
  **ERR_SCHEDULE_BELOW_THRESHOLD**     422        Balance below         Not shown to contractor  N/A --- internal     scheduleId,
                                                  minimumThresholdUSD   --- silent skip.                              thresholdUSD,
                                                  at scheduled          (Notification sent after                      currentBalanceUSD,
                                                  execution time.       3 consecutive misses per                      consecutiveMissCount
                                                                        PS-17 §5.3.)                                  

  **ERR_SCHEDULE_OUTSIDE_WINDOW**      422        Execution deferred    Not shown to contractor  N/A --- internal     scheduleId, currentTime,
                                                  --- outside           --- internal deferral                         nextWindowOpensAt
                                                  06:00--22:00 UTC      only.                                         
                                                  window or                                                           
                                                  weekend/holiday.                                                    

  **ERR_SCHEDULE_LOCK_FAILED**         423        Redis lock for        Not shown to contractor  N/A --- internal     
                                                  schedule cron could   --- internal only.                            
                                                  not be acquired ---                                                 
                                                  another tick is                                                     
                                                  running.                                                            

  **ERR_SCHEDULE_PRIMARY_FAILED**      422        Primary method        Your scheduled payout    View status →        scheduleId,
                                                  execution failed ---  could not be sent.       /earnings/history    failedMethodId,
                                                  secondary not         We\'ll try again on your                      primaryFailureCode
                                                  attempted.            next scheduled date.                          

  **ERR_SCHEDULE_SECONDARY_FAILED**    422        Secondary method      Part of your scheduled   View status →        primaryAmountUSD,
                                                  failed after primary  payout couldn\'t be sent /earnings/history    secondaryAmountUSD,
                                                  succeeded. Primary    to your second account.                       primaryMethodLabel,
                                                  not reversed.         \${primaryAmount} was                         secondaryMethodLabel
                                                                        sent to                                       
                                                                        {primaryMethodLabel}.                         
                                                                        We\'ll retry                                  
                                                                        \${secondaryAmount} to                        
                                                                        {secondaryMethodLabel}                        
                                                                        automatically.                                

  **ERR_SCHEDULE_THRESHOLD_TOO_LOW**   422        Threshold amount for  Your minimum payout      Update schedule →    submittedThresholdUSD,
                                                  threshold-based       threshold must be at     /settings/payouts    minimumUSD: 50
                                                  schedule is below     least \$50.00.                                
                                                  \$50 minimum.                                                       

  **ERR_SCHEDULE_EDD_TRIGGERED**       202        Balance \>= \$10,000  Your scheduled payout is View status →        scheduleId,
                                                  EDD threshold at      under compliance review. /earnings/history    payoutRequestId,
                                                  scheduled execution   You\'ll be notified when                      amountUSD
                                                  --- schedule paused   it\'s approved.                               
                                                  pending compliance                                                  
                                                  review.                                                             

  **ERR_PROVIDER_UNAVAILABLE**         503        PayPal / Wise /       The {providerName}       View status →        providerName,
                                                  Payoneer / bridge API service is temporarily   /earnings/history    retryAfterSeconds
                                                  returned 5xx or is    unavailable. We\'ll                           
                                                  unreachable.          retry your payout                             
                                                                        automatically.                                

  **ERR_NETWORK_FAILURE**              503        Unexpected internal   Something went wrong on  Try again →          requestId --- for
                                                  service communication our end. Please try      /earnings/withdraw   support reference
                                                  failure --- not       again in a few minutes.                       
                                                  provider-specific.    Your balance has not                          
                                                                        been changed.                                 
  --------------------------------------------------------------------------------------------------------------------------------------------

# **14. HTTP Status Code Usage Summary**

  -------------------------------------------------------------------------------
  **HTTP status**  **When used in payout-service** **Example errors**
  ---------------- ------------------------------- ------------------------------
  **200 OK**       Successful reads (GET requests) GET /v1/payouts/pause-status,
                                                   GET /v1/balance

  **201 Created**  Successful resource creation    POST /v1/deposit-methods (new
                                                   method created)

  **202 Accepted** Async operation accepted but    POST /v1/payouts/initiate →
                   not yet complete                awaiting_verification or
                                                   awaiting_edd

  **400 Bad        Malformed request body ---      Request body missing required
  Request**        schema validation failure,      field
                   missing required fields         

  **401            Missing or invalid JWT. OAuth   No Authorization header,
  Unauthorized**   token invalid.                  expired JWT

  **403            Authenticated but not           ERR_KYC_TIER1_REQUIRED,
  Forbidden**      authorised --- KYC gate, pause  ERR_PAYOUT_OFAC_BLOCKED,
                   condition, hold active, OFAC    ERR_PAYOUT_HOLD_ACTIVE
                   block                           

  **404 Not        Resource not found for this     ERR_METHOD_NOT_FOUND,
  Found**          contractorId                    ERR_CARD_NOT_FOUND

  **409 Conflict** Conflict with existing state    ERR_CARD_ALREADY_EXISTS,
                   --- duplicate, already active,  ERR_SPLIT_SAME_METHOD
                   already exists                  

  **410 Gone**     Resource existed but is now     ERR_MAGIC_LINK_EXPIRED,
                   permanently consumed or expired ERR_MAGIC_LINK_ALREADY_USED

  **422            Valid request shape but         ERR_INSUFFICIENT_FUNDS,
  Unprocessable    business rule violation ---     ERR_CRYPTO_ADDRESS_INVALID
  Entity**         amounts, formats, validation    

  **423 Locked**   Resource is temporarily locked  ERR_SCHEDULE_LOCK_FAILED
                   --- Redis distributed lock held 

  **429 Too Many   Rate limit exceeded             ERR_WITHDRAWAL_RATE_LIMIT,
  Requests**                                       ERR_MAGIC_LINK_RESEND_LIMIT

  **500 Internal   Unexpected internal error.      ERR_SPLIT_ROUNDING_FAULT
  Server Error**   Should never occur in normal    (indicates a code defect)
                   operation.                      

  **503 Service    Downstream dependency           ERR_KYC_SERVICE_UNAVAILABLE,
  Unavailable**    unavailable --- KYC service,    ERR_PROVIDER_UNAVAILABLE,
                   payment provider, bridge        ERR_NETWORK_FAILURE
  -------------------------------------------------------------------------------

# **15. Complete Error Code Index**

  -----------------------------------------------------------------------------------------------
  **Error code**                              **HTTP**   **Category**   **§**
  ------------------------------------------- ---------- -------------- -------------------------
  **ERR_INSUFFICIENT_FUNDS**                  422        Balance        3

  **ERR_INSUFFICIENT_FUNDS_AFTER_FEE**        422        Balance        3

  **ERR_BELOW_MINIMUM_AMOUNT**                422        Balance        3

  **ERR_BELOW_SCHEDULE_MINIMUM**              422        Balance        3

  **ERR_RESERVE_TOO_LOW**                     422        Balance        3

  **ERR_INSUFFICIENT_BALANCE_AT_EXECUTION**   422        Balance        3

  **ERR_METHOD_NOT_FOUND**                    404        Method         4

  **ERR_METHOD_NOT_VERIFIED**                 403        Method         4

  **ERR_METHOD_REAUTH_REQUIRED**              403        Method         4

  **ERR_METHOD_DEACTIVATED**                  422        Method         4

  **ERR_DEPOSIT_METHOD_LIMIT_REACHED**        422        Method         4

  **ERR_CANNOT_REMOVE_DEFAULT_WITH_SPLIT**    409        Method         4

  **ERR_CANNOT_REMOVE_ONLY_METHOD**           409        Method         4

  **ERR_NO_DEFAULT_METHOD**                   422        Method         4

  **ERR_KYC_TIER1_REQUIRED**                  403        KYC            5

  **ERR_KYC_TIER2_REQUIRED**                  403        KYC            5

  **ERR_KYC_TIER3_REQUIRED**                  403        KYC            5

  **ERR_KYC_SERVICE_UNAVAILABLE**             503        KYC            5

  **ERR_MAGIC_LINK_EXPIRED**                  410        Magic Link     6

  **ERR_MAGIC_LINK_ALREADY_USED**             410        Magic Link     6

  **ERR_MAGIC_LINK_INVALID**                  422        Magic Link     6

  **ERR_MAGIC_LINK_RESEND_LIMIT**             429        Magic Link     6

  **ERR_PAYOUT_HOLD_ACTIVE**                  403        Hold & Pause   7

  **ERR_PAYOUT_NO_DEFAULT_METHOD**            403        Hold & Pause   7

  **ERR_PAYOUT_METHOD_DEACTIVATED**           403        Hold & Pause   7

  **ERR_PAYOUT_METHOD_REAUTH_REQUIRED**       403        Hold & Pause   7

  **ERR_PAYOUT_OFAC_BLOCKED**                 403        Hold & Pause   7

  **ERR_PAYOUT_ACCOUNT_SUSPENDED**            403        Hold & Pause   7

  **ERR_WITHDRAWAL_RATE_LIMIT**               429        Rate Limit     8

  **ERR_EDD_REVIEW_PENDING**                  202        EDD            8

  **ERR_SPLIT_PERCENT_OUT_OF_RANGE**          422        Split          9

  **ERR_SPLIT_SAME_METHOD**                   409        Split          9

  **ERR_SPLIT_NO_SECONDARY_METHOD**           422        Split          9

  **ERR_SPLIT_METHOD_NOT_VERIFIED**           422        Split          9

  **ERR_SPLIT_ROUNDING_FAULT**                500        Split          9

  **ERR_CRYPTO_ADDRESS_INVALID**              422        Crypto         10

  **ERR_CRYPTO_NETWORK_UNSUPPORTED**          422        Crypto         10

  **ERR_CRYPTO_WALLETCONNECT_EXPIRED**        410        Crypto         10

  **ERR_GAS_TOO_HIGH**                        422        Crypto         10

  **ERR_CRYPTO_BRIDGE_UNAVAILABLE**           503        Crypto         10

  **ERR_CRYPTO_TX_FAILED**                    422        Crypto         10

  **ERR_CARD_NOT_ACTIVATED**                  403        Card           11

  **ERR_CARD_NOT_FOUND**                      404        Card           11

  **ERR_CARD_ALREADY_EXISTS**                 409        Card           11

  **ERR_CARD_ALREADY_ACTIVE**                 409        Card           11

  **ERR_CARD_ACTIVATION_MISMATCH**            422        Card           11

  **ERR_CARD_FROZEN**                         422        Card           11

  **ERR_CARD_CANCELED**                       422        Card           11

  **ERR_CARD_BALANCE_CAP_EXCEEDED**           422        Card           11

  **ERR_CARD_GEO_UNAVAILABLE**                422        Card           11

  **ERR_CARD_KYC_REQUIRED**                   403        Card           11

  **ERR_INVALID_ROUTING_NUMBER**              422        Bank Fields    12

  **ERR_INVALID_ACCOUNT_NUMBER**              422        Bank Fields    12

  **ERR_INVALID_IBAN**                        422        Bank Fields    12

  **ERR_INVALID_SWIFT**                       422        Bank Fields    12

  **ERR_INVALID_IFSC**                        422        Bank Fields    12

  **ERR_INVALID_SORT_CODE**                   422        Bank Fields    12

  **ERR_INVALID_BSB**                         422        Bank Fields    12

  **ERR_ACH_INVALID_ACCOUNT**                 422        Bank Fields    12

  **ERR_ACH_ACCOUNT_FROZEN**                  422        Bank Fields    12

  **ERR_SCHEDULE_BELOW_THRESHOLD**            422        Schedule       13

  **ERR_SCHEDULE_OUTSIDE_WINDOW**             422        Schedule       13

  **ERR_SCHEDULE_LOCK_FAILED**                423        Schedule       13

  **ERR_SCHEDULE_PRIMARY_FAILED**             422        Schedule       13

  **ERR_SCHEDULE_SECONDARY_FAILED**           422        Schedule       13

  **ERR_SCHEDULE_THRESHOLD_TOO_LOW**          422        Schedule       13

  **ERR_SCHEDULE_EDD_TRIGGERED**              202        Schedule       13

  **ERR_PROVIDER_UNAVAILABLE**                503        System         13

  **ERR_NETWORK_FAILURE**                     503        System         13
  -----------------------------------------------------------------------------------------------

CONFIDENTIAL --- Marketeq Internal Engineering Documentation \|
payout-service PS-24 \| v1.0
