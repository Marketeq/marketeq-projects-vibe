**[MARKETEQ PLATFORM --- BACKEND DOCUMENTATION]{.smallcaps}**

**payout-service**

PS-16 --- Paused Payouts & Alert System

  -----------------------------------------------------------------------
  **Property**        **Value**
  ------------------- ---------------------------------------------------
  **Document**        PS-16 --- Paused Payouts & Alert System

  **Version**         1.0

  **Applies to**      All contractors. All deposit method types.

  **Alert location**  Persistent banner in the promotional banner slot.
                      Not a toast. Not dismissible.

  **Alert priority**  Always above promotional banners. Cannot be hidden
                      while condition is active.

  **Clears when**     Underlying condition resolves. Automatic --- no
                      manual contractor action to dismiss.

  **Notification**    RabbitMQ event to notification-service on pause
                      trigger AND on resume. In-app + email.

  **Prerequisites**   PS-02, PS-04, PS-09, PS-15
  -----------------------------------------------------------------------

# **1. Overview**

Certain conditions cause payout-service to pause all outbound payouts
for a contractor. When a pause condition is active, the contractor sees
a persistent non-dismissible alert banner in the promotional banner
location on the Earnings and Payouts screens. The banner shows exact
copy tied to the specific condition, with a CTA that links directly to
the resolution action. The banner cannot be hidden, minimised, or
dismissed by the contractor --- it remains until the condition is
resolved. When the condition clears, the banner is removed automatically
and the contractor receives a notification confirming payouts have
resumed. If a promotional banner is active when a pause condition
triggers, the promotional banner is displaced and does not show until
the pause is resolved.

# **2. All Pause Conditions**

  -----------------------------------------------------------------------------------------------
  **Condition code**                   **Trigger**             **Auto-resolves    **Requires
                                                               when**             admin action?**
  ------------------------------------ ----------------------- ------------------ ---------------
  **NO_DEFAULT_METHOD**                Contractor has no       Contractor sets a  No
                                       deposit method marked   new default        
                                       is_default=true. This   method.            
                                       includes: never set                        
                                       one, deleted their                         
                                       default, or default                        
                                       method was deactivated.                    

  **DEFAULT_METHOD_DEACTIVATED**       The contractor\'s       Contractor sets a  No ---
                                       default deposit method  new active method  contractor
                                       has isActive=false.     as default.        self-resolves
                                       Deactivated by admin,                      
                                       failed verification, or                    
                                       card cancelled.                            

  **DEFAULT_METHOD_REAUTH_REQUIRED**   The contractor\'s       Contractor         No
                                       default deposit method  completes          
                                       (OAuth type) has        re-authorization   
                                       reauthRequired=true.    flow.              
                                       Token expired or                           
                                       revoked (PS-09).                           

  **OFAC_FLAG**                        Contractor\'s country   Sanctions match    Yes --- admin
                                       or identity matches     removed AND admin  must review and
                                       OFAC sanctions list.    manually clears    clear
                                       Set by                  the flag.          
                                       kyc-identity-service.                      

  **ACCOUNT_SUSPENDED**                Contractor account is   Admin reinstates   Yes --- admin
                                       suspended by Marketeq   account.           only
                                       admin. Set in                              
                                       user-service.                              
  -----------------------------------------------------------------------------------------------

+-----------------------------------------------------------------------+
| **OFAC_FLAG and ACCOUNT_SUSPENDED are admin-only resolves**           |
|                                                                       |
| NO_DEFAULT_METHOD, DEFAULT_METHOD_DEACTIVATED, and                    |
| DEFAULT_METHOD_REAUTH_REQUIRED                                        |
|                                                                       |
| resolve automatically when the contractor takes the correct action.   |
|                                                                       |
| OFAC_FLAG and ACCOUNT_SUSPENDED cannot be resolved by the contractor. |
|                                                                       |
| The banner for these two conditions does not include a self-service   |
| CTA.                                                                  |
|                                                                       |
| It directs the contractor to contact support.                         |
|                                                                       |
| payout-service must check for active pause conditions before every    |
| withdrawal initiation                                                 |
|                                                                       |
| and before every scheduled payout execution --- not just when the     |
| banner is shown.                                                      |
+=======================================================================+

# **3. Exact Banner Copy and CTA Per Condition**

