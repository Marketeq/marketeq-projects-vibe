**[MARKETEQ PLATFORM --- BACKEND DOCUMENTATION]{.smallcaps}**

**payout-service**

PS-28 --- User Stories & Acceptance Criteria --- Payout Screens &
Features

  -----------------------------------------------------------------------
  **Property**        **Value**
  ------------------- ---------------------------------------------------
  **Document**        PS-28 --- User Stories & Acceptance Criteria ---
                      Payout Screens & Features

  **Version**         1.0

  **Story format**    As a \[contractor\], I want \[goal\], so that
                      \[reason\].

  **AC format**       Numbered, testable, unambiguous. Each AC maps to
                      one observable system behaviour.

  **Coverage**        6-step withdrawal, deposit schedules, all method
                      types, method management, split payouts, paused
                      payouts, payout history, upcoming payout, lifetime
                      stats.

  **Prerequisites**   PS-02 through PS-27
  -----------------------------------------------------------------------

# **1. Earnings Overview --- Direct Deposit Panel**

## **US-01 View available balance**

As a contractor, I want to see my available balance on the Earnings
overview, so that I know how much I can withdraw.

  ----------------------------------------------------------------------------
  **\#**   **Acceptance criterion**
  -------- -------------------------------------------------------------------
  **1**    The available balance displayed equals availableBalanceUSD minus
           reserveAmountUSD from GET /v1/earnings/balance.

  **2**    The balance is shown in the contractor\'s displayCurrency using the
           cached FX rate.

  **3**    A secondary label shows the raw USD amount when displayCurrency is
           not USD.

  **4**    The balance updates in real time when an Ably payout.completed
           event is received --- no page refresh required.

  **5**    While the balance is loading, a skeleton placeholder is shown in
           place of the amount.

  **6**    If the balance API returns a network error, the balance field shows
           \"---\" with a refresh icon. Tapping the icon retries the request.

  **7**    A balance of \$0.00 is displayed as \"\$0.00\" with no error
           styling.
  ----------------------------------------------------------------------------

## **US-02 View pending balance**

As a contractor, I want to see any balance that is pending settlement,
so that I understand why my available balance may be lower than
expected.

  ----------------------------------------------------------------------------
  **\#**   **Acceptance criterion**
  -------- -------------------------------------------------------------------
  **1**    A \"Pending\" badge is shown alongside the main balance when
           pendingBalanceUSD \> 0.

  **2**    The badge displays the pending amount in displayCurrency.

  **3**    The badge is hidden when pendingBalanceUSD is 0.

  **4**    Tapping the badge shows a tooltip: \"Funds from in-progress
           payouts. Available once settled.\"
  ----------------------------------------------------------------------------

## **US-03 Withdraw button enabled state**

As a contractor, I want the Withdraw button to be enabled only when I
can actually withdraw, so that I am not shown a flow that will
immediately fail.

  ----------------------------------------------------------------------------
  **\#**   **Acceptance criterion**
  -------- -------------------------------------------------------------------
  **1**    The Withdraw button is enabled when withdrawableUSD \>= 50.00.

  **2**    The Withdraw button is disabled when withdrawableUSD \< 50.00, with
           tooltip: \"You don\'t have any earnings to withdraw yet.\"

  **3**    The Withdraw button is disabled when pauseStatus.paused is true.

  **4**    The Withdraw button is disabled while the balance is loading.

  **5**    The button re-evaluates its state automatically when the Ably
           balance update event fires.
  ----------------------------------------------------------------------------

## **US-04 First-time user state**

As a new contractor with no balance and no methods, I want to see an
onboarding prompt, so that I know what to do next.

  ----------------------------------------------------------------------------
  **\#**   **Acceptance criterion**
  -------- -------------------------------------------------------------------
  **1**    When availableBalanceUSD = 0 and no deposit methods exist and no
           payout history exists, the balance panel is replaced by the
           first-time onboarding card.

  **2**    The onboarding card displays the headline \"Welcome to your
           earnings dashboard.\" and a \"Set up your payout method\" CTA.

  **3**    The CTA navigates to /settings/payouts.

  **4**    The onboarding card is not shown once the contractor has at least
           one deposit method or at least one completed contract.
  ----------------------------------------------------------------------------

# **2. Paused Payouts Banner**

## **US-05 Banner renders on pause condition**

As a contractor, I want to see a clear explanation when my payouts are
paused, so that I know why and what to do.

  ----------------------------------------------------------------------------
  **\#**   **Acceptance criterion**
  -------- -------------------------------------------------------------------
  **1**    The pause banner renders on the Earnings overview and Payouts tab
           whenever GET /v1/payouts/pause-status returns paused: true.

  **2**    The banner is not dismissible --- no close button is shown.

  **3**    The banner replaces any active promotional banner in the same slot.

  **4**    The banner displays the correct headline, body, and CTA for the
           active pause condition as specified in PS-26 §7.

  **5**    Conditions with OFAC_FLAG or ACCOUNT_SUSPENDED render a red banner.
           All other conditions render an amber banner.

  **6**    When multiple pause conditions are active, the highest-priority
           condition is displayed: OFAC_FLAG \> ACCOUNT_SUSPENDED \>
           REAUTH_REQUIRED \> DEACTIVATED \> NO_DEFAULT_METHOD.

  **7**    The banner disappears automatically when the next poll returns
           paused: false --- no page refresh required.

  **8**    The pause-status endpoint is polled every 30 seconds while any
           payout screen is mounted.
  ----------------------------------------------------------------------------

## **US-06 Reconnect expired OAuth method from banner**

As a contractor whose OAuth connection has expired, I want to reconnect
directly from the pause banner, so that I can resume payouts quickly.

  ----------------------------------------------------------------------------
  **\#**   **Acceptance criterion**
  -------- -------------------------------------------------------------------
  **1**    For DEFAULT_METHOD_REAUTH_REQUIRED, the banner CTA is \"Reconnect
           {providerName}\" where providerName is populated from the
           pause-status response.

  **2**    Tapping the CTA navigates to /settings/payouts?reauth={methodId}.

  **3**    After successful reconnection, the banner disappears on the next
           poll cycle (within 30 seconds).
  ----------------------------------------------------------------------------

# **3. Withdraw Funds --- 6-Step Modal**

## **US-07 Step 1 --- Select method and enter amount**

