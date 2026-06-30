**FE-OS --- Offer Service**

**Frontend Feature Definition**

**Service:** offer-service **References:** US-OS-01--56, AC-OS-01--39,
Design Screens **Roles:** Client, Talent

**1. Feature Overview**

The Offer Service manages the complete negotiation lifecycle between a
client and a talent member --- from the moment the client clicks Hire Me
on a talent profile through every round of negotiation until the offer
is accepted, declined, withdrawn, or expired. The frontend must support
all four contract type contexts (Project, Service, Team, and
Contract/Individual) across both the client and talent perspectives.

The offer lifecycle ends when an offer is accepted and offer.accepted is
emitted to contracts-service. All screens and interactions described in
this document are the sole responsibility of the offer-service frontend
integration.

**1.1 Contract Types**

All offer screens exist in four variants. The contract type is always
displayed as a pill badge. Content and field values differ per type;
structure and behavior are identical.

  --------------------- -------------------------------------------------
  **Contract Type**     **Description / Duration Rule**

  **Project**           Scoped work with defined phases. Start date is
                        system-suggested from scope (listings-service).
                        Contract title inherited from project name.

  **Service**           Ongoing or scoped service engagement. Start date
                        system-suggested for scoped, next Monday for
                        ongoing.

  **Team**              No-scope multi-role engagement. Start date
                        defaults to next Monday. Contract title required.

  **Contract**          Individual role hire (e.g. UX Designer Full Stack
                        Developer). No scope. Start date defaults to next
                        Monday. Contract title required.
  --------------------- -------------------------------------------------

**1.2 User Roles**

  --------------------- -------------------------------------------------
  **Role**              **Capabilities**

  **Client**            Sends, edits, withdraws, and resends offers.
                        Views and responds to counter offers
                        (accept/decline/counter back). Approves extension
                        requests.

  **Talent**            Views, accepts, and declines offers. Makes,
                        edits, withdraws, and resends counter offers.
                        Requests extensions on expired offers.
  --------------------- -------------------------------------------------

