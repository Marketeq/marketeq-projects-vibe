**[MARKETEQ PLATFORM --- BACKEND DOCUMENTATION]{.smallcaps}**

**payout-service**

PS-25 --- Edge Cases & Data Limitations

  -----------------------------------------------------------------------
  **Property**        **Value**
  ------------------- ---------------------------------------------------
  **Document**        PS-25 --- Edge Cases & Data Limitations

  **Version**         1.0

  **Applies to**      All payout flows. All deposit method types. All
                      contractor account states.

  **Purpose**         Documents known edge cases, race conditions, and
                      data limitations that require explicit handling.
                      Each case defines the expected system behaviour and
                      where enforcement lives.

  **Prerequisites**   PS-02, PS-04, PS-09, PS-10, PS-14, PS-16, PS-17,
                      PS-18, PS-19, PS-23
  -----------------------------------------------------------------------

# **1. Overview**

This document catalogs edge cases and data limitations that do not fit
naturally into any single feature document but must be handled
explicitly by the system. Each entry defines: the scenario, the exact
system behaviour expected, which service or layer owns the enforcement,
and what the contractor sees. Where engineering work is required, it is
flagged. Where design work is required, it is flagged.

# **2. Race Conditions**

## **2.1 Simultaneous withdrawal attempts from two sessions**

A contractor opens two browser tabs simultaneously and initiates a
withdrawal from both before either completes. Without protection, both
could be accepted and both could execute against the same balance.

  -------------------------------------------------------------------------------
  **Property**               **Detail**
  -------------------------- ----------------------------------------------------
  **Scenario**               Contractor has \$200 balance. Opens Tab A and Tab B.
                             Initiates \$200 withdrawal from Tab A. Before Tab
                             A\'s magic link is verified, initiates another \$200
                             withdrawal from Tab B.

  **Risk**                   Both payout_requests rows are created with
                             status=awaiting_verification. Both magic links are
                             sent. If both are verified before execution: two
                             executions are attempted against a \$200 balance.

  **Layer 1 --- Rate         POST /v1/payouts/initiate rate limit: 5 per hour.
  limiting (fast check)**    Both requests are accepted unless they breach the
                             hourly cap. Rate limiting alone does not prevent
                             this scenario within the 5-per-hour window.

  **Layer 2 --- Balance      earnings-service debit is atomic. When Tab A\'s
  re-check at execution**    payout executes first, balance drops to \$0. When
                             Tab B\'s payout executes: balance re-check at
                             execution fails with
                             ERR_INSUFFICIENT_BALANCE_AT_EXECUTION. Tab B
                             payout_requests.status → failed. Contractor
                             notified.

  **Layer 3 ---              When Tab A\'s execution debits the balance,
  earnings.balance.updated   earnings-service publishes earnings.balance.updated
  consumer (PS-23 §4.2)**    with newBalanceUSD=0. payout-service consumer
                             detects that pending Tab B payout
                             (AWAITING_VERIFICATION) would now be underfunded and
                             proactively fails it before execution even attempts.

  **Contractor experience**  Tab A: payout succeeds. Tab B: receives \"Your
                             balance changed before your withdrawal could be
                             sent\" notification. No double-spend occurs.

  **No pessimistic locking   Optimistic handling via atomic debit + balance
  required**                 re-check is sufficient. No Redis lock on
                             per-contractor payout initiation. The rate limit
                             provides a basic concurrency guard.
  -------------------------------------------------------------------------------

