**[MARKETEQ PLATFORM --- BACKEND DOCUMENTATION]{.smallcaps}**

**payout-service**

PS-18 --- Auto-Balance Logic for Split Payouts

  -----------------------------------------------------------------------
  **Property**        **Value**
  ------------------- ---------------------------------------------------
  **Document**        PS-18 --- Auto-Balance Logic for Split Payouts

  **Version**         1.0

  **Applies to**      Split payout configuration.
                      deposit_schedules.primarySplitPercent +
                      secondaryMethodId.

  **Default split**   50% primary / 50% secondary when split is first
                      enabled.

  **Rounding          ±0.01%. Primary + secondary must equal 100.00%
  tolerance**         exactly after rounding.

  **Auto-balance      User edits either percentage field. System adjusts
  trigger**           the other field in real time.

  **Toggle            Off → On: resets to 50/50. On → Off: primary
  behaviour**         receives 100%, secondaryMethodId cleared.

  **Prerequisites**   PS-03, PS-04, PS-17
  -----------------------------------------------------------------------

# **1. Overview**

Split payout configuration allows a contractor to divide each scheduled
payout between two deposit methods by percentage. The system enforces
that the two percentages always sum to exactly 100.00%. When the
contractor edits one percentage field, the system automatically
calculates and fills the other --- the contractor never has to manually
balance both fields. This document defines the exact auto-balance
calculation rules, rounding behaviour, tolerance handling, what happens
when one method in a split is removed or deactivated, and how the split
toggle interacts with saved configuration.

# **2. Data Model --- Split Fields on deposit_schedules**

+-----------------------------------------------------------------------+
| sql                                                                   |
+-----------------------------------------------------------------------+
| \-- Relevant columns on deposit_schedules (full schema in PS-03)      |
|                                                                       |
| primary_method_id UUID NOT NULL REFERENCES deposit_methods(id),       |
|                                                                       |
| primary_split_percent NUMERIC(5,2) NOT NULL DEFAULT 100.00,           |
|                                                                       |
| \-- Range: 0.01 -- 99.99 when split active. 100.00 when split off.    |
|                                                                       |
| secondary_method_id UUID REFERENCES deposit_methods(id), \-- NULL     |
| when split off                                                        |
|                                                                       |
| secondary_split_percent NUMERIC(5,2) GENERATED ALWAYS AS (100.00 -    |
| primary_split_percent) STORED,                                        |
|                                                                       |
| \-- Computed column. Never written directly.                          |
|                                                                       |
| split_enabled BOOLEAN NOT NULL DEFAULT false,                         |
|                                                                       |
| split_enabled_at TIMESTAMPTZ, \-- timestamp when split was last       |
| turned on                                                             |
|                                                                       |
| split_disabled_at TIMESTAMPTZ, \-- timestamp when split was last      |
| turned off                                                            |
+=======================================================================+

+-----------------------------------------------------------------------+
| **secondary_split_percent is a computed column --- never written      |
| directly**                                                            |
|                                                                       |
| The backend only ever stores primarySplitPercent.                     |
|                                                                       |
| secondarySplitPercent is computed by the DB as (100.00 -              |
| primarySplitPercent).                                                 |
|                                                                       |
| This guarantees the two values always sum to exactly 100.00 at the    |
| storage layer.                                                        |
|                                                                       |
| The frontend may display both fields --- but it only ever sends       |
| primarySplitPercent to the API.                                       |
|                                                                       |
| No endpoint accepts secondarySplitPercent as a writable input.        |
+=======================================================================+