+-----------------------------------------------------------------------+
| *⚠ The frontend must derive the active user\'s role from the JWT      |
| payload (role: \"client\" \| \"talent\").*                            |
|                                                                       |
| Role determines which actions are rendered. Never show client actions |
| to a talent user or vice versa.                                       |
|                                                                       |
| All role enforcement must also be validated server-side --- the       |
| frontend role check is a UX gate only.                                |
+-----------------------------------------------------------------------+

**2. Offer Status Reference**

The frontend must handle every status for both primary offers and
counter offers. The table below defines each status, who produces it,
what renders on the offer card in chat, and what modal state is shown.

  --------------- -------------------- --------------------- -----------------------
  **Status**      **Produced By**      **Offer Card (Chat)** **Modal State**

  **PENDING**     Client               \"This offer expires  Full offer detail.
                  (send/edit/resend)   \[date\]\" CTA: View  Actions: Counter Offer
                                       Offer                 / Decline Offer /
                                                             Accept Offer (talent).
                                                             Withdraw Offer / Edit
                                                             Offer (client).

  **COUNTERED**   Talent (counter      \"Offer Countered --- Primary offer
                  offer)               This offer was        read-only. Counter
                                       replaced by new       offer card rendered
                                       terms.\" No CTA       separately in chat.

  **ACCEPTED**    Either party         \"Offer Accepted ---  Read-only. Accepted
                                       Starts on \[day,      state. View Contract
                                       date\]\" CTA: View    link shown.
                                       Contract              

  **DECLINED**    Talent (decline      \"Offer Declined ---  Declined details modal.
                  offer)               This offer is now     Shows decline reason.
                                       closed.\" CTA: View   Client: Edit/Resend.
                                       Details               Talent: Ask Now.

  **WITHDRAWN**   Client (withdraw     \"Offer Withdrawn --- Withdrawn details
                  offer)               This offer was        modal. Client:
                                       withdrawn.\" CTA:     Edit/Resend. Talent:
                                       View Details          Ask Now.

  **EXPIRED**     System (TTL)         \"Offer Expired ---   Expired details modal.
                                       This offer expired on Client: Edit/Resend.
                                       \[date\].\" CTA: View Talent: Request
                                       Details               Extension (≤30d) or Ask
                                                             Now (\>30d).
  --------------- -------------------- --------------------- -----------------------

**2.1 Counter Offer Status Reference**

  ---------------- ---------------------------- ------------------------------
  **Status**       **Counter Offer Card         **Notes**
                   (Chat)**                     

  **PENDING**      \"Counter Offer Submitted    Client sees: Counter Offer /
                   --- This counteroffer        Decline / Accept Offer. Talent
                   expires \[date\].\" CTA:     sees: Withdraw / Edit.
                   View Details                 

  **ACCEPTED**     \"Counter Offer Submitted    Both parties: read-only. Offer
                   --- These changes were       accepted.
                   accepted.\" CTA: View Offer  
                   History                      

  **DECLINED**     \"Counter Offer Submitted    Primary offer restored to
                   --- These changes weren\'t   PENDING.
                   accepted.\" CTA: View Offer  
                   History                      

  **WITHDRAWN**    \"Counter Offer Withdrawn    Primary offer restored to
                   --- The active offer expires PENDING.
                   \[date\].\" CTA: View Active 
                   Offer                        

  **EXPIRED**      \"Counter Offer Submitted    Primary offer restored to
                   --- This offer expired       PENDING if not independently
                   \[date\].\" CTA: View        expired.
                   Details                      

  **SUPERSEDED**   \"Counter Offer Submitted    Replaced by a new counter
                   --- This counter offer was   offer from either party.
                   superseded by another        
                   counteroffer.\" CTA: View    
                   Offer History                
  ---------------- ---------------------------- ------------------------------

**3. Screens & UI Components**

  -----------------------------------------------------------------------
  **3.1 Hire Me Modal** Entry point --- triggered from talent profile

  -----------------------------------------------------------------------

**Trigger**

- Client clicks the Hire Me button on any talent profile page.

- Modal opens in-place without page navigation.

**Header Components**

- Talent avatar (profile photo)

- Talent name (bold), role title, years of experience, location
  (secondary text)

- Pending invite avatar chip stack --- one chip per existing PENDING
  invite sent to this talent. Shows overflow count (+N) if \> 5 chips.
  Hidden if no pending invites exist.

**Path Selection**

- \"Invite to a new contract\" --- radio/toggle option

- \"Add to an existing contract\" --- radio/toggle option

- Both options always rendered simultaneously.

**States**

- **Default:** Both path options shown. No form fields yet.

- **New contract selected:** Offer creation form renders below path
  selection.

- **Existing contract selected:** Searchable contract list renders below
  path selection.

- **Empty (no existing contracts):** Contract list shows empty state
  message. New contract path remains available.

- **Dismissal:** X button closes modal. No offer record created.

  -----------------------------------------------------------------------
  **3.2 Existing Contract Selector** Sub-state of Hire Me --- \"Add to
  existing\"

  -----------------------------------------------------------------------

**Components**

- Search input --- filters contract list by name

- Contract list rows --- each row: contract name, phase label (if
  applicable), team member avatar stack with +N overflow

- Row selection --- clicking a row selects it and renders the offer form
  below

**Empty State**

- \"You have no active contracts. Invite this talent to a new contract
  instead.\" --- shown when the list is empty after search or by
  default.

**Error State**

- If the contract list fails to load: \"Could not load your contracts.
  Please try again.\" with a retry action.

  -----------------------------------------------------------------------
  **3.3 Offer Creation Form** New contract or after existing contract
  selected

  -----------------------------------------------------------------------

**Static Header (when contract has phases)**

- Contract/project name + phase label (e.g. \"React Native Mobile App /
  Design Phase +5\")

- \"Change Contract\" link --- allows client to switch the associated
  project or phase

**Field: Contract Title**

- Text input. Required for no-scope contract types (Team, Service
  Ongoing, Contract/Individual). Pre-populated for scoped projects.

- Placeholder: \"Enter your contract title\"

**Field: Rate**

- Preset pill buttons sourced from job listing service types (e.g. Logo
  Design \$45/hr, Web Development \$70/hr, UX/UI Design \$85/hr)

- \"Custom Rate\" pill --- opens inline text input + Cancel link

- Only one selection active at a time

**Field: Contract Duration**

- Preset pill buttons: 3 Months, 6 Months, 1 Year, 18 Months, 2 Years,
  Ongoing

- \"Custom Duration\" pill --- opens inline numeric input + unit
  dropdown (Months / Years) + Cancel link

- Only one selection active at a time

**Field: Work Schedule**

- Three options: Part Time (up to 30 hrs/week), Full Time (over 30
  hrs/week), Custom Work Schedule

- \"Custom Work Schedule\" --- opens inline numeric input + unit
  dropdown (Per day / Per week / Per month) + Cancel link

- Only one selection active at a time

**Field: Start Date**

- Behaviour depends on contract type --- see Section 4.1 and 4.2 for the
  full start date sub-flow.

**Field: Message (Optional)**

- Textarea with placeholder \"Write your message\" or \"Add a short
  note\...\"

- Character counter: 0/500, updates on every keystroke

- Max 500 characters. Field stops accepting input at 500.

**Primary CTA**

- \"Send Offer\" button --- disabled until all required fields are
  populated (rate, duration, schedule, startDate, title if required).
  Active state when all fields valid.

**Validation States**

- Each required field shows an inline error message on submission
  attempt if empty

- Custom inputs (rate, duration, schedule) show inline errors if
  non-numeric or invalid values are entered

- Start date in the past: \"Please select a date in the future.\" inline
  error

  -----------------------------------------------------------------------
  **3.4 Start Date Sub-Flow --- Scoped Projects** Confirm Start Date step

  -----------------------------------------------------------------------

**Components**

- Confirm Start Date step header

- Body text: \"Based on the project scope, the anticipated start date is
  \[date\]\" (project) or \"Based on the service scope, the anticipated
  start date is \[date\]\" (service)

- \"Confirm Start Date\" button (primary)

- \"Change Date\" button (secondary) --- opens calendar picker

**Calendar Picker**

- Opens inline below the start date step

- Suggested date is pre-selected and highlighted

- Month/year navigation (prev/next arrows)

- Full 7-day grid layout (Sun--Sat)

- Past dates rendered as disabled/non-selectable

- Today is visually distinguished

- Selecting a date updates the displayed date and closes the picker

**States**

- **Default:** Suggested date shown. Both buttons visible.

- **Calendar open:** Calendar renders with suggested date highlighted.

- **Date changed:** Updated date shown. Calendar closes.

- **No scope date available:** Calendar renders in manual mode with no
  pre-selection.

  -----------------------------------------------------------------------
  **3.5 Start Date Sub-Flow --- No-Scope Contracts** Calendar defaults to
  next Monday

  -----------------------------------------------------------------------

- Calendar picker renders immediately (no Confirm step)

- Next Monday from today is pre-selected

- Client may change the date or confirm the default

- Past dates disabled. If today is Monday, default is the following
  Monday (not today).

  -----------------------------------------------------------------------
  **3.6 Offer Sent Confirmation Screen** Post-submission --- within the
  Hire Me modal

  -----------------------------------------------------------------------

**Components**

- Confirmation icon/header

- Contract context line: e.g. \"CodeZen21 has been invited to join your
  new project Marketeq Projects Network\" / \"\...has been invited to a
  full-time contract\" / \"\...part-time contract\" / \"\...custom
  contract\"

- Team member avatar stack with new pending invite chip added --- shows
  up to 5 avatars + overflow count

- \"Pending Invite\" label on the new chip

- CTA 1: \"Review Your Offer\" --- navigates to the offer detail modal

- CTA 2: \"Continue Browsing\" --- closes modal, returns to talent
  profile or marketplace

- Optional: \"Review Your Team\" link when multiple invites have been
  sent

**Error State**

- If Review Your Offer fails to load: toast error shown, user remains on
  confirmation screen

  -----------------------------------------------------------------------
  **3.7 Active Offer Modal --- Talent View** Received offer in PENDING
  status

  -----------------------------------------------------------------------

**Header**

- \"Offer from @\[client username\]\" --- username is a clickable link
  to client profile

- X close button (top right)

**Sub-Header Row**

- Contract type badge pill (Project / Service / Team / Contract)

- Received date (\"Received on \[date\]\")

- \"Offer History\" link --- opens Offer History modal

- \"Message\" button (icon + label) --- opens chat thread with client

**Contract Info**

- Contract/project name (bold, large)

- \"View Job\" link with briefcase icon --- navigates to job listing
  page

**Offer Terms (data table)**

- Offer Rate --- value in bold (e.g. \$45/hr)

- Role --- value in bold

- Contract Duration --- value in bold

- Work Schedule --- value bold + secondary label (e.g. \"Full Time over
  30 hrs/week\")

- Start Date --- value in bold

**Message Section**

- Rendered only if client included a message. Shows message text in a
  contained block.

- Hidden if no message was sent --- no empty placeholder.

**Footer**

- Expiry line: \"This offer expires \[date\]\" (light text)

- Three action buttons: Counter Offer (secondary) \| Decline Offer
  (secondary) \| Accept Offer (primary blue)

**States**

- **PENDING:** All components shown as described above.

- **COUNTERED:** Action buttons hidden. Modal renders in read-only mode.
  Counter offer handles next action.

- **Any terminal status:** Routes to the appropriate details modal (see
  Sections 3.15--3.20).

- **Loading:** Skeleton loader for terms area.

- **Error:** Inline error: \"This offer could not be loaded. Please try
  again.\"

- **Not found:** \"This offer is no longer available.\"

  -----------------------------------------------------------------------
  **3.8 Accept Offer Modal** Talent action --- from offer modal

  -----------------------------------------------------------------------

**Components**

- \"Accept This Offer\" title

- Optional message to client textarea (placeholder: \"Add a short
  note\...\"). Character counter 0/500.

- Consent checkbox with label: \"I agree to Marketeq\'s Terms of
  Service, Privacy Policy, Dispute Policy, and Work Protection
  Guidelines.\" Each term is a hyperlink.

- Legal notice: \"Once you accept, this offer becomes an active
  contract.\"

- \"Cancel\" link (left) \| \"Accept Offer\" button (right, primary
  blue)

**Validation**

- Accept Offer button is disabled until consent checkbox is checked.
  Checkbox is never pre-checked.

- Button becomes active immediately when checkbox is checked.

**States**

- **Default:** Checkbox unchecked. Accept Offer button disabled.

- **Checkbox checked:** Accept Offer button enabled.

- **Submitting:** Button shows loading state. Both buttons disabled
  during request.

- **Success:** Modal closes. Chat updates with Offer Accepted event
  card. View Contract CTA shown.

- **Error --- offer expired mid-flow:** \"This offer has expired and can
  no longer be accepted.\" Inline error. Cancel enabled.

- **Error --- server:** Toast: \"Something went wrong. Please try
  again.\"

  -----------------------------------------------------------------------
  **3.9 Decline Offer Modal** Talent action --- from offer modal

  -----------------------------------------------------------------------

**Components**

- \"Decline This Offer\" title

- Subtitle: \"Help us understand why you\'re declining. If you\'re still
  interested but need different terms, you can make a counter offer.\"

- Free-text reason textarea (placeholder: \"Add a reason\...\").
  Character counter 0/500.

- Six quick-select reason chips (pill buttons, multi-select): Budget
  doesn\'t work \| Start date doesn\'t work \| Requirements are unclear
  \| Not a fit for my skills \| Too busy right now \| Need different
  terms

- Selecting a chip auto-populates the textarea with the chip label.
  Talent may then edit freely.

- \"Cancel\" link \| \"Counter Offer\" button (secondary) \| \"Decline
  offer\" button (primary)

**Validation**

- Decline offer button enabled when: at least one chip is selected OR
  textarea contains non-whitespace text.

- Counter Offer button is always enabled --- it does not require a
  reason.

**States**

- **Default:** Textarea empty. No chips selected. Decline button
  disabled.

- **Chip selected:** Chip highlighted. Textarea populated. Decline
  button enabled.

- **Text entered manually:** Decline button enabled. No chip required.

- **Counter Offer clicked:** Decline modal closes. Make Counter Offer
  modal opens. No decline recorded.

- **Submitting:** Loading state. Buttons disabled.

- **Success:** Modal closes. Offer card in chat updates to DECLINED
  state.

- **Error:** Toast: \"Something went wrong. Please try again.\"

  -----------------------------------------------------------------------
  **3.10 Make a Counter Offer Modal** Talent action --- from offer modal
  or decline modal

  -----------------------------------------------------------------------

**Header**

- \"Make a Counter Offer\" title

- Subtitle: \"Propose new terms that work for you.\"

- X close button

**Layout**

- Two-column layout: left column = original offer values (read-only
  labels), right column = editable input fields

**Editable Fields (right column)**

- Offer Rate --- same preset pills + Custom Rate as offer creation
  (Section 3.3)

- Contract Duration --- same preset pills + Custom Duration

- Work Schedule --- same preset options + Custom Work Schedule

- Start Date --- calendar picker (same rules as offer creation)

**Message Field**

- Optional message textarea. 0/500 counter.

**Rate Warning**

- When the entered rate exceeds the advisory threshold: warning message
  renders inline below the rate field: \"The client will be more likely
  to accept if your counteroffer is closer to \$\[X\]/hr.\"

- Warning is informational only. Does not disable the Review
  Counteroffer button.

**Footer**

- \"Cancel\" link \| \"Review Counteroffer\" button (primary)

**States**

- **Default:** Original values shown in left column. Right column fields
  empty/unselected.

- **Rate warning visible:** Warning box appears below rate field.

- **Review Counteroffer clicked:** Navigates to Review Counter Offer
  screen (Section 3.11).

- **Error --- offer expired mid-flow:** \"This offer has expired and can
  no longer be countered.\"

  -----------------------------------------------------------------------
  **3.11 Review Counter Offer Screen** Confirmation step before
  submitting counter offer

  -----------------------------------------------------------------------

**Components**

- \"Review Your Counter Offer\" title

- Subtitle: \"Confirm the details before sending to the client.\"

- Four data rows: Offer Rate, Contract Duration, Work Schedule, Start
  Date

- Changed fields: new value displayed boldly + \"(was \[original
  value\])\" in muted text alongside

- Unchanged fields: value shown with no annotation

- Message section --- shown if a message was entered

- Legal notice: \"By submitting, you agree to work under these terms if
  the client accepts your offer.\"

- \"Previous Offer\" link (if available) --- navigates to Previous Offer
  modal

**Footer**

- \"Edit Counter Offer\" button (secondary) --- returns to Make Counter
  Offer form with all values preserved

- \"Submit Counter Offer\" button (primary)

**States**

- **Submitting:** Submit button shows loading state. Both buttons
  disabled.

- **Success:** Modal closes. Counter offer card appears in chat. Offer
  card updates to COUNTERED.

- **Error:** Toast error. User remains on review screen.

  -----------------------------------------------------------------------
  **3.12 Active Offer Modal --- Client View (Sent Offer)** PENDING offer
  sent by client

  -----------------------------------------------------------------------

**Header**

- \"Offer to @\[talent username\]\" --- username is a clickable link to
  talent profile

- X close button

**Sub-Header Row**

- Contract type badge, sent date, Offer History link, Message button

**Contract Info & Terms**

- Contract/project name, View Job link, offer terms table (same
  structure as talent view)

**Footer**

- Expiry line: \"This offer expires \[date\]\"

- \"Withdraw Offer\" button (secondary) \| \"Edit Offer\" button
  (primary)

**States**

- **PENDING:** All components shown. Withdraw and Edit buttons active.

- **COUNTERED:** Withdraw and Edit buttons hidden. Client is directed to
  the counter offer card/modal.

- **Any terminal status:** Routes to appropriate details modal.

  -----------------------------------------------------------------------
  **3.13 Edit Offer Modal** Client action --- from sent offer modal

  -----------------------------------------------------------------------

**Header**

- \"Edit your offer\" title. Talent profile mini-header (avatar, name,
  experience, location).

**Layout**

- Two-column: left = current offer values (read-only), right = editable
  inputs

- Contract title field (editable, text input)

- \"Change Contract\" link shown when the offer has an associated scoped
  project with phases

**Editable Fields**

- Same four fields as counter offer: rate, duration, schedule, start
  date (Section 3.10)

- Optional message textarea (0/500)

**Footer**

- \"Cancel\" link \| \"Review Offer\" button (primary)

**Review Offer Screen**

- \"Review your offer --- Confirm the details before sending.\"

- Contract type badge + expiry date shown

- Talent profile mini-header

- Changed fields: new value + \"(was \[value\])\" diff notation.
  Unchanged: value only.

- \"View Previous Offer\" link

- \"Edit Offer\" link (returns to edit form) \| \"Send Offer\" button
  (primary)

**States**

- **Submitting:** Loading state. Buttons disabled.

- **Success:** Modal closes. Offer card in chat reflects updated terms.
  Expiry clock reset.

- **Error --- offer responded to mid-flow:** \"This offer has already
  been responded to and can no longer be edited.\" Inline error.

- **Error --- server:** Toast error.

  -----------------------------------------------------------------------
  **3.14 Withdraw Offer Modal** Client action --- primary offer
  withdrawal

  -----------------------------------------------------------------------

**Components**

- \"Withdraw this offer?\" title

- Body: \"This will cancel the offer and notify the recipient.\"

- Optional message to talent textarea (0/500)

- \"Cancel\" link \| \"Withdraw Offer\" button (destructive/red or
  secondary)

**States**

- **Default:** Message field empty. Withdraw button active.

- **Submitting:** Loading state. Buttons disabled.

- **Success:** Modal closes. Offer card updates to WITHDRAWN. Event card
  shown in chat.

- **Error --- offer accepted mid-flow:** \"This offer was already
  accepted and cannot be withdrawn.\"

- **Error --- server:** Toast error.

  -----------------------------------------------------------------------
  **3.15 Counter Offer Modal --- Client View** Client receives talent\'s
  counter offer

  -----------------------------------------------------------------------

**Header**

- \"Counter offer from @\[talent username\]\"

- X close button

**Sub-Header Row**

- Contract type badge, received date, Message button

**Contract Info**

- Contract/project name, View Job link

**Offer Terms**

- Rate row: new rate (bold) + arrow indicator + \"(was \$\[original
  rate\])\" in muted text

