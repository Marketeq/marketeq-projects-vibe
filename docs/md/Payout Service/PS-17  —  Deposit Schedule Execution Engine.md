**[MARKETEQ PLATFORM --- BACKEND DOCUMENTATION]{.smallcaps}**

**payout-service**

PS-17 --- Deposit Schedule Execution Engine

  -----------------------------------------------------------------------
  **Property**        **Value**
  ------------------- ---------------------------------------------------
  **Document**        PS-17 --- Deposit Schedule Execution Engine

  **Version**         1.0

  **Applies to**      All scheduled payouts. WEEKLY, BIWEEKLY, MONTHLY
                      frequency options.

  **Cron runner**     \@nestjs/schedule. Single cron fires every 30
                      minutes --- evaluates all due schedules per cycle.

  **Minimum threshold Silent skip on first miss. Notification after 3
  skip**              consecutive missed cycles.

  **Split execution** Primary method executes first and must fully
                      confirm before secondary executes.

  **Partial failure** Primary success + secondary failure: primary is NOT
                      reversed. Secondary retried independently.

  **Atomicity**       Per-method execution is atomic. Cross-method split
                      is not --- see §7.

  **Prerequisites**   PS-02, PS-03, PS-16, PS-15, PS-14
  -----------------------------------------------------------------------

# **1. Overview**

The deposit schedule execution engine is a cron-driven service that
evaluates all active contractor payout schedules every 30 minutes,
identifies which schedules are due for execution, and processes payouts
in a controlled, auditable sequence. It is not a simple fire-and-forget
job --- it enforces minimum balance thresholds with consecutive-miss
tracking, executes split payouts in a defined order with partial failure
isolation, runs all pre-flight gates (pause conditions, KYC, method
verification) identically to manual withdrawals, and produces a complete
audit trail per execution cycle. This document specifies the cron
expressions, execution windows, threshold logic, split execution order,
partial failure handling, and atomicity guarantees.

# **2. Frequency Options and Cron Expressions**

  ----------------------------------------------------------------------------------------------------
  **Frequency**   **Label shown   **Cron             **Execution day**          **Notes**
                  to contractor** expression**                                  
  --------------- --------------- ------------------ -------------------------- ----------------------
  **WEEKLY**      Every week      0 9 \* \* 1        Every Monday at 09:00 UTC  If Monday is a public
                                                                                holiday: executes
                                                                                Tuesday. Holiday list:
                                                                                US federal holidays
                                                                                only in v1.

  **BIWEEKLY**    Every two weeks 0 9 \* \* 1/2      Every other Monday at      Biweekly anchor date
                                                     09:00 UTC                  set at schedule
                                                                                creation. Even/odd
                                                                                week determined by
                                                                                schedule.anchorDate.

  **MONTHLY**     Once a month    0 9 1 \* \*        1st of each month at 09:00 If 1st is Saturday:
                                                     UTC                        executes Friday
                                                                                30th/31st prior. If
                                                                                1st is Sunday:
                                                                                executes Monday 2nd.

  **THRESHOLD**   When balance    N/A ---            Triggered by               Not a cron job.
                  reaches \$X     event-driven       earnings.balance.updated   Separate
                                                     event                      threshold-triggered
                                                                                executor. Not covered
                                                                                in this document.
  ----------------------------------------------------------------------------------------------------

+-----------------------------------------------------------------------+
| **Single master cron --- not one cron per frequency**                 |
|                                                                       |
| payout-service runs one cron job that fires every 30 minutes: 0,30 \* |
| \* \* \*                                                              |
|                                                                       |
| On each tick it queries deposit_schedules for all rows where:         |
|                                                                       |
| nextExecutionAt \<= NOW() AND isActive = true AND pausedAt IS NULL    |
|                                                                       |
| This means all frequency types are evaluated by the same job.         |
|                                                                       |
| A separate per-frequency cron would create execution drift and        |
| complicate holiday handling.                                          |
|                                                                       |
| The 30-minute tick ensures no schedule is delayed more than 30        |
| minutes past its due time.                                            |
+=======================================================================+