## **3.1 NO_DEFAULT_METHOD**

  -----------------------------------------------------------------------
  **Banner element** **Content**
  ------------------ ----------------------------------------------------
  **Icon**           ⚠️ warning amber

  **Headline**       Your payouts are paused.

  **Body**           You don\'t have a default payout method set.

  **CTA label**      Set default payout method

  **CTA              /settings/payouts --- deposit method management
  destination**      screen

  **Dismissible**    No
  -----------------------------------------------------------------------

## **3.2 DEFAULT_METHOD_DEACTIVATED**

  -----------------------------------------------------------------------
  **Banner element** **Content**
  ------------------ ----------------------------------------------------
  **Icon**           ⚠️ warning amber

  **Headline**       Your payouts are paused.

  **Body**           Your default payout method has been deactivated and
                     can no longer receive payouts.

  **CTA label**      Update payout method

  **CTA              /settings/payouts --- deposit method management
  destination**      screen

  **Dismissible**    No
  -----------------------------------------------------------------------

## **3.3 DEFAULT_METHOD_REAUTH_REQUIRED**

  -----------------------------------------------------------------------
  **Banner element** **Content**
  ------------------ ----------------------------------------------------
  **Icon**           ⚠️ warning amber

  **Headline**       Your payouts are paused.

  **Body**           Your {providerName} connection has expired.
                     Reconnect your account to resume payouts.

  **CTA label**      Reconnect {providerName}

  **CTA              /settings/payouts?reauth={depositMethodId} ---
  destination**      triggers re-auth flow (PS-09 §8.3)

  **Dismissible**    No

  **Note**           {providerName} is populated from
                     deposit_methods.methodType: PAYPAL → \"PayPal\",
                     WISE → \"Wise\", PAYONEER → \"Payoneer\".
  -----------------------------------------------------------------------

## **3.4 OFAC_FLAG**

  -----------------------------------------------------------------------
  **Banner element** **Content**
  ------------------ ----------------------------------------------------
  **Icon**           🚫 red

  **Headline**       Your payouts are paused.

  **Body**           Your account has been flagged for a compliance
                     review. Payouts are unavailable while this review is
                     in progress.

  **CTA label**      Contact support

  **CTA              https://support.marketeq.com --- or in-app support
  destination**      chat

  **Dismissible**    No

  **No self-service  Do not expose what triggered the flag. Do not name
  action**           OFAC or sanctions in the banner copy.
  -----------------------------------------------------------------------

## **3.5 ACCOUNT_SUSPENDED**

  -----------------------------------------------------------------------
  **Banner element** **Content**
  ------------------ ----------------------------------------------------
  **Icon**           🚫 red

  **Headline**       Your payouts are paused.

  **Body**           Your account has been suspended. Please contact
                     support for more information.

  **CTA label**      Contact support

  **CTA              https://support.marketeq.com
  destination**      

  **Dismissible**    No
  -----------------------------------------------------------------------

# **4. Banner Rendering Rules**

  -----------------------------------------------------------------------
  **Rule**              **Detail**
  --------------------- -------------------------------------------------
  **Location**          Occupies the promotional banner slot at the top
                        of the Earnings and Payouts pages. Exact same
                        position and dimensions as a promotional banner.

  **Priority over       If a pause condition is active, the promotional
  promotional banners** banner does not render. The pause alert takes the
                        slot entirely. Promotional banner is queued and
                        shows again once the pause resolves.

  **Multiple conditions Only one banner is shown. Priority order:
  active                OFAC_FLAG \> ACCOUNT_SUSPENDED \>
  simultaneously**      DEFAULT_METHOD_REAUTH_REQUIRED \>
                        DEFAULT_METHOD_DEACTIVATED \> NO_DEFAULT_METHOD.
                        Highest priority condition shown. Others queued
                        but not displayed.

  **Pages where banner  Earnings overview, Earnings history,
  appears**             Payouts/Withdraw screen, Deposit method settings
                        screen.

  **Pages where banner  All other pages --- this is not a global
  does not appear**     site-wide banner. Scoped to earnings and payout
                        screens.

  **Banner styling**    Amber background for warning conditions
                        (NO_DEFAULT_METHOD, DEFAULT_METHOD_DEACTIVATED,
                        DEFAULT_METHOD_REAUTH_REQUIRED). Red background
                        for compliance conditions (OFAC_FLAG,
                        ACCOUNT_SUSPENDED). Consistent with Marketeq
                        design system alert variants.

  **Auto-clear          Frontend polls GET /v1/payouts/pause-status every
  behaviour**           30 seconds while banner is active. When response
                        returns { paused: false }, banner is removed
                        without page refresh.
  -----------------------------------------------------------------------