- Role, Contract Duration, Work Schedule, Start Date --- standard data
  rows

**Message Section**

- Shown if talent included a message. Hidden if not.

**Footer**

- Expiry notice: \"This counteroffer expires \[date\]. If you decline,
  your original offer stays active unless it expires.\"

- \"Counter Offer\" button (secondary) \| \"Decline\" button (secondary)
  \| \"Accept Offer\" button (primary blue)

**States**

- **PENDING:** All components and all three buttons shown.

- **Any terminal status:** Buttons hidden. Modal in read-only mode.

  -----------------------------------------------------------------------
  **3.16 Withdraw Counter Offer Modal** Talent action --- withdraw
  pending counter offer

  -----------------------------------------------------------------------

**Components**

- \"Withdraw this counter offer?\" title

- Body: \"Do you want to withdraw your counter offer? You can still
  accept the client\'s active offer afterward.\"

- Optional message textarea (0/500)

- \"Cancel\" link \| \"Withdraw Counter Offer\" button

**States**

- **Success:** Modal closes. Counter offer card updates to WITHDRAWN.
  Original offer card restores to PENDING with Counter Offer / Decline /
  Accept buttons re-enabled.

- **Error:** Toast error.

  -----------------------------------------------------------------------
  **3.17 Offer Expired Details Modal --- Client View** Client sees their
  expired sent offer

  -----------------------------------------------------------------------