# **3. Auto-Balance Rules --- What Happens When User Edits a Field**

  ------------------------------------------------------------------------
  **User action**    **System response**      **Example**
  ------------------ ------------------------ ----------------------------
  **User edits       Secondary % auto-fills   User types 70 in primary →
  primary % field**  as 100 − primary.        secondary auto-fills 30.
                     Primary field value is   
                     accepted as-is (subject  
                     to validation).          

  **User edits       Primary % auto-fills as  User types 40 in secondary →
  secondary %        100 − secondary. The     primary auto-fills 60. API
  field**            system translates        receives
                     secondary input into     primarySplitPercent=60.
                     primary for storage.     

  **User clears      Secondary % clears to    Empty primary → empty
  primary % field**  blank. Neither value is  secondary. Save button
                     submitted until primary  disabled.
                     is re-entered.           

  **User enters a    Truncate to 2 decimal    User types 33.333 → treated
  value with more    places. Do not round up  as 33.33. Counterpart
  than 2 decimal     --- truncate.            auto-fills as 66.67.
  places**                                    

  **User types 0 or  Validation error: \"Each 0 in primary →
  100 in either      account must receive at  ERR_SPLIT_PERCENT_ZERO. 100
  field**            least 0.01%.\" Split     in primary →
                     requires both methods to ERR_SPLIT_PERCENT_FULL.
                     receive something.       

  **User types a     Validation error inline. Primary = 99.995 → truncated
  value \> 99.99 or  Counterpart field not    to 99.99. Secondary
  \< 0.01**          updated until valid      auto-fills 0.01. Valid.
                     value entered.           
  ------------------------------------------------------------------------

## **3.1 Frontend auto-balance implementation guidance**

Auto-balance fires on the onChange event of either percentage input ---
not onBlur. The counterpart field updates in real time as the user
types. The Save button is disabled unless: primarySplitPercent is
between 0.01 and 99.99 inclusive, both method selectors have a selected
method, and the two selected methods are different. The frontend does
not send secondarySplitPercent to the API --- it sends only
primarySplitPercent. The API computes and stores secondarySplitPercent
as a DB computed column.

# **4. Rounding Rules and Tolerance**

## **4.1 Storage precision**

  -----------------------------------------------------------------------
  **Rule**           **Detail**
  ------------------ ----------------------------------------------------
  **Decimal places   2\. NUMERIC(5,2) --- e.g. 66.67, 33.33, 50.00.
  stored**           

  **Truncation vs    User input is truncated to 2 decimal places, not
  rounding**         rounded. 33.337 → 33.33, not 33.34.

  **Computed         DB computed as 100.00 − primarySplitPercent. Since
  counterpart**      primarySplitPercent is already a clean 2dp value,
                     the result is always a clean 2dp value.

  **Sum guarantee**  primarySplitPercent + secondarySplitPercent = 100.00
                     always. Guaranteed by computed column --- not by
                     application logic.
  -----------------------------------------------------------------------

## **4.2 Execution rounding --- dollars and cents**

At execution time (PS-17 §7), the available balance in USD is split by
percentage. Floating-point arithmetic can produce sub-cent values. The
rule is: primary receives the floor of (balance × percent / 100) rounded
to 2 decimal places, secondary receives the exact remainder (balance −
primary amount). This ensures no cent is lost or duplicated.

+-----------------------------------------------------------------------+
| typescript                                                            |
+-----------------------------------------------------------------------+
| // src/schedule/split-calculator.service.ts                           |
|                                                                       |
| splitAmount(                                                          |
|                                                                       |
| balanceUSD: number,                                                   |
|                                                                       |
| primarySplitPercent: number, // e.g. 66.67                            |
|                                                                       |
| ): { primaryUSD: number; secondaryUSD: number } {                     |
|                                                                       |
| // Primary: truncate to 2dp (floor at cent level)                     |
|                                                                       |
| const primaryRaw = balanceUSD \* primarySplitPercent / 100;           |
|                                                                       |
| const primaryUSD = Math.floor(primaryRaw \* 100) / 100;               |
|                                                                       |
| // Secondary: exact remainder --- no independent rounding             |
|                                                                       |
| const secondaryUSD = Math.round((balanceUSD - primaryUSD) \* 100) /   |
| 100;                                                                  |
|                                                                       |
| // Invariant check --- must sum exactly to balance                    |
|                                                                       |
| // If floating point produces a discrepancy \> \$0.01, throw --- do   |
| not execute                                                           |
|                                                                       |
| const sum = Math.round((primaryUSD + secondaryUSD) \* 100) / 100;     |
|                                                                       |
| if (Math.abs(sum - balanceUSD) \> 0.01)                               |
|                                                                       |
| throw new PayoutError(                                                |
|                                                                       |
| \"Split amount rounding produced an invalid result.\",                |
|                                                                       |
| HttpStatus.INTERNAL_SERVER_ERROR,                                     |
|                                                                       |
| \"ERR_SPLIT_ROUNDING_FAULT\",                                         |
|                                                                       |
| { balanceUSD, primaryUSD, secondaryUSD, sum },                        |
|                                                                       |
| );                                                                    |
|                                                                       |
| return { primaryUSD, secondaryUSD };                                  |
|                                                                       |
| }                                                                     |
|                                                                       |
| // Example:                                                           |
|                                                                       |
| // balance = \$100.00, primarySplitPercent = 66.67                    |
|                                                                       |
| // primaryRaw = 66.670000                                             |
|                                                                       |
| // primaryUSD = 66.67 (floor at cent)                                 |
|                                                                       |
| // secondaryUSD = 100.00 − 66.67 = 33.33                              |
|                                                                       |
| // sum = 100.00 ✓                                                     |
|                                                                       |
| // balance = \$1.00, primarySplitPercent = 33.33                      |
|                                                                       |
| // primaryRaw = 0.3333                                                |
|                                                                       |
| // primaryUSD = 0.33 (floor)                                          |
|                                                                       |
| // secondaryUSD = 1.00 − 0.33 = 0.67                                  |
|                                                                       |
| // sum = 1.00 ✓                                                       |
+=======================================================================+

