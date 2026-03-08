**[MARKETEQ PLATFORM --- BACKEND DOCUMENTATION]{.smallcaps}**

**payout-service**

PS-27 --- Frontend Integration Guide

  -----------------------------------------------------------------------
  **Property**        **Value**
  ------------------- ---------------------------------------------------
  **Document**        PS-27 --- Frontend Integration Guide

  **Version**         1.0

  **Applies to**      All payout-related frontend components. Web and
                      mobile.

  **Purpose**         Maps every payout-related UI component to its API
                      endpoints, request/response shapes, loading states,
                      empty states, and error states. Intended for
                      frontend engineers --- not backend.

  **Real-time**       Ably for balance updates on payout completion. REST
                      polling for pause-status (30s) and magic link
                      status (5s).

  **Auth**            All endpoints require Authorization: Bearer {jwt}
                      header. 401 → redirect to login.

  **Base URL**        https://api.marketeq.com/v1

  **Prerequisites**   PS-02, PS-14, PS-16, PS-19, PS-23, PS-24, PS-26
  -----------------------------------------------------------------------

# **1. Overview**

This document is the frontend engineer\'s primary reference for building
every payout-related screen. For each component it defines: which
endpoints to call, when to call them, what the response shape looks
like, how to handle loading states, what to show when the response is
empty, and how to surface each error. Backend API contracts are defined
in PS-02 and PS-19. Error codes are defined in PS-24. This document does
not repeat those contracts --- it maps them to UI components.

+-----------------------------------------------------------------------+
| **Conventions used in this document**                                 |
|                                                                       |
| GET on mount = call this endpoint when the component mounts. Cached   |
| for {n} seconds.                                                      |
|                                                                       |
| POST on action = call this endpoint when the user takes the specified |
| action.                                                               |
|                                                                       |
| POLL {n}s = poll this endpoint every {n} seconds while the component  |
| is mounted.                                                           |
|                                                                       |
| ABLY = subscribe to this Ably channel for real-time updates.          |
|                                                                       |
| All amounts returned by the API are in USD as decimal numbers (e.g.   |
| 250.00).                                                              |
|                                                                       |
| All timestamps are ISO 8601 UTC strings.                              |
|                                                                       |
| displayCurrency conversion is frontend-only using the cached FX rate  |
| from /v1/fx-rate.                                                     |
+=======================================================================+

# **2. Global State & Shared Providers**

## **2.1 Balance context --- fetched once, shared globally**

+-----------------------------------------------------------------------+
| typescript                                                            |
+-----------------------------------------------------------------------+
| // GET /v1/earnings/balance                                           |
|                                                                       |
| // Fetch on app mount. Refresh on: payout.completed Ably event,       |
|                                                                       |
| // payout.failed Ably event, manual refetch after any POST            |
| /v1/payouts/\*                                                        |
|                                                                       |
| {                                                                     |
|                                                                       |
| \"availableBalanceUSD\": 250.00,                                      |
|                                                                       |
| \"pendingBalanceUSD\": 0.00, // In-flight payouts not yet settled     |
|                                                                       |
| \"reserveAmountUSD\": 50.00,                                          |
|                                                                       |
| \"withdrawableUSD\": 200.00, // availableBalanceUSD -                 |
| reserveAmountUSD                                                      |
|                                                                       |
| \"displayCurrency\": \"GBP\",                                         |
|                                                                       |
| \"displayCurrencyRate\": 0.7923, // Multiply USD amounts by this for  |
| display                                                               |
|                                                                       |
| \"displayAmount\": \"£158.46\" // Pre-converted string for            |
| convenience                                                           |
|                                                                       |
| }                                                                     |
+=======================================================================+

## **2.2 Feature flags --- fetched once on mount**

+-----------------------------------------------------------------------+
| typescript                                                            |
+-----------------------------------------------------------------------+
| // GET /v1/features                                                   |
|                                                                       |
| // Fetch on app mount. Cache for session duration.                    |
|                                                                       |
| // Gate all feature-specific UI on these flags before rendering.      |
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
| \"FEATURE_INSTANT_PAYOUT\": false                                     |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
+=======================================================================+

## **2.3 Pause status --- poll every 30 seconds**

+-----------------------------------------------------------------------+
| typescript                                                            |
+-----------------------------------------------------------------------+
| // GET /v1/payouts/pause-status                                       |
|                                                                       |
| // Poll every 30 seconds while any payout screen is mounted.          |
|                                                                       |
| // Also call immediately after any deposit method change.             |
|                                                                       |
| {                                                                     |
|                                                                       |
| \"paused\": true,                                                     |
|                                                                       |
| \"condition\": \"DEFAULT_METHOD_REAUTH_REQUIRED\", // or null if not  |
| paused                                                                |
|                                                                       |
| \"providerName\": \"PayPal\", // Populated for REAUTH conditions only |
|                                                                       |
| \"methodId\": \"uuid\", // Populated for REAUTH conditions only       |
|                                                                       |
| }                                                                     |
|                                                                       |
| // If paused: true → render pause banner (see §4).                    |
|                                                                       |
| // Banner renders over all payout screens until paused becomes false. |
+=======================================================================+

## **2.4 Ably --- real-time balance update channel**