**Header**

- \"This Offer Expired\" title

- X close button

**Sub-Header Row**

- Contract type badge, \"Expired on \[date\]\", Message button

- Contract/project name, \"Sent to @\[talent\]\" with avatar

**Offer Terms**

- Full terms table: rate, role, duration, schedule, start date. All
  read-only.

**Footer --- Three States**

- Default resendable: \"You can resend this offer or edit the terms
  before sending.\" + Edit Offer button + Resend Offer button

- Reopened: \"This offer was reopened \[N\] days ago\" + View Current
  Offer button

- Accepted post-expiry: \"This offer was accepted \[N\] days ago\" +
  View Contract button

**Loading / Error States**

- Loading: skeleton terms area

- Error: \"This offer could not be loaded.\"

  -----------------------------------------------------------------------
  **3.18 Offer Expired Details Modal --- Talent View** Talent sees an
  expired received offer

  -----------------------------------------------------------------------

**Header**

- \"This Offer Expired\" title

**Sub-Header Row**

- Contract type badge, \"Expired on \[date\]\", Message button

- Contract/project name, \"Offer from @\[client\]\" with avatar

**Offer Terms**

- Full terms table. Read-only.

**Footer --- Two States (mutually exclusive)**

- Expired ≤30 days: \"Want to revisit this? You can ask the client to
  extend the offer.\" + Request Extension button

- Expired \>30 days: \"Want to revisit this? Ask the client to see if
  the role is still available.\" + Ask Now button

+-----------------------------------------------------------------------+
| The frontend must calculate the elapsed time since expiredAt to       |
| determine which recovery action to render.                            |
|                                                                       |
| Use: elapsedDays = Math.floor((now - expiredAt) / (1000 \* 60 \* 60   |
| \* 24))                                                               |
|                                                                       |
| elapsedDays \<= 30 → Request Extension. elapsedDays \> 30 → Ask Now.  |
+-----------------------------------------------------------------------+

  -----------------------------------------------------------------------
  **3.19 Offer Declined Details Modal --- Client View**

  -----------------------------------------------------------------------

**Components**

- \"Your offer was declined\" title

- Contract type badge, \"Declined on \[date\]\", Message button,
  contract name, \"Sent to @\[talent\]\"

- Full offer terms table (read-only)

- Reason section --- shows decline reason text. Fallback: \"No reason
  provided.\" if empty.

- Footer: \"You can resend this offer or edit the terms before
  sending.\" + Edit Offer + Resend Offer buttons

**Empty State**

- Reason section must always render --- never show an empty section. Use
  \"No reason provided.\" as fallback.

  -----------------------------------------------------------------------
  **3.20 Offer Declined Details Modal --- Talent View**

  -----------------------------------------------------------------------

**Components**

- \"You declined this offer\" title

- Contract type badge, \"Declined on \[date\]\", Message button,
  contract name, \"Offer from @\[client\]\" with avatar

- Full offer terms table (read-only)

- Reason section --- shows the reason the talent provided

- Footer: \"Want to revisit this? Ask the client to see if the role is
  still open.\" + Ask Now button

  -----------------------------------------------------------------------
  **3.21 Offer Withdrawn Details Modal --- Client View**

  -----------------------------------------------------------------------

**Components**

- \"You withdrew this offer\" title

- Contract type badge, \"Withdrawn on \[date\]\", Message button,
  contract name, \"Sent to @\[talent\]\"

- Full offer terms table (read-only)

- Message section --- withdrawal message if sent, or \"No message was
  sent.\" fallback

- Footer: Edit Offer + Resend Offer buttons

  -----------------------------------------------------------------------
  **3.22 Offer Withdrawn Details Modal --- Talent View**

  -----------------------------------------------------------------------

**Components**

- \"This offer was withdrawn\" title

- Contract type badge, \"Withdrawn on \[date\]\", Message button,
  contract name, \"Offer from @\[client\]\"

- Full offer terms table (read-only)

- Message section --- withdrawal message or \"No message was sent.\"
  fallback

- Footer: \"Want to revisit this? Ask the client to see if the role is
  still available.\" + Ask Now button

  -----------------------------------------------------------------------
  **3.23 Resend Offer Modal** Client --- from expired/declined/withdrawn
  detail modals

  -----------------------------------------------------------------------

**Components**

- \"Resend this offer?\" title

- Body: \"This will resend the offer with the same terms. / Resending
  creates a new offer.\"

- \"View Terms\" link (chevron-left back arrow) --- navigates back to
  the expired/declined detail modal to review original terms

- Optional message to talent textarea (0/500)

- \"Cancel\" link \| \"Resend Offer\" button (primary)

**States**

- **Success:** Modal closes. Chat shows \"Offer Sent --- New offer sent
  with the same terms.\" toast. New PENDING offer card appears.

- **Error:** Toast error.

  -----------------------------------------------------------------------
  **3.24 Offer History Modal** Accessible from any offer modal via Offer
  History link

  -----------------------------------------------------------------------

**Components**

- \"Offer History\" title

- X close button

- Horizontal divider below header

- Chronological event list (oldest first)

**Each Event Row**

- Actor avatar (profile photo)

