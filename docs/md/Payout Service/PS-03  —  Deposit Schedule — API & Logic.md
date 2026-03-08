**[MARKETEQ PLATFORM --- BACKEND DOCUMENTATION]{.smallcaps}**

**payout-service**

PS-03 --- Deposit Schedule --- API & Logic

  -----------------------------------------------------------------------
  **Property**        **Value**
  ------------------- ---------------------------------------------------
  **Document**        PS-03 --- Deposit Schedule --- API & Logic

  **Version**         1.0

  **Endpoints**       GET /v1/payouts/schedule, PUT /v1/payouts/schedule

  **Frequencies**     daily, weekly, bi-weekly, monthly, custom (1--365
                      day interval)

  **Threshold range** \$50--\$1,000+ (scheduled deposits only, not manual
                      withdrawals)

  **Reserve balance** Off by default (\$0). Max \$250. \$0 = disabled.

  **Split payout**    Max 2 methods. Auto-balance: system resolves
                      percentages, no manual sum-to-100 required.

  **Prerequisites**   PS-00, PS-01, PS-02
  -----------------------------------------------------------------------

# **1. Overview**

The deposit schedule defines when and how the platform automatically
moves a contractor\'s available balance to their deposit method(s). A
contractor configures frequency, a minimum threshold, an optional
reserve, and optionally splits the payout across two methods.

+-----------------------------------------------------------------------+
| **Schedule vs manual withdrawal**                                     |
|                                                                       |
| Schedule: automated, threshold-gated, reserve-respecting,             |
| split-capable.                                                        |
|                                                                       |
| Manual: contractor-initiated, \$50 minimum, no threshold or reserve   |
| logic, no split.                                                      |
|                                                                       |
| These are independent flows. Schedule configuration has no effect on  |
| manual withdrawals.                                                   |
+=======================================================================+

# **2. Endpoints**

## **2.1 GET /v1/payouts/schedule**

Returns the contractor\'s current schedule configuration. If no schedule
has been saved, returns the default configuration (weekly, \$50
threshold, no reserve, no split).

+-----------------------------------------------------------------------+
| typescript                                                            |
+-----------------------------------------------------------------------+
| // Response 200                                                       |
|                                                                       |
| {                                                                     |
|                                                                       |
| \"scheduleId\": \"uuid \| null\",                                     |
|                                                                       |
| \"isActive\": true,                                                   |
|                                                                       |
| \"frequency\": \"weekly\",                                            |
|                                                                       |
| \"dayOfWeek\": 1, // 0=Sun...6=Sat. Present when                      |
| frequency=weekly\|bi_weekly                                           |
|                                                                       |
| \"dayOfMonth\": null, // 1--28. Present when frequency=monthly        |
|                                                                       |
| \"customIntervalDays\": null, // 1--365. Present when                 |
| frequency=custom                                                      |
|                                                                       |
| \"thresholdUsd\": \"50.00\",                                          |
|                                                                       |
| \"reserveUsd\": \"0.00\", // 0.00 = reserve disabled                  |
|                                                                       |
| \"primaryMethod\": {                                                  |
|                                                                       |
| \"id\": \"uuid\",                                                     |
|                                                                       |
| \"displayLabel\": \"Chase ••••4242\",                                 |
|                                                                       |
| \"methodType\": \"BANK_STRIPE\",                                      |
|                                                                       |
| \"pct\": \"100.00\"                                                   |
|                                                                       |
| },                                                                    |
|                                                                       |
| \"secondaryMethod\": null,                                            |
|                                                                       |
| \"nextRunAt\": \"2025-06-16T00:00:00Z\",                              |
|                                                                       |
| \"lastRunAt\": \"2025-06-09T00:00:00Z\"                               |
|                                                                       |
| }                                                                     |
+=======================================================================+

## **2.2 PUT /v1/payouts/schedule**

Creates or fully replaces the contractor\'s schedule. All fields are
optional --- any field omitted retains its current value. Returns the
saved schedule.