## **4.3 Tolerance for display**

The ±0.01% tolerance applies to the percentage display only --- not to
the stored value. When the frontend displays computed percentages,
values within 0.01% of a round number may be displayed as the round
number. Example: a stored primarySplitPercent of 33.33 may be displayed
as \"33.33%\" without a warning that it is not exactly one-third. No
rounding correction is applied to stored values.

# **5. Default 50/50 Split**

  -------------------------------------------------------------------------------
  **Scenario**                **primarySplitPercent   **secondarySplitPercent**
                              set to**                
  --------------------------- ----------------------- ---------------------------
  **Split enabled for the     50.00                   50.00 (computed)
  first time on an account**                          

  **Split toggled off and     50.00 (reset)           50.00 (computed)
  then back on again**                                

  **Contractor saves a custom 50.00 (reset ---        50.00
  split (e.g. 70/30), then    previous custom value   
  disables, then re-enables** not restored)           

  **Contractor edits the      Whatever value they     100 − that value
  split percentage after it   enter                   
  was set to 50/50**                                  
  -------------------------------------------------------------------------------

+-----------------------------------------------------------------------+
| **Re-enabling split always resets to 50/50 --- previous custom value  |
| is not restored**                                                     |
|                                                                       |
| When a contractor turns the split toggle off and back on, the         |
| percentage resets to 50/50.                                           |
|                                                                       |
| The previous custom split percentage is not preserved.                |
|                                                                       |
| This is intentional --- it prevents stale configurations being        |
| silently reactivated.                                                 |
|                                                                       |
| The contractor must explicitly re-enter their desired split after     |
| re-enabling.                                                          |
|                                                                       |
| The UI should communicate this: \"Turning split off and back on will  |
| reset to 50/50.\"                                                     |
+=======================================================================+