As a contractor, I want to select where to send my withdrawal and enter
an amount, so that I can initiate a payout.

  ----------------------------------------------------------------------------
  **\#**   **Acceptance criterion**
  -------- -------------------------------------------------------------------
  **1**    The method selector is populated from GET /v1/deposit-methods and
           shows only active, verified methods.

  **2**    The currently configured default method is pre-selected on modal
           open.

  **3**    The \"Withdraw full amount\" button sets the amount input to
           withdrawableUSD.

  **4**    The reserve amount is displayed below the balance: \"You have
           \${reserve} reserved.\"

  **5**    The Continue button is disabled until a method is selected and
           amount \>= 50.00.

  **6**    Entering an amount below \$50.00 shows an inline error below the
           field: \"Minimum withdrawal is \$50.00.\" The Continue button
           remains disabled.

  **7**    Entering an amount above withdrawableUSD shows an inline error:
           \"You can withdraw up to \${withdrawableUSD}.\" The Continue button
           remains disabled.

  **8**    Tapping Continue triggers POST /v1/payouts/validate. A loading
           spinner replaces the Continue button while the request is in
           flight.

  **9**    If validation returns an error, the error userMessage is shown in a
           red alert box at the top of the modal step. The amount and method
           remain editable.

  **10**   If the method list is empty, the modal shows a \"No verified
           methods\" state with an \"Add method\" CTA and cannot advance.
  ----------------------------------------------------------------------------

## **US-08 Step 2 --- KYC gate check**