+-----------------------------------------------------------------------+
| typescript                                                            |
+-----------------------------------------------------------------------+
| // Atomic earnings debit --- the last line of defence against race    |
| condition                                                             |
|                                                                       |
| // earnings-service debit endpoint must be transactional              |
|                                                                       |
| // If two debits race: one succeeds, one fails with                   |
| INSUFFICIENT_BALANCE                                                  |
|                                                                       |
| // POST /internal/earnings/debit (earnings-service internal endpoint) |
|                                                                       |
| async debitBalance(                                                   |
|                                                                       |
| contractorId: string,                                                 |
|                                                                       |
| amountUSD: number,                                                    |
|                                                                       |
| payoutRequestId: string,                                              |
|                                                                       |
| ): Promise\<void\> {                                                  |
|                                                                       |
| await this.dataSource.transaction(async (em) =\> {                    |
|                                                                       |
| const balance = await em                                              |
|                                                                       |
| .createQueryBuilder(EarningsBalance, \"b\")                           |
|                                                                       |
| .setLock(\"pessimistic_write\") // Row-level lock for this contractor |
|                                                                       |
| .where(\"b.contractorId = :id\", { id: contractorId })                |
|                                                                       |
| .getOneOrFail();                                                      |
|                                                                       |
| if (balance.availableUSD \< amountUSD)                                |
|                                                                       |
| throw new Error(\"INSUFFICIENT_BALANCE\");                            |
|                                                                       |
| await em.update(EarningsBalance,                                      |
|                                                                       |
| { contractorId },                                                     |
|                                                                       |
| { availableUSD: () =\> \`available_usd - \${amountUSD}\` },           |
|                                                                       |
| );                                                                    |
|                                                                       |
| });                                                                   |
|                                                                       |
| }                                                                     |
|                                                                       |
| // Row-level pessimistic_write lock ensures only one debit can        |
| proceed at a time                                                     |
|                                                                       |
| // for a given contractor --- serialises concurrent execution         |
| attempts                                                              |
+=======================================================================+

## **2.2 Scheduled payout fires while manual withdrawal is in AWAITING_VERIFICATION**

  -----------------------------------------------------------------------
  **Property**       **Detail**
  ------------------ ----------------------------------------------------
  **Scenario**       Contractor has \$500 balance. Manual withdrawal of
                     \$500 is in AWAITING_VERIFICATION (magic link sent
                     but not yet clicked). Scheduled payout cron fires
                     and attempts to execute.

  **Risk**           Scheduled payout executes against \$500 balance.
                     Contractor then clicks magic link --- manual
                     withdrawal execution fails at balance re-check.

  **Enforcement**    ScheduledPayoutExecutor checks for any
                     payout_requests row in AWAITING_VERIFICATION or
                     PROCESSING for this contractor before executing. If
                     one exists: schedule tick deferred for this
                     contractor. Skipped cycle recorded. No ERR ---
                     internal only.

  **Contractor       Scheduled payout is skipped silently for this cycle.
  experience**       Manual withdrawal proceeds normally. If manual
                     withdrawal expires (magic link not clicked in 15
                     min), next schedule cycle executes normally.

  **Edge within the  If the manual withdrawal amount is less than the
  edge**             balance (e.g. \$200 manual, \$500 balance), the
                     schedule could safely execute the remainder. v1 does
                     not implement partial-skip --- it skips the whole
                     schedule cycle if any pending manual exists.
                     Simplicity over optimisation.
  -----------------------------------------------------------------------

# **3. Fee and Balance Edge Cases**

## **3.1 Instant fee reducing balance to exactly \$0**

  -----------------------------------------------------------------------
  **Property**       **Detail**
  ------------------ ----------------------------------------------------
  **Scenario**       Contractor has \$50.00. Requests withdrawal of
                     \$50.00. A platform fee or processing fee is
                     applicable and reduces the net amount, leaving
                     balance at \$0 or making the payout net amount \$0
                     or negative.

  **v1 position**    In v1, Marketeq does not charge withdrawal fees on
                     top of the payout amount. The \$50 minimum refers to
                     the amount the contractor receives, not the gross
                     amount. If a future fee model is introduced: the fee
                     must be deducted before the minimum check, and
                     ERR_INSUFFICIENT_FUNDS_AFTER_FEE must be returned if
                     net amount \< \$50.

  **Current          ERR_INSUFFICIENT_FUNDS_AFTER_FEE (PS-24 §3) is
  enforcement**      defined and implemented in anticipation of a future
                     fee model. In v1, feeAmountUSD is always 0. The
                     check is a no-op but the code path exists.

  **Zero net amount  If feeAmountUSD is ever non-zero and equals the
  guard**            requested amount: payout is blocked. A \$0
                     payout_requests row must never be created. Minimum
                     net amount is \$0.01 (but in practice
                     ERR_BELOW_MINIMUM_AMOUNT at \$50 guards this first).

  **Balance exactly  Valid state. Contractor balance of \$0 is allowed.
  at \$0 after       Scheduled payouts with BELOW_THRESHOLD skip logic
  payout**           handle the zero-balance case gracefully (PS-17 §5).
                     No special handling needed.
  -----------------------------------------------------------------------

## **3.2 Reserve amount blocking a withdrawal the contractor wants to override**

  -----------------------------------------------------------------------
  **Property**       **Detail**
  ------------------ ----------------------------------------------------
  **Scenario**       Contractor has \$300 balance with a \$250 reserve
                     configured. Available for withdrawal: \$50.
                     Contractor wants to withdraw \$200 --- more than the
                     \$50 available after reserve.

  **Current          ERR_INSUFFICIENT_FUNDS is returned. The reserve is
  behaviour**        enforced --- it cannot be overridden in a single
                     withdrawal without first lowering the reserve.

  **Self-service     Contractor can go to schedule settings and lower or
  resolution**       remove the reserve. This takes effect immediately.
                     Contractor can then initiate the \$200 withdrawal.
                     Two-step process --- no shortcut.

  **Design           Not implemented in v1. Would require a one-time
  consideration ---  reserve bypass flag on the withdrawal request.
  \"Override reserve Design team decision for a future sprint.
  for this           Engineering note: if implemented, the bypass flag
  withdrawal\" UX**  must be backend-validated --- it cannot be a
                     client-only flag.

  **Reserve is not a The reserve is the contractor\'s own preference.
  hold**             Marketeq cannot use the reserve funds for any
                     purpose. The \$250 reserved is still owed to the
                     contractor. If the account is closed, the reserve is
                     included in the final payout.

  **Reserve of \$0   Setting minimumReserveUSD = 0 is valid. All balance
  effectively        is available for withdrawal.
  disables it**      
  -----------------------------------------------------------------------

# **4. Split Payout Edge Cases**

## **4.1 Split percentage rounding tolerance (±0.01%)**

  -----------------------------------------------------------------------
  **Property**       **Detail**
  ------------------ ----------------------------------------------------
  **Scenario**       Contractor enters 33.33% for primary (secondary
                     auto-fills 66.67%). At execution on a \$100.00
                     balance: 33.33% of \$100.00 = \$33.33, secondary =
                     \$66.67. Sum = \$100.00. Clean case.

  **Problematic      Balance of \$1.00 and primary = 33.33%. Primary =
  case**             floor(\$0.3333) = \$0.33. Secondary = \$1.00 -
                     \$0.33 = \$0.67. Sum = \$1.00. Clean --- secondary
                     absorbs the remainder.

  **Tolerance        The ±0.01% tolerance described in PS-18 §4.3 applies
  meaning**          to display only --- not to stored values. Stored
                     values are always clean 2dp values. The tolerance
                     means the UI may display 33.33% as \"33.33%\"
                     without warning the contractor it is not exactly
                     one-third.

  **Invariant that   primaryUSD + secondaryUSD must equal balanceUSD
  must hold at       exactly (to 2dp). The ERR_SPLIT_ROUNDING_FAULT check
  execution**        in PS-18 §4.2 guards this. If it fires: execution
                     halted, engineering alerted, no funds moved.

  **No scenario      Primary floor + secondary remainder mathematically
  where funds are    guarantees sum = balance. The only failure mode is a
  lost or            floating-point fault exceeding \$0.01, which is
  duplicated**       guarded by the invariant check.
  -----------------------------------------------------------------------

## **4.2 Removing the default account when split is active**

  -----------------------------------------------------------------------
  **Property**       **Detail**
  ------------------ ----------------------------------------------------
  **Scenario**       Split is active: primary = Bank A (60%), secondary =
                     PayPal (40%). Contractor deletes Bank A (the primary
                     / default method).

  **Enforcement**    DELETE /v1/deposit-methods/:id pre-check: if the
                     method being deleted is the current primary and
                     split is active, and no other verified method exists
                     to promote: ERR_CANNOT_REMOVE_DEFAULT_WITH_SPLIT
                     (PS-24 §4). Deletion blocked.

  **If another       Contractor can proceed by first setting a new
  verified method    default method, which auto-demotes Bank A from
  exists**           default. Then Bank A can be deleted. Split
                     automatically disables when primary is cleared
                     (PS-18 §7.2). Payouts continue to new default at
                     100%.

  **Split reset on   splitEnabled → false, primarySplitPercent → 100.00,
  primary removal**  secondaryMethodId → null. payout.paused event
                     published if no valid default remains after removal.
                     NO_DEFAULT_METHOD pause condition evaluated
                     immediately.

  **Contractor       In-app: \"Your split payout has been turned off
  notification**     because you removed your primary payout account. All
                     payouts will now go to \[new default\].\" --- if a
                     new default was set before removal. Or the pause
                     banner if no default remains.

  **Alert fires**    payout.paused event → notification-service → pause
                     banner rendered per PS-16. Contractor must set a new
                     default to resume.
  -----------------------------------------------------------------------

# **5. Method Management Edge Cases**

## **5.1 Removing the only connected account**

  -----------------------------------------------------------------------
  **Property**       **Detail**
  ------------------ ----------------------------------------------------
  **Scenario**       Contractor has exactly one active deposit method and
                     attempts to delete it.

  **Enforcement**    ERR_CANNOT_REMOVE_ONLY_METHOD (PS-24 §4). Deletion
                     blocked at API layer regardless of split status,
                     default status, or any other condition. One method
                     minimum is a hard rule.

  **Contractor       Inline error in the method management UI: \"You must
  experience**       have at least one payout method. Add another method
                     before removing this one.\" Add Method CTA shown.

  **No orphaned      This ensures a contractor can never reach a state
  contractor**       where they have an earnings balance but no way to
                     receive a payout. Marketeq cannot disburse to a
                     method-less account.
  -----------------------------------------------------------------------

## **5.2 Maximum connected accounts limit reached**

  -----------------------------------------------------------------------
  **Property**       **Detail**
  ------------------ ----------------------------------------------------
  **Scenario**       Contractor already has 5 active deposit methods and
                     attempts to add a 6th.

  **Enforcement**    ERR_DEPOSIT_METHOD_LIMIT_REACHED (422). POST
                     /v1/deposit-methods returns error before any Stripe
                     or OAuth call is initiated. The limit check is the
                     first pre-flight.

  **Frontend guard** \"Add method\" button is disabled when methodCount
                     \>= 5. Tooltip: \"You\'ve reached the maximum of 5
                     payout methods. Remove one before adding another.\"
                     Backend enforces this independently --- a raw API
                     call is still rejected.

  **Limit of 5       isActive=false methods (deactivated or cancelled) do
  applies to active  not count toward the limit. A contractor who has had
  methods only**     10 bank accounts over time but only 5 currently
                     active can still add a 6th after deactivating one.

  **Split and the    A contractor with 5 methods can still have a split
  limit**            --- split uses two of the 5 existing methods, not an
                     additional one.
  -----------------------------------------------------------------------

## **5.3 OAuth token expires mid-connection flow**

  -----------------------------------------------------------------------
  **Property**       **Detail**
  ------------------ ----------------------------------------------------
  **Scenario**       Contractor begins OAuth connection to
                     PayPal/Wise/Payoneer. After being redirected to the
                     provider login page, they leave the tab idle for
                     over 10 minutes. The OAuth state parameter in Redis
                     expires (10-minute TTL on the state token, PS-09
                     §3).

  **What happens**   Contractor completes login at the provider and is
                     redirected back to the Marketeq callback URL with a
                     code. Marketeq validates the state parameter --- it
                     is no longer in Redis. State validation fails.

  **Response**       GET /v1/oauth/callback returns
                     ERR_OAUTH_STATE_EXPIRED. Contractor is redirected to
                     the method setup screen with an error message:
                     \"Your connection session timed out. Please try
                     connecting again.\"

  **No partial state The state token is deleted on use (atomic DEL, same
  left**             pattern as magic link). If state is expired: no
                     deposit_methods row is created. No OAuth token is
                     stored. Clean failure.

  **Contractor       \"Your connection timed out. Please try again.\"
  experience**       Retry CTA restarts the OAuth flow from step 1 (new
                     redirect URL, new state token).

  **Token expires    Separate case covered by PS-09 §7 REAUTH_REQUIRED
  after connection   flow. Mid-connection expiry (during initial setup)
  is established**   is this case.
  -----------------------------------------------------------------------

## **5.4 WalletConnect QR code expires during scan**

  -----------------------------------------------------------------------
  **Property**       **Detail**
  ------------------ ----------------------------------------------------
  **Scenario**       Contractor opens the WalletConnect QR code screen.
                     The QR code is displayed with a 5-minute TTL
                     countdown. The contractor opens their wallet app to
                     scan but takes more than 5 minutes (e.g. phone was
                     locked, distracted, app was slow to open).

  **What the         5-minute countdown reaches 0:00. QR code is greyed
  contractor sees**  out. \"QR code expired\" message. \"Generate new
                     code\" button appears. Countdown was a frontend
                     display only --- the backend Redis session also
                     expires at 5 minutes (PS-10 §5.3).

  **If the           WalletConnect v2 session is no longer valid in
  contractor scans   Redis. If the wallet attempts to respond to an
  an expired QR      expired session: the callback finds no matching
  code**             session in Redis. ERR_CRYPTO_WALLETCONNECT_EXPIRED
                     returned. Frontend prompts: \"Your wallet connection
                     timed out. Please scan the new QR code.\"

  **New QR code      POST /v1/walletconnect/session creates a new session
  generation**       (new URI, new Redis key, new 5-minute TTL). The old
                     session record is overwritten. Old QR code cannot be
                     used.

  **No               The wallet address is only saved after a successful
  deposit_methods    WalletConnect session confirmation. An expired
  row created until  mid-scan leaves no partial record.
  session            
  completes**        
  -----------------------------------------------------------------------

## **5.5 Stripe Financial Connections session expires during bank link (30-minute idle)**

  -----------------------------------------------------------------------
  **Property**       **Detail**
  ------------------ ----------------------------------------------------
  **Scenario**       Contractor begins Stripe Financial Connections bank
                     account linking flow. The Stripe-hosted modal opens.
                     The contractor logs in to their bank but then leaves
                     the flow idle for over 30 minutes (e.g. multi-factor
                     auth delay, distraction). Stripe Financial
                     Connections sessions expire after 30 minutes of
                     inactivity.

  **What Stripe      Stripe Financial Connections client SDK returns an
  returns**          error: session_expired or the modal closes without
                     returning account data.

  **payout-service   The front-end Financial Connections session never
  behaviour**        calls the Marketeq backend if it fails --- the
                     Stripe SDK handles the session lifecycle
                     client-side. If the session expires: no
                     /v1/deposit-methods POST is ever made. No partial
                     deposit_methods record exists.

  **Contractor       Stripe modal closes or shows an error. Contractor is
  experience**       returned to the bank account linking screen with a
                     message: \"Your bank connection session timed out.
                     Please try again.\" Retry CTA re-initialises a fresh
                     Stripe Financial Connections session (new
                     client_secret fetched from POST
                     /v1/deposit-methods/stripe-link-session).

  **Financial        The link_token Marketeq fetches from Stripe (used to
  Connections        initialise Financial Connections) has its own TTL
  link_token         --- typically 30 minutes from creation. If the
  expiry**           contractor takes longer than 30 minutes from the
                     time the token was fetched to completing the flow:
                     the token itself is also expired. Backend must
                     create a fresh link_token on retry.
  -----------------------------------------------------------------------

# **6. Feature Flag Edge Cases**

## **6.1 TEQ Coin feature flag is OFF for MVP**

  -----------------------------------------------------------------------
  **Property**       **Detail**
  ------------------ ----------------------------------------------------
  **What TEQ Coin    A planned Marketeq-native token (\"TEQ\") intended
  is**               to be a future payout option. Not built for MVP.
                     Referenced in some design assets.

  **Feature flag**   FEATURE_TEQ_COIN_ENABLED = false. Set in environment
                     config. Checked at runtime --- not a compile-time
                     constant. Allows future enable without deployment.

  **When flag is OFF POST /v1/deposit-methods with methodType=TEQ_COIN:
  --- backend**      rejected with HTTP 422, ERR_FEATURE_DISABLED. No
                     TEQ_COIN rows created. No TEQ payout logic executed.

  **When flag is OFF Any UI component that references TEQ Coin as a
  --- frontend**     payout option must check the feature flag response
                     from GET /v1/features before rendering. If
                     FEATURE_TEQ_COIN_ENABLED is false: TEQ Coin option
                     is hidden entirely. Not greyed out --- hidden. No
                     \"Coming Soon\" placeholder unless product
                     explicitly requests it.

  **GET /v1/features Returns a map of active feature flags for the
  endpoint**         current contractor context. payout-service exposes
                     this endpoint. Clients must not hardcode feature
                     availability --- always check the endpoint.

  **When flag is ON  TEQ_COIN becomes a valid methodType. Full setup,
  (future)**         verification, and payout flows must be built at that
                     time. PS-25 will need a new section for TEQ Coin
                     edge cases.

  **Design assets    Any screen in the design files that shows a TEQ Coin
  referencing TEQ    option must be implemented with the feature flag
  Coin**             gate. Design team must be made aware that MVP will
                     not show this option.
  -----------------------------------------------------------------------

+-----------------------------------------------------------------------+
| typescript                                                            |
+-----------------------------------------------------------------------+
| // GET /v1/features --- feature flag endpoint                         |
|                                                                       |
| // Returns contractor-context feature flags                           |
|                                                                       |
| {                                                                     |
|                                                                       |
| \"features\": {                                                       |
|                                                                       |
| \"FEATURE_TEQ_COIN_ENABLED\": false,                                  |
|                                                                       |
| \"FEATURE_DEBIT_CARD_ENABLED\": true,                                 |
|                                                                       |
| \"FEATURE_CRYPTO_ENABLED\": true,                                     |
|                                                                       |
| \"FEATURE_SPLIT_PAYOUTS_ENABLED\": true,                              |
|                                                                       |
| \"FEATURE_INSTANT_PAYOUT\": false // future --- not yet built         |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
|                                                                       |
| // Backend method type validation guard                               |
|                                                                       |
| if (                                                                  |
|                                                                       |
| dto.methodType === MethodType.TEQ_COIN &&                             |
|                                                                       |
| !this.featureFlags.isEnabled(\"FEATURE_TEQ_COIN_ENABLED\")            |
|                                                                       |
| ) {                                                                   |
|                                                                       |
| throw new PayoutError(                                                |
|                                                                       |
| \"TEQ Coin payout method is not available.\",                         |
|                                                                       |
| HttpStatus.UNPROCESSABLE_ENTITY,                                      |
|                                                                       |
| \"ERR_FEATURE_DISABLED\",                                             |
|                                                                       |
| { feature: \"FEATURE_TEQ_COIN_ENABLED\" },                            |
|                                                                       |
| );                                                                    |
|                                                                       |
| }                                                                     |
+=======================================================================+

# **7. Currency and Localisation Edge Cases**

## **7.1 Contractor logs in from a new country --- localCurrency changes but displayCurrency was manually set**

  ------------------------------------------------------------------------
  **Property**        **Detail**
  ------------------- ----------------------------------------------------
  **Background**      Marketeq displays earnings and payout amounts in the
                      contractor\'s local currency as a convenience
                      conversion. The source of truth is always USD.
                      displayCurrency is the currency shown in the UI.
                      localCurrency is the system-detected currency based
                      on contractor country.

  **Scenario**        Contractor is based in Germany. localCurrency = EUR.
                      They manually set displayCurrency = GBP (they prefer
                      GBP for some reason). They then relocate to Canada.
                      Marketeq detects country = CA, localCurrency → CAD.
                      displayCurrency was manually set to GBP --- should
                      it change?

  **Rule**            displayCurrency is never auto-updated if it was
                      manually set by the contractor. localCurrency
                      updates automatically on country change. The two
                      fields are independent.

  **How \"manually    contractor_preferences.displayCurrencyManuallySet =
  set\" is tracked**  true is set whenever the contractor explicitly
                      changes displayCurrency via the UI or API. If false:
                      displayCurrency follows localCurrency. If true:
                      displayCurrency is sticky.

  **Contractor        If displayCurrencyManuallySet = false:
  experience on       displayCurrency auto-updates to match new
  country change**    localCurrency (CAD). If displayCurrencyManuallySet =
                      true: displayCurrency remains GBP. No notification
                      --- the contractor chose this. The UI may show a
                      one-time soft prompt: \"Your location changed to
                      Canada. Would you like to update your display
                      currency to CAD?\" --- dismissed once, not shown
                      again.

  **FX conversion     fawazahmed0/exchange-api with 15-minute Redis cache.
  source**            Display conversion only --- never used for payout
                      calculations. All payouts are in USD.

  **displayCurrency   Currency display is cosmetic. Changing
  changes do not      displayCurrency from GBP to CAD does not change the
  affect any payout   amount of any payout. The actual payout is always in
  amount**            USD to the contractor\'s designated method.

  **Crypto payout     Crypto network availability is not country-gated in
  networks and        v1 (except OFAC-blocked countries). A country change
  country change**    does not affect crypto method availability unless
                      the new country is OFAC-blocked.
  ------------------------------------------------------------------------

+-----------------------------------------------------------------------+
| typescript                                                            |
+-----------------------------------------------------------------------+
| // contractor_preferences table --- relevant columns                  |
|                                                                       |
| // display_currency VARCHAR(3) \-- ISO 4217 e.g. GBP, CAD, EUR        |
|                                                                       |
| // display_currency_manually_set BOOLEAN NOT NULL DEFAULT false       |
|                                                                       |
| // local_currency VARCHAR(3) \-- derived from contractor country      |
|                                                                       |
| // local_currency_updated_at TIMESTAMPTZ                              |
|                                                                       |
| // On contractor country change event (from user-service):            |
|                                                                       |
| async handleCountryChange(                                            |
|                                                                       |
| contractorId: string,                                                 |
|                                                                       |
| newCountry: string,                                                   |
|                                                                       |
| ): Promise\<void\> {                                                  |
|                                                                       |
| const newLocalCurrency = this.countryToCurrency(newCountry);          |
|                                                                       |
| await this.preferencesRepo.update(                                    |
|                                                                       |
| { contractorId },                                                     |
|                                                                       |
| {                                                                     |
|                                                                       |
| localCurrency: newLocalCurrency,                                      |
|                                                                       |
| localCurrencyUpdatedAt: new Date(),                                   |
|                                                                       |
| // Only auto-update displayCurrency if contractor never manually set  |
| it                                                                    |
|                                                                       |
| \...(await this.wasManuallySet(contractorId)                          |
|                                                                       |
| ? {} // sticky --- do not update                                      |
|                                                                       |
| : { displayCurrency: newLocalCurrency }),                             |
|                                                                       |
| },                                                                    |
|                                                                       |
| );                                                                    |
|                                                                       |
| }                                                                     |
+=======================================================================+

# **8. Additional Edge Cases**

## **8.1 Contractor submits a withdrawal while their session JWT expires mid-flow**

  -----------------------------------------------------------------------
  **Property**       **Detail**
  ------------------ ----------------------------------------------------
  **Scenario**       Contractor opens the withdrawal screen. Their JWT is
                     valid. They fill in the form. By the time they press
                     \"Confirm\", the JWT has expired (e.g. long-duration
                     token, left the tab open overnight).

  **Enforcement**    POST /v1/payouts/initiate returns 401 Unauthorized.
                     The request is rejected at the auth middleware
                     before any business logic runs.

  **Contractor       Frontend detects 401 → redirects to login. After
  experience**       re-authentication, the contractor is returned to the
                     withdrawal screen. Amount and method selection are
                     not persisted --- the contractor must re-enter. No
                     payout_requests row was created.
  -----------------------------------------------------------------------

## **8.2 Contractor changes default method while a payout is AWAITING_VERIFICATION**

  -----------------------------------------------------------------------
  **Property**       **Detail**
  ------------------ ----------------------------------------------------
  **Scenario**       Contractor initiates a \$200 withdrawal to Bank A
                     (the default at time of initiation). Before clicking
                     the magic link, they go to settings and change their
                     default method to PayPal. Then they click the magic
                     link.

  **Behaviour**      The payout_requests row was created with
                     depositMethodId = Bank A. The default method change
                     does not retroactively affect in-flight payout
                     requests. The \$200 payout executes to Bank A as
                     originally requested.

  **Why**            depositMethodId is locked to the payout_requests row
                     at creation time. Default method is a preference for
                     future initiations --- not a retroactive assignment.

  **Edge within the  If the contractor deactivates Bank A after
  edge**             initiating but before the magic link is clicked: the
                     payout execution checks method status at execution
                     time and fails with ERR_METHOD_DEACTIVATED.
                     Contractor notified. Balance restored.
  -----------------------------------------------------------------------

## **8.3 EDD hold placed on a contractor between schedule cycle and execution**

  -----------------------------------------------------------------------
  **Property**       **Detail**
  ------------------ ----------------------------------------------------
  **Scenario**       Scheduled payout is due. The cron picks it up.
                     Between the pre-flight check and the execution, a
                     compliance officer manually places an EDD hold on
                     the contractor account (e.g. from a separate
                     investigation triggered by another transaction).

  **Behaviour**      The EDD hold is implemented as a pause condition
                     (ACCOUNT_SUSPENDED or a dedicated EDD_HOLD status in
                     kyc-identity-service). The execution engine calls
                     assertNotPaused() immediately before the
                     Stripe/bridge API call. If the hold was placed in
                     the intervening milliseconds: execution is blocked.
                     Status → failed (or awaiting_edd if routed to
                     queue).

  **TOCTOU           assertNotPaused() is the final gate before external
  mitigation**       money movement. No external API call is ever made
                     before this gate passes.
                     Time-of-check-to-time-of-use window is minimised to
                     microseconds (the gap between the assertNotPaused()
                     call and the Stripe API call).
  -----------------------------------------------------------------------

## **8.4 Contractor adds the same bank account twice**

  -------------------------------------------------------------------------
  **Property**         **Detail**
  -------------------- ----------------------------------------------------
  **Scenario**         Contractor adds Chase checking account (\...4521).
                       Later, they add it again --- same routing number and
                       account number.

  **Enforcement**      POST /v1/deposit-methods deduplication check:
                       SHA-256 hash of normalised (routing_number +
                       account_number) is stored on the deposit_methods
                       row. On creation attempt: if hash already exists for
                       this contractorId in an active method: return the
                       existing method ID with HTTP 200 (idempotent) rather
                       than creating a duplicate.

  **If the existing    A deactivated method with the same account hash: a
  method was           new active method is created. The contractor
  deactivated**        re-verifies ownership via micro-deposit or Financial
                       Connections. The deactivated record is retained for
                       audit.

  **Cross-contractor   The same bank account can be added by multiple
  deduplication**      contractors --- deduplication is per contractorId,
                       not platform-wide. Two different contractors can
                       legitimately share a joint account.
  -------------------------------------------------------------------------

## **8.5 WalletConnect session established but contractor sends from a different address**

  -----------------------------------------------------------------------
  **Property**       **Detail**
  ------------------ ----------------------------------------------------
  **Scenario**       Contractor connects via WalletConnect. The session
                     returns wallet address 0xABC. The contractor then
                     switches accounts in their wallet app mid-session
                     and sends a transaction from 0xDEF.

  **Behaviour**      Marketeq stores 0xABC at session time and uses it
                     for all payouts. The deposit_methods row records
                     0xABC. If the contractor later switches addresses in
                     their wallet, Marketeq has no awareness of this.
                     Payouts continue to go to 0xABC.

  **Resolution**     Contractor must delete the old method and reconnect
                     with the new wallet address. There is no
                     auto-refresh of wallet address from an active
                     WalletConnect session --- the address is captured
                     once at connection time and stored.

  **Why no live      WalletConnect v2 sessions have unpredictable
  address polling**  lifetimes. Depending on the provider, storing the
                     session and re-querying could violate the user\'s
                     intent. Snapshot-at-connection is the safer model.
  -----------------------------------------------------------------------

# **9. Data Limitations**

  ---------------------------------------------------------------------------------
  **Limitation**           **Impact**                     **Mitigation**
  ------------------------ ------------------------------ -------------------------
  **fawazahmed0 FX rate    Display currency conversions   Cache TTL is short enough
  cache is 15 minutes      may be up to 15 minutes stale. for display purposes.
  old**                    Not a financial risk ---       Label: \"Approximate ---
                           display only.                  rates updated every 15
                                                          minutes.\"

  **WalletConnect session  If the contractor loses their  No mitigation needed.
  data not persisted after WalletConnect session (wallet  Address is stored
  connection**             app uninstalled, session       independently of the
                           revoked), payout-service still session.
                           holds the address. The address 
                           itself is still valid for      
                           payouts --- only the session   
                           is gone.                       

  **ACH settlement timing  Contractor sees payout as      payout_requests.status =
  is T+1 to T+3 business   \"sent\" in the UI but funds   completed reflects Stripe
  days**                   do not arrive instantly.       acceptance, not bank
                           Stripe ACH timing varies.      receipt. UI copy:
                                                          \"Usually arrives within
                                                          1--3 business days.\"

  **Crypto settlement      Bitcoin can take 30 minutes to PS-12 §5 confirmation
  finality varies by       3 business days. Ethereum      thresholds. Status =
  network**                2--15 minutes. Display as      completed only after
                           pending until confirmation     threshold met.
                           threshold met.                 

  **Chainalysis wallet     Chainalysis database updates   Screening is a reasonable
  screening is not         on a schedule. A newly         best-efforts control.
  real-time for all        sanctioned address may not be  Legal counsel must advise
  addresses**              flagged immediately.           on liability for gaps.

  **kyc-identity-service   If kyc-identity-service is     Circuit breaker with
  is a synchronous         unreachable, all withdrawals   60-second retry. In v1,
  dependency**             fail with                      no cache of KYC status in
                           ERR_KYC_SERVICE_UNAVAILABLE.   payout-service ---
                           No fallback to cached status.  safety-first.

  **Split execution is not Primary success + secondary    PS-17 §8. Secondary retry
  atomic across both       failure is a permanent partial up to 3 times. Finance
  methods**                state. No cross-method         alert on final failure.
                           rollback.                      Disclosed in contractor
                                                          ToS.

  **Business day           UK, Canada, Australia, EU      PS-17 §2 note. v1 US
  calculator does not      holidays not in v1 holiday     federal holidays only.
  account for public       list. Schedules may execute on Expand holiday list
  holidays beyond US       non-US holidays.               before non-US launch.
  federal**                                               
  ---------------------------------------------------------------------------------

# **10. References**

  -----------------------------------------------------------------------
  **Document**          **Edge cases sourced from**
  --------------------- -------------------------------------------------
  **PS-04 --- Deposit   Method limit, deduplication, default method
  Method Management**   rules.

  **PS-09 ---           OAuth state expiry. REAUTH_REQUIRED.
  Third-Party OAuth**   

  **PS-10 --- Crypto    WalletConnect QR expiry. Address
  Wallet Connection**   snapshot-at-connection.

  **PS-14 --- Magic     One-use enforcement. Race condition handling.
  Link**                

  **PS-17 --- Schedule  Concurrent schedule + manual withdrawal. EDD hold
  Execution Engine**    between check and execution.

  **PS-18 ---           Split rounding tolerance. Reserve blocking.
  Auto-Balance Logic**  

  **PS-20 --- Fund      Reserve is contractor funds. No Marketeq usage of
  Custody**             reserve.

  **PS-23 --- RabbitMQ  earnings.balance.updated consumer for proactive
  Events**              insufficient-balance detection.
  -----------------------------------------------------------------------

CONFIDENTIAL --- Marketeq Internal Engineering Documentation \|
payout-service PS-25 \| v1.0