# **5. Pause Status API Endpoint**

+-----------------------------------------------------------------------+
| typescript                                                            |
+-----------------------------------------------------------------------+
| // GET /v1/payouts/pause-status                                       |
|                                                                       |
| // Called by frontend on page load and every 30 seconds while paused  |
|                                                                       |
| // Auth: contractor JWT                                               |
|                                                                       |
| // Response --- paused                                                |
|                                                                       |
| {                                                                     |
|                                                                       |
| \"paused\": true,                                                     |
|                                                                       |
| \"activeCondition\": \"DEFAULT_METHOD_REAUTH_REQUIRED\",              |
|                                                                       |
| \"priority\": 3,                                                      |
|                                                                       |
| \"bannerCopy\": {                                                     |
|                                                                       |
| \"headline\": \"Your payouts are paused.\",                           |
|                                                                       |
| \"body\": \"Your PayPal connection has expired. Reconnect your        |
| account to resume payouts.\",                                         |
|                                                                       |
| \"ctaLabel\": \"Reconnect PayPal\",                                   |
|                                                                       |
| \"ctaUrl\": \"/settings/payouts?reauth=uuid-of-method\",              |
|                                                                       |
| \"style\": \"warning\" // \"warning\" \| \"critical\"                 |
|                                                                       |
| },                                                                    |
|                                                                       |
| \"allConditions\": \[                                                 |
|                                                                       |
| { \"condition\": \"DEFAULT_METHOD_REAUTH_REQUIRED\", \"active\": true |
| },                                                                    |
|                                                                       |
| { \"condition\": \"NO_DEFAULT_METHOD\", \"active\": false }           |
|                                                                       |
| \]                                                                    |
|                                                                       |
| }                                                                     |
|                                                                       |
| // Response --- not paused                                            |
|                                                                       |
| {                                                                     |
|                                                                       |
| \"paused\": false,                                                    |
|                                                                       |
| \"activeCondition\": null,                                            |
|                                                                       |
| \"bannerCopy\": null,                                                 |
|                                                                       |
| \"allConditions\": \[                                                 |
|                                                                       |
| { \"condition\": \"NO_DEFAULT_METHOD\", \"active\": false },          |
|                                                                       |
| { \"condition\": \"DEFAULT_METHOD_DEACTIVATED\", \"active\": false }, |
|                                                                       |
| { \"condition\": \"DEFAULT_METHOD_REAUTH_REQUIRED\", \"active\":      |
| false },                                                              |
|                                                                       |
| { \"condition\": \"OFAC_FLAG\", \"active\": false },                  |
|                                                                       |
| { \"condition\": \"ACCOUNT_SUSPENDED\", \"active\": false }           |
|                                                                       |
| \]                                                                    |
|                                                                       |
| }                                                                     |
+=======================================================================+

## **5.1 Pause status service**

+-----------------------------------------------------------------------+
| typescript                                                            |
+-----------------------------------------------------------------------+
| // src/pause/pause-status.service.ts                                  |
|                                                                       |
| // Folder: /apps/payout-service/src/pause/                            |
|                                                                       |
| async getPauseStatus(contractorId: string):                           |
| Promise\<PauseStatusResult\> {                                        |
|                                                                       |
| // Run all condition checks in parallel                               |
|                                                                       |
| const \[defaultMethod, kycStatus, accountStatus\] = await             |
| Promise.all(\[                                                        |
|                                                                       |
| this.methodRepo.findOne({                                             |
|                                                                       |
| where: { contractorId, isDefault: true, isActive: true },             |
|                                                                       |
| }),                                                                   |
|                                                                       |
| this.kycIdentityClient.getGateStatus(contractorId),                   |
|                                                                       |
| this.userServiceClient.getAccountStatus(contractorId),                |
|                                                                       |
| \]);                                                                  |
|                                                                       |
| const conditions: PauseCondition\[\] = \[\];                          |
|                                                                       |
| // NO_DEFAULT_METHOD                                                  |
|                                                                       |
| if (!defaultMethod)                                                   |
|                                                                       |
| conditions.push(\"NO_DEFAULT_METHOD\");                               |
|                                                                       |
| // DEFAULT_METHOD_DEACTIVATED --- default exists but isActive=false   |
|                                                                       |
| const inactiveDefault = await this.methodRepo.findOne({               |
|                                                                       |
| where: { contractorId, isDefault: true, isActive: false },            |
|                                                                       |
| });                                                                   |
|                                                                       |
| if (inactiveDefault)                                                  |
|                                                                       |
| conditions.push(\"DEFAULT_METHOD_DEACTIVATED\");                      |
|                                                                       |
| // DEFAULT_METHOD_REAUTH_REQUIRED                                     |
|                                                                       |
| if (defaultMethod?.reauthRequired)                                    |
|                                                                       |
| conditions.push(\"DEFAULT_METHOD_REAUTH_REQUIRED\");                  |
|                                                                       |
| // OFAC_FLAG                                                          |
|                                                                       |
| if (kycStatus.ofacFlagged)                                            |
|                                                                       |
| conditions.push(\"OFAC_FLAG\");                                       |
|                                                                       |
| // ACCOUNT_SUSPENDED                                                  |
|                                                                       |
| if (accountStatus.suspended)                                          |
|                                                                       |
| conditions.push(\"ACCOUNT_SUSPENDED\");                               |
|                                                                       |
| if (conditions.length === 0)                                          |
|                                                                       |
| return { paused: false, activeCondition: null, allConditions:         |
| conditions };                                                         |
|                                                                       |
| // Apply priority order                                               |
|                                                                       |
| const priority: PauseCondition\[\] = \[                               |
|                                                                       |
| \"OFAC_FLAG\",                                                        |
|                                                                       |
| \"ACCOUNT_SUSPENDED\",                                                |
|                                                                       |
| \"DEFAULT_METHOD_REAUTH_REQUIRED\",                                   |
|                                                                       |
| \"DEFAULT_METHOD_DEACTIVATED\",                                       |
|                                                                       |
| \"NO_DEFAULT_METHOD\",                                                |
|                                                                       |
| \];                                                                   |
|                                                                       |
| const activeCondition = priority.find(c =\> conditions.includes(c))!; |
|                                                                       |
| return {                                                              |
|                                                                       |
| paused: true,                                                         |
|                                                                       |
| activeCondition,                                                      |
|                                                                       |
| allConditions: conditions,                                            |
|                                                                       |
| bannerCopy: this.buildBannerCopy(activeCondition, defaultMethod),     |
|                                                                       |
| };                                                                    |
|                                                                       |
| }                                                                     |
+=======================================================================+

# **6. Payout Block Enforcement**

The banner is a UX layer --- it does not replace enforcement. Every
withdrawal initiation and every scheduled payout execution must
independently check pause conditions before proceeding. The banner
informs the contractor. The gate blocks execution.

+-----------------------------------------------------------------------+
| typescript                                                            |
+-----------------------------------------------------------------------+
| // Injected at the top of PayoutInitiator.initiate() --- before any   |
| other check                                                           |
|                                                                       |
| // Also called at the top of ScheduledPayoutExecutor.execute()        |
|                                                                       |
| async assertNotPaused(contractorId: string): Promise\<void\> {        |
|                                                                       |
| const status = await                                                  |
| this.pauseStatusService.getPauseStatus(contractorId);                 |
|                                                                       |
| if (!status.paused) return;                                           |
|                                                                       |
| const errorMap: Record\<PauseCondition, string\> = {                  |
|                                                                       |
| NO_DEFAULT_METHOD: \"ERR_PAYOUT_NO_DEFAULT_METHOD\",                  |
|                                                                       |
| DEFAULT_METHOD_DEACTIVATED: \"ERR_PAYOUT_METHOD_DEACTIVATED\",        |
|                                                                       |
| DEFAULT_METHOD_REAUTH_REQUIRED:                                       |
| \"ERR_PAYOUT_METHOD_REAUTH_REQUIRED\",                                |
|                                                                       |
| OFAC_FLAG: \"ERR_PAYOUT_OFAC_BLOCKED\",                               |
|                                                                       |
| ACCOUNT_SUSPENDED: \"ERR_PAYOUT_ACCOUNT_SUSPENDED\",                  |
|                                                                       |
| };                                                                    |
|                                                                       |
| throw new PayoutError(                                                |
|                                                                       |
| \"Payouts are currently paused on your account.\",                    |
|                                                                       |
| HttpStatus.FORBIDDEN,                                                 |
|                                                                       |
| errorMap\[status.activeCondition\],                                   |
|                                                                       |
| );                                                                    |
|                                                                       |
| }                                                                     |
+=======================================================================+

# **7. Notifications --- On Pause and On Resume**

## **7.1 On pause trigger**

When a condition first becomes active, payout-service publishes a
notification event so the contractor is informed by email and in-app ---
not just by seeing the banner on their next login.

+-----------------------------------------------------------------------+
| typescript                                                            |
+-----------------------------------------------------------------------+
| // Event: payout.paused                                               |
|                                                                       |
| // Published when a pause condition is first detected (state change:  |
| not paused → paused)                                                  |
|                                                                       |
| // Not published on every request while already paused --- only on    |
| transition                                                            |
|                                                                       |
| {                                                                     |
|                                                                       |
| contractorId: string,                                                 |
|                                                                       |
| condition: PauseCondition,                                            |
|                                                                       |
| occurredAt: string, // ISO 8601                                       |
|                                                                       |
| }                                                                     |
|                                                                       |
| // notification-service maps condition to message:                    |
|                                                                       |
| // NO_DEFAULT_METHOD:                                                 |
|                                                                       |
| // In-app: \"Your payouts have been paused. You don\'t have a default |
| payout method set.\"                                                  |
|                                                                       |
| // Email subject: \"Action required: Set a default payout method\"    |
|                                                                       |
| //                                                                    |
|                                                                       |
| // DEFAULT_METHOD_DEACTIVATED:                                        |
|                                                                       |
| // In-app: \"Your payouts have been paused. Your default payout       |
| method was deactivated.\"                                             |
|                                                                       |
| // Email subject: \"Action required: Update your payout method\"      |
|                                                                       |
| //                                                                    |
|                                                                       |
| // DEFAULT_METHOD_REAUTH_REQUIRED:                                    |
|                                                                       |
| // In-app: \"Your payouts have been paused. Your {providerName}       |
| connection expired.\"                                                 |
|                                                                       |
| // Email subject: \"Action required: Reconnect your {providerName}    |
| account\"                                                             |
|                                                                       |
| //                                                                    |
|                                                                       |
| // OFAC_FLAG:                                                         |
|                                                                       |
| // In-app: \"Your payouts have been paused pending a compliance       |
| review.\"                                                             |
|                                                                       |
| // Email subject: \"Important: Your payouts have been paused\"        |
|                                                                       |
| //                                                                    |
|                                                                       |
| // ACCOUNT_SUSPENDED:                                                 |
|                                                                       |
| // In-app: \"Your account has been suspended and payouts are          |
| paused.\"                                                             |
|                                                                       |
| // Email subject: \"Your Marketeq account has been suspended\"        |
+=======================================================================+

## **7.2 On condition resolved (resume)**

+-----------------------------------------------------------------------+
| typescript                                                            |
+-----------------------------------------------------------------------+
| // Event: payout.resumed                                              |
|                                                                       |
| // Published when all pause conditions clear (state change: paused →  |
| not paused)                                                           |
|                                                                       |
| {                                                                     |
|                                                                       |
| contractorId: string,                                                 |
|                                                                       |
| resolvedCondition: PauseCondition, // the condition that just cleared |
|                                                                       |
| occurredAt: string,                                                   |
|                                                                       |
| }                                                                     |
|                                                                       |
| // notification-service message:                                      |
|                                                                       |
| // In-app: \"Your payouts have resumed. Everything looks good.\"      |
|                                                                       |
| // Email subject: \"Good news --- your payouts have resumed\"         |
|                                                                       |
| // Email body: \"Your payouts are no longer paused and will process   |
| on your normal schedule.\"                                            |
+=======================================================================+

## **7.3 Pause state change detection**

payout-service does not poll for state changes continuously. Pause
condition transitions are detected at three trigger points: when a
withdrawal is attempted (initiation gate), when a scheduled payout runs
(executor gate), and when a deposit method is added, updated, or deleted
(method management events). On method events, payout-service
re-evaluates pause status and publishes payout.paused or payout.resumed
if the state changed.

+-----------------------------------------------------------------------+
| typescript                                                            |
+-----------------------------------------------------------------------+
| // Called after any deposit method create/update/delete event         |
|                                                                       |
| async evaluateAndPublishPauseChange(                                  |
|                                                                       |
| contractorId: string,                                                 |
|                                                                       |
| previouslyPaused: boolean,                                            |
|                                                                       |
| ): Promise\<void\> {                                                  |
|                                                                       |
| const current = await                                                 |
| this.pauseStatusService.getPauseStatus(contractorId);                 |
|                                                                       |
| if (!previouslyPaused && current.paused) {                            |
|                                                                       |
| await this.rabbitMQ.publish(\"payout.paused\", {                      |
|                                                                       |
| contractorId,                                                         |
|                                                                       |
| condition: current.activeCondition,                                   |
|                                                                       |
| occurredAt: new Date().toISOString(),                                 |
|                                                                       |
| });                                                                   |
|                                                                       |
| }                                                                     |
|                                                                       |
| if (previouslyPaused && !current.paused) {                            |
|                                                                       |
| await this.rabbitMQ.publish(\"payout.resumed\", {                     |
|                                                                       |
| contractorId,                                                         |
|                                                                       |
| resolvedCondition: null, // full resolution                           |
|                                                                       |
| occurredAt: new Date().toISOString(),                                 |
|                                                                       |
| });                                                                   |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
+=======================================================================+

# **8. Scheduled Payout Interaction**

  ------------------------------------------------------------------------------------
  **Scenario**                       **Behaviour**
  ---------------------------------- -------------------------------------------------
  **Scheduled payout fires while     Schedule skips this execution cycle. No
  NO_DEFAULT_METHOD**                payout_requests row created. Contractor already
                                     has persistent banner. No additional notification
                                     (already notified when condition first
                                     triggered).

  **Scheduled payout fires while     Same as above --- skipped. Banner and
  DEFAULT_METHOD_REAUTH_REQUIRED**   notification already sent at time of REAUTH
                                     trigger (PS-09).

  **Scheduled payout fires while     Skipped. Finance and compliance team alerted
  OFAC_FLAG**                        separately via payout.edd.triggered equivalent
                                     compliance event.

  **Condition resolves between       Next scheduled cycle runs normally.
  scheduled cycles**                 payout.resumed event published. Contractor
                                     notified.

  **Contractor manually withdraws    Blocked by assertNotPaused() at initiation.
  while paused**                     Returns appropriate ERR\_ code. Banner already
                                     visible --- no second notification.
  ------------------------------------------------------------------------------------

# **9. Error Code Reference**

  ----------------------------------------------------------------------------------------
  **Error code**                          **HTTP     **Condition**
                                          status**   
  --------------------------------------- ---------- -------------------------------------
  **ERR_PAYOUT_NO_DEFAULT_METHOD**        403        NO_DEFAULT_METHOD active at
                                                     withdrawal initiation or schedule
                                                     execution.

  **ERR_PAYOUT_METHOD_DEACTIVATED**       403        DEFAULT_METHOD_DEACTIVATED active.

  **ERR_PAYOUT_METHOD_REAUTH_REQUIRED**   403        DEFAULT_METHOD_REAUTH_REQUIRED
                                                     active. depositMethodId in metadata.

  **ERR_PAYOUT_OFAC_BLOCKED**             403        OFAC_FLAG active. No additional
                                                     detail exposed in response.

  **ERR_PAYOUT_ACCOUNT_SUSPENDED**        403        ACCOUNT_SUSPENDED active.
  ----------------------------------------------------------------------------------------

# **10. References**

  -----------------------------------------------------------------------
  **Document /           **Relevant to**
  Resource**             
  ---------------------- ------------------------------------------------
  **PS-02 --- Withdrawal assertNotPaused() called at top of initiation.
  Flow & Payout State    Scheduled executor gate.
  Machine**              

  **PS-04 --- Deposit    Default method management. isActive, isDefault,
  Method Management**    reauthRequired columns.

  **PS-09 ---            REAUTH_REQUIRED trigger and re-auth flow.
  Third-Party OAuth      DEFAULT_METHOD_REAUTH_REQUIRED condition source.
  Methods**              

  **PS-03 --- Deposit    Scheduled payout executor gate. Skip behaviour
  Schedule**             on pause.

  **PS-15 ---            OFAC_FLAG source in kyc-identity-service gate
  KYC-Identity Gating**  status response.
  -----------------------------------------------------------------------

CONFIDENTIAL --- Marketeq Internal Engineering Documentation \|
payout-service PS-16 \| v1.0