+-----------------------------------------------------------------------+
| typescript                                                            |
+-----------------------------------------------------------------------+
| // PATCH /v1/schedules/:id/split --- enable/disable or update split   |
|                                                                       |
| async updateSplit(                                                    |
|                                                                       |
| scheduleId: string,                                                   |
|                                                                       |
| contractorId: string,                                                 |
|                                                                       |
| dto: UpdateSplitDto,                                                  |
|                                                                       |
| ): Promise\<void\> {                                                  |
|                                                                       |
| const schedule = await this.scheduleRepo.findOneOrFail({              |
|                                                                       |
| where: { id: scheduleId, contractorId },                              |
|                                                                       |
| });                                                                   |
|                                                                       |
| if (dto.splitEnabled === true && !schedule.splitEnabled) {            |
|                                                                       |
| // Enabling split --- always reset to 50/50                           |
|                                                                       |
| await this.scheduleRepo.update(scheduleId, {                          |
|                                                                       |
| splitEnabled: true,                                                   |
|                                                                       |
| splitEnabledAt: new Date(),                                           |
|                                                                       |
| primarySplitPercent: 50.00,                                           |
|                                                                       |
| secondaryMethodId: dto.secondaryMethodId ?? null,                     |
|                                                                       |
| });                                                                   |
|                                                                       |
| return;                                                               |
|                                                                       |
| }                                                                     |
|                                                                       |
| if (dto.splitEnabled === false && schedule.splitEnabled) {            |
|                                                                       |
| // Disabling split --- primary gets 100%, clear secondary             |
|                                                                       |
| await this.scheduleRepo.update(scheduleId, {                          |
|                                                                       |
| splitEnabled: false,                                                  |
|                                                                       |
| splitDisabledAt: new Date(),                                          |
|                                                                       |
| primarySplitPercent: 100.00,                                          |
|                                                                       |
| secondaryMethodId: null,                                              |
|                                                                       |
| });                                                                   |
|                                                                       |
| return;                                                               |
|                                                                       |
| }                                                                     |
|                                                                       |
| if (dto.primarySplitPercent !== undefined) {                          |
|                                                                       |
| // Update percentage while split is active                            |
|                                                                       |
| this.validateSplitPercent(dto.primarySplitPercent);                   |
|                                                                       |
| await this.scheduleRepo.update(scheduleId, {                          |
|                                                                       |
| primarySplitPercent: this.truncateTo2dp(dto.primarySplitPercent),     |
|                                                                       |
| });                                                                   |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
|                                                                       |
| private truncateTo2dp(value: number): number {                        |
|                                                                       |
| return Math.floor(value \* 100) / 100;                                |
|                                                                       |
| }                                                                     |
|                                                                       |
| private validateSplitPercent(value: number): void {                   |
|                                                                       |
| const truncated = this.truncateTo2dp(value);                          |
|                                                                       |
| if (truncated \< 0.01 \|\| truncated \> 99.99)                        |
|                                                                       |
| throw new PayoutError(                                                |
|                                                                       |
| \"Each account must receive between 0.01% and 99.99%.\",              |
|                                                                       |
| HttpStatus.UNPROCESSABLE_ENTITY,                                      |
|                                                                       |
| \"ERR_SPLIT_PERCENT_OUT_OF_RANGE\",                                   |
|                                                                       |
| { value: truncated },                                                 |
|                                                                       |
| );                                                                    |
|                                                                       |
| }                                                                     |
+=======================================================================+

# **6. What Triggers a Rebalance**

  --------------------------------------------------------------------------------------
  **Trigger**        **System action**                      **User sees**
  ------------------ -------------------------------------- ----------------------------
  **User edits       Frontend: secondary auto-fills in real Counterpart field updates as
  primary % field in time. No API call until Save is        they type.
  the UI**           pressed.                               

  **User edits       Frontend: primary auto-fills in real   Counterpart field updates as
  secondary % field  time. API receives only                they type.
  in the UI**        primarySplitPercent on Save.           

  **User presses     PATCH /v1/schedules/:id/split called   Confirmation: \"Split
  Save after         with new primarySplitPercent.          updated.\"
  editing**                                                 

  **User removes     See §7 --- not a rebalance, a split    Banner or confirmation per
  secondary method** disablement.                           §7.

  **User changes the PATCH /v1/schedules/:id/split with new Method swapped. Percentage
  secondary method   secondaryMethodId. Percentages         unchanged.
  to a different     unchanged.                             
  method**                                                  

  **User changes the PATCH /v1/schedules/:id with new       Method swapped. Percentage
  primary method to  primaryMethodId. Percentages           unchanged.
  a different        unchanged.                             
  method**                                                  

  **Admin changes    PATCH                                  Contractor notified via
  contractor\'s      /internal/admin/schedules/:id/split.   notification event.
  split via admin    Same validation applies.               
  dashboard**                                               
  --------------------------------------------------------------------------------------

# **7. Behaviour When One Account in a Split Is Removed**

## **7.1 Secondary method removed**

  ---------------------------------------------------------------------------------------------
  **Scenario**                 **What happens to     **What happens to **Contractor
                               split**               payouts**         notification**
  ---------------------------- --------------------- ----------------- ------------------------
  **Contractor manually        splitEnabled set to   Payouts continue  In-app: \"Your split
  removes secondary deposit    false.                to primary method payout has been turned
  method (DELETE               primarySplitPercent   at 100%.          off because you removed
  /v1/deposit-methods/:id)**   reset to 100.00.                        {methodLabel}. All
                               secondaryMethodId                       payouts will now go to
                               cleared.                                your primary account.\"
                               splitDisabledAt                         
                               recorded.                               

  **Secondary method           Same as above ---     Payouts continue  Same notification copy.
  deactivated by system        split disabled,       to primary at     
  (failed verification, card   primary gets 100%.    100%.             
  cancelled)**                                                         

  **Secondary method enters    Split NOT             Partial           In-app: \"Your split
  REAUTH_REQUIRED state**      automatically         execution:        payout is paused for
                               disabled. Schedule    primary receives  {secondaryMethodLabel}
                               execution checks      100% until        because it needs to be
                               method status and     re-auth           reconnected. Payouts are
                               skips secondary       completed. After  going to your primary
                               (PS-17 §8). Primary   re-auth: split    account only.\" (see
                               executes at 100% of   resumes at saved  PS-16 §3.3)
                               the balance for that  percentage.       
                               cycle.                                  
  ---------------------------------------------------------------------------------------------

## **7.2 Primary method removed**

  --------------------------------------------------------------------------------------------------
  **Scenario**      **What happens to split**              **What happens to   **Contractor
                                                           payouts**           notification**
  ----------------- -------------------------------------- ------------------- ---------------------
  **Contractor      Cannot proceed if it is the only       Payouts paused ---  Pause banner shown.
  removes primary   active method or the default. DELETE   NO_DEFAULT_METHOD   Contractor must set a
  deposit method**  /v1/deposit-methods/:id blocked with   pause condition     new default method to
                    ERR_CANNOT_REMOVE_DEFAULT_WITH_SPLIT   triggered (PS-16).  resume.
                    if split is active and no other                            
                    verified method exists.                                    

  **Contractor      Old primary removed. Secondary         Payouts resume to   In-app: \"Your payout
  removes primary   promoted:                              new primary at      method has been
  and sets          deposit_schedules.primaryMethodId =    100%.               updated. Split has
  secondary as new  former secondaryMethodId. splitEnabled                     been turned off.\"
  primary**         = false. primarySplitPercent = 100.00.                     
                    secondaryMethodId = null.                                  
  --------------------------------------------------------------------------------------------------

## **7.3 Both methods removed (edge case)**

+-----------------------------------------------------------------------+
| typescript                                                            |
+-----------------------------------------------------------------------+
| // If contractor attempts to remove their only remaining deposit      |
| method while split is active:                                         |
|                                                                       |
| // DELETE /v1/deposit-methods/:id                                     |
|                                                                       |
| // Pre-deletion check:                                                |
|                                                                       |
| const activeCount = await this.methodRepo.count({                     |
|                                                                       |
| where: { contractorId, isActive: true },                              |
|                                                                       |
| });                                                                   |
|                                                                       |
| if (activeCount === 1)                                                |
|                                                                       |
| throw new PayoutError(                                                |
|                                                                       |
| \"You cannot remove your only payout method. Add another method       |
| before removing this one.\",                                          |
|                                                                       |
| HttpStatus.CONFLICT,                                                  |
|                                                                       |
| \"ERR_CANNOT_REMOVE_ONLY_METHOD\",                                    |
|                                                                       |
| );                                                                    |
+=======================================================================+

# **8. Toggle --- Full State Machine**

  ----------------------------------------------------------------------------------------------------------------------
  **Current     **Action**            **New state** **primarySplitPercent**   **secondaryMethodId**   **splitEnabled**
  state**                                                                                             
  ------------- --------------------- ------------- ------------------------- ----------------------- ------------------
  **Split OFF** Toggle ON             Split ON      50.00                     Must be set by          true
                                      (50/50)                                 contractor in same      
                                                                              action                  

  **Split ON    Toggle OFF            Split OFF     100.00                    null (cleared)          false
  (any %)**                                                                                           

  **Split ON    Toggle OFF then       Split ON      50.00                     null until contractor   true
  (any %)**     immediately ON        (50/50 reset)                           selects                 

  **Split ON**  Secondary method      Split OFF     100.00                    null                    false
                removed                                                                               
                (auto-disable)                                                                        

  **Split OFF** Contractor sets       Validation    Unchanged                 Unchanged               false
                primarySplitPercent   error ---                                                       
                without toggling ON   cannot set                                                      
                first                 split percent                                                   
                                      while split                                                     
                                      is off                                                          
  ----------------------------------------------------------------------------------------------------------------------

  ------------------------------------------------------------------------
  **UI element**     **Behaviour when       **Behaviour when toggled ON**
                     toggled OFF**          
  ------------------ ---------------------- ------------------------------
  **Primary %        Greyed out. Shows      Editable. Pre-filled with 50.
  input**            \"100%\" (not          
                     editable).             

  **Secondary %      Hidden or greyed out.  Editable. Pre-filled with 50.
  input**            Shows \"---\".         

  **Secondary method Hidden.                Shown. Required before Save is
  selector**                                enabled.

  **Save button**    Disabled while         Disabled until both method and
                     toggling off           percentage are valid.
                     (auto-saves            
                     immediately).          

  **Informational    \"All payouts will go  \"Split payouts divide each
  note**             to your primary        payout between two accounts.\"
                     account.\"             
  ------------------------------------------------------------------------