- Actor name (bold) + action label (e.g. \"Laura sent an offer\",
  \"Andrew sent a counteroffer\", \"Laura declined the counter offer\")

- Rate at the time of the action (right-aligned, bold)

- Relative timestamp (e.g. \"Last week at 3:14 PM\", \"Yesterday at 1:36
  PM\", \"Today at 5:00 PM\")

- Expand/collapse chevron

**Expanded Row (additional detail)**

- Role

- Contract Duration

- Work Schedule

- Start Date

- Message --- shown if one was included with this round

**Footer**

- \"View Contract\" CTA --- shown only when the offer thread has been
  accepted and a contract exists. Navigates to the contract detail page.

**States**

- **Loading:** Skeleton rows

- **Empty:** Should never occur --- history always has at least one
  entry (the initial send). If it does, show: \"No history available.\"

- **Error:** \"Could not load offer history. Please try again.\"

  -----------------------------------------------------------------------
  **3.25 Previous Offer Modal** Accessible via Offer History link in
  active offer modals

  -----------------------------------------------------------------------

**Components**

- Same layout as the active offer modal

- Header: \"Offer from @\[client\]\" (talent view) or \"Offer to
  @\[talent\]\" (client view)

- Contract type badge, received/sent date, Offer History link in header

- Contract name, View Job link

- Full offer terms table (read-only)

- Expiry line

**Actions --- Talent View**

- \"Decline Offer\" and \"Accept Offer\" buttons remain active ---
  talent can act on the original offer from this modal

**Actions --- Client View**

- \"Withdraw Offer\" button remains active

  -----------------------------------------------------------------------
  **3.26 Pending Counter Offer Modal --- Talent View (After Submission)**
  Talent viewing their own submitted counter offer

  -----------------------------------------------------------------------

**Components**

- \"Counter offer sent to @\[client username\]\" header

- Contract type badge, sent date, Message button

- Contract/project name, View Job link

- Rate row: proposed rate (bold) + arrow + \"(was \$\[original\])\"
  notation

- Role, Duration, Work Schedule, Start Date rows

- Message section (if included)

- Footer notice: \"This counteroffer expires \[date\]. You can edit or
  withdraw it anytime before then.\"

- \"Withdraw Counter Offer\" button (secondary) \| \"Edit Counter
  Offer\" button (primary)

**Edit Counter Offer**

- Opens the Make a Counter Offer form (Section 3.10) pre-populated with
  the submitted counter offer values

- On re-submission, the existing counter offer is superseded and a new
  one is created

  -----------------------------------------------------------------------
  **3.27 Offer Card --- In-Chat Inline Component** Embedded in chat
  thread for all offer events

  -----------------------------------------------------------------------

**Always-Present Components**

- Contract type badge pill

- Contract/project name (bold)

- Status label (coloured, right of name or below) --- see Section 2 for
  all status labels

- Status context line --- descriptive text beneath the name

- Summary row of key terms: Rate \| Role \| Duration \| Schedule

- CTA link --- contextual per status (see Section 2)

**Status-Specific Rendering**

  --------------------- -------------------------------------------------
  **Status**            **CTA + Context Line**

  **PENDING**           \"This offer expires \[date\].\" --- CTA: View
                        Offer

  **ACCEPTED**          \"Starts on \[day, date\].\" --- CTA: View
                        Contract

  **DECLINED**          \"This offer is now closed.\" --- CTA: View
                        Details

  **COUNTERED**         \"This offer was replaced by new terms.\" --- No
                        CTA (counter offer card renders separately)

  **WITHDRAWN**         \"This offer was withdrawn.\" --- CTA: View
                        Details

  **EXPIRED**           \"This offer expired on \[date\].\" --- CTA: View
                        Details
  --------------------- -------------------------------------------------

**Counter Offer Event Cards (separate from primary offer card)**

  --------------------- -------------------------------------------------
  **Counter Offer       **Context Line + CTA**
  State**               

  **Submitted           \"This counteroffer expires \[date\].\" --- CTA:
  (active)**            View Counter Offer or View Details

  **Submitted →         These changes were accepted.\" --- CTA: View
  Accepted**            Offer History

  **Submitted →         \"These changes weren\'t accepted.\" --- CTA:
  Declined**            View Offer History

  **Submitted →         \"This counter offer was withdrawn.\" --- CTA:
  Withdrawn**           View Offer History

  **Submitted →         \"This counter offer was superseded by another
  Superseded**          counteroffer.\" --- CTA: View Offer History

  **Submitted →         \"This offer expired \[date\].\" --- CTA: View
  Expired**             Details

  **Submitted →         \"This counter offer was resent.\" --- CTA: View
  Resent**              Offer History

  **Withdrawn           \"The active offer expires \[date\].\" --- CTA:
  (standalone)**        View Active Offer

  **Declined            \"These changes weren\'t accepted.\" --- CTA:
  (standalone)**        View Offer History
  --------------------- -------------------------------------------------

**4. User Flows**

**4.1 Client --- Send New Offer**

  --------------------- -------------------------------------------------
  **Step**              **Action / Screen**

  **1**                 Clicks Hire Me on talent profile → Hire Me modal
                        opens (Section 3.1)

  **2**                 Selects \"Invite to a new contract\"

  **3**                 Completes offer form: rate, duration, schedule,
                        start date, optional title, optional message
                        (Section 3.3)

  **4**                 For scoped project: Confirm Start Date sub-flow
                        (Section 3.4). For no-scope: Calendar picker
                        (Section 3.5)

  **5**                 Clicks Send Offer → loading state → offer-service
                        creates PENDING offer record

  **6**                 Offer Sent confirmation screen renders (Section
                        3.6)

  **7**                 Client clicks Review Your Offer or Continue
                        Browsing
  --------------------- -------------------------------------------------

**4.2 Client --- Add Offer to Existing Contract**

  --------------------- -------------------------------------------------
  **Step**              **Action / Screen**

  **1**                 Clicks Hire Me → selects \"Add to an existing
                        contract\"

  **2**                 Searches and selects a contract from the list
                        (Section 3.2)

  **3**                 Offer creation form renders pre-populated with
                        contract context (Section 3.3)

  **4**                 Completes form and sends offer --- same flow as
                        4.1 from Step 3
  --------------------- -------------------------------------------------

**4.3 Talent --- Accept Offer**

  --------------------- -------------------------------------------------
  **Step**              **Action / Screen**

  **1**                 Opens offer from chat or notification → Offer
                        modal (Section 3.7)

  **2**                 Clicks Accept Offer → Accept This Offer modal
                        (Section 3.8)

  **3**                 Checks consent checkbox → Accept Offer button
                        enables

  **4**                 Optionally adds message → clicks Accept Offer

  **5**                 Offer-service sets ACCEPTED, emits offer.accepted
                        → contracts-service creates ContractGroup

  **6**                 Chat updates with Offer Accepted card. View
                        Contract CTA shown.
  --------------------- -------------------------------------------------

**4.4 Talent --- Decline Offer (with optional counter pivot)**

  --------------------- -------------------------------------------------
  **Step**              **Action / Screen**

  **1**                 Opens offer modal (Section 3.7) → clicks Decline
                        Offer

  **2**                 Decline modal opens (Section 3.9)

  **3a**                Selects reason chip or types reason → clicks
                        Decline offer → DECLINED state.

  **3b (pivot)**        Clicks Counter Offer instead → decline modal
                        closes → Make Counter Offer modal opens (Section
                        3.10). No decline recorded.
  --------------------- -------------------------------------------------

**4.5 Talent --- Make Counter Offer**

  --------------------- -------------------------------------------------
  **Step**              **Action / Screen**

  **1**                 Opens offer modal (Section 3.7) → clicks Counter
                        Offer

  **2**                 Make Counter Offer modal (Section 3.10). Enters
                        new terms.

  **3**                 Rate warning shown if rate exceeds threshold
                        (advisory only)

  **4**                 Clicks Review Counteroffer → Review screen
                        (Section 3.11). Diff shown for changed fields.

  **5a**                Clicks Edit Counter Offer → returns to form with
                        values preserved.

  **5b**                Clicks Submit Counter Offer → PENDING counter
                        offer created. Primary offer → COUNTERED.

  **6**                 Counter offer card appears in chat. Notification
                        sent to client.
  --------------------- -------------------------------------------------

**4.6 Client --- Respond to Counter Offer**

  --------------------- -------------------------------------------------
  **Step**              **Action / Screen**

  **1**                 Opens counter offer from chat or notification →
                        Counter Offer modal (Section 3.15)

  **2a (accept)**       Clicks Accept Offer → ACCEPTED. offer.accepted
                        emitted. Chat shows Offer Accepted card.

  **2b (decline)**      Clicks Decline → DECLINED. Primary offer restored
                        to PENDING. Talent can act again.

  **2c (counter back)** Clicks Counter Offer → Make Counter Offer modal
                        pre-populated with original offer terms.
  --------------------- -------------------------------------------------

**4.7 Client --- Edit Pending Offer**

  --------------------- -------------------------------------------------
  **Step**              **Action / Screen**

  **1**                 Opens sent offer modal (Section 3.12) → clicks
                        Edit Offer

  **2**                 Edit Offer modal (Section 3.13). Modifies one or
                        more fields.

  **3**                 Clicks Review Offer → Review screen. Diff shown
                        for changed fields.

  **4**                 Clicks Send Offer → offer-service updates record
                        in-place. Expiry clock resets to +14 days.

  **5**                 Chat does not show a new card --- the existing
                        pending offer card updates.
  --------------------- -------------------------------------------------

**4.8 Client --- Withdraw Pending Offer**

  --------------------- -------------------------------------------------
  **Step**              **Action / Screen**

  **1**                 Opens sent offer modal (Section 3.12) → clicks
                        Withdraw Offer

  **2**                 Withdraw Offer confirmation modal (Section 3.14)

  **3**                 Optionally adds message → clicks Withdraw Offer

  **4**                 Offer → WITHDRAWN. Chat shows Offer Withdrawn
                        event card.
  --------------------- -------------------------------------------------

**4.9 Talent --- Withdraw Counter Offer**

  --------------------- -------------------------------------------------
  **Step**              **Action / Screen**

  **1**                 Opens submitted counter offer modal (Section
                        3.26) → clicks Withdraw Counter Offer

  **2**                 Withdraw Counter Offer modal (Section 3.16).
                        Optional message.

  **3**                 Counter offer → WITHDRAWN. Primary offer restored
                        to PENDING.

  **4**                 Original offer modal re-enables Counter Offer /
                        Decline / Accept buttons.
  --------------------- -------------------------------------------------

**4.10 Client --- Resend or Edit & Resend Expired/Declined/Withdrawn
Offer**

  --------------------- -------------------------------------------------
  **Step**              **Action / Screen**

  **1**                 Opens expired/declined/withdrawn details modal
                        (Sections 3.17--3.22)

  **2a (resend same)**  Clicks Resend Offer → Resend modal (Section 3.23)
                        → confirms → new PENDING offer created.

  **2b (edit &          Clicks Edit Offer → Edit Offer modal
  resend)**             pre-populated → updates terms → review → Send
                        Offer → new PENDING offer created.

  **3**                 Original offer retains terminal status. New offer
                        appears as PENDING in chat.
  --------------------- -------------------------------------------------

**4.11 Talent --- Request Extension on Expired Offer**

  --------------------- -------------------------------------------------
  **Step**              **Action / Screen**

  **1**                 Opens expired offer details modal (Section 3.18).
                        Elapsed ≤30 days.

  **2**                 Clicks Request Extension → request sent to
                        client. Client receives notification.

  **3 (client           Client approves → new PENDING offer created with
  approves)**           same terms + fresh expiry. Talent notified.

  **3 (client ignores / Extension request auto-cancelled. Talent UI
  30-day window         shifts to Ask Now path.
  closes)**             
  --------------------- -------------------------------------------------

**5. Field Validations**

These rules apply to all forms that include these fields: offer
creation, edit offer, make counter offer, edit counter offer.

  ------------- -------------- --------------------------- -----------------------
  **Field**     **Required**   **Rules**                   **Error Message**

  **Rate**      Yes            Positive numeric \> 0. No   \"Please enter a valid
                               symbols. Preset or custom.  hourly rate.\"

  **Contract    Yes            Preset or custom positive   \"Please select or
  Duration**                   integer \> 0. Unit required enter a contract
                               if custom.                  duration.\"

  **Work        Yes            Preset or custom positive   \"Please select or
  Schedule**                   integer \> 0 with unit      enter a work
                               selected.                   schedule.\"

  **Start       Yes            Must not be in the past.    \"Please select a date
  Date**                       Must be a valid calendar    in the future..\"
                               date.                       

  **Contract    Conditional    Required for Team, Service  \"Please enter a
  Title**                      Ongoing,                    contract title.\"
                               Contract/Individual. Max    
                               length: reasonable limit    
                               (e.g. 100 chars).           

  **Message**   No             Optional. Max 500           \"Message cannot exceed
                               characters. Whitespace-only 500 characters.\"
                               treated as empty.           (shown at counter)

  **Consent     Yes (accept    Must be checked. Never      Accept Offer button
  Checkbox**    only)          pre-checked. Cannot bypass. remains disabled. No
                                                           inline error text
                                                           needed.

  **Decline     Conditional    At least one chip selected  Decline button remains
  Reason**                     OR free-text non-empty to   disabled. No separate
                               enable Decline button.      error message.
  ------------- -------------- --------------------------- -----------------------

+-----------------------------------------------------------------------+
| Client-side validation must fire on blur (field exit) and on form     |
| submission attempt.                                                   |
|                                                                       |
| Server-side validation is the authoritative check --- 422 responses   |
| must surface field-level errors inline.                               |
|                                                                       |
| Never expose raw server error messages to the user --- map error      |
| codes to user-friendly strings.                                       |
+-----------------------------------------------------------------------+

**6. Permissions Matrix**

The frontend must render actions based on the user\'s role AND their
relationship to the offer. Role is derived from the JWT. The table below
defines what each role may do.

  ---------------------------- ------------------------ ------------------------
  **Action**                   **Client**               **Talent**

  **Send (create) an offer**   ✅ Yes                   ❌ No

  **View a sent offer (Sent    ✅ Yes                   ❌ No
  view)**                                               

  **View a received offer      ❌ No                    ✅ Yes
  (Received view)**                                     

  **Edit a PENDING offer**     ✅ Yes                   ❌ No

  **Withdraw a PENDING offer** ✅ Yes                   ❌ No

  **Accept an offer**          ❌ No                    ✅ Yes

  **Decline an offer**         ❌ No                    ✅ Yes

  **Submit a counter offer**   ❌ No                    ✅ Yes

  **View a counter offer       ✅ Yes                   ❌ No (talent views
  (received)**                                          their own submission)

  **Accept a counter offer**   ✅ Yes                   ❌ No

  **Decline a counter offer**  ✅ Yes                   ❌ No

  **Counter a counter offer**  ✅ Yes                   ✅ Yes (new round)

  **Withdraw a counter offer** ❌ No                    ✅ Yes

  **Resend an                  ✅ Yes                   ❌ No
  expired/declined/withdrawn                            
  offer**                                               

  **Request extension on       ❌ No                    ✅ Yes
  expired offer**                                       

  **Approve extension          ✅ Yes                   ❌ No
  request**                                             

  **View Offer History**       ✅ Yes                   ✅ Yes

  **View Previous Offer        ✅ Yes                   ✅ Yes
  modal**                                               

  **Click Message button**     ✅ Yes                   ✅ Yes
  ---------------------------- ------------------------ ------------------------

+-----------------------------------------------------------------------+
| If the API returns 403 for any action: show toast \"You don\'t have   |
| permission to perform this action.\" Do not render the action button  |
| at all if the role cannot perform it.                                 |
|                                                                       |
| If a user somehow reaches a forbidden action (e.g. direct URL), show  |
| 403 error screen.                                                     |
+-----------------------------------------------------------------------+

**7. State Management**

**7.1 Offer Data Shape**

The frontend offer object should hold the following fields at minimum.
All are populated from the GET /v1/offers/:id response.

  ------------------------- -------------------------------------------------
  **Field**                 **Type / Notes**

  **offerId**               string --- unique offer identifier

  **clientId**              string

  **talentId**              string

  **contractType**          \"project\" \| \"service\" \| \"team\" \|
                            \"contract\"

  **contractTitle**         string

  **rate**                  number --- hourly rate

  **duration**              string --- e.g. \"6 months\", \"ongoing\"

  **schedule**              string --- e.g. \"full-time\", \"part-time\",
                            \"custom: 20 hrs/week\"

  **startDate**             ISO 8601 date string (YYYY-MM-DD). Display
                            format: Monday, Jan 30, 2025

  **message**               string \| null

  **status**                \"PENDING\" \| \"COUNTERED\" \| \"ACCEPTED\" \|
                            \"DECLINED\" \| \"WITHDRAWN\" \| \"EXPIRED\"

  **expiresAt**             ISO 8601 datetime --- drives expiry display and
                            48h warning

  **createdAt**             ISO 8601 datetime

  **acceptedAt**            ISO 8601 datetime \| null

  **declinedAt**            ISO 8601 datetime \| null

  **withdrawnAt**           ISO 8601 datetime \| null

  **expiredAt**             ISO 8601 datetime \| null

  **declineReason**         string \| null --- reason code

  **declineReasonText**     string \| null --- free text

  **resendOfOfferId**       string \| null --- links resent offer to original

  **reopenedFromOfferId**   string \| null --- links extension-reopened offer
                            to original

  **activeCounterOffer**    CounterOffer \| null --- the current PENDING
                            counter offer if one exists

  **ndaSigned**             boolean --- from offer-service (populated via
                            nda.signed event from legal-service)
  ------------------------- -------------------------------------------------

**7.2 Counter Offer Data Shape**

  ---------------------------- -------------------------------------------------
  **Field**                    **Type / Notes**

  **counterOfferId**           string

  **parentOfferId**            string

  **submittedBy**              \"client\" \| \"talent\"

  **rate**                     number

  **duration**                 string

  **schedule**                 string

  **startDate**                ISO 8601 date string (YYYY-MM-DD). Display
                               format: Monday, Jan 30, 2025

  **message**                  string \| null

  **status**                   \"PENDING\" \| \"ACCEPTED\" \| \"DECLINED\" \|
                               \"WITHDRAWN\" \| \"EXPIRED\" \| \"SUPERSEDED\"

  **expiresAt**                ISO 8601 datetime

  **createdAt**                ISO 8601 datetime

  **resendOfCounterOfferId**   string \| null
  ---------------------------- -------------------------------------------------

**7.3 Offer History Entry Shape**

  --------------------- -------------------------------------------------
  **Field**             **Type / Notes**

  **eventId**           string

  **actor**             { userId, displayName, avatar }

  **action**            string --- e.g. \"sent an offer\", \"sent a
                        counteroffer\", \"declined the counter offer\"

  **rate**              number --- rate at the time of this event

  **timestamp**         ISO 8601 datetime --- displayed as relative time

  **terms**             { role, duration, schedule, startDate, message }
                        --- full terms at this round (shown on expand)
  --------------------- -------------------------------------------------

**7.4 Key Derived / Computed Values**

The frontend must derive these values from the raw offer data rather
than storing them independently:

- isExpiringSoon --- boolean. Derived from: now \> (expiresAt - 48h).
  Used to show expiry warning badge.

- isExpired --- boolean. Derived from: status === \"EXPIRED\".

- elapsedDaysSinceExpiry --- number. Derived from: Math.floor((now -
  expiredAt) / 86400000). Used to select recovery action (Request
  Extension vs Ask Now).

- hasChanged(field) --- boolean. Used in review screens to determine
  whether to show \"(was \$X)\" diff notation for a given field.

- canClientEdit --- boolean. status === \"PENDING\" && currentUser.role
  === \"client\"

- canClientWithdraw --- boolean. status === \"PENDING\" &&
  currentUser.role === \"client\"

- canTalentAccept --- boolean. status === \"PENDING\" &&
  currentUser.role === \"talent\"

- canTalentCounter --- boolean. status === \"PENDING\" &&
  currentUser.role === \"talent\"

- canTalentDecline --- boolean. status === \"PENDING\" &&
  currentUser.role === \"talent\"

**8. API Integration Points**

All endpoints are prefixed /v1. All requests require Authorization:
Bearer \[JWT\] header. All responses follow the standard { data, error }
envelope.

  ----------------------------------------------- --------------------- -------------------------
  **Method + Endpoint**                           **Called From**       **Frontend Action on
                                                                        Response**

  **POST /v1/offers**                             Offer creation form   201: Close form, show
                                                  --- Send Offer        Offer Sent confirmation.
                                                                        409: Show \"An offer
                                                                        already exists for this
                                                                        talent.\" 422: Show
                                                                        field-level validation
                                                                        errors inline.

  **GET /v1/offers/:id**                          Any offer modal open  200: Render offer detail.
                                                                        404: Show \"Offer not
                                                                        found.\" 403: Show
                                                                        \"Access denied.\"

  **PATCH /v1/offers/:id**                        Edit Offer review     200: Close modal, update
                                                  screen --- Send Offer offer card in chat. 409:
                                                                        Show \"This offer has
                                                                        been responded to.\" 422:
                                                                        Field errors inline.

  **POST /v1/offers/:id/accept**                  Accept This Offer --- 200: Close modal, show
                                                  Accept Offer button   Offer Accepted card. 409:
                                                                        Show \"This offer has
                                                                        expired or is no longer
                                                                        active.\" 422: Show
                                                                        consent error if
                                                                        applicable.

  **POST /v1/offers/:id/decline**                 Decline modal ---     200: Close modal, update
                                                  Decline offer button  offer card to DECLINED.
                                                                        409: Show state error.

  **POST /v1/offers/:id/withdraw**                Withdraw modal ---    200: Close modal, update
                                                  Withdraw Offer button offer card to WITHDRAWN.
                                                                        409: Show state error.

  **POST /v1/offers/:id/counter-offers**          Review Counter Offer  201: Close modal, show
                                                  --- Submit button     counter offer card in
                                                                        chat. 409: Show state
                                                                        error. 422: Field errors.

  **PATCH /v1/offers/:id/counter-offers/:cid**    Edit counter offer    200: Update counter
                                                  --- re-submit         offer. Same error
                                                                        handling as POST.

  **POST                                          Client --- Accept     200: Accepted. 409: State
  /v1/offers/:id/counter-offers/:cid/accept**     Offer on counter      error.
                                                  offer modal           

  **POST                                          Client --- Decline on 200: Declined. Primary
  /v1/offers/:id/counter-offers/:cid/decline**    counter offer modal   offer restored. 409:
                                                                        State error.

  **POST                                          Talent --- Withdraw   200: Withdrawn. Primary
  /v1/offers/:id/counter-offers/:cid/withdraw**   Counter Offer button  offer restored. 409:
                                                                        State error.

  **POST                                          Talent --- resend     201: New counter offer
  /v1/offers/:id/counter-offers/:cid/resend**     expired counter offer created. 409: Not
                                                                        expired.

  **POST /v1/offers/:id/resend**                  Client --- Resend     201: New PENDING offer
                                                  Offer modal           created. Render in chat.
                                                                        409: Cannot resend
                                                                        PENDING or ACCEPTED.

  **GET /v1/offers/:id/history**                  Offer History modal   200: Render event list.
                                                  open                  404/403: Error state.

  **GET /v1/offers/:id/recovery-options**         Expired offer details 200: Returns { action:
                                                  modal open            \"REQUEST_EXTENSION\" \|
                                                                        \"ASK_NOW\" }. Frontend
                                                                        renders correct footer.

  **POST /v1/offers/:id/request-extension**       Talent --- Request    200: Extension request
                                                  Extension button      created. Show
                                                                        confirmation. 409:
                                                                        Already pending.

  **POST /v1/offers/:id/approve-extension**       Client --- Approve    200: New offer created.
                                                  extension             409: Window closed.
  ----------------------------------------------- --------------------- -------------------------

+-----------------------------------------------------------------------+
| All API calls should show a loading/spinner state on the triggering   |
| button while in-flight.                                               |
|                                                                       |
| Buttons must be disabled during the request to prevent                |
| double-submission.                                                    |
|                                                                       |
| On network error (no response): toast \"Could not connect. Please     |
| check your connection and try again.\"                                |
|                                                                       |
| On 5xx server error: toast \"Something went wrong on our end. Please  |
| try again shortly.\"                                                  |
+-----------------------------------------------------------------------+

**9. Error States**

The following error states must be handled at the component level. Do
not show raw API error codes or stack traces to the user.

  --------------------------- ---------------------------------- ----------------------
  **Scenario**                **Error Display**                  **Recovery Action**

  **Offer not found (404)**   Inline in modal: \"This offer is   Close button only.
                              no longer available.\"             

  **Access denied (403)**     Inline in modal: \"You don\'t have Close button only.
                              access to this offer.\"            

  **Offer expired mid-flow    Inline below action: \"This offer  Cancel button. User
  (409 + OFFER_EXPIRED)**     has expired and can no longer be   can resend from
                              \[accepted/countered/edited\].\"   details modal.

  **Offer already responded   Inline: \"This offer has already   Cancel. Offer card in
  to (409)**                  been responded to.\"               chat reflects new
                                                                 state.

  **Duplicate offer (409 +    Toast: \"An active offer already   No action needed ---
  OFFER_ALREADY_EXISTS)**     exists for this talent.\"          existing offer
                                                                 remains.

  **Field validation failure  Inline per-field error beneath the User corrects fields
  (422)**                     relevant input.                    and resubmits.

  **Consent not checked       Consent checkbox highlighted.      User checks the box.
  (422 +                      Button stays disabled.             
  OFFER_CONSENT_REQUIRED)**                                      

  **Counter offer withdrawn   Inline: \"This counter offer has   Refresh offer state.
  mid-flow (409)**            been withdrawn.\"                  Return to active offer
                                                                 modal.

  **Modal load failure (500   Inline: \"Could not load this      Retry button
  or network)**               offer. Please try again.\" + Retry re-fetches offer data.
                              button.                            

  **Offer history load        Inline in history modal: \"Could   Retry button.
  failure**                   not load offer history. Please try 
                              again.\" + Retry.                  

  **Extension request already Toast: \"An extension request is   No further action.
  pending (409)**             already pending for this offer.\"  

  **Extension window closed   Inline: \"The extension window has Ask Now button shown.
  (409)**                     closed. You can ask the client if  
                              the role is still available.\"     
  --------------------------- ---------------------------------- ----------------------

**10. Empty States**

  --------------------- -------------------------------------------------
  **Component /         **Empty State Behaviour**
  Location**            

  **Pending invite      No chips rendered. Section hidden entirely --- no
  chips (Hire Me modal  blank row.
  header)**             

  **Existing contract   \"You have no active contracts. Invite this
  list (Hire Me         talent to a new contract instead.\"
  modal)**              

  **Message section     Withdrawal message: \"No message was sent.\" ---
  (offer/counter offer  section always renders with fallback. Offer
  details)**            message: section hidden if no message.

  **Decline reason      Always renders. Fallback: \"No reason provided.\"
  section (declined     if reason was not stored.
  offer modal)**        

  **Offer History       Should never be empty. If it is: \"No history
  modal**               available.\" --- defensive fallback only.

  **Counter offer card  Not applicable --- cards only render when events
  (chat)**              occur.
  --------------------- -------------------------------------------------

**11. Edge Cases the Frontend Must Handle**

**11.1 Race Conditions**

- Offer expires between opening a modal and submitting: the API returns
  409 OFFER_EXPIRED. The frontend must not assume the offer is still
  active based on locally cached state.

- Talent accepts offer while client is on the withdraw confirmation: API
  returns 409. Client sees \"This offer was already accepted and cannot
  be withdrawn.\"

- Client accepts counter offer while talent withdraws it: whichever
  request reaches the server first wins. The loser receives a 409 and
  must refresh state.

- Double-submit (button clicked twice rapidly): disable the button
  immediately on first click. The server is idempotent but the frontend
  must not send duplicate requests.

**11.2 Status Change During Active Session**

- If the user has an offer modal open and the offer status changes (e.g.
  it expires or is responded to by the other party), the modal must
  reflect the new state. Use polling or a real-time update channel
  (Ably) to detect status changes without requiring a page refresh.

- If an offer modal is open and the status changes to ACCEPTED: the
  action buttons must be immediately hidden and replaced with \"View
  Contract.\"

- If a counter offer is accepted while the client is viewing it: replace
  the three action buttons with a \"View Contract\" CTA immediately.

**11.3 The 30-Day Expiry Window Boundary**

- The frontend must compute elapsedDaysSinceExpiry on every modal render
  --- not cache it. The boundary from Request Extension to Ask Now
  switches at exactly 30 days.

- If the elapsedDays value is borderline (e.g. 29.9 days), the frontend
  must floor the value: Math.floor(). Never round up.

- If Request Extension is clicked at exactly day 30, the API may return
  409 (window closed). Show the error and switch the footer to the Ask
  Now state.

**11.4 Multiple Negotiation Rounds**

- There is no limit to the number of negotiation rounds. The Offer
  History modal must paginate or scroll if the list grows long.

- The \"(was \$X)\" diff notation must always reference the previous
  round\'s value --- not the original offer. The frontend must track the
  prior round value to compute the correct diff.

- A superseded counter offer card in chat must render in a visually
  distinct state (greyed out or labelled \"superseded\") so the user
  understands it is no longer active.

**11.5 Contract Type Variant Rendering**

- All offer modals, cards, and detail screens must render correctly for
  all four contract types: Project, Service, Team, Contract
  (Individual).

- The contract type badge must always be visible and accurate.

- Start date sub-flow (Confirm Start Date vs Calendar only) is
  determined by contractType --- not inferred from any other field.

- The \"Change Contract\" link in Edit Offer is only shown when
  contractType is project or service and the contract has phases.

**11.6 NDA Required Context**

- If ndaSigned is false on an offer associated with an NDA-required
  listing, the frontend must surface the NDA signing prompt before
  allowing the talent to view the full scope. This is a legal-service
  concern but it creates a direct requirement on the offer detail view:
  the \"View Job\" link must check NDA status before navigating to the
  full scope view.

- NDA signing does not accept the offer --- the offer actions remain
  independent. This must be clearly communicated if the NDA prompt is
  shown within an offer context.

**11.7 Resend Links to Original**

- When a resent offer is shown in chat (\"Offer Sent --- New offer sent
  with the same terms\"), the original expired/declined/withdrawn offer
  card must remain in history above it. Do not remove or replace it.

- The resent offer is a new independent PENDING offer. It has its own
  expiresAt and its own offer ID. The user should be able to view both
  independently via their respective View Details / View Offer CTAs.

**11.8 Deactivated Accounts**

- If either party\'s account is deactivated after an offer is created,
  the offer history and details must remain readable for the other
  party.

- If the talent profile linked via View Job no longer exists, the View
  Job link should either be hidden or show a graceful \"This listing is
  no longer available\" message.