+-----------------------------------------------------------------------+
| typescript                                                            |
+-----------------------------------------------------------------------+
| // Request body --- all fields optional                               |
|                                                                       |
| {                                                                     |
|                                                                       |
| \"isActive\": true,                                                   |
|                                                                       |
| \"frequency\": \"weekly\",                                            |
|                                                                       |
| \"dayOfWeek\": 1,                                                     |
|                                                                       |
| \"dayOfMonth\": null,                                                 |
|                                                                       |
| \"customIntervalDays\": null,                                         |
|                                                                       |
| \"thresholdUsd\": \"100.00\",                                         |
|                                                                       |
| \"reserveUsd\": \"50.00\",                                            |
|                                                                       |
| \"primaryMethodId\": \"uuid\",                                        |
|                                                                       |
| \"primaryPct\": \"60\", // optional --- system auto-balances if       |
| omitted                                                               |
|                                                                       |
| \"secondaryMethodId\": \"uuid\", // optional --- null removes split   |
|                                                                       |
| \"secondaryPct\": \"40\" // optional --- auto-derived if omitted      |
|                                                                       |
| }                                                                     |
|                                                                       |
| // Response 200 --- saved schedule (same shape as GET response)       |
+=======================================================================+

## **2.3 Validation rules**

  -----------------------------------------------------------------------------------------------------------
  **Field**                **Validation**                              **Error code**
  ------------------------ ------------------------------------------- --------------------------------------
  **frequency**            Must be                                     ERR_SCHEDULE_INVALID_FREQUENCY
                           daily\|weekly\|bi_weekly\|monthly\|custom   

  **dayOfWeek**            Required when frequency=weekly or           ERR_SCHEDULE_INVALID_DAY_OF_WEEK
                           bi_weekly. Integer 0--6.                    

  **dayOfMonth**           Required when frequency=monthly. Integer    ERR_SCHEDULE_INVALID_DAY_OF_MONTH
                           1--28. (29--31 excluded to avoid month-end  
                           edge cases.)                                

  **customIntervalDays**   Required when frequency=custom. Integer     ERR_SCHEDULE_INVALID_INTERVAL
                           1--365.                                     

  **thresholdUsd**         Minimum \$50.00. Maximum \$1,000,000 (no    ERR_SCHEDULE_THRESHOLD_BELOW_MINIMUM
                           practical upper cap beyond sanity).         

  **reserveUsd**           Minimum \$0 (disabled). Maximum \$250.00.   ERR_SCHEDULE_RESERVE_EXCEEDS_MAX

  **primaryMethodId**      Must be an active, verified deposit method  ERR_SCHEDULE_METHOD_NOT_FOUND
                           owned by contractor.                        

  **secondaryMethodId**    If provided: must be active, verified,      ERR_SCHEDULE_DUPLICATE_METHOD
                           owned, and different from primaryMethodId.  

  **pct values**           If provided: each must be 0.01--99.99.      ERR_SCHEDULE_INVALID_PCT
                           Auto-balanced if omitted --- see §4.        
  -----------------------------------------------------------------------------------------------------------

# **3. Frequency Options**

  ---------------------------------------------------------------------------------
  **Frequency**   **Config required**  **next_run_at calculation** **Example**
  --------------- -------------------- --------------------------- ----------------
  **daily**       None                 Next midnight UTC from now  Every day at
                                                                   00:00 UTC

  **weekly**      dayOfWeek (0--6)     Next occurrence of that     Every Monday
                                       weekday at 00:00 UTC        

  **bi_weekly**   dayOfWeek (0--6)     Next occurrence of that     Every other
                                       weekday, then +14 days      Monday
                                       thereafter                  

  **monthly**     dayOfMonth (1--28)   Next occurrence of that     1st of every
                                       calendar day at 00:00 UTC   month

  **custom**      customIntervalDays   lastRunAt + interval days.  Every 10 days
                  (1--365)             If no lastRunAt: now +      
                                       interval.                   
  ---------------------------------------------------------------------------------