+-----------------------------------------------------------------------+
| typescript                                                            |
+-----------------------------------------------------------------------+
| // Subscribe on mount of any earnings or payout screen.               |
|                                                                       |
| // Unsubscribe on unmount.                                            |
|                                                                       |
| const channel =                                                       |
| ably.channels.get(\`contractor:\${contractorId}:payouts\`);           |
|                                                                       |
| channel.subscribe(\"payout.completed\", (msg) =\> {                   |
|                                                                       |
| // Refetch GET /v1/earnings/balance                                   |
|                                                                       |
| // Update balance context                                             |
|                                                                       |
| // Show success toast: \"Your \${msg.data.methodLabel} payout of      |
|                                                                       |
| // \${formatCurrency(msg.data.amountUSD)} was sent.\"                 |
|                                                                       |
| queryClient.invalidateQueries(\[\"earnings-balance\"\]);              |
|                                                                       |
| queryClient.invalidateQueries(\[\"payout-history\"\]);                |
|                                                                       |
| });                                                                   |
|                                                                       |
| channel.subscribe(\"payout.failed\", (msg) =\> {                      |
|                                                                       |
| // Refetch balance (funds returned)                                   |
|                                                                       |
| // Show failure toast with reason                                     |
|                                                                       |
| queryClient.invalidateQueries(\[\"earnings-balance\"\]);              |
|                                                                       |
| queryClient.invalidateQueries(\[\"payout-history\"\]);                |
|                                                                       |
| showErrorToast(\`Your payout could not be sent:                       |
| \${msg.data.failureReason}\`);                                        |
|                                                                       |
| });                                                                   |
|                                                                       |
| // Ably channel is authenticated via short-lived token from:          |
|                                                                       |
| // POST /v1/ably/token-request → returns Ably TokenRequest object     |
|                                                                       |
| // Frontend passes to ably.auth.requestToken()                        |
+=======================================================================+

# **3. Earnings Overview --- Direct Deposit Panel**

  --------------------------------------------------------------------------------------
  **Element**          **Endpoint**               **When called**    **Response field
                                                                     used**
  -------------------- -------------------------- ------------------ -------------------
  **Available balance  GET /v1/earnings/balance   On mount. On Ably  withdrawableUSD,
  display**                                       payout.completed   displayAmount
                                                  event.             

  **Pending balance    GET /v1/earnings/balance   On mount.          pendingBalanceUSD
  badge**                                                            --- hide badge if 0

  **Next payout date   GET /v1/payouts/schedule   On mount.          nextExecutionAt,
  widget**                                                           frequency,
                                                                     thresholdUSD

  **Withdraw button    Derived from balance       Reactive --- no    withdrawableUSD \>
  enabled/disabled**   context                    separate call.     50 → enabled

  **Pause banner**     GET                        Polled every 30s.  paused, condition,
                       /v1/payouts/pause-status                      providerName
  --------------------------------------------------------------------------------------

  -----------------------------------------------------------------------
  **State**        **Display**
  ---------------- ------------------------------------------------------
  **Loading**      Skeleton loaders for balance amount and next-payout
                   widget. Withdraw button disabled with skeleton state.

  **Error          Balance shows \"---\" with a small refresh icon.
  (network)**      Tooltip: \"Couldn\'t load your balance. Tap to
                   retry.\"

  **\$0 balance**  Balance shows \"\$0.00\". Withdraw button disabled.
                   Tooltip: \"You don\'t have any earnings to withdraw
                   yet.\"

  **First-time (no See PS-26 §6 first-time user state. Replace balance
  methods, no      display with onboarding card.
  history)**       

  **Paused**       Pause banner rendered above balance panel per §4.
                   Withdraw button disabled.
  -----------------------------------------------------------------------

# **4. Pause Banner Component**

The pause banner is a shared component mounted on the Earnings overview
and the Payouts tab. It is driven by the pause-status poll from §2.3.
See PS-26 §7 for exact copy per condition.

+-----------------------------------------------------------------------+
| typescript                                                            |
+-----------------------------------------------------------------------+
| // PauseBanner renders when pauseStatus.paused === true               |
|                                                                       |
| // It is not dismissible --- no onClose prop                          |
|                                                                       |
| // Props derived from GET /v1/payouts/pause-status response           |
|                                                                       |
| interface PauseBannerProps {                                          |
|                                                                       |
| condition: \"NO_DEFAULT_METHOD\" \| \"DEFAULT_METHOD_DEACTIVATED\" \| |
|                                                                       |
| \"DEFAULT_METHOD_REAUTH_REQUIRED\" \| \"OFAC_FLAG\" \|                |
| \"ACCOUNT_SUSPENDED\";                                                |
|                                                                       |
| providerName: string \| null;                                         |
|                                                                       |
| methodId: string \| null;                                             |
|                                                                       |
| }                                                                     |
|                                                                       |
| // Banner colour: OFAC_FLAG \| ACCOUNT_SUSPENDED → red. All others →  |
| amber.                                                                |
|                                                                       |
| // CTA links:                                                         |
|                                                                       |
| // NO_DEFAULT_METHOD → /settings/payouts                              |
|                                                                       |
| // DEFAULT_METHOD_DEACTIVATED → /settings/payouts                     |
|                                                                       |
| // REAUTH_REQUIRED → /settings/payouts?reauth={methodId}              |
|                                                                       |
| // OFAC_FLAG → https://support.marketeq.com                           |
|                                                                       |
| // ACCOUNT_SUSPENDED → https://support.marketeq.com                   |
+=======================================================================+

# **5. Payouts Tab --- Transaction History**

  -----------------------------------------------------------------------------------------------------
  **Element**     **Endpoint**                              **When called**    **Notes**
  --------------- ----------------------------------------- ------------------ ------------------------
  **Payout        GET /v1/payouts/history?page=1&limit=20   On mount. On Ably  Paginated. Each item:
  history list**                                            payout.completed   payoutRequestId,
                                                            event.             amountUSD,
                                                                               displayAmount, status,
                                                                               methodLabel, createdAt,
                                                                               settledAt.

  **Date range    GET                                       On filter apply.   Filter state is local.
  filter**        /v1/payouts/history?from={iso}&to={iso}                      Backend filters
                                                                               server-side.

  **Payout detail GET /v1/payouts/{payoutRequestId}         On item tap.       Returns full payout
  modal**                                                                      detail: failureCode,
                                                                               failureReason,
                                                                               externalTransactionId,
                                                                               achReturnCode.

  **Status        Derived from payout.status field in       No separate call.  Status → badge copy:
  badges**        history response.                                            processing →
                                                                               \"Processing\",
                                                                               completed → \"Sent\",
                                                                               failed → \"Failed\",
                                                                               awaiting_verification →
                                                                               \"Confirming\",
                                                                               awaiting_edd → \"Under
                                                                               review\", awaiting_hold
                                                                               → \"On hold\".
  -----------------------------------------------------------------------------------------------------

  ------------------------------------------------------------------------
  **State**         **Display**
  ----------------- ------------------------------------------------------
  **Loading         Skeleton list items --- 5 rows, each showing
  (initial)**       placeholder lines for amount and date.

  **Loading         Spinner at the bottom of the list. List items remain
  (pagination)**    visible.

  **Empty --- no    See PS-26 §2.2: \"No payouts yet.\"
  history ever**    

  **Empty ---       See PS-26 §2.5: \"No transactions found.\" with
  filter applied    clear-filter CTA.
  with no results** 

  **Failed payout   Row shows red \"Failed\" badge. Tap opens detail modal
  item**            with failureReason in plain English.

  **awaiting_edd    Amber \"Under review\" badge. Detail modal shows PS-26
  item**            §9.2 copy.

  **awaiting_hold   Blue \"On hold\" badge. Detail modal shows PS-26 §9.3
  item**            copy with release date.

  **Network error** Inline error in list area: \"Couldn\'t load your
                    payout history. Tap to retry.\"
  ------------------------------------------------------------------------

# **6. Withdraw Funds Modal --- All 6 Steps**

## **6.1 Step 1 --- Select method and enter amount**

  ------------------------------------------------------------------------
  **Element**           **Endpoint**             **When called**
  --------------------- ------------------------ -------------------------
  **Method selector     GET /v1/deposit-methods  On modal open. Returns
  dropdown**                                     array of active verified
                                                 methods with label, type,
                                                 icon.

  **Balance display     From balance context     Reactive --- no new call.
  (within modal)**      (§2.1)                   

  **\"Withdraw full     Derived from             Sets amount input to
  amount\" button**     withdrawableUSD          withdrawableUSD. No API
                                                 call.

  **Reserve display**   From balance context     Shows reserveAmountUSD
                                                 below balance. \"You have
                                                 \${X} reserved --- change
                                                 reserve.\"

  **Validation          POST                     On Continue tap.
  (Continue CTA)**      /v1/payouts/validate     Lightweight pre-flight:
                                                 checks amount, method,
                                                 balance. Returns
                                                 validation result or
                                                 error. Does not create a
                                                 payout.
  ------------------------------------------------------------------------

+-----------------------------------------------------------------------+
| typescript                                                            |
+-----------------------------------------------------------------------+
| // POST /v1/payouts/validate --- pre-flight without creating a payout |
|                                                                       |
| // Request:                                                           |
|                                                                       |
| { \"depositMethodId\": \"uuid\", \"amountUSD\": 200.00 }              |
|                                                                       |
| // Success response (200):                                            |
|                                                                       |
| { \"valid\": true, \"netAmountUSD\": 200.00, \"feeAmountUSD\": 0.00 } |
|                                                                       |
| // Error response (422):                                              |
|                                                                       |
| { \"error\": { \"code\": \"ERR_INSUFFICIENT_FUNDS\", \"userMessage\": |
| \"\...\", \... } }                                                    |
|                                                                       |
| // On success: advance to Step 2                                      |
|                                                                       |
| // On error: display error inline in modal header (never toast for    |
| this step)                                                            |
+=======================================================================+

  -----------------------------------------------------------------------------
  **State**              **Display**
  ---------------------- ------------------------------------------------------
  **Loading methods**    Skeleton dropdown. Continue button disabled.

  **No verified          Dropdown shows disabled \"No verified methods\".
  methods**              Message: \"You need to add and verify a payout method
                         first.\" CTA: \"Add method\" → /settings/payouts.
                         Modal cannot advance.

  **Amount below         Inline below amount field: \"Minimum withdrawal is
  minimum**              \$50.00.\" Continue button disabled. No API call made.

  **Amount above         Inline below field: \"You can withdraw up to
  withdrawable**         \${withdrawableUSD}.\" Continue disabled.

  **POST                 Red alert box at top of step 1. Error userMessage
  /v1/payouts/validate   displayed. Continue button re-enabled so user can
  error**                correct.
  -----------------------------------------------------------------------------

## **6.2 Step 2 --- KYC gate check**

  ------------------------------------------------------------------------
  **Element**           **Endpoint**             **When called**
  --------------------- ------------------------ -------------------------
  **KYC gate status**   GET /v1/kyc/gate-status  On advancing from Step 1.
                        (proxied from            Blocking --- modal waits
                        kyc-identity-service)    for response.

  ------------------------------------------------------------------------

+-----------------------------------------------------------------------+
| typescript                                                            |
+-----------------------------------------------------------------------+
| // GET /v1/kyc/gate-status                                            |
|                                                                       |
| // Response:                                                          |
|                                                                       |
| {                                                                     |
|                                                                       |
| \"tier1\": { \"status\": \"verified\", \"blocksWithdrawal\": false }, |
|                                                                       |
| \"tier2\": { \"status\": \"not_started\", \"blocksWithdrawal\": true, |
| \"subType\": \"ssn\" },                                               |
|                                                                       |
| \"tier3\": {                                                          |
|                                                                       |
| \"status\": \"pending\",                                              |
|                                                                       |
| \"blocksWithdrawal\": true,                                           |
|                                                                       |
| \"depositMethodId\": \"uuid\" // The specific method that needs Tier  |
| 3                                                                     |
|                                                                       |
| },                                                                    |
|                                                                       |
| \"firstPayoutHold\": {                                                |
|                                                                       |
| \"active\": false,                                                    |
|                                                                       |
| \"releasesAt\": null                                                  |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
|                                                                       |
| // If any blocksWithdrawal is true: do NOT advance to Step 3.         |
|                                                                       |
| // Instead: close the modal and render the appropriate KYC intercept  |
| screen.                                                               |
|                                                                       |
| // See PS-26 §5 for KYC intercept screen content per tier.            |
|                                                                       |
| // Priority: check Tier 1 first, then Tier 2, then Tier 3, then       |
| firstPayoutHold.                                                      |
+=======================================================================+

  ----------------------------------------------------------------------------------------
  **State**                         **Display**
  --------------------------------- ------------------------------------------------------
  **Loading**                       Full modal shows \"Verifying your account...\"
                                    spinner. Steps 1 progress indicator remains visible.

  **All tiers verified**            Advance silently to Step 3. No visible step 2 screen
                                    to contractor.

  **Any tier blocks**               Modal closes. Full-screen KYC intercept renders (PS-26
                                    §5). Withdrawal state is discarded.

  **ERR_KYC_SERVICE_UNAVAILABLE**   Show modal-level error: \"We\'re unable to verify your
                                    account right now. Please try again in a few
                                    minutes.\" Retry button. Do NOT advance to Step 3 ---
                                    never skip the KYC check.
  ----------------------------------------------------------------------------------------

## **6.3 Step 3 --- Review and confirm**

  ----------------------------------------------------------------------------
  **Element**           **Endpoint / source**  **Notes**
  --------------------- ---------------------- -------------------------------
  **Confirmation        Derived from Step 1    Shows: method label, amount,
  summary**             selection.             estimated arrival
                                               (method-specific copy).

  **Estimated arrival   Static per method      ACH: \"1--3 business days.\"
  copy**                type.                  PayPal/Wise/Payoneer: \"Usually
                                               same day.\" Crypto: \"Varies by
                                               network.\" Card: \"Usually
                                               instant.\"

  **Confirm CTA**       POST                   On Confirm tap.
                        /v1/payouts/initiate   
  ----------------------------------------------------------------------------

+-----------------------------------------------------------------------+
| typescript                                                            |
+-----------------------------------------------------------------------+
| // POST /v1/payouts/initiate                                          |
|                                                                       |
| // Request:                                                           |
|                                                                       |
| {                                                                     |
|                                                                       |
| \"depositMethodId\": \"uuid\",                                        |
|                                                                       |
| \"amountUSD\": 200.00,                                                |
|                                                                       |
| \"idempotencyKey\": \"uuid-v4-generated-client-side\" // Prevents     |
| double-submission on retry                                            |
|                                                                       |
| }                                                                     |
|                                                                       |
| // Success (202 Accepted):                                            |
|                                                                       |
| {                                                                     |
|                                                                       |
| \"payoutRequestId\": \"uuid\",                                        |
|                                                                       |
| \"status\": \"awaiting_verification\",                                |
|                                                                       |
| \"message\": \"A confirmation email has been sent.\"                  |
|                                                                       |
| }                                                                     |
|                                                                       |
| // On 202: advance to Step 4 (awaiting magic link)                    |
|                                                                       |
| // On 403 ERR_PAYOUT_HOLD_ACTIVE: close modal, show hold intercept    |
| with releaseDate from metadata                                        |
|                                                                       |
| // On 403 ERR_EDD_REVIEW_PENDING (202): advance to a \"payout under   |
| review\" terminal state screen                                        |
|                                                                       |
| // On any other error: display inline in modal                        |
+=======================================================================+

## **6.4 Step 4 --- Awaiting magic link confirmation**

  ---------------------------------------------------------------------------------------------------
  **Element**           **Endpoint**                                        **When called**
  --------------------- --------------------------------------------------- -------------------------
  **Countdown timer**   None --- client-side only.                          15-minute countdown from
                                                                            moment Step 4 is entered.
                                                                            Fires expired state when
                                                                            0:00.

  **Status poll**       GET /v1/payouts/{payoutRequestId}/status            Poll every 5 seconds.
                                                                            Stop when status changes
                                                                            from
                                                                            awaiting_verification.

  **Resend email CTA**  POST                                                On contractor tap.
                        /v1/payouts/{payoutRequestId}/resend-verification   Disabled after 3 uses.
                                                                            Shows \"Email resent\"
                                                                            confirmation toast.
  ---------------------------------------------------------------------------------------------------

+-----------------------------------------------------------------------+
| typescript                                                            |
+-----------------------------------------------------------------------+
| // GET /v1/payouts/{payoutRequestId}/status --- polled every 5        |
| seconds in Step 4                                                     |
|                                                                       |
| {                                                                     |
|                                                                       |
| \"payoutRequestId\": \"uuid\",                                        |
|                                                                       |
| \"status\": \"awaiting_verification\" \| \"processing\" \|            |
| \"completed\" \| \"failed\" \| \"cancelled\"                          |
|                                                                       |
| }                                                                     |
|                                                                       |
| // Status transitions during Step 4:                                  |
|                                                                       |
| // awaiting_verification → processing: magic link was clicked →       |
| advance to Step 5                                                     |
|                                                                       |
| // awaiting_verification → cancelled: 15-min TTL elapsed server-side  |
| → show expired state                                                  |
|                                                                       |
| // awaiting_verification → failed: balance changed (race condition) → |
| show failed state                                                     |
|                                                                       |
| // Client-side 15-min countdown is a UI convenience.                  |
|                                                                       |
| // Server-side expiry is authoritative --- poll response takes        |
| priority.                                                             |
+=======================================================================+

  ------------------------------------------------------------------------
  **State**         **Display**
  ----------------- ------------------------------------------------------
  **Waiting         Instruction: \"Check your inbox for a confirmation
  (normal)**        email from Marketeq.\" Countdown timer. \"Resend
                    email\" link. \"Cancel withdrawal\" link.

  **Countdown       Greyed overlay on step: \"This link has expired.\"
  expired           \"Start a new withdrawal\" CTA. Stop polling.
  (client-side)**   

  **Poll returns    Same as countdown expired. Stop polling.
  cancelled**       

  **Poll returns    Advance to Step 5 automatically. No user action
  processing**      required.

  **Poll returns    Show error: \"Your withdrawal could not be processed.
  failed**          Your balance has been returned.\" \"Start new
                    withdrawal\" CTA. Stop polling.

  **Resend limit    Resend button becomes \"Start a new withdrawal\" after
  reached**         3 resends.
  ------------------------------------------------------------------------

## **6.5 Step 5 --- Token verification (magic link landing page)**

Step 5 is a standalone page (not inside the modal) loaded when the
contractor clicks the magic link in their email. The URL contains the
raw token in the query string. This page exists outside the main app
shell.

+------------------------------------------------------------------------------+
| typescript                                                                   |
+------------------------------------------------------------------------------+
| // URL:                                                                      |
| https://app.marketeq.com/verify-payout?token={rawToken}&id={payoutRequestId} |
|                                                                              |
| // Page calls: GET                                                           |
| /v1/payouts/verify-magic-link?token={rawToken}&id={payoutRequestId}          |
|                                                                              |
| // Success (200):                                                            |
|                                                                              |
| { \"status\": \"processing\", \"methodLabel\": \"Chase Bank (\...4521)\",    |
| \"amountUSD\": 200.00 }                                                      |
|                                                                              |
| → Render: \"Your withdrawal of \$200.00 to Chase Bank (\...4521) is being    |
| processed.\"                                                                 |
|                                                                              |
| CTA: \"View your earnings\" → /earnings                                      |
|                                                                              |
| // Error responses mapped to full-page states:                               |
|                                                                              |
| // ERR_MAGIC_LINK_EXPIRED → \"This link has expired.\" + \"Start new         |
| withdrawal\" CTA                                                             |
|                                                                              |
| // ERR_MAGIC_LINK_ALREADY_USED → \"This link has already been used.\" +      |
| \"View earnings\" CTA                                                        |
|                                                                              |
| // ERR_MAGIC_LINK_INVALID → \"This link is not valid.\" + \"Start new        |
| withdrawal\" CTA                                                             |
+==============================================================================+

  ----------------------------------------------------------------------------------------
  **State**                         **Display**
  --------------------------------- ------------------------------------------------------
  **Loading**                       Spinner with \"Verifying your confirmation...\"

  **Success**                       Success illustration. \"Withdrawal confirmed.\" Method
                                    and amount shown. \"View your earnings\" CTA.

  **ERR_MAGIC_LINK_EXPIRED**        Error page. \"This verification link has expired.\"
                                    \"Start a new withdrawal\" CTA → /earnings.

  **ERR_MAGIC_LINK_ALREADY_USED**   Neutral info page (not error-red). \"This link has
                                    already been used.\" \"View your payout status\" CTA →
                                    /earnings/history.

  **ERR_MAGIC_LINK_INVALID**        Error page. \"This link isn\'t valid.\" \"Start a new
                                    withdrawal\" CTA → /earnings.
  ----------------------------------------------------------------------------------------

## **6.6 Step 6 --- Payout processing / terminal state**

Step 6 is not a modal step the contractor sees in real time --- payout
execution is asynchronous. The \"step 6\" experience is delivered via
Ably notification and transaction history. There is no polling screen
for execution status after magic link confirmation.

  -----------------------------------------------------------------------
  **Experience**        **How delivered**
  --------------------- -------------------------------------------------
  **Payout completed**  Ably payout.completed event → toast notification:
                        \"Your \${methodLabel} payout of \${amount} was
                        sent.\" Balance context auto-refreshes.

  **Payout failed       Ably payout.failed event → toast notification +
  (execution)**         in-app notification. Transaction history updated
                        with failed status and reason.

  **Payout still        Edge case --- show \"Processing\" badge in
  processing after      history. Support link shown. No automatic user
  24h**                 action required.
  -----------------------------------------------------------------------

# **7. Deposit Schedule Settings**

  -----------------------------------------------------------------------------
  **Element**           **Endpoint**                  **When called**
  --------------------- ----------------------------- -------------------------
  **Current schedule    GET /v1/payouts/schedule      On mount.
  display**                                           

  **Save schedule**     PUT /v1/payouts/schedule      On save. Replaces full
                                                      schedule config.

  **Toggle schedule     PATCH                         On toggle. Body: {
  on/off**              /v1/payouts/schedule/active   \"isActive\": true/false
                                                      }.
  -----------------------------------------------------------------------------

+-----------------------------------------------------------------------+
| typescript                                                            |
+-----------------------------------------------------------------------+
| // GET /v1/payouts/schedule response:                                 |
|                                                                       |
| {                                                                     |
|                                                                       |
| \"scheduleId\": \"uuid\",                                             |
|                                                                       |
| \"isActive\": true,                                                   |
|                                                                       |
| \"frequency\": \"WEEKLY\", // WEEKLY \| BIWEEKLY \| MONTHLY \|        |
| THRESHOLD                                                             |
|                                                                       |
| \"anchorDate\": \"2025-01-06\", // For BIWEEKLY only                  |
|                                                                       |
| \"minimumThresholdUSD\": 100.00,                                      |
|                                                                       |
| \"reserveAmountUSD\": 50.00,                                          |
|                                                                       |
| \"splitEnabled\": false,                                              |
|                                                                       |
| \"primaryMethodId\": \"uuid\",                                        |
|                                                                       |
| \"primaryMethodLabel\": \"Chase Bank (\...4521)\",                    |
|                                                                       |
| \"primarySplitPercent\": 100.00,                                      |
|                                                                       |
| \"secondaryMethodId\": null,                                          |
|                                                                       |
| \"secondaryMethodLabel\": null,                                       |
|                                                                       |
| \"secondarySplitPercent\": null,                                      |
|                                                                       |
| \"nextExecutionAt\": \"2025-06-16T09:00:00Z\"                         |
|                                                                       |
| }                                                                     |
|                                                                       |
| // If no schedule exists: 404. Frontend shows empty/setup state.      |
+=======================================================================+

  ---------------------------------------------------------------------------------------
  **State**                        **Display**
  -------------------------------- ------------------------------------------------------
  **Loading**                      Skeleton for frequency selector, threshold input,
                                   method selector.

  **No schedule (404)**            Empty state: \"Set up automatic payouts.\" Frequency
                                   selector shown pre-set to WEEKLY as default. See PS-26
                                   §2.3.

  **Schedule inactive**            Toggle shows Off. nextExecutionAt not shown. All
                                   inputs still editable.

  **Save loading**                 Save button shows spinner. Inputs disabled.

  **Save error**                   Inline error above save button. Input that caused the
                                   error is highlighted.

  **ERR_BELOW_SCHEDULE_MINIMUM**   Inline below threshold input: \"Minimum threshold is
                                   \$50.00.\"
  ---------------------------------------------------------------------------------------

## **7.1 Split percentage editing --- auto-balance display**

When split is enabled and the contractor edits either percentage input,
the other input must update in real time on every keystroke. This is a
pure frontend calculation --- no API call is made during editing.

+-----------------------------------------------------------------------+
| typescript                                                            |
+-----------------------------------------------------------------------+
| // Auto-balance logic --- runs on every onChange of either percent    |
| input                                                                 |
|                                                                       |
| // Truncate to 2dp --- do not round                                   |
|                                                                       |
| function truncate2dp(n: number): number {                             |
|                                                                       |
| return Math.floor(n \* 100) / 100;                                    |
|                                                                       |
| }                                                                     |
|                                                                       |
| // User edits primary input:                                          |
|                                                                       |
| function onPrimaryChange(rawValue: string) {                          |
|                                                                       |
| const primary = truncate2dp(parseFloat(rawValue) \|\| 0);             |
|                                                                       |
| const secondary = truncate2dp(100 - primary);                         |
|                                                                       |
| setPrimaryPercent(primary);                                           |
|                                                                       |
| setSecondaryPercent(secondary);                                       |
|                                                                       |
| // Show live amount preview: \"\$X.XX to \[primary label\], \$Y.YY to |
| \[secondary label\]\"                                                 |
|                                                                       |
| // Based on current balance context withdrawableUSD                   |
|                                                                       |
| }                                                                     |
|                                                                       |
| // User edits secondary input:                                        |
|                                                                       |
| function onSecondaryChange(rawValue: string) {                        |
|                                                                       |
| const secondary = truncate2dp(parseFloat(rawValue) \|\| 0);           |
|                                                                       |
| const primary = truncate2dp(100 - secondary);                         |
|                                                                       |
| setSecondaryPercent(secondary);                                       |
|                                                                       |
| setPrimaryPercent(primary);                                           |
|                                                                       |
| }                                                                     |
|                                                                       |
| // Validation (on blur or save attempt --- not on every keystroke):   |
|                                                                       |
| // primary must be in range 0.01--99.99                               |
|                                                                       |
| // primary + secondary must equal 100.00 (check truncated values)     |
|                                                                       |
| // Primary and secondary methods must differ (already enforced by     |
| dropdown exclusion)                                                   |
+=======================================================================+

# **8. Add Deposit Method Flows --- All Types**

## **8.1 Common: method type selector**

+-----------------------------------------------------------------------+
| typescript                                                            |
+-----------------------------------------------------------------------+
| // Method type selector is the entry point for all add-method flows.  |
|                                                                       |
| // Available options are driven by feature flags (§2.2) and           |
| contractor country.                                                   |
|                                                                       |
| // GET /v1/deposit-methods/available-types                            |
|                                                                       |
| {                                                                     |
|                                                                       |
| \"types\": \[                                                         |
|                                                                       |
| { \"type\": \"BANK_STRIPE\", \"label\": \"Bank account (instant       |
| verify)\", \"available\": true },                                     |
|                                                                       |
| { \"type\": \"BANK_MANUAL\", \"label\": \"Bank account (manual        |
| entry)\", \"available\": true },                                      |
|                                                                       |
| { \"type\": \"PAYPAL\", \"label\": \"PayPal\", \"available\": true }, |
|                                                                       |
| { \"type\": \"WISE\", \"label\": \"Wise\", \"available\": true },     |
|                                                                       |
| { \"type\": \"PAYONEER\", \"label\": \"Payoneer\", \"available\":     |
| true },                                                               |
|                                                                       |
| { \"type\": \"CRYPTO\", \"label\": \"Crypto wallet\", \"available\":  |
| true },                                                               |
|                                                                       |
| { \"type\": \"DEBIT_CARD\", \"label\": \"Marketeq Debit Card\",       |
| \"available\": true },                                                |
|                                                                       |
| { \"type\": \"TEQ_COIN\", \"label\": \"TEQ Coin\", \"available\":     |
| false }                                                               |
|                                                                       |
| \]                                                                    |
|                                                                       |
| }                                                                     |
|                                                                       |
| // available: false → option is hidden in the selector (not greyed    |
| out)                                                                  |
|                                                                       |
| // Exception: DEBIT_CARD with ERR_CARD_GEO_UNAVAILABLE shows disabled |
| with lock icon                                                        |
+=======================================================================+

## **8.2 Stripe Financial Connections (BANK_STRIPE)**

  ----------------------------------------------------------------------------------------------------
  **Step**   **Action**      **Endpoint**                              **Notes**
  ---------- --------------- ----------------------------------------- -------------------------------
  **1**      Initialise      POST                                      Returns { clientSecret,
             session         /v1/deposit-methods/stripe-link-session   linkToken }. clientSecret
                                                                       initialises Stripe.js Financial
                                                                       Connections.

  **2**      Launch Stripe   Stripe.js client SDK                      Client-side only. Stripe modal
             modal                                                     handles bank login and account
                                                                       selection.

  **3**      Stripe modal    Stripe SDK callback                       Returns {
             returns                                                   financialConnectionsAccountId }
                                                                       on success. Null on cancel.

  **4**      Save method     POST /v1/deposit-methods                  Body: { type: \"BANK_STRIPE\",
                                                                       financialConnectionsAccountId
                                                                       }. Returns deposit method
                                                                       record.
  ----------------------------------------------------------------------------------------------------

  ---------------------------------------------------------------------------------------------
  **State**                              **Display**
  -------------------------------------- ------------------------------------------------------
  **Loading (initialise)**               Spinner: \"Connecting to your bank...\"

  **Stripe modal open**                  Full-screen Stripe-hosted modal. No Marketeq UI while
                                         open.

  **Stripe session expired**             Stripe SDK returns error. Show: \"Your session timed
                                         out. Please try again.\" Reinitialise (new POST
                                         /stripe-link-session).

  **Stripe modal cancelled**             User dismissed modal without selecting a bank. Return
                                         to method type selector silently.

  **POST /v1/deposit-methods success**   Success screen: \"Bank account added.\" Method label
                                         shown. \"Set as default\" toggle if no default exists.

  **ERR_DEPOSIT_METHOD_LIMIT_REACHED**   Inline: \"You\'ve reached the maximum of 5 payout
                                         methods.\"
  ---------------------------------------------------------------------------------------------

## **8.3 Manual bank entry (BANK_MANUAL) --- by region**

The manual bank entry form adapts its fields based on the contractor\'s
country/region. Field sets per region are defined in PS-07. Frontend
must render the correct set of fields based on the country selected in
the form.

  -----------------------------------------------------------------------------
  **Region**        **Fields shown**            **Validation**
  ----------------- --------------------------- -------------------------------
  **United States** Account holder name,        Routing: ABA checksum. Account:
                    Routing number (9 digits),  digits only.
                    Account number (4--17       
                    digits), Account type       
                    (checking/savings)          

  **United          Account holder name, Sort   Sort code: 6 digit numeric.
  Kingdom**         code (6 digits, formatted   Account: 8 digit numeric.
                    XX-XX-XX), Account number   
                    (8 digits)                  

  **EU / SEPA**     Account holder name, IBAN   IBAN format + check digit
                    (up to 34 chars), SWIFT/BIC validation. SWIFT: 8 or 11
                    (8 or 11 chars)             chars.

  **India**         Account holder name,        IFSC: 4 letter bank code + 0 +
                    Account number, IFSC code   6 digit branch code.
                    (11 chars, e.g.             
                    SBIN0001234)                

  **Australia**     Account holder name, BSB (6 BSB: 6 digit numeric.
                    digits), Account number     

  **Canada**        Account holder name,        Numeric validation.
                    Institution number (3       
                    digits), Transit number (5  
                    digits), Account number     

  **Other /         Account holder name, IBAN   IBAN or SWIFT required.
  International**   or account number,          
                    SWIFT/BIC, Bank name, Bank  
                    country                     
  -----------------------------------------------------------------------------

+-----------------------------------------------------------------------+
| typescript                                                            |
+-----------------------------------------------------------------------+
| // POST /v1/deposit-methods --- manual bank                           |
|                                                                       |
| // Request:                                                           |
|                                                                       |
| {                                                                     |
|                                                                       |
| \"type\": \"BANK_MANUAL\",                                            |
|                                                                       |
| \"country\": \"US\",                                                  |
|                                                                       |
| \"accountHolderName\": \"Jane Smith\",                                |
|                                                                       |
| \"routingNumber\": \"021000021\",                                     |
|                                                                       |
| \"accountNumber\": \"123456789\",                                     |
|                                                                       |
| \"accountType\": \"checking\"                                         |
|                                                                       |
| }                                                                     |
|                                                                       |
| // On success: micro-deposit verification required before method can  |
| receive payouts.                                                      |
|                                                                       |
| // Response includes verificationStatus: \"pending_verification\".    |
|                                                                       |
| // Navigate to micro-deposit pending screen (PS-08).                  |
+=======================================================================+

## **8.4 PayPal (PAYPAL)**

  ----------------------------------------------------------------------------------------------
  **Step**   **Action**      **Endpoint**                         **Notes**
  ---------- --------------- ------------------------------------ ------------------------------
  **1**      Get OAuth       GET /v1/oauth/paypal/connect         Returns { redirectUrl }.
             redirect URL                                         Frontend redirects to
                                                                  redirectUrl.

  **2**      User completes  PayPal hosted                        User redirected back to
             PayPal login                                         /v1/oauth/paypal/callback
                                                                  (handled server-side).

  **3**      Callback        Server-side redirect to              Frontend reads connected query
             success         /settings/payouts?connected=paypal   param. Shows success screen.

  **4**      Fetch updated   GET /v1/deposit-methods              On /settings/payouts mount
             methods                                              after redirect.
  ----------------------------------------------------------------------------------------------

  -----------------------------------------------------------------------
  **State**        **Display**
  ---------------- ------------------------------------------------------
  **Loading        Spinner: \"Redirecting to PayPal...\"
  (redirect)**     

  **OAuth state    URL contains ?error=state_expired. Show: \"Your PayPal
  expired          connection timed out. Please try again.\"
  (redirect back   
  with error)**    

  **OAuth          URL contains ?error=access_denied. Show: \"PayPal
  cancelled (user  connection cancelled.\" Return to method selector.
  declined at      
  PayPal)**        

  **Success**      URL contains ?connected=paypal. Show: \"PayPal
                   connected successfully.\"
  -----------------------------------------------------------------------

## **8.5 Wise (WISE) and Payoneer (PAYONEER)**

Wise and Payoneer follow the same OAuth redirect pattern as PayPal
(§8.4). Replace \"paypal\" with \"wise\" or \"payoneer\" in endpoint
paths and copy. Callback URL pattern: /settings/payouts?connected=wise
or ?connected=payoneer. All error states and loading states are
identical to §8.4.

## **8.6 Crypto wallet --- per provider**

  ----------------------------------------------------------------------------------------------------
  **Step**         **Action**      **Endpoint**                **Notes**
  ---------------- --------------- --------------------------- ---------------------------------------
  **1**            Choose          UI choice                   Option A: Paste wallet address. Option
                   connection                                  B: WalletConnect QR. Option C: Ramp
                   method                                      Network. Option D: Transak.

  **2A**           Paste address   POST /v1/deposit-methods    Body: { type: \"CRYPTO\", network,
                                                               walletAddress }. Validates address
                                                               format server-side.

  **2B**           WalletConnect   POST                        Returns { uri, qrCodeData, sessionId,
                                   /v1/walletconnect/session   expiresAt }. Render QR code. POLL
                                                               /v1/walletconnect/session/{sessionId}
                                                               every 3 seconds.

  **2C/2D**        Ramp or Transak GET /v1/oauth/ramp/connect  OAuth redirect. Same pattern as PayPal
                                   or /transak/connect         (§8.4). Callback: ?connected=ramp or
                                                               ?connected=transak.

  **3              Session         Poll returns status:        Stop polling. Address returned in
  (WalletConnect   confirmed       \"confirmed\"               response. POST /v1/deposit-methods with
  only)**                                                      address.
  ----------------------------------------------------------------------------------------------------

  -------------------------------------------------------------------------------------------
  **State**                            **Display**
  ------------------------------------ ------------------------------------------------------
  **Network selector**                 Dropdown: Ethereum, Bitcoin, Solana, Tron, Polygon,
                                       Litecoin. Network determines address validation regex.

  **Address paste --- validation**     Inline below field as user types. \"Not a valid
                                       {network} address\" shown before submit if format
                                       invalid.

  **WalletConnect QR displayed**       QR image + countdown timer \"{mm:ss} remaining\".
                                       \"Generate new code\" shown when timer hits 0:00. See
                                       PS-26 §9.4 for all 5 WalletConnect states.

  **WalletConnect scanning**           Status text: \"Connecting... waiting for your wallet
                                       to confirm.\" Spinner.

  **WalletConnect confirmed**          Address shown truncated. \"Save this wallet\" CTA.
                                       Shows: \"Connected: 0x1234...abcd\".

  **ERR_CRYPTO_ADDRESS_INVALID**       Inline error below address input. \"This doesn\'t look
                                       like a valid {network} address.\"

  **ERR_CRYPTO_NETWORK_UNSUPPORTED**   Toast: \"We don\'t support payouts to {network} yet.\"
  -------------------------------------------------------------------------------------------

## **8.7 Debit card (DEBIT_CARD)**

Debit card setup requires new design screens (PS-26 §8). Frontend cannot
be built until those designs are delivered. The endpoint mapping below
is provided for when designs are ready.

  ---------------------------------------------------------------------------------------------------
  **Step**         **Endpoint**                                        **Notes**
  ---------------- --------------------------------------------------- ------------------------------
  **Check          GET /v1/deposit-methods/debit-card/eligibility      Returns { eligible: bool,
  eligibility**                                                        reason: null \|
                                                                       \"GEO_UNAVAILABLE\" \|
                                                                       \"KYC_REQUIRED\" \|
                                                                       \"ALREADY_EXISTS\" }.

  **Request card** POST /v1/deposit-methods/debit-card/request         Body: { cardType: \"virtual\"
                                                                       \| \"physical\" }. Creates
                                                                       Stripe cardholder and issues
                                                                       card.

  **Get virtual    GET /v1/deposit-methods/debit-card/secure-details   Returns { cardNumber,
  card details**                                                       expiryMonth, expiryYear, cvv }
                                                                       via Stripe Elements iframe.
                                                                       Never in plain API response.

  **Activate       POST /v1/deposit-methods/debit-card/activate        Body: { last4: \"1234\", cvv:
  card**                                                               \"567\" }. Returns updated
                                                                       method with status: VERIFIED.

  **Freeze /       PATCH /v1/deposit-methods/{methodId}/card-status    Body: { frozen: true/false }.
  unfreeze**                                                           Returns updated status.

  **Report         POST                                                Cancels old card, creates
  lost/stolen**    /v1/deposit-methods/{methodId}/report-lost-stolen   replacement. Returns new
                                                                       methodId and estimated
                                                                       delivery.

  **Cancel card**  DELETE /v1/deposit-methods/{methodId}               Standard method delete ---
                                                                       deactivates card and returns
                                                                       balance to earnings.
  ---------------------------------------------------------------------------------------------------

# **9. Deposit Method Management List**

  ----------------------------------------------------------------------------------------------------
  **Element**           **Endpoint**                                         **When called**
  --------------------- ---------------------------------------------------- -------------------------
  **Method list**       GET /v1/deposit-methods                              On mount. On return from
                                                                             any add-method flow.

  **Set as default**    PATCH /v1/deposit-methods/{methodId}/default         On \"Set as default\"
                                                                             tap. Body: {}.

  **Delete method**     DELETE /v1/deposit-methods/{methodId}                On delete confirm.

  **Reconnect OAuth     PATCH /v1/deposit-methods/{methodId}/reconnect       Triggers new OAuth
  method**                                                                   redirect for expired
                                                                             OAuth methods.

  **Verify bank         GET                                                  On mount for pending
  (micro-deposit)**     /v1/deposit-methods/{methodId}/verification-status   methods. Navigate to
                                                                             verification flow if
                                                                             pending.
  ----------------------------------------------------------------------------------------------------

+-----------------------------------------------------------------------+
| typescript                                                            |
+-----------------------------------------------------------------------+
| // GET /v1/deposit-methods --- response array                         |
|                                                                       |
| \[                                                                    |
|                                                                       |
| {                                                                     |
|                                                                       |
| \"depositMethodId\": \"uuid\",                                        |
|                                                                       |
| \"type\": \"BANK_STRIPE\",                                            |
|                                                                       |
| \"label\": \"Chase Bank (\...4521)\",                                 |
|                                                                       |
| \"isDefault\": true,                                                  |
|                                                                       |
| \"isActive\": true,                                                   |
|                                                                       |
| \"verificationStatus\": \"VERIFIED\", // VERIFIED \| PENDING \|       |
| FAILED                                                                |
|                                                                       |
| \"reauthRequired\": false,                                            |
|                                                                       |
| \"splitRole\": \"primary\", // \"primary\" \| \"secondary\" \| null   |
|                                                                       |
| \"splitPercent\": 60.00, // null if not in a split                    |
|                                                                       |
| \"iconUrl\": \"https://cdn.marketeq.com/banks/chase.png\",            |
|                                                                       |
| \"createdAt\": \"2025-01-10T12:00:00Z\"                               |
|                                                                       |
| },                                                                    |
|                                                                       |
| // \...more methods                                                   |
|                                                                       |
| \]                                                                    |
+=======================================================================+

  ------------------------------------------------------------------------------------------
  **State**                           **Display**
  ----------------------------------- ------------------------------------------------------
  **Loading**                         Skeleton rows --- 1 to 3 rows depending on typical
                                      method count.

  **Empty (no methods)**              See PS-26 §2.1 empty state.

  **PENDING verification**            Yellow \"Verification pending\" badge. \"Verify now\"
                                      CTA. Method cannot be used for payouts.

  **FAILED verification**             Red \"Verification failed\" badge. \"Try again\" CTA.
                                      Method cannot be used.

  **reauthRequired: true**            Amber \"Reconnect\" badge. \"Reconnect
                                      {providerName}\" CTA. Method cannot receive payouts.

  **Default method**                  Blue \"Default\" badge. \"Set as default\" CTA hidden.

  **In split (splitRole not null)**   Secondary label shows split percentage. \"50% to this
                                      account\" or \"60%/40% split.\"

  **Delete --- only method**          Show tooltip on delete icon: \"Add another method
                                      before removing this one.\" Delete icon disabled.

  **Delete --- default with active    Confirm dialog: \"Removing this method will turn off
  split**                             your split payouts. All future payouts will go to your
                                      next default method.\" Confirm / Cancel.

  **ERR_CANNOT_REMOVE_ONLY_METHOD**   Toast: \"You must have at least one payout method.\"

  **Network error on delete**         Toast: \"Couldn\'t remove this method. Please try
                                      again.\"
  ------------------------------------------------------------------------------------------

# **10. Error Code to UI State Mapping --- Quick Reference**

All error codes are defined in PS-24. This table maps each code to the
correct UI pattern for the component where it most commonly occurs.

  --------------------------------------------------------------------------------------------
  **Error code**                         **UI pattern**           **Copy source**
  -------------------------------------- ------------------------ ----------------------------
  **ERR_INSUFFICIENT_FUNDS**             Inline in withdrawal     PS-24 §3 userMessage
                                         modal Step 1 header      

  **ERR_INSUFFICIENT_FUNDS_AFTER_FEE**   Inline in withdrawal     PS-24 §3 userMessage
                                         modal Step 1 header      

  **ERR_BELOW_MINIMUM_AMOUNT**           Inline below amount      PS-24 §3 userMessage
                                         input field              

  **ERR_METHOD_NOT_VERIFIED**            Method list badge +      PS-24 §4 userMessage
                                         inline modal warning     

  **ERR_METHOD_REAUTH_REQUIRED**         Pause banner + method    PS-26 §7 banner copy
                                         list badge               

  **ERR_KYC_TIER1_REQUIRED**             Full-screen KYC          PS-26 §5.1
                                         intercept (modal closes) 

  **ERR_KYC_TIER2_REQUIRED**             Full-screen KYC          PS-26 §5.2 or §5.3
                                         intercept (modal closes) 

  **ERR_KYC_TIER3_REQUIRED**             Full-screen KYC          PS-26 §5.4
                                         intercept (modal closes) 

  **ERR_MAGIC_LINK_EXPIRED**             Standalone full-page     PS-26 §4 (magic link page)
                                         error                    

  **ERR_MAGIC_LINK_ALREADY_USED**        Standalone full-page     PS-26 §4
                                         info (neutral)           

  **ERR_PAYOUT_HOLD_ACTIVE**             Modal closes; hold       PS-26 §9.3
                                         intercept screen with    
                                         releaseDate              

  **ERR_PAYOUT_OFAC_BLOCKED**            Pause banner (red) +     PS-26 §7
                                         withdrawal blocked at    
                                         modal                    

  **ERR_PAYOUT_ACCOUNT_SUSPENDED**       Pause banner (red)       PS-26 §7

  **ERR_WITHDRAWAL_RATE_LIMIT**          Toast with countdown:    PS-24 §8
                                         \"Try again in           
                                         {retryAfterSeconds}s\"   

  **ERR_SPLIT_PERCENT_OUT_OF_RANGE**     Inline below percent     PS-24 §9
                                         input field              

  **ERR_SPLIT_SAME_METHOD**              Inline below secondary   PS-24 §9
                                         method selector          

  **ERR_CRYPTO_ADDRESS_INVALID**         Inline below wallet      PS-24 §10
                                         address input            

  **ERR_GAS_TOO_HIGH**                   Modal-level amber        PS-24 §10 userMessage
                                         warning. Payout queued,  
                                         not rejected.            

  **ERR_CARD_NOT_ACTIVATED**             Method list badge +      PS-24 §11
                                         block on card selection  
                                         in modal                 

  **ERR_DEPOSIT_METHOD_LIMIT_REACHED**   Toast + \"Add method\"   PS-24 §4
                                         CTA hidden when at limit 

  **ERR_NETWORK_FAILURE**                Toast: \"Something went  PS-24 §13
                                         wrong. Please try        
                                         again.\"                 

  **ERR_PROVIDER_UNAVAILABLE**           Toast with providerName: PS-24 §13
                                         \"{provider} is          
                                         temporarily              
                                         unavailable.\"           

  **ERR_KYC_SERVICE_UNAVAILABLE**        Modal-level error. Do    PS-24 §5
                                         not advance past KYC     
                                         step.                    
  --------------------------------------------------------------------------------------------

# **11. References**

  -----------------------------------------------------------------------
  **Document**          **Relevant to**
  --------------------- -------------------------------------------------
  **PS-02 ---           API endpoint contracts for all withdrawal
  Withdrawal Flow**     actions.

  **PS-07 --- Global    Manual bank field sets per region (§8.3).
  Bank Schema**         

  **PS-08 ---           Pending verification state in method management
  Micro-Deposit         (§9).
  Verification**        

  **PS-09 ---           PayPal, Wise, Payoneer OAuth flow (§8.4, §8.5).
  Third-Party OAuth**   

  **PS-10 --- Crypto    WalletConnect QR session lifecycle (§8.6).
  Wallet Connection**   

  **PS-14 --- Magic     Step 4 polling and Step 5 standalone page (§6.4,
  Link Verification**   §6.5).

  **PS-16 --- Paused    Pause banner content and polling (§4).
  Payouts**             

  **PS-19 ---           Which validations are frontend-only vs
  Validation Split**    backend-enforced.

  **PS-24 --- Error     All ERR\_ codes and userMessage copy (§10).
  Catalog**             

  **PS-26 --- UX States Empty states, loading states, intercept screens
  Not in Designs**      referenced throughout.
  -----------------------------------------------------------------------

CONFIDENTIAL --- Marketeq Internal Engineering Documentation \|
payout-service PS-27 \| v1.0