As a contractor, I want KYC verification to be checked before I can
withdraw, so that my account is compliant before any payout is sent.

  ----------------------------------------------------------------------------
  **\#**   **Acceptance criterion**
  -------- -------------------------------------------------------------------
  **1**    GET /v1/kyc/gate-status is called when the contractor advances from
           Step 1.

  **2**    While the gate status is loading, the modal shows \"Verifying your
           account...\" with a spinner.

  **3**    If all tiers return blocksWithdrawal: false and
           firstPayoutHold.active: false, the modal advances silently to Step
           3 with no visible step 2 screen.

  **4**    If Tier 1 blocksWithdrawal is true, the modal closes and the Tier 1
           KYC intercept screen renders (PS-26 §5.1).

  **5**    If Tier 2 blocksWithdrawal is true, the modal closes and the
           appropriate Tier 2 intercept screen renders (PS-26 §5.2 or §5.3
           depending on contractor\'s country).

  **6**    If Tier 3 blocksWithdrawal is true, the modal closes and the Tier 3
           intercept screen renders (PS-26 §5.4).

  **7**    If firstPayoutHold.active is true, the modal closes and the
           first-payout hold intercept screen renders showing the
           holdReleasesAt date from the error metadata.

  **8**    If GET /v1/kyc/gate-status returns a 503 error, the modal displays
           an error message: \"We\'re unable to verify your account right now.
           Please try again in a few minutes.\" The modal does not advance.

  **9**    The KYC gate check is never skipped --- even if Step 1 validation
           passed, the gate check must complete successfully before Step 3 is
           shown.
  ----------------------------------------------------------------------------

## **US-09 Step 3 --- Review and confirm**

As a contractor, I want to review the withdrawal details before
confirming, so that I can verify the amount and destination before funds
are sent.

  ----------------------------------------------------------------------------
  **\#**   **Acceptance criterion**
  -------- -------------------------------------------------------------------
  **1**    Step 3 displays the selected method label, the withdrawal amount in
           both USD and displayCurrency, and the estimated arrival copy for
           the method type.

  **2**    ACH methods show: \"Usually arrives in 1--3 business days.\"
           PayPal, Wise, and Payoneer show: \"Usually same day.\" Crypto
           shows: \"Varies by network.\" Debit card shows: \"Usually
           instant.\"

  **3**    A client-side idempotency key (UUID v4) is generated when Step 3
           renders and attached to the POST /v1/payouts/initiate request.

  **4**    Tapping Confirm triggers POST /v1/payouts/initiate. The Confirm
           button shows a spinner and is disabled while the request is in
           flight.

  **5**    A 202 response advances the modal to Step 4.

  **6**    ERR_PAYOUT_HOLD_ACTIVE closes the modal and renders the hold
           intercept screen with the holdReleasesAt date.

  **7**    A 202 with status awaiting_edd advances to a \"payout under
           review\" terminal screen with EDD copy (PS-26 §9.2).

  **8**    Any other error displays the userMessage inline in the modal with a
           retry option.
  ----------------------------------------------------------------------------

## **US-10 Step 4 --- Awaiting magic link**

As a contractor, I want to confirm my withdrawal via a link in my email,
so that only I can authorise the payout.

  ----------------------------------------------------------------------------
  **\#**   **Acceptance criterion**
  -------- -------------------------------------------------------------------
  **1**    Step 4 displays instructions to check email, a 15-minute countdown
           timer, a \"Resend email\" link, and a \"Cancel withdrawal\" link.

  **2**    The countdown timer counts down from 15:00 in mm:ss format.

  **3**    GET /v1/payouts/{payoutRequestId}/status is polled every 5 seconds
           while Step 4 is visible.

  **4**    When the poll returns status: processing, the modal advances to
           Step 5 automatically with no user action.

  **5**    When the poll returns status: cancelled, the countdown expired
           state is shown: \"This link has expired.\" with a \"Start a new
           withdrawal\" CTA.

  **6**    When the poll returns status: failed, a failure message is shown
           with a \"Start a new withdrawal\" CTA.

  **7**    When the client-side 15-minute countdown reaches 0:00, the expired
           state is shown even if polling has not yet returned a cancelled
           status.

  **8**    Tapping \"Resend email\" calls POST
           /v1/payouts/{payoutRequestId}/resend-verification and shows a
           \"Email resent\" confirmation toast.

  **9**    The \"Resend email\" link is disabled after 3 uses. After 3 uses,
           it is replaced by a \"Start a new withdrawal\" link.

  **10**   Tapping \"Cancel withdrawal\" calls DELETE
           /v1/payouts/{payoutRequestId} and closes the modal, returning to
           the Earnings overview.

  **11**   Polling stops when the modal unmounts or when a terminal status
           (processing, cancelled, failed) is received.
  ----------------------------------------------------------------------------

## **US-11 Step 5 --- Magic link verification page**

As a contractor clicking the confirmation link in my email, I want to be
shown a clear confirmation that my withdrawal was approved, so that I
know the payout is in progress.

  ----------------------------------------------------------------------------
  **\#**   **Acceptance criterion**
  -------- -------------------------------------------------------------------
  **1**    The magic link page is a standalone page at /verify-payout, outside
           the main app shell.

  **2**    On page load, GET /v1/payouts/verify-magic-link is called with the
           token and payoutRequestId from the URL query string.

  **3**    While the verification request is in flight, the page shows a
           spinner with \"Verifying your confirmation...\"

  **4**    A 200 response renders a success screen showing the method label
           and amount, with a \"View your earnings\" CTA.

  **5**    ERR_MAGIC_LINK_EXPIRED renders an error page: \"This verification
           link has expired.\" with a \"Start a new withdrawal\" CTA
           navigating to /earnings.

  **6**    ERR_MAGIC_LINK_ALREADY_USED renders a neutral info page (not
           error-red): \"This link has already been used.\" with a \"View
           payout status\" CTA navigating to /earnings/history.

  **7**    ERR_MAGIC_LINK_INVALID renders an error page: \"This link isn\'t
           valid.\" with a \"Start a new withdrawal\" CTA.

  **8**    None of these pages display the raw token value, the
           payoutRequestId, or any internal error detail.
  ----------------------------------------------------------------------------

## **US-12 Step 6 --- Async payout completion notification**

As a contractor who has confirmed a withdrawal, I want to be notified
when my funds are sent, so that I know the payout completed
successfully.

  ----------------------------------------------------------------------------
  **\#**   **Acceptance criterion**
  -------- -------------------------------------------------------------------
  **1**    When the Ably payout.completed event fires, a toast notification
           appears: \"Your {methodLabel} payout of {amount} was sent.\"

  **2**    The balance context is automatically refreshed when the
           payout.completed event is received.

  **3**    The payout history list is automatically refreshed when the
           payout.completed event is received.

  **4**    When the Ably payout.failed event fires, a toast notification
           appears with the failureReason from the event payload.

  **5**    The balance context is refreshed on payout.failed (funds are
           returned to available balance).

  **6**    Toast notifications auto-dismiss after 8 seconds.
  ----------------------------------------------------------------------------

# **4. Deposit Schedule --- Setup and Editing**

## **US-13 View current schedule**

As a contractor, I want to see my current payout schedule settings, so
that I can understand when my next automatic payout will occur.

  ----------------------------------------------------------------------------
  **\#**   **Acceptance criterion**
  -------- -------------------------------------------------------------------
  **1**    Schedule settings are loaded from GET /v1/payouts/schedule on
           mount.

  **2**    The screen displays: frequency, threshold (if applicable), default
           method, reserve amount, split configuration (if enabled), and next
           execution date.

  **3**    While loading, skeleton placeholders replace the frequency
           selector, threshold input, and method selector.

  **4**    A 404 response (no schedule exists) shows the empty schedule state:
           \"Set up automatic payouts\" with a default frequency of WEEKLY
           pre-selected.

  **5**    An inactive schedule (isActive: false) shows the toggle in the Off
           position. All fields remain visible and editable.

  **6**    The nextExecutionAt date is shown as a formatted date string (e.g.
           \"Monday, 16 June 2025\"). It is not shown when isActive: false or
           when nextExecutionAt is null.

  **7**    For THRESHOLD schedules, the next execution date is replaced with:
           \"Next payout triggered when your balance reaches \${threshold}.\"
  ----------------------------------------------------------------------------

## **US-14 Configure schedule frequency**

As a contractor, I want to choose how often my earnings are paid out
automatically, so that I can match my cash flow needs.

  ----------------------------------------------------------------------------
  **\#**   **Acceptance criterion**
  -------- -------------------------------------------------------------------
  **1**    The frequency selector offers: Weekly, Bi-weekly, Monthly, and When
           balance reaches threshold.

  **2**    Selecting Bi-weekly reveals an anchor date picker. The anchor date
           determines which week the bi-weekly cycle starts.

  **3**    Selecting \"When balance reaches threshold\" reveals a threshold
           amount input and hides any date-based fields.

  **4**    The threshold amount input enforces a minimum of \$50.00 inline:
           \"Minimum threshold is \$50.00.\"

  **5**    Changing the frequency updates the nextExecutionAt preview in the
           UI before the user saves.

  **6**    PUT /v1/payouts/schedule is called when the user taps Save.

  **7**    The Save button shows a spinner and is disabled while the PUT
           request is in flight.

  **8**    A successful save shows a confirmation toast: \"Your schedule has
           been updated.\"

  **9**    A validation error (e.g. ERR_BELOW_SCHEDULE_MINIMUM) shows the
           userMessage inline above the Save button.
  ----------------------------------------------------------------------------

## **US-15 Configure reserve amount**

As a contractor, I want to keep a minimum balance in my account that is
excluded from automatic payouts, so that I always have a small buffer
available.

  ----------------------------------------------------------------------------
  **\#**   **Acceptance criterion**
  -------- -------------------------------------------------------------------
  **1**    The reserve amount input accepts values from \$0.00 to \$250.00.

  **2**    Entering a value above \$250.00 shows an inline error: \"Maximum
           reserve is \$250.00.\"

  **3**    Entering a value below \$0 is not permitted --- the field minimum
           is 0.

  **4**    Setting reserve to \$0.00 is valid and disables the reserve (all
           balance available for payout).

  **5**    The reserve amount is saved as part of PUT /v1/payouts/schedule.

  **6**    The balance panel on the Earnings overview updates to reflect the
           new reserve immediately after a successful save.
  ----------------------------------------------------------------------------

## **US-16 Toggle schedule on and off**

As a contractor, I want to temporarily pause my automatic schedule
without deleting it, so that I can re-enable it later with the same
settings.

  ----------------------------------------------------------------------------
  **\#**   **Acceptance criterion**
  -------- -------------------------------------------------------------------
  **1**    The schedule settings screen has an active/inactive toggle.

  **2**    Toggling off calls PATCH /v1/payouts/schedule/active with {
           isActive: false }.

  **3**    Toggling on calls PATCH /v1/payouts/schedule/active with {
           isActive: true }.

  **4**    When toggled off, the nextExecutionAt field is hidden.

  **5**    When toggled on, the nextExecutionAt field recalculates and
           displays.

  **6**    The toggle shows a loading state while the PATCH request is in
           flight.

  **7**    Toggling off does not delete the schedule or change any settings.
  ----------------------------------------------------------------------------

# **5. Split Payout Auto-Balance**

## **US-17 Enable split payouts**

As a contractor, I want to split my automatic payouts between two
accounts, so that I can direct portions of my earnings to different
destinations.

  ----------------------------------------------------------------------------
  **\#**   **Acceptance criterion**
  -------- -------------------------------------------------------------------
  **1**    The split payout toggle is only shown when
           FEATURE_SPLIT_PAYOUTS_ENABLED is true.

  **2**    Enabling the split toggle reveals a secondary method selector and
           two percentage inputs.

  **3**    The secondary method selector excludes the currently selected
           primary method.

  **4**    On first enable, primary defaults to 50% and secondary defaults to
           50%.

  **5**    Toggling split off then on resets the percentages to 50/50 --- the
           previous custom values are not restored.

  **6**    The Save button is disabled until a secondary method is selected
           and both percentages are valid.
  ----------------------------------------------------------------------------

## **US-18 Auto-balance split percentages**

As a contractor editing split percentages, I want the other field to
update automatically, so that both values always sum to 100% without
manual calculation.

  ----------------------------------------------------------------------------
  **\#**   **Acceptance criterion**
  -------- -------------------------------------------------------------------
  **1**    When the primary percentage input changes, the secondary input
           updates to (100 − primary) on every keystroke.

  **2**    When the secondary percentage input changes, the primary input
           updates to (100 − secondary) on every keystroke.

  **3**    The auto-calculation uses truncation to 2 decimal places, not
           rounding: 100 / 3 = 33.33, not 33.34.

  **4**    A live preview below the inputs shows the calculated amounts:
           \"\~\${primaryAmount} to {primaryLabel}, \~\${secondaryAmount} to
           {secondaryLabel}\" using the current withdrawableUSD.

  **5**    No API call is made during percentage editing --- calculation is
           purely client-side.

  **6**    On blur or save attempt, if the primary value is outside
           0.01--99.99, an inline error is shown: \"Each account must receive
           between 0.01% and 99.99%.\"

  **7**    The save API receives only primarySplitPercent. The secondary is
           always derived server-side.
  ----------------------------------------------------------------------------

## **US-19 Split method validation**

As a contractor configuring a split, I want to be prevented from
selecting the same method for both primary and secondary, so that a
valid split is always configured.

  ----------------------------------------------------------------------------
  **\#**   **Acceptance criterion**
  -------- -------------------------------------------------------------------
  **1**    The secondary method dropdown excludes the method currently
           selected as primary.

  **2**    If the primary method is changed to match the current secondary
           method, the secondary resets to unselected.

  **3**    Attempting to save with primary and secondary set to the same
           method (via a direct API call) returns ERR_SPLIT_SAME_METHOD.

  **4**    Attempting to save with splitEnabled: true but no secondaryMethodId
           returns ERR_SPLIT_NO_SECONDARY_METHOD.
  ----------------------------------------------------------------------------

# **6. Adding Deposit Methods**

## **US-20 View available method types**

As a contractor, I want to see which payout methods I can add, so that I
can choose the right option for my situation.

  ----------------------------------------------------------------------------
  **\#**   **Acceptance criterion**
  -------- -------------------------------------------------------------------
  **1**    The method type selector is populated from GET
           /v1/deposit-methods/available-types.

  **2**    Method types with available: false are hidden from the selector.

  **3**    The debit card option is visible but disabled with a lock icon and
           tooltip when the contractor is not US-based.

  **4**    The method count is displayed: \"X of 5 methods used.\"

  **5**    When the contractor already has 5 active methods, the \"Add
           method\" entry point is disabled with tooltip: \"You\'ve reached
           the maximum of 5 payout methods.\"
  ----------------------------------------------------------------------------

## **US-21 Add bank via Stripe Financial Connections**

As a contractor, I want to link my bank account using instant
verification, so that I can start withdrawing immediately without
waiting for micro-deposits.

  ----------------------------------------------------------------------------
  **\#**   **Acceptance criterion**
  -------- -------------------------------------------------------------------
  **1**    Selecting \"Bank account (instant verify)\" calls POST
           /v1/deposit-methods/stripe-link-session and launches the Stripe
           Financial Connections modal.

  **2**    A spinner with \"Connecting to your bank...\" is shown while the
           session is initialising.

  **3**    If the contractor dismisses the Stripe modal without selecting a
           bank, they are returned to the method type selector silently.

  **4**    If the Stripe session expires (\> 30 minutes idle), the error
           message is: \"Your session timed out. Please try again.\" A \"Try
           again\" CTA reinitialises the session.

  **5**    On successful bank link, POST /v1/deposit-methods is called with
           the financialConnectionsAccountId.

  **6**    A success screen shows the bank name and last 4 digits, with a
           \"Set as default\" toggle if no default method exists.

  **7**    ERR_DEPOSIT_METHOD_LIMIT_REACHED shows inline: \"You\'ve reached
           the maximum of 5 payout methods.\"
  ----------------------------------------------------------------------------

## **US-22 Add bank via manual entry**

As a contractor, I want to enter my bank details manually, so that I can
add an account that is not supported by instant bank linking.

  ----------------------------------------------------------------------------
  **\#**   **Acceptance criterion**
  -------- -------------------------------------------------------------------
  **1**    The manual bank entry form shows the correct fields for the
           contractor\'s country as defined in PS-07.

  **2**    US contractors see: account holder name, routing number (9 digits),
           account number (4--17 digits), account type.

  **3**    UK contractors see: account holder name, sort code (6 digits),
           account number (8 digits).

  **4**    EU/SEPA contractors see: account holder name, IBAN, SWIFT/BIC.

  **5**    India contractors see: account holder name, account number, IFSC
           code.

  **6**    Australia contractors see: account holder name, BSB, account
           number.

  **7**    Routing number is validated against the ABA checksum algorithm
           before submission.

  **8**    IBAN is validated against the ISO 13616 check digit algorithm
           before submission.

  **9**    Backend field validation errors (e.g. ERR_INVALID_ROUTING_NUMBER)
           are shown inline below the affected field.

  **10**   On successful POST /v1/deposit-methods, the screen shows: \"Bank
           added. We\'ve sent two small test deposits to verify your
           account.\" and navigates to the micro-deposit pending state.
  ----------------------------------------------------------------------------

## **US-23 Add PayPal, Wise, or Payoneer**

As a contractor, I want to connect my PayPal, Wise, or Payoneer account,
so that I can receive payouts directly to those accounts.

  ----------------------------------------------------------------------------
  **\#**   **Acceptance criterion**
  -------- -------------------------------------------------------------------
  **1**    Selecting a provider triggers GET /v1/oauth/{provider}/connect and
           redirects the browser to the returned redirectUrl.

  **2**    A spinner with \"Redirecting to {providerName}...\" is shown
           briefly before the redirect.

  **3**    On successful OAuth completion, the browser is redirected to
           /settings/payouts?connected={provider}.

  **4**    The connected query param triggers a success toast:
           \"{providerName} connected successfully.\"

  **5**    GET /v1/deposit-methods is refetched after the redirect to display
           the new method in the list.

  **6**    If the OAuth state has expired (error=state_expired in the callback
           URL), the error message is: \"Your {providerName} connection timed
           out. Please try again.\"

  **7**    If the contractor cancels at the provider (error=access_denied),
           they are returned to the method selector silently with no error
           shown.
  ----------------------------------------------------------------------------

## **US-24 Add crypto wallet --- paste address**

As a contractor, I want to add my crypto wallet by pasting the address,
so that I can receive earnings in cryptocurrency.

  ----------------------------------------------------------------------------
  **\#**   **Acceptance criterion**
  -------- -------------------------------------------------------------------
  **1**    The contractor selects a network from the supported network
           dropdown before entering an address.

  **2**    The address field validates the format for the selected network on
           every keystroke (frontend regex check).

  **3**    An invalid address shows inline: \"This doesn\'t look like a valid
           {network} address.\"

  **4**    The Submit button is disabled while the address is invalid.

  **5**    POST /v1/deposit-methods is called on submit with the network and
           walletAddress.

  **6**    ERR_CRYPTO_ADDRESS_INVALID from the backend (e.g. checksum failure)
           shows the error inline below the address field.

  **7**    ERR_CRYPTO_NETWORK_UNSUPPORTED shows a toast: \"We don\'t support
           payouts to {network} yet.\"

  **8**    On success, a confirmation screen shows the truncated wallet
           address and the network.
  ----------------------------------------------------------------------------

## **US-25 Add crypto wallet --- WalletConnect**

As a contractor, I want to connect my wallet using WalletConnect, so
that I can add a wallet without copying and pasting an address.

  ----------------------------------------------------------------------------
  **\#**   **Acceptance criterion**
  -------- -------------------------------------------------------------------
  **1**    Selecting WalletConnect calls POST /v1/walletconnect/session and
           renders a QR code with a 5-minute countdown timer.

  **2**    The countdown timer displays mm:ss format and decrements in real
           time.

  **3**    GET /v1/walletconnect/session/{sessionId} is polled every 3 seconds
           after the QR is displayed.

  **4**    When the poll returns status: confirmed, the screen shows
           \"Connected: {truncated address}\" and a \"Save this wallet\" CTA.

  **5**    When the countdown reaches 0:00 or the poll returns status:
           expired, the QR is greyed out and a \"Generate new code\" CTA
           appears. Tapping it calls POST /v1/walletconnect/session again.

  **6**    When the poll returns status: rejected (user declined in wallet
           app), the screen shows \"Connection declined.\" with a \"Try
           again\" CTA.

  **7**    POST /v1/deposit-methods is called with the confirmed wallet
           address after the contractor taps \"Save this wallet.\"
  ----------------------------------------------------------------------------

## **US-26 Request Marketeq debit card**

As a US contractor, I want to request a Marketeq Visa debit card, so
that I can access my earnings instantly at point of sale.

  ----------------------------------------------------------------------------
  **\#**   **Acceptance criterion**
  -------- -------------------------------------------------------------------
  **1**    The debit card option is only available when
           FEATURE_DEBIT_CARD_ENABLED is true.

  **2**    GET /v1/deposit-methods/debit-card/eligibility is called before
           displaying the card request flow. If eligible: false with reason
           GEO_UNAVAILABLE, the option is shown as disabled with: \"The
           Marketeq card is currently available to US contractors only.\"

  **3**    If reason is ALREADY_EXISTS, the option is hidden and the existing
           card management screen is shown.

  **4**    If reason is KYC_REQUIRED, the KYC intercept screen is shown (card
           context variant --- PS-26 §8).

  **5**    The card type selection screen offers Virtual (instant) and
           Physical (7--14 business days) with descriptions of each.

  **6**    Proceeding requires the contractor to accept the card programme
           terms via a scrollable terms block with a checkbox.

  **7**    POST /v1/deposit-methods/debit-card/request is called after terms
           acceptance.

  **8**    Virtual card: the success screen shows the full card number,
           expiry, and CVV via Stripe Elements iframe with a security note:
           \"This is the only time your full card number will be shown.\"

  **9**    Physical card: the success screen shows an order confirmation and
           estimated delivery range.
  ----------------------------------------------------------------------------

## **US-27 Activate debit card**

As a contractor who has received a physical Marketeq card, I want to
activate it, so that I can use it for purchases.

  ----------------------------------------------------------------------------
  **\#**   **Acceptance criterion**
  -------- -------------------------------------------------------------------
  **1**    The activation screen displays two inputs: last 4 digits of the
           card and CVV.

  **2**    POST /v1/deposit-methods/debit-card/activate is called on submit.

  **3**    ERR_CARD_ACTIVATION_MISMATCH shows: \"The card details you entered
           don\'t match. Please check and try again.\" The remaining attempt
           count is shown after the second failure.

  **4**    ERR_CARD_ALREADY_ACTIVE shows: \"Your card is already active.\"

  **5**    On success, the card management screen is shown with an Active
           status badge.
  ----------------------------------------------------------------------------

# **7. Deposit Method Management**

## **US-28 View method list**

As a contractor, I want to see all my connected payout methods in one
place, so that I can review and manage them.

  ----------------------------------------------------------------------------
  **\#**   **Acceptance criterion**
  -------- -------------------------------------------------------------------
  **1**    GET /v1/deposit-methods is called on mount and on return from any
           add-method flow.

  **2**    Each method displays: provider icon, label (e.g. \"Chase Bank
           (\...4521)\"), type badge, status badge, and action menu.

  **3**    VERIFIED methods show a green \"Verified\" badge (or no badge ---
           default is verified).

  **4**    PENDING methods show an amber \"Verification pending\" badge and a
           \"Verify now\" CTA.

  **5**    FAILED methods show a red \"Verification failed\" badge and a \"Try
           again\" CTA.

  **6**    Methods with reauthRequired: true show an amber \"Reconnect\" badge
           and a reconnect CTA.

  **7**    The default method shows a blue \"Default\" badge. The \"Set as
           default\" action is hidden for the default method.

  **8**    Methods participating in a split show their split role and
           percentage: \"60% to this account (Primary)\".

  **9**    While the list is loading, skeleton rows are shown.

  **10**   If no methods exist, the empty state from PS-26 §2.1 is shown.
  ----------------------------------------------------------------------------

## **US-29 Set default method**

As a contractor, I want to designate one method as my default payout
method, so that manual withdrawals and schedules use it automatically.

  ----------------------------------------------------------------------------
  **\#**   **Acceptance criterion**
  -------- -------------------------------------------------------------------
  **1**    Tapping \"Set as default\" on a method calls PATCH
           /v1/deposit-methods/{methodId}/default.

  **2**    The previously default method\'s \"Default\" badge is removed
           immediately on success.

  **3**    The new default method\'s \"Default\" badge appears immediately on
           success.

  **4**    If the method being set as default has reauthRequired: true, the
           action is blocked with: \"Reconnect this account before setting it
           as default.\"

  **5**    If the method is PENDING verification, the action is blocked with:
           \"Verify this account before setting it as default.\"
  ----------------------------------------------------------------------------

## **US-30 Remove a deposit method**

As a contractor, I want to remove a payout method I no longer use, so
that my method list stays clean.

  ----------------------------------------------------------------------------
  **\#**   **Acceptance criterion**
  -------- -------------------------------------------------------------------
  **1**    Tapping the delete icon on a method shows a confirmation dialog:
           \"Remove {methodLabel}? This cannot be undone.\"

  **2**    Confirming calls DELETE /v1/deposit-methods/{methodId}.

  **3**    On success, the method is removed from the list without a page
           reload.

  **4**    ERR_CANNOT_REMOVE_ONLY_METHOD shows a toast: \"You must have at
           least one payout method.\" The method is not removed.

  **5**    ERR_CANNOT_REMOVE_DEFAULT_WITH_SPLIT shows a confirmation dialog:
           \"Removing this method will turn off your split payouts. All future
           payouts will go to your next default method.\" The contractor must
           confirm to proceed.

  **6**    When the contractor has only one method, the delete icon is
           disabled with tooltip: \"Add another method before removing this
           one.\"

  **7**    Removing a method that is not the default does not affect schedule
           or split configuration for other methods.
  ----------------------------------------------------------------------------

## **US-31 Reconnect an expired OAuth method**

As a contractor whose OAuth connection has expired, I want to reconnect
it from the method list, so that my payouts resume.

  ----------------------------------------------------------------------------
  **\#**   **Acceptance criterion**
  -------- -------------------------------------------------------------------
  **1**    Methods with reauthRequired: true display a \"Reconnect\" CTA.

  **2**    Tapping Reconnect calls PATCH
           /v1/deposit-methods/{methodId}/reconnect which returns a new OAuth
           redirect URL.

  **3**    The browser redirects to the provider OAuth flow.

  **4**    On successful reconnection, the reauthRequired badge is removed
           from the method.

  **5**    The pause condition (DEFAULT_METHOD_REAUTH_REQUIRED) clears and the
           pause banner disappears on the next poll cycle.
  ----------------------------------------------------------------------------

## **US-32 Manage debit card**

As a contractor with an active Marketeq debit card, I want to freeze,
report, or cancel it, so that I have full control over my card.

  ----------------------------------------------------------------------------
  **\#**   **Acceptance criterion**
  -------- -------------------------------------------------------------------
  **1**    The card management screen shows: card visual, status badge (Active
           / Frozen / Cancelled), current card balance, and action buttons.

  **2**    Tapping the Freeze toggle shows a confirm dialog: \"Freeze your
           card? You won\'t be able to use it for purchases until you unfreeze
           it.\"

  **3**    Confirming freeze calls PATCH
           /v1/deposit-methods/{methodId}/card-status with { frozen: true }.
           The status badge updates to \"Frozen.\"

  **4**    Tapping Unfreeze requires no confirmation. PATCH is called with {
           frozen: false }. The badge updates to \"Active.\"

  **5**    Tapping \"Report lost or stolen\" shows a dialog explaining the
           current card will be cancelled and a replacement will be ordered.
           Confirming calls POST
           /v1/deposit-methods/{methodId}/report-lost-stolen.

  **6**    Tapping \"Cancel card\" shows a destructive confirmation dialog
           requiring the contractor to type \"CANCEL\". Confirming calls
           DELETE /v1/deposit-methods/{methodId}. A toast confirms: \"Your
           card has been cancelled and your balance has been returned to your
           earnings.\"

  **7**    A frozen card cannot receive payouts --- withdrawals to it return
           ERR_CARD_FROZEN with the message: \"Your card is frozen and can\'t
           receive payouts. Unfreeze your card first.\"
  ----------------------------------------------------------------------------

# **8. Payout History**

## **US-33 View payout history list**

As a contractor, I want to see a list of all my past payouts, so that I
can track my earnings disbursements.

  ----------------------------------------------------------------------------
  **\#**   **Acceptance criterion**
  -------- -------------------------------------------------------------------
  **1**    GET /v1/payouts/history is called on mount with page=1&limit=20.

  **2**    Each history item shows: payout amount (in displayCurrency with USD
           secondary), method label, status badge, and date.

  **3**    Status badges: \"Sent\" (green) for completed, \"Processing\"
           (blue) for processing, \"Failed\" (red) for failed, \"Under
           review\" (amber) for awaiting_edd, \"On hold\" (blue) for
           awaiting_hold, \"Confirming\" (grey) for awaiting_verification.

  **4**    Tapping a history item opens a detail modal with: full amount,
           method, external transaction ID, failure reason (if failed), and
           arrival date (if completed).

  **5**    The list supports infinite scroll or \"Load more\" pagination. When
           page \> 1 is loading, a spinner is shown below the existing items.

  **6**    The Ably payout.completed event triggers GET /v1/payouts/history to
           refetch page 1, refreshing the top of the list.

  **7**    When no history exists, the empty state from PS-26 §2.2 is shown.

  **8**    A network error shows: \"Couldn\'t load your payout history. Tap to
           retry.\"
  ----------------------------------------------------------------------------

## **US-34 Filter payout history by date range**

As a contractor, I want to filter my payout history by date range, so
that I can find payouts from a specific period.

  ----------------------------------------------------------------------------
  **\#**   **Acceptance criterion**
  -------- -------------------------------------------------------------------
  **1**    A date range filter (from/to) is available above the history list.

  **2**    Applying a filter calls GET
           /v1/payouts/history?from={iso}&to={iso}.

  **3**    While the filtered results load, the list shows a loading state.

  **4**    When the filtered results return empty, the filtered empty state
           from PS-26 §2.5 is shown: \"No transactions found.\" with a \"Clear
           filter\" CTA.

  **5**    \"Clear filter\" resets to the default view (all history or last 90
           days).

  **6**    The filtered empty state is visually distinct from the
           no-history-ever empty state.
  ----------------------------------------------------------------------------

## **US-35 View payout detail**

As a contractor, I want to see full details of a specific payout, so
that I can reconcile it or understand why it failed.

  ----------------------------------------------------------------------------
  **\#**   **Acceptance criterion**
  -------- -------------------------------------------------------------------
  **1**    Tapping a payout history item calls GET
           /v1/payouts/{payoutRequestId}.

  **2**    The detail view shows: amount, displayCurrency equivalent, method
           label, status, initiated date, settled date (if applicable),
           external transaction ID (if applicable), and failure reason (if
           failed).

  **3**    For failed payouts, the failure reason is shown in plain English
           from failureReason --- not the raw ERR\_ code.

  **4**    For awaiting_edd payouts, the copy from PS-26 §9.2 is shown with
           estimated review time.

  **5**    For awaiting_hold (first-payout hold) payouts, the release date is
           shown as a formatted date string.

  **6**    The external transaction ID for crypto payouts is shown as a
           truncated hash with a \"Copy\" icon and a \"View on explorer\"
           link.
  ----------------------------------------------------------------------------

# **9. Upcoming Payout Display**

## **US-36 View next scheduled payout**

As a contractor with an active payout schedule, I want to see when my
next automatic payout will occur, so that I can plan my finances.

  ----------------------------------------------------------------------------
  **\#**   **Acceptance criterion**
  -------- -------------------------------------------------------------------
  **1**    The \"Next payout\" widget on the Earnings overview is populated
           from GET /v1/payouts/schedule.

  **2**    The widget shows: frequency label (e.g. \"Weekly\"), next execution
           date (formatted as \"Monday, 16 June\"), and estimated amount based
           on current withdrawableUSD.

  **3**    For THRESHOLD schedules, the estimated amount is shown as a range:
           \"Paid out when your balance reaches \${threshold}.\"

  **4**    When isActive is false, the widget shows: \"Your schedule is
           paused.\" with a \"Resume schedule\" CTA.

  **5**    When no schedule exists (404), the widget shows the empty state
           from PS-26 §2.3 with a \"Set up schedule\" CTA.

  **6**    The widget does not show when payouts are paused
           (pauseStatus.paused: true) --- the pause banner takes its place.
  ----------------------------------------------------------------------------

## **US-37 Upcoming payout amount preview**

As a contractor, I want to see how much will be paid out on my next
scheduled date, so that I know what to expect.

  ----------------------------------------------------------------------------
  **\#**   **Acceptance criterion**
  -------- -------------------------------------------------------------------
  **1**    The estimated payout amount shown in the \"Next payout\" widget
           equals withdrawableUSD (balance minus reserve).

  **2**    The estimate is clearly labelled as approximate: \"\~\${estimate}\"
           or \"Est. \${estimate}\".

  **3**    The estimate updates in real time when the balance context is
           refreshed.

  **4**    When withdrawableUSD is below the schedule minimum threshold, the
           widget shows: \"Your current balance of \${balance} is below your
           minimum threshold of \${threshold}. No payout will be sent unless
           your balance increases.\"
  ----------------------------------------------------------------------------

# **10. Lifetime Stats**

## **US-38 View lifetime earnings summary**

As a contractor, I want to see a summary of my total lifetime earnings
and payouts, so that I can see my overall earnings on the platform.

  ----------------------------------------------------------------------------
  **\#**   **Acceptance criterion**
  -------- -------------------------------------------------------------------
  **1**    Lifetime stats are loaded from GET /v1/earnings/stats on mount.

  **2**    The stats panel displays: total earnings (all time), total paid out
           (all time), and total pending.

  **3**    Stats are shown in displayCurrency with the USD equivalent as a
           secondary label.

  **4**    While loading, skeleton placeholders replace each stat value.

  **5**    If the stats endpoint returns an error, stat fields show \"---\"
           with a retry icon.

  **6**    Lifetime stats do not update in real time via Ably --- they are
           refreshed on page load only. A manual refresh icon is provided.
  ----------------------------------------------------------------------------

## **US-39 View year-to-date earnings**

As a contractor, I want to see my earnings for the current calendar
year, so that I can estimate my tax liability.

  ----------------------------------------------------------------------------
  **\#**   **Acceptance criterion**
  -------- -------------------------------------------------------------------
  **1**    YTD earnings are included in the GET /v1/earnings/stats response as
           ytdEarningsUSD.

  **2**    The YTD figure is displayed with the current tax year label: \"2025
           earnings to date.\"

  **3**    A note is shown when ytdEarningsUSD \>= 500: \"You may receive a
           1099-NEC form for this tax year. Ensure your tax information is up
           to date.\" --- linking to the tax settings screen.

  **4**    The note is not shown for non-US contractors.

  **5**    YTD earnings are gross earnings (before Marketeq\'s platform fee)
           or net earnings as defined by the earnings-service contract ---
           whichever the earnings-service returns. The label must match:
           \"Gross earnings\" or \"Net earnings\" as returned.
  ----------------------------------------------------------------------------

# **11. KYC Intercept Screens**

## **US-40 KYC Tier 1 intercept**

As a contractor who has not yet verified my identity, I want to be shown
a clear prompt with instructions, so that I can complete verification
and return to my withdrawal.

  ----------------------------------------------------------------------------
  **\#**   **Acceptance criterion**
  -------- -------------------------------------------------------------------
  **1**    When KYC Tier 1 blocks withdrawal, the withdrawal modal closes and
           the Tier 1 intercept screen renders as a full-screen state.

  **2**    The screen shows the headline, body, and estimated time copy from
           PS-26 §5.1.

  **3**    The primary CTA \"Verify my identity\" navigates to the identity
           verification flow.

  **4**    \"Do this later\" returns the contractor to the Earnings overview.
           The withdrawal they had started is discarded.

  **5**    If Tier 1 status is pending (verification submitted but not
           reviewed), the \"Verify\" CTA is replaced by an informational
           message: \"Your identity verification is in progress. We\'ll notify
           you once it\'s complete.\"

  **6**    If Tier 1 status is failed, the screen shows the failed variant
           with a \"Try again\" CTA and a \"Contact support\" secondary CTA.
  ----------------------------------------------------------------------------

## **US-41 KYC Tier 2 intercept --- US**

As a US contractor who has not provided tax information, I want to be
prompted to add it, so that Marketeq can issue my 1099-NEC.

  ----------------------------------------------------------------------------
  **\#**   **Acceptance criterion**
  -------- -------------------------------------------------------------------
  **1**    When Tier 2 blocks withdrawal for a US contractor, the intercept
           screen from PS-26 §5.2 renders.

  **2**    \"Add tax information\" CTA navigates to the SSN/ITIN entry form.

  **3**    If subReason is TIN_MISMATCH, the screen shows: \"The tax ID you
           provided doesn\'t match IRS records. Please re-enter your SSN or
           ITIN carefully.\" CTA: \"Update tax information.\"

  **4**    \"Do this later\" returns to the Earnings overview.
  ----------------------------------------------------------------------------

## **US-42 KYC Tier 2 intercept --- International**

As an international contractor who has not completed W-8BEN
certification, I want to be prompted to complete it, so that my payments
comply with US tax law.

  ----------------------------------------------------------------------------
  **\#**   **Acceptance criterion**
  -------- -------------------------------------------------------------------
  **1**    When Tier 2 blocks withdrawal for a non-US contractor, the
           intercept screen from PS-26 §5.3 renders.

  **2**    \"Complete W-8BEN\" CTA navigates to the W-8BEN form.

  **3**    If subReason is W8BEN_EXPIRED, the screen shows: \"Your W-8BEN tax
           certification has expired. Please complete a new form to continue
           withdrawing.\" CTA: \"Renew W-8BEN.\"

  **4**    The tax treaty note is shown below the CTA: \"If your country has a
           US tax treaty, you may qualify for a reduced withholding rate.\"

  **5**    \"Do this later\" returns to the Earnings overview.
  ----------------------------------------------------------------------------

## **US-43 KYC Tier 3 intercept --- bank account ownership**

As a contractor with an unverified bank account, I want to be guided to
complete micro-deposit verification, so that I can withdraw to that
account.

  ----------------------------------------------------------------------------
  **\#**   **Acceptance criterion**
  -------- -------------------------------------------------------------------
  **1**    When Tier 3 blocks withdrawal for a specific deposit method, the
           intercept screen from PS-26 §5.4 renders with the bank\'s last 4
           digits in the body copy.

  **2**    \"Enter deposit amounts\" CTA navigates to the micro-deposit
           verification screen.

  **3**    When micro-deposits have not yet arrived, the primary CTA changes
           to \"Remind me by email\" and a secondary CTA \"Use a different
           method\" is shown.

  **4**    \"Use a different method\" returns to the withdrawal modal Step 1
           with the unverified method greyed out.

  **5**    \"Do this later\" returns to the Earnings overview.
  ----------------------------------------------------------------------------

# **12. Non-Functional Acceptance Criteria**

## **US-44 Loading state timing**

As a contractor using the payout features, I want loading states to
appear only when an operation actually takes time, so that I do not see
unnecessary flickers.

  ----------------------------------------------------------------------------
  **\#**   **Acceptance criterion**
  -------- -------------------------------------------------------------------
  **1**    Loading spinners and skeleton states are shown only if the
           corresponding API request has not returned within 300ms.

  **2**    If a request completes in under 300ms, no loading state is
           displayed --- the result renders directly.

  **3**    The 300ms delay is implemented using a debounced timeout that is
           cancelled if the response arrives first.
  ----------------------------------------------------------------------------

## **US-45 Error messages never expose internal detail**

As a contractor, I want all error messages to be written in plain
English, so that I am never shown a technical error code or stack trace.

  ----------------------------------------------------------------------------
  **\#**   **Acceptance criterion**
  -------- -------------------------------------------------------------------
  **1**    No UI component ever renders a raw ERR\_ error code visible to the
           contractor.

  **2**    No UI component ever renders an HTTP status code visible to the
           contractor.

  **3**    All contractor-visible error messages use the userMessage field
           from the API error response.

  **4**    Internal failureCodes in payout history detail views are mapped to
           plain English descriptions before display.

  **5**    The raw token value is never rendered on any payout screen.
  ----------------------------------------------------------------------------

## **US-46 Ably channel teardown**

As a contractor navigating away from payout screens, I want the
real-time channel to be cleaned up, so that my connection is not kept
alive unnecessarily.

  ----------------------------------------------------------------------------
  **\#**   **Acceptance criterion**
  -------- -------------------------------------------------------------------
  **1**    The Ably channel subscription is established when the first
           payout-related screen mounts.

  **2**    The Ably channel subscription is released when the last
           payout-related screen unmounts.

  **3**    Balance context polling (pause-status every 30s) stops when no
           payout screen is mounted.

  **4**    Magic link status polling (every 5s in Step 4) stops when the
           withdrawal modal unmounts.
  ----------------------------------------------------------------------------

CONFIDENTIAL --- Marketeq Internal Engineering Documentation \|
payout-service PS-28 \| v1.0