# **9. Validation Summary**

  -----------------------------------------------------------------------------------------------
  **Validation**          **Rule**                         **Error code**
  ----------------------- -------------------------------- --------------------------------------
  **primarySplitPercent   \>= 0.01 (after truncation to    ERR_SPLIT_PERCENT_OUT_OF_RANGE
  minimum**               2dp)                             

  **primarySplitPercent   \<= 99.99 (after truncation to   ERR_SPLIT_PERCENT_OUT_OF_RANGE
  maximum**               2dp)                             

  **Sum invariant**       primarySplitPercent +            ERR_SPLIT_ROUNDING_FAULT (execution
                          secondarySplitPercent = 100.00   time only --- cannot occur at write
                          (enforced by DB computed column) time)

  **Primary and secondary secondaryMethodId !==            ERR_SPLIT_SAME_METHOD
  methods must differ**   primaryMethodId                  

  **Secondary method must deposit_methods.isActive=true,   ERR_SPLIT_METHOD_NOT_VERIFIED
  be active and           verificationStatus=verified      
  verified**                                               

  **Cannot enable split   secondaryMethodId must be set    ERR_SPLIT_NO_SECONDARY_METHOD
  without selecting a     when splitEnabled=true           
  secondary method**                                       

  **Cannot remove default DELETE /v1/deposit-methods/:id   ERR_CANNOT_REMOVE_DEFAULT_WITH_SPLIT
  method while split      pre-check                        
  active and no other                                      
  verified method**                                        

  **Cannot remove only    activeCount \>= 2 before         ERR_CANNOT_REMOVE_ONLY_METHOD
  method**                deletion proceeds                
  -----------------------------------------------------------------------------------------------

# **10. References**

  -----------------------------------------------------------------------
  **Document /           **Relevant to**
  Resource**             
  ---------------------- ------------------------------------------------
  **PS-03 --- Deposit    deposit_schedules schema. primarySplitPercent,
  Schedule**             secondaryMethodId, splitEnabled columns.

  **PS-04 --- Deposit    Method deletion pre-checks. isActive,
  Method Management**    verificationStatus.

  **PS-17 --- Deposit    Execution-time split amount calculation. Partial
  Schedule Execution     failure handling when secondary fails.
  Engine**               

  **PS-16 --- Paused     NO_DEFAULT_METHOD pause condition triggered when
  Payouts & Alert        primary removed with no replacement.
  System**               
  -----------------------------------------------------------------------

CONFIDENTIAL --- Marketeq Internal Engineering Documentation \|
payout-service PS-18 \| v1.0