+-----------------------------------------------------------------------+
| **Day 29, 30, 31 excluded from monthly**                              |
|                                                                       |
| Monthly schedules only allow dayOfMonth 1--28.                        |
|                                                                       |
| This avoids the edge case where \"run on the 31st\" never fires in    |
| February, April, June, etc.                                           |
|                                                                       |
| Contractors who want end-of-month should use dayOfMonth=28.           |
+=======================================================================+

# **4. Auto-Balance Split Percentage Logic**

The auto-balance system ensures percentages always sum to exactly 100
without requiring the contractor to do manual arithmetic. The rules
below determine the resolved percentages from whatever the contractor
provides.

## **4.1 Resolution rules**

  -----------------------------------------------------------------------
  **Input state**             **Resolution**
  --------------------------- -------------------------------------------
  **primaryPct provided,      secondaryPct = 100 - primaryPct
  secondaryPct omitted**      

  **secondaryPct provided,    primaryPct = 100 - secondaryPct
  primaryPct omitted**        

  **Both provided and sum =   Use as-is
  100**                       

  **Both provided and sum ≠   Reject: ERR_SCHEDULE_PCT_DOES_NOT_SUM. Ask
  100**                       contractor to correct.

  **Neither provided, split   Default: primaryPct=50, secondaryPct=50
  is new (secondaryMethodId   
  just added)**               

  **Neither provided, split   Retain existing percentages from DB
  was previously saved**      

  **secondaryMethodId set to  primaryPct=100, secondaryPct=null
  null (removing split)**     
  -----------------------------------------------------------------------

## **4.2 Auto-balance service logic**