+-----------------------------------------------------------------------+
| typescript                                                            |
+-----------------------------------------------------------------------+
| // src/schedule/schedule-execution.cron.ts                            |
|                                                                       |
| // Folder: /apps/payout-service/src/schedule/                         |
|                                                                       |
| \@Cron(\"0,30 \* \* \* \*\") // fires at :00 and :30 of every hour    |
|                                                                       |
| async runScheduledPayouts(): Promise\<void\> {                        |
|                                                                       |
| const lock = await                                                    |
| this.redisLock.acquire(\"schedule:execution:lock\", 25 \* 60 \*       |
| 1000);                                                                |
|                                                                       |
| if (!lock) {                                                          |
|                                                                       |
| this.logger.warn(\"Schedule execution already running --- skipping    |
| tick\");                                                              |
|                                                                       |
| return;                                                               |
|                                                                       |
| }                                                                     |
|                                                                       |
| try {                                                                 |
|                                                                       |
| const due = await this.scheduleRepo.find({                            |
|                                                                       |
| where: {                                                              |
|                                                                       |
| isActive: true,                                                       |
|                                                                       |
| pausedAt: IsNull(),                                                   |
|                                                                       |
| nextExecutionAt: LessThanOrEqual(new Date()),                         |
|                                                                       |
| },                                                                    |
|                                                                       |
| });                                                                   |
|                                                                       |
| this.logger.log(\`Schedule tick: \${due.length} schedules due\`);     |
|                                                                       |
| // Process in parallel --- each schedule is independent               |
|                                                                       |
| // Concurrency cap: 50 simultaneous --- avoid overwhelming bridge     |
| APIs                                                                  |
|                                                                       |
| await pLimit(50)(due.map(schedule =\> () =\>                          |
| this.processSchedule(schedule)));                                     |
|                                                                       |
| } finally {                                                           |
|                                                                       |
| await this.redisLock.release(\"schedule:execution:lock\");            |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
+=======================================================================+

# **3. Execution Time Windows**

Scheduled payouts execute within a defined window. If the cron tick
detects a due schedule outside the execution window (e.g. a schedule
that became due overnight), it defers it to the next available window
start --- not the next scheduled frequency date. This prevents batch
payouts from processing at 3:00 AM and producing confusing contractor
notifications.

  -------------------------------------------------------------------------
  **Window**    **Time (UTC)**  **Days**        **Behaviour outside
                                                window**
  ------------- --------------- --------------- ---------------------------
  **Primary     06:00 -- 22:00  Monday --       Deferred to the next window
  window**      UTC             Friday          open (06:00 next business
                                                day).

  **Weekend**   Saturday --     All hours       Deferred to Monday 06:00
                Sunday                          UTC. Exception: if
                                                frequency is MONTHLY and
                                                1st falls on a weekend ---
                                                see §2 holiday/weekend
                                                logic.

  **Public      All hours on    N/A             Deferred to next business
  holiday (US   holiday                         day 06:00 UTC. Holiday list
  federal)**                                    maintained in environment
                                                config.
  -------------------------------------------------------------------------

+-----------------------------------------------------------------------+
| typescript                                                            |
+-----------------------------------------------------------------------+
| // Window check inside processSchedule()                              |
|                                                                       |
| private isWithinExecutionWindow(now: Date): boolean {                 |
|                                                                       |
| const day = now.getUTCDay(); // 0=Sun, 6=Sat                          |
|                                                                       |
| const hour = now.getUTCHours();                                       |
|                                                                       |
| if (day === 0 \|\| day === 6) return false; // weekend                |
|                                                                       |
| if (this.isPublicHoliday(now)) return false;                          |
|                                                                       |
| return hour \>= 6 && hour \< 22; // 06:00--22:00 UTC                  |
|                                                                       |
| }                                                                     |
|                                                                       |
| private async processSchedule(schedule: DepositSchedule):             |
| Promise\<void\> {                                                     |
|                                                                       |
| if (!this.isWithinExecutionWindow(new Date())) {                      |
|                                                                       |
| // Defer --- do NOT update nextExecutionAt here                       |
|                                                                       |
| // The schedule remains due and will be picked up on the next tick    |
| inside the window                                                     |
|                                                                       |
| this.logger.log(\"Schedule deferred --- outside execution window\",   |
|                                                                       |
| { scheduleId: schedule.id });                                         |
|                                                                       |
| return;                                                               |
|                                                                       |
| }                                                                     |
|                                                                       |
| // \... proceed to pre-flight checks                                  |
|                                                                       |
| }                                                                     |
+=======================================================================+

# **4. Pre-Flight Checks Before Execution**

Every scheduled execution runs the same pre-flight stack as a manual
withdrawal. The sequence is identical to PS-15 §7, with the addition of
the minimum threshold check.

  -----------------------------------------------------------------------------
  **Check   **Gate**                 **On failure**
  order**                            
  --------- ------------------------ ------------------------------------------
  **1**     Pause conditions (PS-16  Skip cycle. Log. No notification (already
            assertNotPaused)         notified at pause trigger).

  **2**     KYC Tier 1 and Tier 2    Skip cycle. Log.
            (PS-15)                  

  **3**     KYC Tier 3 for target    Skip cycle for this method. Log.
            method (PS-15)           

  **4**     Method is active and     Skip cycle. If method just became
            verified                 inactive: evaluate pause condition and
                                     notify.

  **5**     Minimum balance          Skip cycle with consecutive-miss tracking.
            threshold (§5 below)     Notify after 3 misses.

  **6**     EDD --- if balance \>=   Pause schedule. Route to compliance queue.
            \$10,000 (PS-15 §6)      Notify contractor.
  -----------------------------------------------------------------------------

# **5. Minimum Balance Threshold --- Skip Logic**

## **5.1 Threshold definition**

Each deposit_schedules row has a minimumThresholdUSD column (nullable).
If set, the schedule only executes when the contractor\'s available
balance meets or exceeds the threshold. If balance is below threshold
the cycle is skipped. The skip is recorded. After 3 consecutive skipped
cycles the contractor is notified.

  ------------------------------------------------------------------------
  **Scenario**           **Behaviour**
  ---------------------- -------------------------------------------------
  **Balance \>=          Execute normally. consecutiveMissCount reset to 0
  threshold**            after execution.

  **Balance \<           Skip silently. consecutiveMissCount set to 1.
  threshold,             nextExecutionAt advanced to next period. No
  consecutiveMissCount = notification.
  0**                    

  **Balance \<           Skip silently. consecutiveMissCount set to 2.
  threshold,             nextExecutionAt advanced. No notification.
  consecutiveMissCount = 
  1**                    

  **Balance \<           Skip. consecutiveMissCount set to 3.
  threshold,             nextExecutionAt advanced. Notification sent:
  consecutiveMissCount = §5.3.
  2**                    

  **Balance \<           Skip. consecutiveMissCount incremented.
  threshold,             Notification sent again every 3rd miss (at 3, 6,
  consecutiveMissCount   9\...). Not every miss.
  \>= 3**                

  **Balance \>=          Execute. consecutiveMissCount reset to 0. If
  threshold on any       contractor was previously notified: send resume
  subsequent cycle**     notification.
  ------------------------------------------------------------------------

## **5.2 Threshold skip code**

+-----------------------------------------------------------------------+
| typescript                                                            |
+-----------------------------------------------------------------------+
| // src/schedule/threshold-check.service.ts                            |
|                                                                       |
| async checkThreshold(                                                 |
|                                                                       |
| schedule: DepositSchedule,                                            |
|                                                                       |
| availableBalanceUSD: number,                                          |
|                                                                       |
| ): Promise\<{ proceed: boolean }\> {                                  |
|                                                                       |
| // No threshold configured --- always proceed                         |
|                                                                       |
| if (!schedule.minimumThresholdUSD)                                    |
|                                                                       |
| return { proceed: true };                                             |
|                                                                       |
| if (availableBalanceUSD \>= schedule.minimumThresholdUSD)             |
|                                                                       |
| return { proceed: true };                                             |
|                                                                       |
| // Below threshold --- increment miss count                           |
|                                                                       |
| const newMissCount = (schedule.consecutiveMissCount ?? 0) + 1;        |
|                                                                       |
| await this.scheduleRepo.update(schedule.id, {                         |
|                                                                       |
| consecutiveMissCount: newMissCount,                                   |
|                                                                       |
| lastSkippedAt: new Date(),                                            |
|                                                                       |
| lastSkipReason: \"BELOW_THRESHOLD\",                                  |
|                                                                       |
| });                                                                   |
|                                                                       |
| // Notify at miss 3 and every 3rd miss thereafter                     |
|                                                                       |
| if (newMissCount % 3 === 0) {                                         |
|                                                                       |
| await this.rabbitMQ.publish(\"payout.schedule.threshold_miss\", {     |
|                                                                       |
| contractorId: schedule.contractorId,                                  |
|                                                                       |
| scheduleId: schedule.id,                                              |
|                                                                       |
| consecutiveMissCount: newMissCount,                                   |
|                                                                       |
| thresholdUSD: schedule.minimumThresholdUSD,                           |
|                                                                       |
| currentBalanceUSD: availableBalanceUSD,                               |
|                                                                       |
| occurredAt: new Date().toISOString(),                                 |
|                                                                       |
| });                                                                   |
|                                                                       |
| }                                                                     |
|                                                                       |
| // Advance nextExecutionAt regardless --- do not pile up missed       |
| cycles                                                                |
|                                                                       |
| await this.advanceNextExecution(schedule);                            |
|                                                                       |
| return { proceed: false };                                            |
|                                                                       |
| }                                                                     |
+=======================================================================+

## **5.3 Notification copy --- 3-miss threshold alert**

  -----------------------------------------------------------------------
  **Notification        **Content**
  element**             
  --------------------- -------------------------------------------------
  **In-app message**    Your scheduled payout was skipped again. Your
                        balance of \${currentBalanceUSD} is below your
                        minimum threshold of \${thresholdUSD}. Add
                        earnings or lower your threshold to resume
                        automatic payouts.

  **Email subject**     Your scheduled payout has been skipped

  **Email body**        Your automatic payout schedule has now been
                        skipped {consecutiveMissCount} times because your
                        balance hasn\'t reached your minimum threshold of
                        \${thresholdUSD}. Your current balance is
                        \${currentBalanceUSD}. To resume: earn more,
                        lower your threshold, or withdraw manually.

  **CTA label**         Update payout schedule

  **CTA destination**   /settings/payouts --- schedule settings screen
  -----------------------------------------------------------------------

# **6. Advancing nextExecutionAt**

Whether a schedule executes successfully or is skipped for any reason,
nextExecutionAt must always be advanced to the next due date. It must
never remain in the past --- a stale nextExecutionAt would cause the
schedule to be picked up on every tick until it executes or is manually
corrected.

+-----------------------------------------------------------------------+
| typescript                                                            |
+-----------------------------------------------------------------------+
| // src/schedule/next-execution.service.ts                             |
|                                                                       |
| async advanceNextExecution(schedule: DepositSchedule):                |
| Promise\<void\> {                                                     |
|                                                                       |
| const next = this.calculateNext(schedule.frequency,                   |
| schedule.anchorDate, new Date());                                     |
|                                                                       |
| await this.scheduleRepo.update(schedule.id, { nextExecutionAt: next   |
| });                                                                   |
|                                                                       |
| }                                                                     |
|                                                                       |
| calculateNext(frequency: Frequency, anchorDate: Date, from: Date):    |
| Date {                                                                |
|                                                                       |
| switch (frequency) {                                                  |
|                                                                       |
| case Frequency.WEEKLY: {                                              |
|                                                                       |
| // Next Monday at 09:00 UTC                                           |
|                                                                       |
| const next = new Date(from);                                          |
|                                                                       |
| const daysUntilMonday = (1 + 7 - next.getUTCDay()) % 7 \|\| 7;        |
|                                                                       |
| next.setUTCDate(next.getUTCDate() + daysUntilMonday);                 |
|                                                                       |
| next.setUTCHours(9, 0, 0, 0);                                         |
|                                                                       |
| return this.adjustForHoliday(next);                                   |
|                                                                       |
| }                                                                     |
|                                                                       |
| case Frequency.BIWEEKLY: {                                            |
|                                                                       |
| // Next even/odd Monday based on anchorDate parity                    |
|                                                                       |
| const weeksSinceAnchor = Math.floor(                                  |
|                                                                       |
| (from.getTime() - anchorDate.getTime()) / (7 \* 24 \* 60 \* 60 \*     |
| 1000)                                                                 |
|                                                                       |
| );                                                                    |
|                                                                       |
| const weeksUntilNext = weeksSinceAnchor % 2 === 0 ? 2 : 1;            |
|                                                                       |
| const next = new Date(from);                                          |
|                                                                       |
| next.setUTCDate(next.getUTCDate() + (weeksUntilNext \* 7));           |
|                                                                       |
| next.setUTCHours(9, 0, 0, 0);                                         |
|                                                                       |
| return this.adjustForHoliday(next);                                   |
|                                                                       |
| }                                                                     |
|                                                                       |
| case Frequency.MONTHLY: {                                             |
|                                                                       |
| // 1st of next month at 09:00 UTC                                     |
|                                                                       |
| const next = new Date(Date.UTC(                                       |
|                                                                       |
| from.getUTCMonth() === 11 ? from.getUTCFullYear() + 1 :               |
| from.getUTCFullYear(),                                                |
|                                                                       |
| (from.getUTCMonth() + 1) % 12,                                        |
|                                                                       |
| 1, 9, 0, 0,                                                           |
|                                                                       |
| ));                                                                   |
|                                                                       |
| return this.adjustForWeekend(this.adjustForHoliday(next));            |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
+=======================================================================+

# **7. Split Payout Execution Order**

When a contractor has configured a split payout (primary method receives
X%, secondary receives remaining Y%), the execution engine processes
both methods in a strict order with a confirmation gate between them.
The primary must fully confirm before the secondary is initiated.

  -------------------------------------------------------------------------------
  **Step**   **Action**                        **On failure**
  ---------- --------------------------------- ----------------------------------
  **1**      Read contractor balance from      Abort entire execution. No funds
             earnings-service. Calculate       moved. Log and retry next cycle.
             primary amount (balance ×         
             primarySplitPercent / 100).       
             Calculate secondary amount        
             (balance − primary amount).       

  **2**      Run all pre-flight checks for     Abort. No funds moved.
             primary method (pause, KYC,       
             threshold, EDD).                  

  **3**      Initiate payout to primary        Abort. Secondary not attempted.
             method. Create payout_requests    
             row for primary with              
             status=processing.                

  **4**      Await primary execution           Primary failed: mark primary row
             confirmation (webhook or polling  failed. Secondary NOT attempted.
             per method type). Confirm         See §8 partial failure handling.
             status=completed.                 

  **5**      Run all pre-flight checks for     Secondary blocked: primary is
             secondary method.                 already completed. Log secondary
                                               failure. Notify contractor. Do NOT
                                               reverse primary.

  **6**      Initiate payout to secondary      See §8.
             method. Create payout_requests    
             row for secondary with            
             status=processing.                

  **7**      Await secondary execution         See §8.
             confirmation.                     

  **8**      Both completed: advance           ---
             nextExecutionAt. Reset            
             consecutiveMissCount to 0.        
             Publish payout.schedule.completed 
             event.                            
  -------------------------------------------------------------------------------

+-----------------------------------------------------------------------+
| typescript                                                            |
+-----------------------------------------------------------------------+
| // src/schedule/split-payout-executor.service.ts                      |
|                                                                       |
| async executeSplit(                                                   |
|                                                                       |
| schedule: DepositSchedule,                                            |
|                                                                       |
| balanceUSD: number,                                                   |
|                                                                       |
| ): Promise\<void\> {                                                  |
|                                                                       |
| const primaryAmount = Math.floor(balanceUSD \*                        |
| (schedule.primarySplitPercent / 100) \* 100) / 100;                   |
|                                                                       |
| const secondaryAmount = Math.round((balanceUSD - primaryAmount) \*    |
| 100) / 100;                                                           |
|                                                                       |
| // Rounding: primary gets floor, secondary gets remainder             |
|                                                                       |
| // This ensures primaryAmount + secondaryAmount === balanceUSD        |
| exactly                                                               |
|                                                                       |
| // Step 1: Execute primary                                            |
|                                                                       |
| const primaryResult = await this.executeSingleMethod({                |
|                                                                       |
| contractorId: schedule.contractorId,                                  |
|                                                                       |
| depositMethodId: schedule.primaryMethodId,                            |
|                                                                       |
| amountUSD: primaryAmount,                                             |
|                                                                       |
| scheduleId: schedule.id,                                              |
|                                                                       |
| splitRole: \"primary\",                                               |
|                                                                       |
| });                                                                   |
|                                                                       |
| if (primaryResult.status !== \"completed\") {                         |
|                                                                       |
| // Primary failed --- do not attempt secondary                        |
|                                                                       |
| await this.handlePrimaryFailure(schedule, primaryResult);             |
|                                                                       |
| return;                                                               |
|                                                                       |
| }                                                                     |
|                                                                       |
| // Step 2: Execute secondary only after primary confirms              |
|                                                                       |
| const secondaryResult = await this.executeSingleMethod({              |
|                                                                       |
| contractorId: schedule.contractorId,                                  |
|                                                                       |
| depositMethodId: schedule.secondaryMethodId!,                         |
|                                                                       |
| amountUSD: secondaryAmount,                                           |
|                                                                       |
| scheduleId: schedule.id,                                              |
|                                                                       |
| splitRole: \"secondary\",                                             |
|                                                                       |
| });                                                                   |
|                                                                       |
| if (secondaryResult.status !== \"completed\") {                       |
|                                                                       |
| await this.handleSecondaryFailure(schedule, primaryResult,            |
| secondaryResult);                                                     |
|                                                                       |
| return;                                                               |
|                                                                       |
| }                                                                     |
|                                                                       |
| // Both complete                                                      |
|                                                                       |
| await this.advanceNextExecution(schedule);                            |
|                                                                       |
| await this.scheduleRepo.update(schedule.id, { consecutiveMissCount: 0 |
| });                                                                   |
|                                                                       |
| await this.rabbitMQ.publish(\"payout.schedule.completed\", {          |
|                                                                       |
| scheduleId: schedule.id,                                              |
|                                                                       |
| contractorId: schedule.contractorId,                                  |
|                                                                       |
| totalUSD: balanceUSD,                                                 |
|                                                                       |
| primaryUSD: primaryAmount,                                            |
|                                                                       |
| secondaryUSD: secondaryAmount,                                        |
|                                                                       |
| occurredAt: new Date().toISOString(),                                 |
|                                                                       |
| });                                                                   |
|                                                                       |
| }                                                                     |
+=======================================================================+

# **8. Partial Failure Handling**

## **8.1 Primary fails before secondary is attempted**

  ------------------------------------------------------------------------------------------
  **State**     **Primary         **Secondary       **Balance state** **Action**
                payout_requests   payout_requests                     
                status**          status**                            
  ------------- ----------------- ----------------- ----------------- ----------------------
  **Primary     failed            Never created     Unchanged --- no  Retry primary on next
  fails during                                      debit occurred    scheduled cycle.
  execution**                                                         consecutiveMissCount
                                                                      NOT incremented
                                                                      (threshold skip logic
                                                                      does not apply to
                                                                      execution failures).
                                                                      Contractor notified of
                                                                      failure.

  ------------------------------------------------------------------------------------------

## **8.2 Primary succeeds, secondary fails**

  ---------------------------------------------------------------------------------
  **State**   **Primary         **Secondary       **Balance state** **Action**
              payout_requests   payout_requests                     
              status**          status**                            
  ----------- ----------------- ----------------- ----------------- ---------------
  **Primary   completed         failed            Primary amount    Primary is NOT
  settled,                                        debited.          reversed ---
  secondary                                       Secondary amount  funds already
  fails**                                         NOT debited.      delivered to
                                                                    contractor.
                                                                    Secondary
                                                                    retried
                                                                    independently
                                                                    up to 3 times
                                                                    with
                                                                    exponential
                                                                    backoff. If
                                                                    secondary still
                                                                    fails after 3
                                                                    retries:
                                                                    contractor
                                                                    notified.
                                                                    Secondary
                                                                    marked failed.
                                                                    Finance team
                                                                    alerted. Manual
                                                                    reprocessing
                                                                    required.

  ---------------------------------------------------------------------------------

+-----------------------------------------------------------------------+
| **Primary is never reversed on secondary failure**                    |
|                                                                       |
| Reversing a completed payout to the primary method is not safe ---    |
| the contractor may                                                    |
|                                                                       |
| have already spent the funds (debit card), the crypto transfer is     |
| irreversible,                                                         |
|                                                                       |
| or the bank ACH may have already settled.                             |
|                                                                       |
| Primary success + secondary failure is treated as a partial success.  |
|                                                                       |
| The secondary amount remains in the contractor\'s earnings balance    |
| until                                                                 |
|                                                                       |
| either the secondary retry succeeds or manual reprocessing is         |
| completed.                                                            |
|                                                                       |
| The contractor is notified immediately of the secondary failure with  |
| exact amounts.                                                        |
+=======================================================================+

## **8.3 Secondary failure notification copy**

  -----------------------------------------------------------------------
  **Notification        **Content**
  element**             
  --------------------- -------------------------------------------------
  **In-app message**    Your payout was partially completed.
                        \${primaryAmount} was sent to your
                        {primaryMethodLabel}. Your remaining
                        \${secondaryAmount} could not be sent to
                        {secondaryMethodLabel} and will remain in your
                        balance. We\'ll retry automatically.

  **Email subject**     Partial payout --- action may be required

  **CTA label**         View payout status

  **CTA destination**   /earnings --- earnings history tab showing both
                        payout_requests rows
  -----------------------------------------------------------------------

## **8.4 Secondary retry logic**

+-----------------------------------------------------------------------+
| typescript                                                            |
+-----------------------------------------------------------------------+
| // Secondary retry runs independently of the schedule cycle           |
|                                                                       |
| // Uses the same exponential backoff as PS-12 §8.3                    |
|                                                                       |
| // Retry attempts: immediately, +5 minutes, +30 minutes               |
|                                                                       |
| // After 3 failures: mark secondary payout_requests.status = failed   |
|                                                                       |
| // publish payout.secondary.failed event for finance alert            |
|                                                                       |
| async retrySecondaryPayout(                                           |
|                                                                       |
| secondaryPayoutRequestId: string,                                     |
|                                                                       |
| ): Promise\<void\> {                                                  |
|                                                                       |
| const payout = await this.payoutRequestRepo.findOneOrFail({           |
|                                                                       |
| where: { id: secondaryPayoutRequestId, splitRole: \"secondary\" },    |
|                                                                       |
| });                                                                   |
|                                                                       |
| await this.executeWithRetry(                                          |
|                                                                       |
| () =\> this.payoutExecutor.execute(payout),                           |
|                                                                       |
| { payoutRequestId: payout.id, attempt: payout.retryCount + 1 },       |
|                                                                       |
| 3,                                                                    |
|                                                                       |
| );                                                                    |
|                                                                       |
| }                                                                     |
+=======================================================================+

# **9. Atomicity Guarantees**

  ------------------------------------------------------------------------------------
  **Scope**           **Atomic?**   **Mechanism**               **Notes**
  ------------------- ------------- --------------------------- ----------------------
  **Single method     Yes           TypeORM                     If either operation
  execution --- DB                  DataSource.transaction().   fails, both are rolled
  operations**                      payout_requests row         back. No orphaned
                                    creation + earnings-service rows.
                                    debit in one transaction.   

  **Single method     No ---        Idempotency keys on all     See PS-02 idempotency
  execution ---       external      external API calls. Payout  key pattern.
  external calls      calls cannot  state machine recovers from 
  (Stripe, bridge,    be transacted partial external failures.  
  chain)**                                                      

  **Split execution   No --- by     Primary and secondary are   Partial success is
  --- both methods as design        independent payout_requests valid and handled
  one unit**                        rows.                       explicitly in §8.

  **Schedule tick --- Yes           Redis distributed lock      Lock TTL: 25 minutes.
  concurrent                        (redisLock). Only one       If cron takes \> 25
  execution                         instance of the cron        min: lock releases and
  prevention**                      executes at a time across   next tick may overlap.
                                    all payout-service pods.    Alert fires if
                                                                execution exceeds 20
                                                                minutes.

  **nextExecutionAt   Yes           Updated inside the same     Prevents the same
  advance**                         transaction as              schedule from being
                                    payout_requests creation.   picked up twice in
                                                                rapid succession.
  ------------------------------------------------------------------------------------

+-----------------------------------------------------------------------+
| typescript                                                            |
+-----------------------------------------------------------------------+
| // Atomic single-method execution --- payout row + earnings debit in  |
| one transaction                                                       |
|                                                                       |
| async executeSingleMethod(dto: ExecuteSingleMethodDto):               |
| Promise\<ExecutionResult\> {                                          |
|                                                                       |
| return this.dataSource.transaction(async (em) =\> {                   |
|                                                                       |
| // 1. Create payout_requests row                                      |
|                                                                       |
| const payoutRequest = em.create(PayoutRequest, {                      |
|                                                                       |
| contractorId: dto.contractorId,                                       |
|                                                                       |
| depositMethodId: dto.depositMethodId,                                 |
|                                                                       |
| amountUSD: dto.amountUSD,                                             |
|                                                                       |
| status: PayoutStatus.PROCESSING,                                      |
|                                                                       |
| scheduleId: dto.scheduleId,                                           |
|                                                                       |
| splitRole: dto.splitRole,                                             |
|                                                                       |
| idempotencyKey:                                                       |
| \`schedule:\${dto.scheduleId}:\${dto.splitRole}:\${Date.now()}\`,     |
|                                                                       |
| });                                                                   |
|                                                                       |
| await em.save(payoutRequest);                                         |
|                                                                       |
| // 2. Debit earnings balance                                          |
|                                                                       |
| await this.earningsClient.debitBalance({                              |
|                                                                       |
| contractorId: dto.contractorId,                                       |
|                                                                       |
| amountUSD: dto.amountUSD,                                             |
|                                                                       |
| payoutRequestId: payoutRequest.id,                                    |
|                                                                       |
| });                                                                   |
|                                                                       |
| // 3. Advance nextExecutionAt inside same transaction                 |
|                                                                       |
| // (only for non-split or final step of split)                        |
|                                                                       |
| if (dto.splitRole !== \"primary\") {                                  |
|                                                                       |
| const next = this.calculateNext(/\* \... \*/);                        |
|                                                                       |
| await em.update(DepositSchedule, dto.scheduleId, { nextExecutionAt:   |
| next });                                                              |
|                                                                       |
| }                                                                     |
|                                                                       |
| return { payoutRequestId: payoutRequest.id, status: \"processing\" }; |
|                                                                       |
| });                                                                   |
|                                                                       |
| // External bridge/Stripe call happens AFTER transaction commits      |
|                                                                       |
| }                                                                     |
+=======================================================================+

# **10. Audit and Monitoring**

  ----------------------------------------------------------------------------------------
  **Event**                             **Published to** **Payload summary**
  ------------------------------------- ---------------- ---------------------------------
  **payout.schedule.started**           RabbitMQ         scheduleId, contractorId,
                                                         totalUSD, frequency, occurredAt

  **payout.schedule.completed**         RabbitMQ         scheduleId, contractorId,
                                                         totalUSD, primaryUSD,
                                                         secondaryUSD, occurredAt

  **payout.schedule.skipped**           RabbitMQ         scheduleId, contractorId,
                                                         skipReason, consecutiveMissCount,
                                                         occurredAt

  **payout.schedule.threshold_miss**    RabbitMQ         scheduleId, contractorId,
                                                         consecutiveMissCount,
                                                         thresholdUSD, currentBalanceUSD,
                                                         occurredAt

  **payout.schedule.partial_failure**   RabbitMQ         scheduleId, contractorId,
                                                         primaryStatus, secondaryStatus,
                                                         secondaryAmountUSD, occurredAt

  **payout.secondary.failed**           RabbitMQ ---     scheduleId, contractorId,
                                        finance alert    secondaryPayoutRequestId,
                                        queue            amountUSD, methodType, occurredAt
  ----------------------------------------------------------------------------------------

  ------------------------------------------------------------------------
  **Metric / Alert**       **Threshold**   **Action**
  ------------------------ --------------- -------------------------------
  **Cron execution time \> Single tick     Alert ops team. Likely large
  20 minutes**                             queue backlog or bridge
                                           latency.

  **Failed schedules in    Per tick        Alert ops team.
  single tick \> 5%**                      

  **consecutiveMissCount   Any schedule    Alert finance team ---
  \> 10 for any schedule**                 contractor may have abandoned
                                           account with funded balance.

  **Redis lock not         Automatic       Redis TTL releases lock. Next
  released after 25                        tick proceeds. Investigate pod
  minutes**                                crash.
  ------------------------------------------------------------------------

# **11. Error Code Reference**

  --------------------------------------------------------------------------------------
  **Error code**                      **Context**   **When thrown**
  ----------------------------------- ------------- ------------------------------------
  **ERR_SCHEDULE_LOCK_FAILED**        Cron tick     Redis lock could not be acquired.
                                                    Another tick is in progress. Current
                                                    tick skipped.

  **ERR_SCHEDULE_BELOW_THRESHOLD**    Pre-flight    Balance below minimumThresholdUSD.
                                                    Cycle skipped. Consecutive miss
                                                    count incremented.

  **ERR_SCHEDULE_OUTSIDE_WINDOW**     Pre-flight    Execution deferred --- current time
                                                    is outside 06:00--22:00 UTC window
                                                    or is weekend/holiday.

  **ERR_SCHEDULE_PRIMARY_FAILED**     Split         Primary method execution failed.
                                      execution     Secondary not attempted.

  **ERR_SCHEDULE_SECONDARY_FAILED**   Split         Secondary method failed after
                                      execution     primary succeeded. Primary not
                                                    reversed.

  **ERR_SCHEDULE_EDD_TRIGGERED**      Pre-flight    Balance \>= \$10,000 EDD threshold.
                                                    Schedule paused pending compliance
                                                    review.
  --------------------------------------------------------------------------------------

# **12. References**

  -----------------------------------------------------------------------
  **Document /           **Relevant to**
  Resource**             
  ---------------------- ------------------------------------------------
  **PS-02 --- Withdrawal payout_requests row structure. Idempotency key
  Flow & Payout State    pattern. Status values.
  Machine**              

  **PS-03 --- Deposit    deposit_schedules schema. minimumThresholdUSD,
  Schedule**             primarySplitPercent, secondaryMethodId columns.

  **PS-16 --- Paused     assertNotPaused() called at pre-flight. Pause
  Payouts & Alert        condition handling during schedule tick.
  System**               

  **PS-15 ---            KYC gate called at pre-flight. EDD \$10,000
  KYC-Identity Gating**  trigger.

  **PS-14 --- Magic Link Magic link NOT required for scheduled payouts
  Email Verification**   --- only for manual withdrawals.
  -----------------------------------------------------------------------

CONFIDENTIAL --- Marketeq Internal Engineering Documentation \|
payout-service PS-17 \| v1.0
