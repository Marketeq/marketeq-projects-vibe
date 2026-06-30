**AC-OS --- Offer Service**

**Acceptance Criteria**

**Service:** offer-service **References:** US-OS-01 through US-OS-56,
Design Screens **Applies to all contract types:** Project, Service,
Team, Contract (Individual)

  -----------------------------------------------------------------------
  **AC-OS-01 Hire Me Modal --- Entry Point** (US-OS-01)

  -----------------------------------------------------------------------

  ----------- ---------------- -----------------------------------------------------
  **AC#**     **Category**     **Acceptance Criterion**

  **01.01**   **PERMISSION**   Only a logged-in user with the role of client may
                               initiate the Hire Me flow. Unauthenticated requests
                               to POST /v1/offers must return 401. Talent role
                               requests must return 403.

  **01.02**   **SYSTEM**       Clicking Hire Me opens the modal without navigating
                               away from the talent profile page.

  **01.03**   **SYSTEM**       The modal header displays the talent\'s avatar, name,
                               role title, years of experience, and location exactly
                               as stored on their profile.

  **01.04**   **SYSTEM**       Any previously sent pending invites to this talent
                               are shown as avatar chips in the modal header, one
                               chip per pending invite.

  **01.05**   **EMPTY STATE**  If no pending invites exist for this talent, the
                               avatar chip area is not rendered --- it does not show
                               an empty row or placeholder.

  **01.06**   **SYSTEM**       The modal presents two entry paths: \"Invite to a new
                               contract\" and \"Add to an existing contract\". Both
                               options must be visible simultaneously.

  **01.07**   **VALIDATION**   The Send Offer button is disabled until all required
                               fields (rate, duration, schedule, start date) are
                               populated. It must not be clickable in a disabled
                               state.

  **01.08**   **SYSTEM**       The modal can be closed at any point via the X button
                               without creating any offer record.
  ----------- ---------------- -----------------------------------------------------

  -----------------------------------------------------------------------
  **AC-OS-02 Contract Selection --- New vs Existing** (US-OS-02,
  US-OS-03)

  -----------------------------------------------------------------------

  ----------- ---------------- -----------------------------------------------------
  **AC#**     **Category**     **Acceptance Criterion**

  **02.01**   **SYSTEM**       Selecting \"Add to an existing contract\" shows a
                               searchable list of the client\'s existing active
                               contracts. Closed, cancelled, or disputed contracts
                               must not appear.

  **02.02**   **SYSTEM**       Each contract row in the list displays: contract
                               name, phase label if applicable (e.g. Design Phase),
                               and overlapping team member avatars with an overflow
                               count (e.g. +5) if more than 5 members exist.

  **02.03**   **EMPTY STATE**  If the client has no active existing contracts, the
                               \"Add to an existing contract\" option is still shown
                               but the list displays an empty state message. The
                               \"Invite to a new contract\" path must remain
                               available.

  **02.04**   **VALIDATION**   The client must select a contract from the list
                               before the offer form renders. Submitting without a
                               selection must not create an offer record.

  **02.05**   **SYSTEM**       Selecting \"Invite to a new contract\" presents the
                               offer creation form without any pre-selected contract
                               context.

  **02.06**   **SYSTEM**       The contract title field is required for no-scope
                               contract types (Service Ongoing, Team, Individual).
                               For scoped projects the title is inherited from the
                               project name and the field may be pre-populated.

  **02.07**   **VALIDATION**   The contract title field must not accept an empty
                               string or whitespace-only input. Validation error
                               shown on submission attempt if blank. Contract titles
                               must be unique per client across ALL contracts
                               regardless of status --- including PENDING, ACTIVE,
                               CANCELLED, COMPLETED, and EXPIRED. Enforced by
                               contracts-service at offer acceptance.
  ----------- ---------------- -----------------------------------------------------

  -----------------------------------------------------------------------
  **AC-OS-03 Rate Input & Validation** (US-OS-04, US-OS-05)

  -----------------------------------------------------------------------

  ----------- ---------------- -----------------------------------------------------
  **AC#**     **Category**     **Acceptance Criterion**

  **03.01**   **SYSTEM**       The rate selector renders preset options sourced from
                               the job listing service types associated with this
                               offer context (e.g. Logo Design \$45/hr, Web
                               Development \$70/hr, UX/UI Design \$85/hr).

  **03.02**   **SYSTEM**       A Custom Rate option is always present as the last
                               item in the rate selector.

  **03.03**   **SYSTEM**       Selecting a preset rate immediately marks it as
                               selected and displays it on the form.

  **03.04**   **SYSTEM**       Selecting Custom Rate renders an inline text input
                               field. A Cancel link is also rendered to dismiss the
                               custom input and return to preset selection.

  **03.05**   **VALIDATION**   Custom rate input must be a positive numeric value
                               greater than zero. Zero, negative values, and
                               non-numeric input must be rejected with an inline
                               error.

  **03.06**   **VALIDATION**   Custom rate input must not accept currency symbols
                               (\$, €, etc.) as part of the value --- numeric only.

  **03.07**   **VALIDATION**   Rate is a required field. The Send Offer / Submit
                               button must remain disabled if no rate is selected or
                               entered.

  **03.08**   **SYSTEM**       Only one rate option can be selected at a time.
                               Selecting a new preset deselects any previously
                               selected value including a previously entered custom
                               rate.

  **03.09**   **EDGE CASE**    If the client cancels out of custom rate entry
                               without entering a value and no preset is selected,
                               the rate field returns to its unselected state and
                               the Send Offer button remains disabled.
  ----------- ---------------- -----------------------------------------------------

  -----------------------------------------------------------------------
  **AC-OS-04 Contract Duration Input & Validation** (US-OS-06, US-OS-07)

  -----------------------------------------------------------------------

  ----------- ---------------- -----------------------------------------------------
  **AC#**     **Category**     **Acceptance Criterion**

  **04.01**   **SYSTEM**       Duration selector offers exactly these preset
                               options: 3 Months, 6 Months, 1 Year, 18 Months, 2
                               Years, Ongoing, and Custom Duration.

  **04.02**   **SYSTEM**       Selecting Custom Duration renders an inline input for
                               a numeric value and a unit selector (Months / Years).
                               A Cancel link is rendered to dismiss.

  **04.03**   **VALIDATION**   Custom duration numeric value must be a positive
                               integer greater than zero. Decimal values, zero, and
                               negative numbers must be rejected.

  **04.04**   **VALIDATION**   Custom duration unit (Months or Years) must be
                               selected. Submitting without a unit must show an
                               inline error.

  **04.05**   **VALIDATION**   Duration is a required field. Send Offer / Submit
                               button remains disabled if no duration is selected.

  **04.06**   **SYSTEM**       Only one duration option can be selected at a time.

  **04.07**   **EDGE CASE**    If the client cancels custom duration entry without
                               entering a value and no preset is selected, the
                               duration field returns to unselected state and the
                               button remains disabled.

  **04.08**   **SYSTEM**       For counter offers and offer edits, duration behaves
                               identically to offer creation: same presets, same
                               custom entry, same validations.
  ----------- ---------------- -----------------------------------------------------

  -----------------------------------------------------------------------
  **AC-OS-05 Work Schedule Input & Validation** (US-OS-08, US-OS-09)

  -----------------------------------------------------------------------

  ----------- ---------------- -----------------------------------------------------
  **AC#**     **Category**     **Acceptance Criterion**

  **05.01**   **SYSTEM**       Schedule selector offers three options: Part Time (up
                               to 30 hrs/week), Full Time (over 30 hrs/week), and
                               Custom Work Schedule.

  **05.02**   **SYSTEM**       Selecting Custom Work Schedule renders an inline
                               input for total hours and a unit dropdown: Per day,
                               Per week, Per month. A Cancel link is rendered.

  **05.03**   **VALIDATION**   Custom schedule hours value must be a positive
                               integer greater than zero.

  **05.04**   **VALIDATION**   Custom schedule unit must be selected. Submitting
                               without a unit shows an inline error.

  **05.05**   **VALIDATION**   Work schedule is a required field. Send Offer /
                               Submit button remains disabled if no schedule is
                               selected.

  **05.06**   **SYSTEM**       Only one schedule option can be selected at a time.

  **05.07**   **SYSTEM**       The Part Time label displays secondary text \"up to
                               30 hrs/week\" and Full Time displays \"over 30
                               hrs/week\" as a sub-label for clarity.

  **05.08**   **EDGE CASE**    If the client cancels custom schedule entry without
                               entering a value and no preset is selected, the
                               schedule field returns to unselected state.
  ----------- ---------------- -----------------------------------------------------

  -----------------------------------------------------------------------
  **AC-OS-06 Start Date --- Scoped Projects** (US-OS-10, US-OS-11)

  -----------------------------------------------------------------------

  ----------- ---------------- -----------------------------------------------------
  **AC#**     **Category**     **Acceptance Criterion**

  **06.01**   **SYSTEM**       For scoped project contracts, offer-service receives
                               the estimated start date from listings-service via
                               the invite context. This date is displayed in the
                               Confirm Start Date step.

  **06.02**   **SYSTEM**       The Confirm Start Date step displays the message:
                               \"Based on the project scope, the anticipated start
                               date is \[date\]\" for project types, and \"Based on
                               the service scope, the anticipated start date is
                               \[date\]\" for service types.

  **06.03**   **SYSTEM**       Two buttons are shown: \"Confirm Start Date\"
                               (primary) and \"Change Date\" (secondary).

  **06.04**   **SYSTEM**       Clicking Confirm Start Date saves the suggested date
                               as the offer start date and advances the form.

  **06.05**   **SYSTEM**       Clicking Change Date opens a calendar picker with the
                               suggested date pre-selected and highlighted.

  **06.06**   **VALIDATION**   The calendar picker must not allow selection of a
                               date in the past. Past dates are rendered as
                               disabled/non-selectable.

  **06.07**   **SYSTEM**       Selecting a new date from the calendar updates the
                               start date field and closes the calendar.

  **06.08**   **VALIDATION**   Start date is a required field. The Send Offer button
                               remains disabled if no start date is confirmed.

  **06.09**   **EDGE CASE**    If listings-service does not return a suggested start
                               date (e.g. scope is incomplete), the start date field
                               renders in manual selection mode with no pre-selected
                               value --- not a Confirm step.
  ----------- ---------------- -----------------------------------------------------

  -----------------------------------------------------------------------
  **AC-OS-07 Start Date --- No-Scope Contracts** (US-OS-12)

  -----------------------------------------------------------------------

  ----------- ---------------- -----------------------------------------------------
  **AC#**     **Category**     **Acceptance Criterion**

  **07.01**   **SYSTEM**       For no-scope contract types (Team, Service Ongoing,
                               Individual), offer-service calculates the default
                               start date as the next Monday from the current date
                               at the time of offer creation.

  **07.02**   **SYSTEM**       The calendar picker opens with this next-Monday
                               default pre-selected. The client may change it.

  **07.03**   **VALIDATION**   The client must not be able to select a date in the
                               past. Past dates are disabled in the picker.

  **07.04**   **SYSTEM**       If today is a Monday, the default is the following
                               Monday (not today).

  **07.05**   **SYSTEM**       The selected start date is saved on the Offer record.
                               If the client confirms without changing the date, the
                               default next Monday is used.

  **07.06**   **EDGE CASE**    If the current date is Sunday, the next Monday is
                               tomorrow --- the system must handle this correctly
                               and not skip an additional week.
  ----------- ---------------- -----------------------------------------------------

  -----------------------------------------------------------------------
  **AC-OS-08 Message Field --- Global Rules** (US-OS-13, US-OS-56)

  -----------------------------------------------------------------------

  ----------- ---------------- -----------------------------------------------------
  **AC#**     **Category**     **Acceptance Criterion**

  **08.01**   **SYSTEM**       All offer-related message fields across the entire
                               offer service (send, edit, counter, accept, decline,
                               withdraw, resend, withdraw counter) enforce a
                               500-character maximum.

  **08.02**   **SYSTEM**       A live character counter is rendered below the
                               textarea in the format \"0/500\", updating on every
                               keystroke.

  **08.03**   **VALIDATION**   The textarea stops accepting input at 500 characters.
                               Characters beyond 500 must not be accepted --- the
                               field must not silently truncate; the counter
                               reaching 500/500 is the visual indicator.

  **08.04**   **SYSTEM**       All message fields are optional unless explicitly
                               noted otherwise. An empty message field must not
                               block form submission.

  **08.05**   **SYSTEM**       When a message was included with an offer action, it
                               is stored on the Offer record and displayed in the
                               relevant details modal.

  **08.06**   **EMPTY STATE**  When no message was included with a withdrawal, the
                               details modal displays \"No message was sent.\" as a
                               fallback --- it must not render an empty section.

  **08.07**   **VALIDATION**   Whitespace-only message input is treated as empty and
                               must not be stored as a message.
  ----------- ---------------- -----------------------------------------------------

  -----------------------------------------------------------------------
  **AC-OS-09 Offer Creation --- Submission & Record** (US-OS-03)

  -----------------------------------------------------------------------

  ----------- ---------------- -----------------------------------------------------
  **AC#**     **Category**     **Acceptance Criterion**

  **09.01**   **SYSTEM**       On successful Send Offer submission, offer-service
                               creates an Offer record with status PENDING.

  **09.02**   **SYSTEM**       The Offer record stores: clientId, talentId,
                               contractType (Project/Service/Team/Contract),
                               contractTitle, rate, duration, schedule, startDate,
                               optional message, status (PENDING), createdAt, and
                               expiresAt (createdAt + 14 days).

  **09.03**   **SYSTEM**       The expiresAt timestamp is calculated server-side by
                               offer-service. It is never accepted from the client
                               request body.

  **09.04**   **SYSTEM**       Offer-service emits an offer.created event after the
                               record is persisted. invite-service and
                               notification-service consume this event.

  **09.05**   **ERROR**        If offer-service fails to persist the offer record
                               (e.g. DB error), the API returns 500 and no
                               offer.created event is emitted. The client sees an
                               error state and can retry.

  **09.06**   **PERMISSION**   A client cannot send more than one active (PENDING)
                               offer to the same talent for the same job listing at
                               the same time. Attempting to do so must return a 409
                               conflict.

  **09.07**   **EDGE CASE**    If the Hire Me modal is submitted multiple times in
                               rapid succession (double-click), offer-service must
                               be idempotent --- only one Offer record must be
                               created. Implement with a server-side idempotency
                               key.

  **09.08**   **VALIDATION**   The server-side validation for all required fields
                               (rate, duration, schedule, startDate, contractTitle
                               for no-scope) must mirror front-end validation.
                               Invalid requests return 422 with field-level error
                               details.
  ----------- ---------------- -----------------------------------------------------

  -----------------------------------------------------------------------
  **AC-OS-10 Offer Sent Confirmation Screen** (US-OS-14)

  -----------------------------------------------------------------------

  ----------- -------------- -----------------------------------------------------
  **AC#**     **Category**   **Acceptance Criterion**

  **10.01**   **SYSTEM**     After a successful offer submission, the Offer Sent
                             confirmation screen is shown within the same modal
                             flow --- no full page navigation.

  **10.02**   **SYSTEM**     The confirmation displays: the talent\'s name, the
                             contract type context (e.g. \"CodZen21 has been
                             invited to a full-time contract\"), and a pending
                             invite status indicator.

  **10.03**   **SYSTEM**     Two CTAs are shown: \"Review Your Offer\" (navigates
                             to the offer detail view) and \"Continue Browsing\"
                             (closes the modal and returns to the talent profile
                             or marketplace).

  **10.04**   **SYSTEM**     The talent\'s avatar is immediately added as a
                             pending invite chip in the team member avatar stack
                             on the confirmation screen.

  **10.05**   **SYSTEM**     The avatar stack on the confirmation screen correctly
                             handles overflow: if there are more than 5 pending
                             invite chips, the extras are shown as a numeric
                             overflow badge (e.g. +2).

  **10.06**   **ERROR**      If the Review Your Offer CTA fails to load the offer
                             detail (e.g. offer ID not found), an error toast is
                             shown and the user remains on the confirmation
                             screen.
  ----------- -------------- -----------------------------------------------------

  -----------------------------------------------------------------------
  **AC-OS-11 Talent Viewing a Received Offer** (US-OS-15, US-OS-16)

  -----------------------------------------------------------------------

  ----------- ---------------- -----------------------------------------------------
  **AC#**     **Category**     **Acceptance Criterion**

  **11.01**   **PERMISSION**   Only the talent identified in the Offer record\'s
                               talentId field may view a received offer. Other
                               talent or client users attempting to access the offer
                               via its ID return 403.

  **11.02**   **SYSTEM**       The offer modal displays all required fields:
                               contract type badge (Project/Service/Team/Contract),
                               received date, contract or project name, View Job
                               link, offer rate, role, contract duration, work
                               schedule, start date, and offer expiry date.

  **11.03**   **SYSTEM**       The offer expiry is rendered as: \"This offer expires
                               \[date\]\" below the offer terms and above the action
                               buttons.

  **11.04**   **SYSTEM**       If the client included a message, a Message section
                               is shown below the terms. If no message was sent, the
                               Message section is not rendered.

  **11.05**   **SYSTEM**       Three action buttons are rendered for a PENDING
                               offer: Counter Offer, Decline Offer, Accept Offer.

  **11.06**   **SYSTEM**       A Message button (chat icon) is rendered in the
                               top-right of the modal and opens the chat thread with
                               the client when clicked.

  **11.07**   **SYSTEM**       An Offer History link is shown in the modal header
                               area. Clicking it opens the Offer History modal.

  **11.08**   **SYSTEM**       A View Job link is rendered below the contract name.
                               It navigates to the associated job listing page.

  **11.09**   **STATE**        If the offer status is anything other than PENDING
                               (e.g. EXPIRED, DECLINED, COUNTERED), the three action
                               buttons are not shown. The modal renders in a
                               read-only details view appropriate to the status.

  **11.10**   **EMPTY STATE**  If the offer is opened and the offer record cannot be
                               found (e.g. deleted or invalid ID), the modal shows
                               an error state: \"This offer is no longer
                               available.\"
  ----------- ---------------- -----------------------------------------------------

  -----------------------------------------------------------------------
  **AC-OS-12 Talent Accepting an Offer** (US-OS-17, US-OS-18)

  -----------------------------------------------------------------------

  ----------- ---------------- -----------------------------------------------------
  **AC#**     **Category**     **Acceptance Criterion**

  **12.01**   **PERMISSION**   Only the talent identified in the Offer record may
                               accept the offer. Accepting via another user\'s
                               session returns 403.

  **12.02**   **VALIDATION**   The Accept Offer button in the Accept This Offer
                               modal must be disabled until the consent checkbox is
                               checked. It must not be possible to bypass this via
                               direct API call --- server-side validation must
                               confirm consentCheckboxChecked: true.

  **12.03**   **SYSTEM**       If consentCheckboxChecked is false in the API request
                               body, offer-service returns 422 with error code
                               OFFER_CONSENT_REQUIRED.

  **12.04**   **VALIDATION**   An offer can only be accepted when its status is
                               PENDING. Attempting to accept a COUNTERED, EXPIRED,
                               DECLINED, or WITHDRAWN offer must return 409 with
                               error code OFFER_NOT_ACTIONABLE.

  **12.05**   **SYSTEM**       On acceptance, offer-service sets: status = ACCEPTED,
                               acceptedAt = now().

  **12.06**   **EVENT**        Offer-service emits offer.accepted immediately after
                               the status update is committed to the database. The
                               event payload includes: offerId, clientId, talentId,
                               rate, schedule, duration, title, startDate,
                               jobListingId, contractType.

  **12.07**   **SYSTEM**       The offer.accepted event emission must be atomic with
                               the status update --- if the event fails to emit, the
                               status update must be rolled back (or a
                               retry/dead-letter queue strategy is employed).

  **12.08**   **SYSTEM**       The optional acceptance message (max 500 chars) is
                               stored on the Offer record and visible in the offer
                               history.

  **12.09**   **STATE**        After acceptance, the offer is permanently ACCEPTED.
                               No further state transitions are possible on this
                               offer record.

  **12.10**   **EDGE CASE**    If the offer expires (status EXPIRED) in the window
                               between the talent opening the Accept modal and
                               submitting it, the API must return 409. The frontend
                               must surface a message: \"This offer has expired and
                               can no longer be accepted.\"
  ----------- ---------------- -----------------------------------------------------

  -----------------------------------------------------------------------
  **AC-OS-13 Talent Declining an Offer** (US-OS-19, US-OS-20)

  -----------------------------------------------------------------------

  ----------- ---------------- -----------------------------------------------------
  **AC#**     **Category**     **Acceptance Criterion**

  **13.01**   **PERMISSION**   Only the talent identified in the Offer record may
                               decline the offer.

  **13.02**   **VALIDATION**   An offer can only be declined when its status is
                               PENDING. Declining a COUNTERED, EXPIRED, ACCEPTED, or
                               WITHDRAWN offer returns 409.

  **13.03**   **SYSTEM**       The Decline This Offer modal renders six quick-select
                               reason chips: Budget doesn\'t work, Start date
                               doesn\'t work, Requirements are unclear, Not a fit
                               for my skills, Too busy right now, Need different
                               terms.

  **13.04**   **SYSTEM**       A free-text reason field (0/500 chars) is shown.
                               Selecting a reason chip auto-populates the text field
                               with the chip label. The talent may then edit the
                               text freely.

  **13.05**   **VALIDATION**   At least one reason chip must be selected OR the
                               free-text field must contain non-whitespace text
                               before the Decline offer button is enabled.

  **13.06**   **SYSTEM**       On decline, offer-service sets: status = DECLINED,
                               declinedAt = now(), declineReason = the structured
                               reason code, declineReasonText = the free text.

  **13.07**   **STATE**        After decline, the offer is permanently DECLINED. No
                               further state transitions are possible on this offer
                               record.

  **13.08**   **SYSTEM**       Two action buttons are shown in the decline modal:
                               Counter Offer (secondary) and Decline offer
                               (primary). Clicking Counter Offer closes the decline
                               modal and opens the Make a Counter Offer modal
                               without recording a decline.

  **13.09**   **SYSTEM**       When Counter Offer is clicked from the decline modal,
                               the offer remains in PENDING status --- no decline
                               event is emitted.

  **13.10**   **EVENT**        On successful decline, offer-service emits
                               offer.declined. Notification-service consumes this to
                               alert the client.
  ----------- ---------------- -----------------------------------------------------

  -----------------------------------------------------------------------
  **AC-OS-14 Talent Making a Counter Offer** (US-OS-21, US-OS-22,
  US-OS-23)

  -----------------------------------------------------------------------

  ----------- ---------------- -----------------------------------------------------
  **AC#**     **Category**     **Acceptance Criterion**

  **14.01**   **PERMISSION**   Only the talent identified in the Offer record may
                               submit a counter offer.

  **14.02**   **VALIDATION**   A counter offer can only be submitted when the
                               primary offer status is PENDING. Attempting to
                               counter a COUNTERED, EXPIRED, ACCEPTED, or DECLINED
                               offer returns 409.

  **14.03**   **SYSTEM**       The Make a Counter Offer modal renders: original
                               offer values on the left column (read-only) and
                               editable fields on the right for rate, duration,
                               schedule, and start date.

  **14.04**   **VALIDATION**   All four counter offer fields (rate, duration,
                               schedule, start date) must follow the same validation
                               rules as offer creation: required, positive numeric
                               where applicable, no past dates.

  **14.05**   **SYSTEM**       An optional message field (0/500) is shown below the
                               terms fields.

  **14.06**   **SYSTEM**       Clicking Review Counteroffer navigates to the Review
                               Counter Offer screen. No data is persisted at this
                               point.

  **14.07**   **SYSTEM**       The Review Counter Offer screen shows all four
                               fields. Changed fields display \"(was \$X)\" or
                               \"(was \[value\])\" diff notation next to the new
                               value. Unchanged fields show no diff annotation.

  **14.08**   **SYSTEM**       A legal notice is shown: \"By submitting, you agree
                               to work under these terms if the client accepts your
                               offer.\"

  **14.09**   **SYSTEM**       Two buttons on the review screen: Edit Counter Offer
                               (returns to the form with values preserved) and
                               Submit Counter Offer (commits the counter offer).

  **14.10**   **STATE**        On submission, offer-service sets the primary offer
                               status to COUNTERED. A new counter offer record is
                               created in PENDING status.

  **14.11**   **STATE**        If a previous counter offer is in PENDING status, it
                               is immediately set to SUPERSEDED when the new counter
                               offer is submitted.

  **14.12**   **EVENT**        Offer-service emits offer.countered after the counter
                               offer record is persisted. Notification-service
                               consumes this to alert the client.

  **14.13**   **EDGE CASE**    If the primary offer expires between the talent
                               opening the counter offer form and submitting it, the
                               API returns 409. The frontend surfaces: \"This offer
                               has expired and can no longer be countered.\"
  ----------- ---------------- -----------------------------------------------------

  -----------------------------------------------------------------------
  **AC-OS-15 Counter Offer Rate Warning** (US-OS-22)

  -----------------------------------------------------------------------

  ----------- -------------- -----------------------------------------------------
  **AC#**     **Category**   **Acceptance Criterion**

  **15.01**   **SYSTEM**     Offer-service exposes a rate threshold check. When
                             the talent enters a counter offer rate that exceeds
                             the configured warning threshold relative to the
                             original offer rate, the API response for the review
                             step includes a warning flag and the suggested rate.

  **15.02**   **SYSTEM**     The warning message rendered is: \"The client will be
                             more likely to accept if your counteroffer is closer
                             to \$\[X\]/hr.\" The \$X value is the original offer
                             rate.

  **15.03**   **SYSTEM**     The warning is advisory only --- it must not block
                             the talent from submitting the counter offer. The
                             Submit Counter Offer button must remain active.

  **15.04**   **SYSTEM**     The warning appears inline within the counter offer
                             form or review screen, not as a blocking modal or
                             toast.

  **15.05**   **EDGE CASE**  If the counter offer rate is equal to or lower than
                             the original offer rate, no warning is shown.
  ----------- -------------- -----------------------------------------------------

  -----------------------------------------------------------------------
  **AC-OS-16 Talent Viewing & Withdrawing a Pending Counter Offer**
  (US-OS-24, US-OS-25)

  -----------------------------------------------------------------------

  ----------- ---------------- -----------------------------------------------------
  **AC#**     **Category**     **Acceptance Criterion**

  **16.01**   **SYSTEM**       The talent can view their submitted counter offer
                               from the chat thread. The counter offer modal shows:
                               proposed rate with \"(was \$X)\" arrow notation,
                               role, duration, schedule, start date, message, and
                               expiry date.

  **16.02**   **SYSTEM**       The expiry notice reads: \"This counteroffer expires
                               \[date\]. You can edit or withdraw it anytime before
                               then.\"

  **16.03**   **SYSTEM**       Two action buttons are shown: Withdraw Counter Offer
                               and Edit Counter Offer.

  **16.04**   **SYSTEM**       Clicking Withdraw Counter Offer opens a confirmation
                               modal with the message: \"Do you want to withdraw
                               your counter offer? You can still accept the
                               client\'s active offer afterward.\"

  **16.05**   **SYSTEM**       An optional message to talent field (0/500) is shown
                               in the withdrawal confirmation modal.

  **16.06**   **STATE**        On withdrawal confirmation, offer-service sets the
                               counter offer status to WITHDRAWN and restores the
                               primary offer status to PENDING.

  **16.07**   **STATE**        After withdrawal of the counter offer, the primary
                               offer must be in PENDING status and all three talent
                               action buttons (Counter Offer, Decline Offer, Accept
                               Offer) must be available again.

  **16.08**   **EVENT**        Offer-service emits offer.counter_withdrawn.
                               Notification-service alerts the client.

  **16.09**   **PERMISSION**   Only the talent who submitted the counter offer may
                               withdraw it.

  **16.10**   **VALIDATION**   Counter offer withdrawal is only allowed when the
                               counter offer status is PENDING. Attempting to
                               withdraw a SUPERSEDED, ACCEPTED, DECLINED, or EXPIRED
                               counter offer returns 409.
  ----------- ---------------- -----------------------------------------------------

  -----------------------------------------------------------------------
  **AC-OS-17 Talent Resending an Expired Counter Offer** (US-OS-26)

  -----------------------------------------------------------------------

  ----------- ---------------- -----------------------------------------------------
  **AC#**     **Category**     **Acceptance Criterion**

  **17.01**   **SYSTEM**       POST /v1/offers/:id/counter-offers/:counterId/resend
                               creates a new counter offer record with the same
                               terms as the expired one. A fresh expiresAt timestamp
                               is set (now + 14 days).

  **17.02**   **STATE**        The original expired counter offer record remains in
                               EXPIRED status. It is not modified.

  **17.03**   **SYSTEM**       The resent counter offer is linked to the original
                               via resendOfCounterOfferId for history traceability.

  **17.04**   **STATE**        The primary offer is set back to COUNTERED status
                               after the resend.

  **17.05**   **SYSTEM**       The chat thread updates to show a \"Counter Offer
                               Resent\" event card with the new expiry date.

  **17.06**   **VALIDATION**   Resend is only allowed when the counter offer status
                               is EXPIRED. Attempting to resend a PENDING,
                               WITHDRAWN, ACCEPTED, or DECLINED counter offer
                               returns 409.

  **17.07**   **EVENT**        Offer-service emits offer.counter_resent.
                               Notification-service alerts the client.
  ----------- ---------------- -----------------------------------------------------

  -----------------------------------------------------------------------
  **AC-OS-18 Client Viewing a Sent Offer** (US-OS-27)

  -----------------------------------------------------------------------

  ----------- ---------------- -----------------------------------------------------
  **AC#**     **Category**     **Acceptance Criterion**

  **18.01**   **PERMISSION**   Only the client who sent the offer may access the
                               sent offer detail modal. Other users return 403.

  **18.02**   **SYSTEM**       The offer modal displays: contract type badge, sent
                               date, Offer History link, contract or project name,
                               View Job link, rate, role, duration, work schedule,
                               start date, expiry date, and optional message.

  **18.03**   **SYSTEM**       For a PENDING offer, two action buttons are shown:
                               Withdraw Offer and Edit Offer.

  **18.04**   **STATE**        If the offer status is COUNTERED, the Edit Offer and
                               Withdraw Offer buttons are not shown. The modal shows
                               the counter offer notification or redirects to View
                               Counter Offer.

  **18.05**   **SYSTEM**       The Message button is always visible regardless of
                               offer status and opens the chat thread with the
                               talent.
  ----------- ---------------- -----------------------------------------------------

  -----------------------------------------------------------------------
  **AC-OS-19 Client Editing a Pending Offer** (US-OS-28)

  -----------------------------------------------------------------------

  ----------- ---------------- -----------------------------------------------------
  **AC#**     **Category**     **Acceptance Criterion**

  **19.01**   **PERMISSION**   Only the client who sent the offer may edit it.

  **19.02**   **VALIDATION**   Offer editing is only permitted when the offer status
                               is PENDING. Editing a COUNTERED, EXPIRED, or ACCEPTED
                               offer returns 409.

  **19.03**   **SYSTEM**       The Edit Offer modal renders original values on the
                               left (read-only) and editable inputs on the right
                               for: rate, duration, schedule, start date, and
                               message.

  **19.04**   **SYSTEM**       A contract title field is shown and editable.

  **19.05**   **SYSTEM**       A Change Contract link is rendered when the offer is
                               associated with a scoped project that has phases.
                               Clicking it allows the client to switch the
                               associated project phase.

  **19.06**   **SYSTEM**       The review screen shows all four fields. Any changed
                               field displays the new value plus \"(was \[original
                               value\])\" diff notation. Unchanged fields show no
                               annotation.

  **19.07**   **SYSTEM**       A View Previous Offer link is shown on the review
                               screen.

  **19.08**   **SYSTEM**       On Send Offer from the review screen, offer-service
                               updates the Offer record in-place (same offerId). The
                               expiresAt timestamp is reset to now + 14 days.

  **19.09**   **VALIDATION**   All edited field values must pass the same validation
                               rules as offer creation (required fields, numeric
                               rate, no past date, etc.).

  **19.10**   **EVENT**        Offer-service emits offer.edited after the update is
                               committed. Notification-service alerts the talent.

  **19.11**   **EDGE CASE**    If the talent acts on the offer (accepts, declines,
                               or counters) between the client opening the Edit
                               modal and submitting the edit, the API returns 409.
                               The client sees: \"This offer has already been
                               responded to and can no longer be edited.\"
  ----------- ---------------- -----------------------------------------------------

  -----------------------------------------------------------------------
  **AC-OS-20 Client Withdrawing an Offer** (US-OS-29)

  -----------------------------------------------------------------------

  ----------- ---------------- -----------------------------------------------------
  **AC#**     **Category**     **Acceptance Criterion**

  **20.01**   **PERMISSION**   Only the client who sent the offer may withdraw it.

  **20.02**   **VALIDATION**   Withdrawal is only allowed when the offer status is
                               PENDING. Withdrawing a COUNTERED, ACCEPTED, DECLINED,
                               or EXPIRED offer returns 409.

  **20.03**   **SYSTEM**       The Withdraw Offer confirmation modal displays:
                               \"This will cancel the offer and notify the
                               recipient.\" An optional message field (0/500) is
                               shown.

  **20.04**   **STATE**        On withdrawal, offer-service sets status = WITHDRAWN,
                               withdrawnAt = now().

  **20.05**   **SYSTEM**       The chat thread updates to show an Offer Withdrawn
                               event card with the message: \"The talent can no
                               longer accept this offer.\"

  **20.06**   **EVENT**        Offer-service emits offer.withdrawn.
                               Notification-service alerts the talent.

  **20.07**   **STATE**        Once WITHDRAWN, the offer is permanently closed. It
                               cannot be reopened. The client may resend (creating a
                               new offer record) but cannot un-withdraw.

  **20.08**   **EDGE CASE**    If the talent accepts the offer in the window between
                               the client opening the withdraw confirmation and
                               submitting it, the API returns 409. The client sees:
                               \"This offer was already accepted and cannot be
                               withdrawn.\"
  ----------- ---------------- -----------------------------------------------------

  -----------------------------------------------------------------------
  **AC-OS-21 Client Viewing a Counter Offer from Talent** (US-OS-30)

  -----------------------------------------------------------------------

  ----------- ---------------- -----------------------------------------------------
  **AC#**     **Category**     **Acceptance Criterion**

  **21.01**   **PERMISSION**   Only the client who owns the offer may view and act
                               on the counter offer.

  **21.02**   **SYSTEM**       The counter offer modal displays: talent username (as
                               a link), contract type badge, received date,
                               contract/project name, View Job link, Message button.

  **21.03**   **SYSTEM**       The rate row shows the new proposed rate with an
                               arrow indicator and \"(was \$X)\" notation clearly
                               showing the change.

  **21.04**   **SYSTEM**       All other terms are displayed: role, contract
                               duration, work schedule, start date.

  **21.05**   **SYSTEM**       The message section renders the talent\'s message if
                               one was included. If no message, the section is not
                               rendered.

  **21.06**   **SYSTEM**       The expiry notice reads: \"This counteroffer expires
                               \[date\]. If you decline, your original offer stays
                               active unless it expires.\"

  **21.07**   **SYSTEM**       Three action buttons are shown: Counter Offer,
                               Decline, Accept Offer.

  **21.08**   **STATE**        If the counter offer status is anything other than
                               PENDING, the action buttons are not shown and the
                               modal renders in read-only mode.
  ----------- ---------------- -----------------------------------------------------

  -----------------------------------------------------------------------
  **AC-OS-22 Client Accepting a Counter Offer** (US-OS-31)

  -----------------------------------------------------------------------

  ----------- ---------------- -----------------------------------------------------
  **AC#**     **Category**     **Acceptance Criterion**

  **22.01**   **VALIDATION**   The counter offer must be in PENDING status.
                               Accepting a WITHDRAWN, EXPIRED, or DECLINED counter
                               offer returns 409.

  **22.02**   **STATE**        On acceptance, offer-service sets the counter offer
                               status to ACCEPTED and the primary offer status to
                               ACCEPTED. Both are updated atomically.

  **22.03**   **SYSTEM**       acceptedAt timestamp is recorded on both the counter
                               offer and the primary offer record.

  **22.04**   **EVENT**        Offer-service emits offer.accepted with the counter
                               offer terms as the agreed terms payload.
                               Contracts-service consumes this to create the
                               ContractGroup in PENDING state.

  **22.05**   **SYSTEM**       The chat updates to show an Offer Accepted event
                               card: \"Starts on \[date\]\" with a View Contract
                               CTA.

  **22.06**   **EDGE CASE**    If the talent withdraws the counter offer in the
                               window between the client opening the accept flow and
                               confirming, the API returns 409. The client sees:
                               \"This counter offer has been withdrawn.\"
  ----------- ---------------- -----------------------------------------------------

  -----------------------------------------------------------------------
  **AC-OS-23 Client Declining a Counter Offer** (US-OS-32)

  -----------------------------------------------------------------------

  ----------- ---------------- -----------------------------------------------------
  **AC#**     **Category**     **Acceptance Criterion**

  **23.01**   **VALIDATION**   The counter offer must be in PENDING status to be
                               declined.

  **23.02**   **STATE**        On decline, offer-service sets the counter offer
                               status to DECLINED.

  **23.03**   **STATE**        The primary offer is restored to PENDING status
                               unless the primary offer has independently expired
                               (status EXPIRED). If the primary offer is already
                               EXPIRED, it remains EXPIRED.

  **23.04**   **EVENT**        Offer-service emits offer.counter_declined.
                               Notification-service alerts the talent.

  **23.05**   **SYSTEM**       The chat updates to show a Counter Offer Declined
                               event card: \"These changes weren\'t accepted.\"

  **23.06**   **STATE**        After the counter offer is DECLINED and the primary
                               offer is restored to PENDING, all three talent action
                               buttons (Counter Offer, Decline Offer, Accept Offer)
                               become available again.
  ----------- ---------------- -----------------------------------------------------

  -----------------------------------------------------------------------
  **AC-OS-24 Client Counter-Offering Back** (US-OS-33)

  -----------------------------------------------------------------------

  ----------- -------------- -----------------------------------------------------
  **AC#**     **Category**   **Acceptance Criterion**

  **24.01**   **SYSTEM**     Clicking Counter Offer from the counter offer view
                             opens the Make a Counter Offer modal pre-populated
                             with the original offer terms (not the talent\'s
                             proposed counter terms).

  **24.02**   **STATE**      On submission, offer-service creates a new counter
                             offer record from the client side. The talent\'s
                             existing counter offer is set to SUPERSEDED.

  **24.03**   **SYSTEM**     The negotiation round increments. Both parties can
                             see the full round history via Offer History.

  **24.04**   **EDGE CASE**  There is no hard cap on the number of negotiation
                             rounds visible in the designs. Offer-service must
                             support multiple back-and-forth rounds without any
                             artificial limit at the service level.
  ----------- -------------- -----------------------------------------------------

  -----------------------------------------------------------------------
  **AC-OS-25 Offer Auto-Expiry & TTL** (US-OS-34, US-OS-35)

  -----------------------------------------------------------------------

  ----------- -------------- -----------------------------------------------------
  **AC#**     **Category**   **Acceptance Criterion**

  **25.01**   **SYSTEM**     Offer-service runs a scheduled job (e.g. CRON every
                             hour) to identify offers and counter offers whose
                             expiresAt timestamp has passed and status is still
                             PENDING or COUNTERED.

  **25.02**   **STATE**      Any PENDING offer whose expiresAt has passed is set
                             to EXPIRED. expiredAt = expiresAt (the scheduled
                             time, not when the job ran).

  **25.03**   **STATE**      Any PENDING counter offer whose expiresAt has passed
                             is set to EXPIRED. If the primary offer is still
                             PENDING, it is restored to PENDING status.

  **25.04**   **EVENT**      For each expired offer, offer-service emits
                             offer.expired. Notification-service consumes this to
                             alert both client and talent.

  **25.05**   **EVENT**      Offer-service emits offer.expiring_soon 48 hours
                             before the expiresAt timestamp. Notification-service
                             consumes this to send a 48-hour warning to both
                             parties.

  **25.06**   **SYSTEM**     The 48h warning event must be emitted exactly once
                             per offer. Duplicate emissions must be prevented
                             (e.g. via a warningSentAt flag on the Offer record).

  **25.07**   **STATE**      An EXPIRED offer is permanently inactive. No accept,
                             decline, counter, or edit actions are permitted on an
                             EXPIRED offer. All such requests return 409 with
                             OFFER_EXPIRED error code.

  **25.08**   **EDGE CASE**  If a client edits a PENDING offer (which resets
                             expiresAt), the 48h warning flag (warningSentAt) must
                             also be reset so the warning fires again for the new
                             expiry window.

  **25.09**   **EDGE CASE**  If a resent offer (new offer record from Resend) is
                             created and the original expired offer is in history,
                             the 48h warning applies to the new offer
                             independently, not the original.
  ----------- -------------- -----------------------------------------------------

  -----------------------------------------------------------------------
  **AC-OS-26 Talent Extension Request (≤30 Days Expired)** (US-OS-36,
  US-OS-37)

  -----------------------------------------------------------------------

  ----------- ---------------- -----------------------------------------------------
  **AC#**     **Category**     **Acceptance Criterion**

  **26.01**   **SYSTEM**       The Request Extension action is only available to
                               talent when: (a) the offer status is EXPIRED and (b)
                               the elapsed time since expiredAt is 30 days or fewer.

  **26.02**   **SYSTEM**       The recovery message shown is: \"Want to revisit
                               this? You can ask the client to extend the offer.\" A
                               Request Extension button is rendered.

  **26.03**   **SYSTEM**       Clicking Request Extension calls POST
                               /v1/offers/:id/request-extension. This sets a
                               pendingExtensionRequest: true flag on the offer
                               record and notifies the client.

  **26.04**   **SYSTEM**       The client receives a notification and can approve or
                               reject the extension request.

  **26.05**   **SYSTEM**       On client approval (POST
                               /v1/offers/:id/approve-extension), offer-service
                               creates a new Offer record with the same terms and a
                               fresh expiresAt (now + 14 days). The new record is
                               linked to the original via reopenedFromOfferId.

  **26.06**   **STATE**        The original expired offer record retains EXPIRED
                               status. It is not modified.

  **26.07**   **VALIDATION**   Talent can only submit one pending extension request
                               per expired offer at a time. A second Request
                               Extension submission while one is pending returns
                               409.

  **26.08**   **EDGE CASE**    If the 30-day window passes while a pending extension
                               request is awaiting client approval, the extension
                               request is automatically cancelled and the talent is
                               notified that the window has closed.
  ----------- ---------------- -----------------------------------------------------

  -----------------------------------------------------------------------
  **AC-OS-27 Ask If Still Open (\>30 Days Expired)** (US-OS-38)

  -----------------------------------------------------------------------

  ----------- -------------- -----------------------------------------------------
  **AC#**     **Category**   **Acceptance Criterion**

  **27.01**   **SYSTEM**     The Ask Now action is available when: (a) offer
                             status is EXPIRED and elapsed time since expiredAt is
                             greater than 30 days, OR (b) offer status is DECLINED
                             or WITHDRAWN.

  **27.02**   **SYSTEM**     The Request Extension button is NOT shown for
                             DECLINED or WITHDRAWN offers under any circumstances.
                             Only Ask Now is shown.

  **27.03**   **SYSTEM**     The recovery message for EXPIRED \> 30 days: \"Want
                             to revisit this? Ask the client to see if the role is
                             still available.\"

  **27.04**   **SYSTEM**     The recovery message for DECLINED: \"Want to revisit
                             this? Ask the client to see if the role is still
                             open.\"

  **27.05**   **SYSTEM**     Clicking Ask Now sends a pre-populated message into
                             the existing chat thread with the client. It does not
                             create a new offer record.

  **27.06**   **EDGE CASE**  If the chat thread no longer exists or has been
                             archived, clicking Ask Now must still succeed ---
                             offer-service or messaging-service must create a new
                             thread or re-open the archived one.
  ----------- -------------- -----------------------------------------------------

  -----------------------------------------------------------------------
  **AC-OS-28 Client Viewing an Expired Offer** (US-OS-39)

  -----------------------------------------------------------------------

  ----------- -------------- -----------------------------------------------------
  **AC#**     **Category**   **Acceptance Criterion**

  **28.01**   **SYSTEM**     The expired offer modal title reads \"This Offer
                             Expired\" with the contract type badge, expiry date,
                             Message button, contract name, \"Sent to
                             @\[talent\]\", and all offer terms.

  **28.02**   **STATE**      Default expired state (not reopened, not accepted):
                             footer shows \"You can resend this offer or edit the
                             terms before sending\" with Edit Offer and Resend
                             Offer buttons.

  **28.03**   **STATE**      If the expired offer was subsequently reopened (via
                             extension approval), footer shows: \"This offer was
                             reopened \[N\] days ago\" with a View Current Offer
                             CTA linking to the new offer record.

  **28.04**   **STATE**      If the expired offer was accepted after expiry
                             (possible if extended then accepted), footer shows:
                             \"This offer was accepted \[N\] days ago\" with a
                             View Contract CTA.

  **28.05**   **SYSTEM**     The \"N days ago\" value is calculated as the elapsed
                             time between now and the reopenedAt or acceptedAt
                             timestamp.

  **28.06**   **EMPTY        If the offer was expired and the talent has not taken
              STATE**        any recovery action, no recovery action UI is shown
                             on the client-side view --- only Edit Offer and
                             Resend Offer.
  ----------- -------------- -----------------------------------------------------

  -----------------------------------------------------------------------
  **AC-OS-29 Declined Offer Details** (US-OS-40, US-OS-41)

  -----------------------------------------------------------------------

  ----------- -------------- -----------------------------------------------------
  **AC#**     **Category**   **Acceptance Criterion**

  **29.01**   **SYSTEM**     Client view title: \"Your offer was declined.\"
                             Talent view title: \"You declined this offer.\"

  **29.02**   **SYSTEM**     Both views show: contract type badge, decline date,
                             Message button, contract name, and all offer terms
                             (rate, role, duration, schedule, start date).

  **29.03**   **SYSTEM**     Client view shows \"Sent to @\[talent\]\". Talent
                             view shows \"Offer from @\[client\]\".

  **29.04**   **SYSTEM**     The Reason section is shown in both views and renders
                             the decline reason text. If no free text was entered,
                             the reason chip label is shown.

  **29.05**   **SYSTEM**     Client view footer: \"You can resend this offer or
                             edit the terms before sending\" with Edit Offer and
                             Resend Offer buttons.

  **29.06**   **SYSTEM**     Talent view footer: \"Want to revisit this? Ask the
                             client to see if the role is still open\" with Ask
                             Now button.

  **29.07**   **EMPTY        If no decline reason was stored, the Reason section
              STATE**        still renders with a fallback: \"No reason
                             provided.\"

  **29.08**   **STATE**      A declined offer is permanently read-only. Neither
                             party can accept, counter, or edit it. The client can
                             only resend (creating a new offer) or message.
  ----------- -------------- -----------------------------------------------------

  -----------------------------------------------------------------------
  **AC-OS-30 Withdrawn Offer Details** (US-OS-42, US-OS-43)

  -----------------------------------------------------------------------

  ----------- -------------- -----------------------------------------------------
  **AC#**     **Category**   **Acceptance Criterion**

  **30.01**   **SYSTEM**     Client view title: \"You withdrew this offer.\"
                             Talent view title: \"This offer was withdrawn.\"

  **30.02**   **SYSTEM**     Both views show: contract type badge, withdrawal
                             date, Message button, contract name, all offer terms,
                             and a Message section.

  **30.03**   **SYSTEM**     Client view shows \"Sent to @\[talent\]\". Talent
                             view shows \"Offer from @\[client\]\".

  **30.04**   **EMPTY        If no withdrawal message was included, the Message
              STATE**        section renders \"No message was sent.\" --- never an
                             empty section.

  **30.05**   **SYSTEM**     Client view footer: Edit Offer and Resend Offer
                             buttons.

  **30.06**   **SYSTEM**     Talent view footer: \"Want to revisit this? Ask the
                             client to see if the role is still available\" with
                             Ask Now button.

  **30.07**   **STATE**      A withdrawn offer is permanently read-only. It cannot
                             be un-withdrawn. The client may only resend or
                             message.
  ----------- -------------- -----------------------------------------------------

  -----------------------------------------------------------------------
  **AC-OS-31 Resend Offer (Same Terms)** (US-OS-44)

  -----------------------------------------------------------------------

  ----------- ---------------- -----------------------------------------------------
  **AC#**     **Category**     **Acceptance Criterion**

  **31.01**   **SYSTEM**       Resend is available from the expired, declined, and
                               withdrawn offer detail modals via the Resend Offer
                               button.

  **31.02**   **SYSTEM**       The Resend confirmation modal shows: \"This will
                               resend the offer with the same terms.\" A View Terms
                               link allows the client to review terms before
                               confirming.

  **31.03**   **SYSTEM**       An optional message to talent field (0/500) is shown.

  **31.04**   **SYSTEM**       On confirmation, offer-service creates a new Offer
                               record with identical terms to the original: same
                               rate, duration, schedule, startDate, title. A fresh
                               expiresAt = now + 14 days is set.

  **31.05**   **SYSTEM**       The new offer record links back to the original via
                               resendOfOfferId.

  **31.06**   **STATE**        The original offer record retains its terminal status
                               (EXPIRED/DECLINED/WITHDRAWN) unchanged.

  **31.07**   **SYSTEM**       After resend, the chat shows: \"Offer Sent --- New
                               offer sent with the same terms.\" and the new offer
                               appears as a PENDING offer card.

  **31.08**   **EVENT**        Offer-service emits offer.created for the new offer
                               record. Notification-service alerts the talent.

  **31.09**   **PERMISSION**   Only the client who originally sent the offer may
                               resend it.

  **31.10**   **VALIDATION**   Resend is only permitted from EXPIRED, DECLINED, or
                               WITHDRAWN offers. Attempting to resend an ACCEPTED or
                               PENDING offer returns 409.
  ----------- ---------------- -----------------------------------------------------

  -----------------------------------------------------------------------
  **AC-OS-32 Edit & Resend Offer (Updated Terms)** (US-OS-45)

  -----------------------------------------------------------------------

  ----------- ---------------- -----------------------------------------------------
  **AC#**     **Category**     **Acceptance Criterion**

  **32.01**   **SYSTEM**       Edit Offer is available from expired and declined
                               offer detail modals. It opens the full Edit Offer
                               form pre-populated with the original terms.

  **32.02**   **SYSTEM**       The client may change any of: rate, duration,
                               schedule, start date, message, contract title.

  **32.03**   **SYSTEM**       The review screen shows all fields with \"(was
                               \[value\])\" diff notation for changed fields only.

  **32.04**   **SYSTEM**       On Send Offer from the review screen, offer-service
                               creates a new Offer record with the updated terms.
                               The new record links to the original via
                               resendOfOfferId.

  **32.05**   **STATE**        The original offer record retains its terminal status
                               unchanged.

  **32.06**   **VALIDATION**   All updated fields must pass the same validation
                               rules as offer creation.

  **32.07**   **PERMISSION**   Only the client who originally sent the offer may
                               edit and resend it.
  ----------- ---------------- -----------------------------------------------------

  -----------------------------------------------------------------------
  **AC-OS-33 Offer History Modal** (US-OS-48)

  -----------------------------------------------------------------------

  ----------- ---------------- -----------------------------------------------------
  **AC#**     **Category**     **Acceptance Criterion**

  **33.01**   **SYSTEM**       The Offer History modal is accessible from any offer
                               modal (active or terminal) via the Offer History
                               link.

  **33.02**   **SYSTEM**       The modal renders a chronological list (oldest first)
                               of all negotiation events for the offer thread.

  **33.03**   **SYSTEM**       Each row displays: actor avatar, actor display name,
                               action label (e.g. \"Laura sent an offer\", \"Andrew
                               sent a counteroffer\"), the rate at the time of the
                               action, and a relative timestamp (e.g. \"Yesterday at
                               1:36 PM\").

  **33.04**   **SYSTEM**       Each row has a chevron expand control. Expanding a
                               row reveals the full offer terms for that round:
                               role, contract duration, work schedule, start date,
                               and the message if one was included.

  **33.05**   **SYSTEM**       All terminal-status offers (expired, declined,
                               withdrawn, accepted) remain permanently in history
                               and are never removed.

  **33.06**   **SYSTEM**       When the offer has been accepted and a contract
                               exists, a View Contract CTA is shown at the bottom of
                               the history modal.

  **33.07**   **PERMISSION**   Both the client and the talent who are parties to the
                               offer may view the offer history. No third party may
                               access it.

  **33.08**   **EMPTY STATE**  The offer history modal always has at least one entry
                               (the initial offer send). An empty offer history
                               state should never occur.

  **33.09**   **SYSTEM**       The Offer History modal renders correctly for all
                               four contract types: Project, Service, Team, and
                               Contract (Individual).
  ----------- ---------------- -----------------------------------------------------

  -----------------------------------------------------------------------
  **AC-OS-34 Previous Offer Access** (US-OS-46, US-OS-47)

  -----------------------------------------------------------------------

  ----------- -------------- -----------------------------------------------------
  **AC#**     **Category**   **Acceptance Criterion**

  **34.01**   **SYSTEM**     The Previous Offer modal is accessible via the Offer
                             History link within the active offer or counter offer
                             modal.

  **34.02**   **SYSTEM**     The Previous Offer modal renders the offer terms in a
                             read-only view: rate, role, duration, work schedule,
                             start date, expiry date.

  **34.03**   **SYSTEM**     Talent view of the previous offer modal retains
                             Decline Offer and Accept Offer action buttons --- the
                             talent may still act on the active offer from this
                             view.

  **34.04**   **SYSTEM**     Client view of the previous offer modal retains the
                             Withdraw Offer button.

  **34.05**   **SYSTEM**     The Offer History link is present in the Previous
                             Offer modal header so the user can navigate to the
                             full history.
  ----------- -------------- -----------------------------------------------------

  -----------------------------------------------------------------------
  **AC-OS-35 Offer Card States in Chat** (US-OS-49)

  -----------------------------------------------------------------------

  ----------- -------------- -----------------------------------------------------
  **AC#**     **Category**   **Acceptance Criterion**

  **35.01**   **SYSTEM**     Every offer action that changes state renders an
                             updated offer card in the chat thread. The card is
                             not a static snapshot --- it reflects the current
                             offer status.

  **35.02**   **SYSTEM**     The offer card always renders: contract type badge,
                             contract/project name, status label, status context
                             line, and a summary row of key terms (rate, role,
                             duration, schedule).

  **35.03**   **STATE**      PENDING: status label = none (pending is the
                             default), context = \"This offer expires \[date\]\",
                             CTA = \"View Offer\"

  **35.04**   **STATE**      ACCEPTED: status label = \"Offer Accepted\", context
                             = \"Starts on \[day, date\]\", CTA = \"View
                             Contract\"

  **35.05**   **STATE**      DECLINED: status label = \"Offer Declined\", context
                             = \"This offer is now closed.\", CTA = \"View
                             Details\"

  **35.06**   **STATE**      COUNTERED: status label = \"Offer Countered\",
                             context = \"This offer was replaced by new terms.\",
                             CTA = none (the counter offer card renders
                             separately)

  **35.07**   **STATE**      WITHDRAWN: status label = \"Offer Withdrawn\",
                             context = \"This offer was withdrawn.\", CTA = \"View
                             Details\"

  **35.08**   **STATE**      EXPIRED: status label = \"Offer Expired\", context =
                             \"This offer expired on \[date\].\", CTA = \"View
                             Details\"

  **35.09**   **SYSTEM**     Counter offer event cards render independently in the
                             chat thread with their own states: Counter Offer
                             Submitted, Counter Offer Withdrawn, Counter Offer
                             Accepted, Counter Offer Declined, Counter Offer
                             Expired, Counter Offer Resent, Counter Offer
                             Superseded.

  **35.10**   **SYSTEM**     All four contract types (Project / Service / Team /
                             Contract) render correctly on the offer card with the
                             appropriate type badge.
  ----------- -------------- -----------------------------------------------------

  -----------------------------------------------------------------------
  **AC-OS-36 Offer State Machine --- Transition Rules**
  (US-OS-49--US-OS-54)

  -----------------------------------------------------------------------

  ----------- -------------- -----------------------------------------------------
  **AC#**     **Category**   **Acceptance Criterion**

  **36.01**   **STATE**      Valid primary offer state transitions: PENDING →
                             ACCEPTED, PENDING → DECLINED, PENDING → WITHDRAWN,
                             PENDING → EXPIRED, PENDING → COUNTERED. No other
                             transitions are valid.

  **36.02**   **STATE**      Valid counter offer state transitions: PENDING →
                             ACCEPTED, PENDING → DECLINED, PENDING → WITHDRAWN,
                             PENDING → EXPIRED, PENDING → SUPERSEDED. No other
                             transitions are valid.

  **36.03**   **STATE**      ACCEPTED, DECLINED, WITHDRAWN, and EXPIRED are
                             terminal states for both primary offers and counter
                             offers. No transitions out of terminal states are
                             allowed.

  **36.04**   **STATE**      When a counter offer is DECLINED by the client:
                             counter offer → DECLINED, primary offer → PENDING (if
                             not independently expired).

  **36.05**   **STATE**      When a counter offer is WITHDRAWN by talent: counter
                             offer → WITHDRAWN, primary offer → PENDING.

  **36.06**   **STATE**      When a counter offer EXPIRES: counter offer →
                             EXPIRED, primary offer → PENDING (if primary offer
                             has not independently expired).

  **36.07**   **STATE**      When a new counter offer is submitted while another
                             is PENDING: the existing counter offer → SUPERSEDED,
                             new counter offer → PENDING.

  **36.08**   **STATE**      COUNTERED primary offer cannot be accepted, declined,
                             or countered again until the counter offer is
                             resolved (ACCEPTED, DECLINED, WITHDRAWN, or EXPIRED).

  **36.09**   **EDGE CASE**  If both the primary offer and counter offer expire
                             simultaneously (same expiresAt window), both are set
                             to EXPIRED. The primary offer does not attempt to
                             restore itself.

  **36.10**   **EDGE CASE**  A talent who has submitted a counter offer (primary
                             offer status = COUNTERED) may still withdraw their
                             counter offer and then accept the original offer.
                             This is an explicitly supported flow.
  ----------- -------------- -----------------------------------------------------

  -----------------------------------------------------------------------
  **AC-OS-37 Offer.Accepted Event & Contracts-Service Handoff**
  (US-OS-55)

  -----------------------------------------------------------------------

  ----------- -------------- -----------------------------------------------------
  **AC#**     **Category**   **Acceptance Criterion**

  **37.01**   **EVENT**      offer.accepted is emitted by offer-service on every
                             acceptance event: talent accepting primary offer,
                             client accepting counter offer, or client approving
                             an extension and talent subsequently accepting.

  **37.02**   **EVENT**      The offer.accepted payload must contain: offerId,
                             clientId, talentId, rate, schedule, duration, title,
                             startDate, jobListingId, contractType
                             (Project/Service/Team/Contract).

  **37.03**   **SYSTEM**     Offer-service\'s responsibility ends at emitting
                             offer.accepted. All subsequent contract lifecycle
                             management belongs to contracts-service.

  **37.04**   **SYSTEM**     Offer-service must not call contracts-service
                             synchronously. The handoff is event-driven only.
                             Offer-service does not wait for contract creation
                             confirmation.

  **37.05**   **ERROR**      If the offer.accepted event fails to publish (e.g.
                             RabbitMQ unavailable), the offer status update must
                             be rolled back OR the event must be queued in a
                             retry/dead-letter mechanism. The offer must not be
                             left in ACCEPTED status without the event being
                             emitted.

  **37.06**   **EDGE CASE**  If contracts-service receives a duplicate
                             offer.accepted event (e.g. retry), it must be
                             idempotent --- it must not create duplicate
                             ContractGroup records.
  ----------- -------------- -----------------------------------------------------

  -----------------------------------------------------------------------
  **AC-OS-38 Permissions & Authentication --- Global** (All US-OS)

  -----------------------------------------------------------------------

  ----------- ---------------- -----------------------------------------------------
  **AC#**     **Category**     **Acceptance Criterion**

  **38.01**   **PERMISSION**   All offer-service endpoints require a valid JWT
                               issued by auth-service. Unauthenticated requests
                               return 401.

  **38.02**   **PERMISSION**   Only users with the client role may: create an offer,
                               edit an offer, withdraw an offer, accept or decline a
                               counter offer, resend an offer, approve an extension
                               request.

  **38.03**   **PERMISSION**   Only users with the talent role may: accept an offer,
                               decline an offer, submit a counter offer, withdraw a
                               counter offer, request an extension, resend a counter
                               offer.

  **38.04**   **PERMISSION**   Both client and talent may: view offer details, view
                               offer history, view the previous offer modal, access
                               the Message button.

  **38.05**   **PERMISSION**   A client may not act on offers they did not send. A
                               talent may not act on offers not addressed to them.
                               Cross-user access returns 403 with
                               OFFER_ACCESS_DENIED.

  **38.06**   **PERMISSION**   Admin role (if applicable) may read all offers for
                               support purposes but must not be able to perform
                               state-changing actions on behalf of either party.

  **38.07**   **SYSTEM**       The JWT payload must contain: sub (userId), role
                               (client \| talent). Offer-service extracts these
                               server-side from the token --- never from the request
                               body.
  ----------- ---------------- -----------------------------------------------------

  -----------------------------------------------------------------------
  **AC-OS-39 Cross-Cutting Error States & Edge Cases** (All US-OS)

  -----------------------------------------------------------------------

  ----------- -------------- -----------------------------------------------------
  **AC#**     **Category**   **Acceptance Criterion**

  **39.01**   **ERROR**      All 4xx API responses from offer-service must return
                             a JSON body in the standard error shape: { code,
                             message, details? }. Error codes must be documented
                             constants (e.g. OFFER_NOT_FOUND,
                             OFFER_NOT_ACTIONABLE, OFFER_EXPIRED,
                             OFFER_ACCESS_DENIED, OFFER_CONSENT_REQUIRED,
                             OFFER_ALREADY_EXISTS).

  **39.02**   **ERROR**      404 is returned when an offer or counter offer ID
                             does not exist in the database.

  **39.03**   **ERROR**      409 is returned when a state-transition attempt is
                             invalid given the offer\'s current status.

  **39.04**   **ERROR**      422 is returned for input validation failures
                             (missing required fields, invalid numeric values,
                             past start dates, etc.) with field-level error
                             details in the response body.

  **39.05**   **ERROR**      403 is returned when the requesting user does not
                             have permission to perform the action on the
                             specified offer.

  **39.06**   **ERROR**      If offer-service is temporarily unavailable, the
                             frontend must display a generic error state without
                             exposing internal error messages. The user should be
                             prompted to retry.

  **39.07**   **EDGE CASE**  All offer actions (accept, decline, counter,
                             withdraw, edit) must be idempotent where possible.
                             Duplicate submissions in quick succession must not
                             create duplicate records or emit duplicate events.

  **39.08**   **EDGE CASE**  If a talent is removed from the platform or
                             deactivated between offer creation and acceptance,
                             offer-service must return 422 with
                             TALENT_NOT_AVAILABLE and prevent further state
                             changes on that offer.

  **39.09**   **EDGE CASE**  Offer history must remain readable even if the talent
                             or client account is deactivated. Read-only access to
                             historical data must not depend on the account being
                             active.

  **39.10**   **EDGE CASE**  All timestamps stored and returned by offer-service
                             must be in ISO 8601 UTC format. The frontend is
                             responsible for locale-specific display formatting.

  **39.11**   **SYSTEM**     All offer-service write operations (status changes,
                             record creation) must use database transactions.
                             Partial writes that leave the database in an
                             inconsistent state are not acceptable.

  **39.12**   **SYSTEM**     Offer-service must not store sensitive financial data
                             beyond the agreed rate. It must not store payment
                             methods, billing information, or account numbers.

  **39.13**   **EDGE CASE**  If the jobListingId referenced on an offer is
                             archived or deleted in listings-service after the
                             offer is created, the offer itself must remain intact
                             and functional. The View Job link may return a 404
                             from listings-service, but this must not affect offer
                             state or actions.

  **39.14**   **SYSTEM**     GET /v1/offers/:id must return the Offer record
                             including: all stored terms, current status,
                             expiresAt, all relevant timestamps (createdAt,
                             acceptedAt, declinedAt, withdrawnAt, expiredAt where
                             applicable), and offerId.

  **39.15**   **SYSTEM**     GET /v1/offers/:id/history must return the full
                             ordered event log with all rounds, timestamps,
                             actors, and terms snapshots. It must not require the
                             offer to be in any particular status.
  ----------- -------------- -----------------------------------------------------