+-----------------------------------------------------------------------+
| typescript                                                            |
+-----------------------------------------------------------------------+
| function resolvePercentages(                                          |
|                                                                       |
| primaryPct?: string \| null,                                          |
|                                                                       |
| secondaryPct?: string \| null,                                        |
|                                                                       |
| existingPrimary?: string \| null,                                     |
|                                                                       |
| existingSecondary?: string \| null,                                   |
|                                                                       |
| isNewSplit?: boolean,                                                 |
|                                                                       |
| ): { primaryPct: string; secondaryPct: string \| null } {             |
|                                                                       |
| // No secondary method --- 100% primary                               |
|                                                                       |
| if (!secondaryPct && !primaryPct && !existingSecondary) {             |
|                                                                       |
| return { primaryPct: \'100.00\', secondaryPct: null };                |
|                                                                       |
| }                                                                     |
|                                                                       |
| const p = parseFloat(primaryPct ?? existingPrimary ?? \'0\');         |
|                                                                       |
| const s = parseFloat(secondaryPct ?? existingSecondary ?? \'0\');     |
|                                                                       |
| // Both supplied --- validate they sum to 100                         |
|                                                                       |
| if (primaryPct && secondaryPct) {                                     |
|                                                                       |
| if (Math.abs(p + s - 100) \> 0.01) {                                  |
|                                                                       |
| throw new PayoutError(\'Percentages must sum to 100.\',               |
|                                                                       |
| HttpStatus.BAD_REQUEST, \'ERR_SCHEDULE_PCT_DOES_NOT_SUM\');           |
|                                                                       |
| }                                                                     |
|                                                                       |
| return { primaryPct: p.toFixed(2), secondaryPct: s.toFixed(2) };      |
|                                                                       |
| }                                                                     |
|                                                                       |
| // Only primary supplied --- derive secondary                         |
|                                                                       |
| if (primaryPct && !secondaryPct) {                                    |
|                                                                       |
| if (p \<= 0 \|\| p \>= 100) throw new PayoutError(\'Primary           |
| percentage must be between 1 and 99.\',                               |
|                                                                       |
| HttpStatus.BAD_REQUEST, \'ERR_SCHEDULE_INVALID_PCT\');                |
|                                                                       |
| return { primaryPct: p.toFixed(2), secondaryPct: (100 - p).toFixed(2) |
| };                                                                    |
|                                                                       |
| }                                                                     |
|                                                                       |
| // Only secondary supplied --- derive primary                         |
|                                                                       |
| if (secondaryPct && !primaryPct) {                                    |
|                                                                       |
| if (s \<= 0 \|\| s \>= 100) throw new PayoutError(\'Secondary         |
| percentage must be between 1 and 99.\',                               |
|                                                                       |
| HttpStatus.BAD_REQUEST, \'ERR_SCHEDULE_INVALID_PCT\');                |
|                                                                       |
| return { primaryPct: (100 - s).toFixed(2), secondaryPct: s.toFixed(2) |
| };                                                                    |
|                                                                       |
| }                                                                     |
|                                                                       |
| // New split, neither supplied --- default 50/50                      |
|                                                                       |
| if (isNewSplit) return { primaryPct: \'50.00\', secondaryPct:         |
| \'50.00\' };                                                          |
|                                                                       |
| // Existing split, neither changed --- retain DB values               |
|                                                                       |
| return { primaryPct: existingPrimary!, secondaryPct:                  |
| existingSecondary! };                                                 |
|                                                                       |
| }                                                                     |
+=======================================================================+

# **5. Threshold & Reserve Logic**

## **5.1 Threshold**

The threshold is the minimum available balance that must exist before a
scheduled payout fires. It applies only to scheduled payouts --- not to
manual withdrawals.

  -----------------------------------------------------------------------
  **Scenario**           **Behaviour**
  ---------------------- ------------------------------------------------
  **availableBalance \>= Scheduled payout fires. Amount =
  threshold**            availableBalance - reserveUsd.

  **availableBalance \<  Scheduled payout skipped. next_run_at advanced
  threshold**            to next interval. No payout_request created.

  **availableBalance =   Payout fires. Amount = threshold - reserveUsd
  threshold exactly**    (which may be \$0 if reserve disabled).

  **threshold set to     Skipped. Contractor will accumulate until
  \$1,000, balance is    \$1,000 is reached.
  \$999.99**             
  -----------------------------------------------------------------------

## **5.2 Reserve balance**

The reserve is a floor --- the scheduler never pays out the reserve
amount. A reserve of \$0 (default) means the full balance above the
threshold is paid out.

+-----------------------------------------------------------------------+
| typescript                                                            |
+-----------------------------------------------------------------------+
| function calculatePayoutAmount(                                       |
|                                                                       |
| availableBalanceUsd: string,                                          |
|                                                                       |
| thresholdUsd: string,                                                 |
|                                                                       |
| reserveUsd: string,                                                   |
|                                                                       |
| ): { shouldPay: boolean; payoutAmountUsd: string } {                  |
|                                                                       |
| const balance = parseFloat(availableBalanceUsd);                      |
|                                                                       |
| const threshold = parseFloat(thresholdUsd);                           |
|                                                                       |
| const reserve = parseFloat(reserveUsd);                               |
|                                                                       |
| if (balance \< threshold) return { shouldPay: false, payoutAmountUsd: |
| \'0.00\' };                                                           |
|                                                                       |
| const payoutAmount = balance - reserve;                               |
|                                                                       |
| if (payoutAmount \<= 0) return { shouldPay: false, payoutAmountUsd:   |
| \'0.00\' };                                                           |
|                                                                       |
| return { shouldPay: true, payoutAmountUsd: payoutAmount.toFixed(2) }; |
|                                                                       |
| }                                                                     |
|                                                                       |
| // Examples:                                                          |
|                                                                       |
| // balance=\$500, threshold=\$50, reserve=\$0 → pay \$500             |
|                                                                       |
| // balance=\$500, threshold=\$200, reserve=\$0 → pay \$500 (balance   |
| \>= threshold)                                                        |
|                                                                       |
| // balance=\$150, threshold=\$200, reserve=\$0 → skip (balance \<     |
| threshold)                                                            |
|                                                                       |
| // balance=\$500, threshold=\$50, reserve=\$100 → pay \$400           |
|                                                                       |
| // balance=\$120, threshold=\$50, reserve=\$100 → pay \$20            |
|                                                                       |
| // balance=\$60, threshold=\$50, reserve=\$100 → skip                 |
| (payoutAmount=\$0 after reserve)                                      |
+=======================================================================+

+-----------------------------------------------------------------------+
| **Reserve does not raise the threshold**                              |
|                                                                       |
| The threshold check uses availableBalance only --- not                |
| (availableBalance - reserve).                                         |
|                                                                       |
| Example: balance=\$120, threshold=\$100, reserve=\$100.               |
|                                                                       |
| Step 1: \$120 \>= \$100 threshold → proceed.                          |
|                                                                       |
| Step 2: payoutAmount = \$120 - \$100 reserve = \$20.                  |
|                                                                       |
| A \$20 payout is initiated even though \$20 \< \$50 minimum.          |
|                                                                       |
| The \$50 minimum applies only to manual withdrawals --- not scheduled |
| payouts.                                                              |
+=======================================================================+

# **6. Split Payout Execution**

When a contractor has two deposit methods configured, the scheduler
creates two payout_request rows sharing a split_group_id. Each leg is
processed independently by its provider. Both legs must complete for the
split to be considered fully settled.

+-----------------------------------------------------------------------+
| typescript                                                            |
+-----------------------------------------------------------------------+
| async executeScheduledSplit(                                          |
|                                                                       |
| contractorId: string,                                                 |
|                                                                       |
| totalAmountUsd: string,                                               |
|                                                                       |
| schedule: PayoutSchedule,                                             |
|                                                                       |
| ): Promise\<void\> {                                                  |
|                                                                       |
| const splitGroupId = randomUUID();                                    |
|                                                                       |
| const total = parseFloat(totalAmountUsd);                             |
|                                                                       |
| const primaryAmt = ((total \* parseFloat(schedule.primaryPct)) /      |
| 100).toFixed(2);                                                      |
|                                                                       |
| // Secondary gets the remainder --- avoids floating-point sum drift   |
|                                                                       |
| const secondaryAmt = (total - parseFloat(primaryAmt)).toFixed(2);     |
|                                                                       |
| const idempotencyPrimary = randomUUID();                              |
|                                                                       |
| const idempotencySecondary = randomUUID();                            |
|                                                                       |
| await this.dataSource.transaction(async (em) =\> {                    |
|                                                                       |
| await em.save(PayoutRequest, {                                        |
|                                                                       |
| contractorId, splitGroupId, splitSequence: 1,                         |
|                                                                       |
| depositMethodId: schedule.primaryMethodId,                            |
|                                                                       |
| amountUsd: primaryAmt, feeUsd: \'0.00\', netAmountUsd: primaryAmt,    |
|                                                                       |
| idempotencyKey: idempotencyPrimary,                                   |
|                                                                       |
| trigger: PayoutTrigger.SCHEDULED,                                     |
|                                                                       |
| status: PayoutStatus.QUEUED,                                          |
|                                                                       |
| });                                                                   |
|                                                                       |
| await em.save(PayoutRequest, {                                        |
|                                                                       |
| contractorId, splitGroupId, splitSequence: 2,                         |
|                                                                       |
| depositMethodId: schedule.secondaryMethodId!,                         |
|                                                                       |
| amountUsd: secondaryAmt, feeUsd: \'0.00\', netAmountUsd:              |
| secondaryAmt,                                                         |
|                                                                       |
| idempotencyKey: idempotencySecondary,                                 |
|                                                                       |
| trigger: PayoutTrigger.SCHEDULED,                                     |
|                                                                       |
| status: PayoutStatus.QUEUED,                                          |
|                                                                       |
| });                                                                   |
|                                                                       |
| });                                                                   |
|                                                                       |
| }                                                                     |
|                                                                       |
| // Note: secondary gets remainder (total - primary) to avoid          |
| floating-point drift.                                                 |
|                                                                       |
| // e.g. \$100 at 33%: primary=\$33.00, secondary=\$67.00 (not         |
| \$33.00+\$33.00+\$34.00).                                             |
+=======================================================================+

+-----------------------------------------------------------------------+
| **Split partial failure handling**                                    |
|                                                                       |
| If primary leg completes but secondary leg fails:                     |
|                                                                       |
| • primary: payout.completed published --- earnings-service debits     |
| full primary amount                                                   |
|                                                                       |
| • secondary: payout.failed published --- earnings-service restores    |
| secondary amount to balance                                           |
|                                                                       |
| • Contractor is notified of the partial failure via                   |
| notification-service                                                  |
|                                                                       |
| • The contractor must manually retry the secondary leg                |
|                                                                       |
| • The split_group_id links both legs for admin investigation          |
+=======================================================================+

# **7. Schedule Execution Engine --- Overview**

The scheduler runs as a cron job inside payout-service. It fires every
minute, finds all schedules with next_run_at \<= now, and initiates
payouts for eligible contractors.

+-----------------------------------------------------------------------+
| typescript                                                            |
+-----------------------------------------------------------------------+
| // src/schedule/schedule.service.ts --- runScheduledPayouts()         |
|                                                                       |
| // Called by \@Cron(\'\* \* \* \* \*\') --- every minute              |
|                                                                       |
| async runScheduledPayouts(): Promise\<void\> {                        |
|                                                                       |
| const due = await this.scheduleRepo.find({                            |
|                                                                       |
| where: {                                                              |
|                                                                       |
| isActive: true,                                                       |
|                                                                       |
| nextRunAt: LessThanOrEqual(new Date()),                               |
|                                                                       |
| },                                                                    |
|                                                                       |
| take: 100, // process max 100 per tick to avoid long-running cron     |
| overlap                                                               |
|                                                                       |
| });                                                                   |
|                                                                       |
| for (const schedule of due) {                                         |
|                                                                       |
| try {                                                                 |
|                                                                       |
| await this.processSchedule(schedule);                                 |
|                                                                       |
| } catch (err) {                                                       |
|                                                                       |
| this.logger.error(\'Schedule run failed\', { scheduleId: schedule.id, |
| err: err.message });                                                  |
|                                                                       |
| // Advance next_run_at even on failure to prevent infinite retry loop |
|                                                                       |
| } finally {                                                           |
|                                                                       |
| await this.advanceNextRunAt(schedule);                                |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
|                                                                       |
| async processSchedule(schedule: PayoutSchedule): Promise\<void\> {    |
|                                                                       |
| // 1. Fresh balance read --- never cached                             |
|                                                                       |
| const balance = await                                                 |
| this.earningsClient.getBalance(schedule.contractorId);                |
|                                                                       |
| if (!balance) return; // earnings-service unavailable --- skip this   |
| tick                                                                  |
|                                                                       |
| // 2. Threshold check                                                 |
|                                                                       |
| const { shouldPay, payoutAmountUsd } = calculatePayoutAmount(         |
|                                                                       |
| balance.availableBalance, schedule.thresholdUsd, schedule.reserveUsd  |
|                                                                       |
| );                                                                    |
|                                                                       |
| if (!shouldPay) return; // below threshold --- skip, next_run_at      |
| still advances                                                        |
|                                                                       |
| // 3. KYC check                                                       |
|                                                                       |
| const kyc = await this.kycClient.getStatus(schedule.contractorId);    |
|                                                                       |
| if (kyc.firstPayoutHold \|\| kyc.suspended) return; // hold active    |
| --- skip                                                              |
|                                                                       |
| // 4. Initiate payout (split or single)                               |
|                                                                       |
| if (schedule.secondaryMethodId) {                                     |
|                                                                       |
| await this.executeScheduledSplit(schedule.contractorId,               |
| payoutAmountUsd, schedule);                                           |
|                                                                       |
| } else {                                                              |
|                                                                       |
| await this.initiateScheduledSingle(schedule.contractorId,             |
| payoutAmountUsd, schedule);                                           |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
|                                                                       |
| function advanceNextRunAt(schedule: PayoutSchedule): Date {           |
|                                                                       |
| const now = new Date();                                               |
|                                                                       |
| switch (schedule.frequency) {                                         |
|                                                                       |
| case \'daily\': return addDays(now, 1);                               |
|                                                                       |
| case \'weekly\': return nextWeekday(schedule.dayOfWeek!);             |
|                                                                       |
| case \'bi_weekly\': return addDays(nextWeekday(schedule.dayOfWeek!),  |
| 7);                                                                   |
|                                                                       |
| case \'monthly\': return nextMonthDay(schedule.dayOfMonth!);          |
|                                                                       |
| case \'custom\': return addDays(now, schedule.customIntervalDays!);   |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
+=======================================================================+

  -----------------------------------------------------------------------
  **Engine property**      **Value**
  ------------------------ ----------------------------------------------
  **Cron interval**        Every minute

  **Max schedules per      100 --- prevents cron overlap under load
  tick**                   

  **next_run_at advance**  Always advances, even when threshold not met
                           or KYC hold active

  **earnings-service       Skip tick --- do not mark as failed. Retry on
  unavailable**            next cron fire.

  **Cron overlap guard**   \@Cron with SchedulerRegistry.doesExist()
                           check prevents concurrent runs

  **Audit log**            Every scheduled payout attempt logged to
                           payout_audit_log regardless of outcome
  -----------------------------------------------------------------------

# **8. Default Method Removed --- Schedule Pause Behaviour**

If a contractor removes or deactivates their primary deposit method,
scheduled payouts pause automatically. The contractor sees a persistent
alert until they set a new default method.

  ------------------------------------------------------------------------
  **Event**             **payout_schedules       **Frontend alert**
                        change**                 
  --------------------- ------------------------ -------------------------
  **Primary method      primaryMethodId set to   Persistent banner: \"Your
  deactivated**         null. isActive remains   scheduled payouts are
                        true but                 paused. Add a deposit
                        processSchedule() skips  method to resume.\"
                        when primaryMethodId is  
                        null.                    

  **Secondary method    secondaryMethodId set to Toast: \"Secondary
  deactivated**         null. Schedule continues deposit method removed.
                        with 100% to primary.    Your full balance will
                                                 now go to \[primary
                                                 label\].\"

  **Both methods        primaryMethodId null.    Same as primary-only case
  deactivated**         Payouts fully paused.    above.

  **New default set**   primaryMethodId updated. Alert dismissed
                        next_run_at recalculated automatically.
                        from now.                
  ------------------------------------------------------------------------

# **9. References**

  -----------------------------------------------------------------------
  **Document**           **Relevant to**
  ---------------------- ------------------------------------------------
  **PS-01 --- Database   payout_schedules table, split_group_id on
  Schema**               payout_requests, reserve and threshold columns

  **PS-02 --- Withdrawal Manual withdrawal flow --- separate from
  Flow**                 schedule. \$50 minimum applies there too.

  **PS-14 --- Split      Full split payout edge cases, partial failure
  Payout Logic**         handling, leg retry flow

  **PS-15 --- Scheduled  Full cron implementation, distributed lock,
  Payout Engine**        large-scale schedule processing

  **PS-21 --- Internal   earnings-service balance read used in
  Balance Check**        processSchedule() --- fresh read, never cached
  -----------------------------------------------------------------------

CONFIDENTIAL --- Marketeq Internal Engineering Documentation \|
payout-service PS-03 \| v1.0
