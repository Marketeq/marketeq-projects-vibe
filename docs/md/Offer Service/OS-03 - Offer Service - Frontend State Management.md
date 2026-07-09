**SM-OS --- Offer Service**

**Frontend State Management**

45 screens · Every trigger, every navigation, every state condition ·
Roles: Client (C) · Talent (T) · Both (B)

This document maps every screen in the offer service to its full state
logic: what renders on each screen per offer status, every button and
link trigger, and the exact screen each trigger navigates to. Organised
in flow order from entry point through to contract handoff.

**Trigger Type Legend**

  --------------------- ------------ ------------------------ ------------------
  **Trigger**           **Type**     **Navigates To**         **Condition /
                                                              Notes**

  **Example**           **Button**   Target Screen            Rendered as a
                                                              clickable button
                                                              element

  **Example**           **Link**     Target Screen            Rendered as a text
                                                              hyperlink

  **Example**           **CTA**      Target Screen            Primary
                                                              call-to-action
                                                              button (blue /
                                                              filled)

  **Example**           **System**   (state change)           Triggered
                                                              automatically by
                                                              the system --- no
                                                              user click
  --------------------- ------------ ------------------------ ------------------

**Group 1 --- Entry Points**

  -----------------------------------------------------------------------
  **S-01 Talent Profile Page** \[Client\] · Client browses talent
  marketplace

  -----------------------------------------------------------------------

  ------------------ ---------- ------------------------------------------
  **State /          **Offer    **What Renders on This Screen**
  Condition**        Status**   

  **No offer         ---        Normal profile view. Hire Me button
  exists**                      active. Save button. View Full Profile
                                link.

  **Active offer     PENDING    Hire Me button disabled or hidden. Cannot
  exists (PENDING)**            send duplicate offer to same talent.
  ------------------ ---------- ------------------------------------------

  --------------------- ------------ ------------------------ ------------------
  **Trigger**           **Type**     **Navigates To**         **Condition /
                                                              Notes**

  **Hire Me**           **CTA**      S-04 --- Hire Me Modal   Client only. Opens
                                     (Path Selection)         Hire Me modal
                                                              inline.

  **Save**              **Button**   (bookmark toggle)        Saves talent to
                                                              Favorites. No
                                                              navigation.

  **View Full Profile** **Link**     Talent Full Profile Page Navigates away
                                                              from current view.

  **Message**           **Button**   Chat/Inbox Thread (S-03) Opens or creates
                                                              chat thread with
                                                              talent.

  **Rate \$X--\$X /     **Link**     Earnings Detail Popup    Shows rate
  View Details**                                              breakdown.
                                                              Offer-service not
                                                              involved.

  **NDA Required badge  **Link**     S-38 --- NDA Review      Only shown if
  (on job listing)**                 Modal                    listing has NDA
                                                              requirement and
                                                              talent has not
                                                              signed.
  --------------------- ------------ ------------------------ ------------------

  -----------------------------------------------------------------------
  **S-02 Notification Bell Dropdown** \[Both\] · Bell icon in top nav ---
  all offer-related notifications

  -----------------------------------------------------------------------

  ------------------ ------------ ------------------------------------------
  **State /          **Offer      **What Renders on This Screen**
  Condition**        Status**     

  **New Offer        PENDING      Row: \"New Offer --- @\[client\] sent you
  (Talent)**                      an offer to join \[project\]\" + View
                                  Offer CTA

  **Counter Offer    COUNTERED    Row: \"@\[talent\] sent you a counter
  Received                        offer for project \[name\]\" + View
  (Client)**                      Counter Offer CTA

  **Counter Offer    ACCEPTED     Row: \"@\[talent\] accepted your counter
  Accepted                        offer for project \[name\]\" + View
  (Client)**                      Contract CTA

  **Counter Offer    PENDING      Row: \"@\[talent\] declined your counter
  Declined           (restored)   offer for project \[name\]\" + View Active
  (Client)**                      Offer CTA

  **Counter Offer    PENDING      Row: \"@\[talent\] withdrew their counter
  Withdrawn          (restored)   offer for project \[name\]\" + View Active
  (Client)**                      Offer CTA

  **Counter Offer    COUNTERED    Row: \"@\[talent\] edited their counter
  Edited (Client)**               offer for project \[name\]\" + View
                                  Counter Offer CTA

  **Offer Declined   DECLINED     Row: \"@\[talent\] declined your offer for
  (Client)**                      project \[name\]\" + View Details CTA

  **Offer Expiring   PENDING      Row: \"The offer for project \[name\]
  Soon (Both)**                   expires in 48h\" + View Offer CTA

  **Offer Expired    EXPIRED      Row: \"The offer for project \[name\] has
  (Both)**                        expired\" + View Details CTA
  ------------------ ------------ ------------------------------------------

  --------------------- ---------- ------------------------ ----------------------------
  **Trigger**           **Type**   **Navigates To**         **Condition / Notes**

  **View Offer**        **CTA**    S-15 --- Active Offer    Routes based on current user
                                   Modal (Talent) OR S-11   role.
                                   --- Active Offer Modal   
                                   (Client)                 

  **View Counter        **CTA**    S-23 --- Counter Offer   Client receiving talent\'s
  Offer**                          Modal (Client)           counter offer.

  **View Active Offer** **CTA**    S-11 --- Active Offer    Routes based on role.
                                   Modal (Client) OR S-15   
                                   --- Active Offer Modal   
                                   (Talent)                 

  **View Contract**     **CTA**    S-45 --- Contract Detail Offer accepted, contract
                                   Page                     exists.

  **View Details**      **CTA**    S-26--S-32 ---           Routes to correct
                                   Appropriate Details      expired/declined/withdrawn
                                   Modal                    modal based on status and
                                                            role.

  **View All**          **Link**   Full Notifications Page  Navigates to full
                                                            notification history.
                                                            Outside offer-service scope.
  --------------------- ---------- ------------------------ ----------------------------

  -----------------------------------------------------------------------
  **S-03 Chat / Inbox Thread** \[Both\] · All offer interactions occur in
  this shared thread

  -----------------------------------------------------------------------

The chat thread is the primary surface for the entire offer lifecycle.
Offer cards and event cards are embedded inline within the message
thread. Every offer between a client-talent pair appears in one
continuous thread.

  ------------------ ------------ ------------------------------------------
  **State /          **Offer      **What Renders on This Screen**
  Condition**        Status**     

  **Offer card ---   PENDING      Offer card: contract type badge, contract
  PENDING (both                   name, \"This offer expires \[date\]\",
  roles)**                        terms summary row, View Offer CTA.

  **Offer card ---   COUNTERED    Offer card: \"Offer Countered --- This
  COUNTERED (both                 offer was replaced by new terms.\" No CTA
  roles)**                        on this card. Counter offer card renders
                                  below it.

  **Offer card ---   ACCEPTED     Offer card: \"Offer Accepted --- Starts on
  ACCEPTED (both                  \[day, date\].\" View Contract CTA.
  roles)**                        

  **Offer card ---   DECLINED     Offer card: \"Offer Declined --- This
  DECLINED (both                  offer is now closed.\" View Details CTA.
  roles)**                        

  **Offer card ---   WITHDRAWN    Offer card: \"Offer Withdrawn --- This
  WITHDRAWN (both                 offer was withdrawn.\" View Details CTA.
  roles)**                        

  **Offer card ---   EXPIRED      Offer card: \"Offer Expired --- This offer
  EXPIRED (both                   expired on \[date\].\" View Details CTA.
  roles)**                        

  **Counter offer    CO PENDING   Card: \"Counter Offer Submitted --- This
  card --- PENDING**              counteroffer expires \[date\].\" View
                                  Details CTA.

  **Counter offer    CO WITHDRAWN Card: \"Counter Offer Withdrawn --- The
  card ---                        active offer expires \[date\].\" View
  WITHDRAWN**                     Active Offer CTA.

  **Counter offer    CO DECLINED  Card: \"Counter Offer Submitted --- These
  card ---                        changes weren\'t accepted.\" View Offer
  DECLINED**                      History CTA.

  **Counter offer    CO           Card: \"Counter Offer Submitted --- This
  card ---           SUPERSEDED   counter offer was superseded by another
  SUPERSEDED**                    counteroffer.\" View Offer History CTA.

  **Counter offer    CO RESENT    Card: \"Counter Offer Resent --- These
  card --- RESENT**               changes were accepted.\" View Offer
                                  History CTA.

  **Counter offer    CO ACCEPTED  Card: \"Counter Offer Resent --- These
  card ---                        changes were accepted.\" View Offer
  ACCEPTED**                      History CTA + View Contract CTA.

  **Extension        EXPIRED      Plain chat message with label:
  request message                 \"\[Project\] This offer expired on
  (Talent)**                      \[date\].\" No card. Resend Counteroffer /
                                  Decline inline actions on client side.

  **Client extension EXPIRED      Client sees message card + \"Edit & Resend
  approval (inline                Offer\" button + \"Decline\" button inline
  card)**                         in chat.
  ------------------ ------------ ------------------------------------------

  ----------------------------- ------------ ------------------------ ------------------
  **Trigger**                   **Type**     **Navigates To**         **Condition /
                                                                      Notes**

  **View Offer (on offer        **CTA**      S-11 or S-15 --- Active  Routes by role.
  card)**                                    Offer Modal              Client → S-11,
                                                                      Talent → S-15.

  **View Counter Offer (on      **CTA**      S-23 --- Counter Offer   Routes by role.
  counter offer card)**                      Modal (Client) OR S-20   
                                             --- Pending Counter      
                                             Offer Modal (Talent)     

  **View Active Offer (on       **CTA**      S-11 or S-15 --- Active  Routes by role.
  counter offer withdrawn                    Offer Modal              
  card)**                                                             

  **View Contract (on accepted  **CTA**      S-45 --- Contract Detail Contract must
  card)**                                    Page                     exist.

  **View Details                **CTA**      S-26--S-32 ---           Routes to correct
  (expired/declined/withdrawn                Appropriate Details      modal per status +
  card)**                                    Modal                    role.

  **View Offer History (on      **CTA**      S-35 --- Offer History   Available after
  counter offer event card)**                Modal                    any counter offer
                                                                      event.

  **Edit & Resend Offer (inline **Button**   S-12 --- Edit Offer      Only shown on
  on extension request card ---              Modal                    extension request
  Client)**                                                           message card.
                                                                      Client only.

  **Decline (inline on          **Button**   (system: extension       Client declines
  extension request card ---                 declined message in      talent\'s
  Client)**                                  chat)                    extension request.

  **Resend Counteroffer (inline **Button**   S-34 --- Resend Counter  Shown when client
  card --- Talent)**                         Offer Confirmation       asks talent to
                                                                      resend expired
                                                                      counteroffer.

  **Decline (inline on          **Button**   (system: decline message Talent declines
  counteroffer expired card ---              in chat)                 client request to
  Talent)**                                                           resend.

  **@\[username\] link**        **Link**     User Profile Page        Opens profile of
                                                                      the other party.
  ----------------------------- ------------ ------------------------ ------------------

**Group 2 --- Hire Me / Offer Creation**

  -----------------------------------------------------------------------
  **S-04 Hire Me Modal --- Path Selection** \[Client\] · First screen
  after clicking Hire Me on talent profile

  -----------------------------------------------------------------------

  ------------------ ---------- ------------------------------------------
  **State /          **Offer    **What Renders on This Screen**
  Condition**        Status**   

  **Default**        ---        Talent mini-header (avatar, name, role,
                                experience, location). Pending invite
                                avatar chips (if any). Two path options:
                                \"Invite to a new contract\" and \"Add to
                                an existing contract\".

  **Pending invites  ---        Avatar chip stack shown in header. One
  exist**                       chip per PENDING offer sent to this
                                talent.

  **No pending       ---        Avatar chip area hidden entirely.
  invites**                     
  ------------------ ---------- ------------------------------------------

  --------------------- ------------ ------------------------ ------------------
  **Trigger**           **Type**     **Navigates To**         **Condition /
                                                              Notes**

  **\"Invite to a new   **Button**   S-06 --- Offer Creation  Client selects
  contract\"**                       Form (New Contract)      this path.

  **\"Add to an         **Button**   S-05 --- Existing        Client selects
  existing contract\"**              Contract Selector        this path.

  **X (close)**         **Button**   (modal closes)           Returns to talent
                                                              profile. No offer
                                                              created.

  **Back (if shown)**   **Link**     Talent Profile Page      Dismiss without
                                                              acting.
  --------------------- ------------ ------------------------ ------------------

  -----------------------------------------------------------------------
  **S-05 Existing Contract Selector** \[Client\] · Sub-state within Hire
  Me --- \"Add to an existing contract\" path

  -----------------------------------------------------------------------

  ------------------ ---------- ------------------------------------------
  **State /          **Offer    **What Renders on This Screen**
  Condition**        Status**   

  **Contracts        ---        Search input + scrollable list of active
  available**                   contracts. Each row: contract name, phase,
                                team avatars.

  **No active        ---        Empty state: \"You have no active
  contracts**                   contracts. Invite this talent to a new
                                contract instead.\"

  **Search active**  ---        List filtered by search term in real time.
  ------------------ ---------- ------------------------------------------

  --------------------- ------------ ------------------------ ------------------
  **Trigger**           **Type**     **Navigates To**         **Condition /
                                                              Notes**

  **Contract row (click **Button**   S-07 --- Offer Creation  Selects the
  to select)**                       Form (Existing Contract) contract and
                                                              renders the offer
                                                              form below.

  **\"Invite to a new   **Link**     S-06 --- Offer Creation  Fallback from
  contract instead\"                 Form (New Contract)      empty state.
  (empty state)**                                             

  **X (close)**         **Button**   (modal closes)           No offer created.
  --------------------- ------------ ------------------------ ------------------

  -----------------------------------------------------------------------
  **S-06 Offer Creation Form --- New Contract** \[Client\] · Entry: path
  \"Invite to a new contract\"

  -----------------------------------------------------------------------

  ------------------ ---------- ------------------------------------------
  **State /          **Offer    **What Renders on This Screen**
  Condition**        Status**   

  **Default --- all  ---        Contract title input. Rate selector
  fields empty**                (presets + Custom Rate). Duration selector
                                (presets + Custom Duration). Schedule
                                selector (3 options + Custom). Start date
                                step. Message textarea. Send Offer button
                                disabled.

  **All required     ---        Send Offer button enabled.
  fields filled**               

  **Custom Rate      ---        Inline numeric input + Cancel link
  selected**                    rendered below rate selector.

  **Custom Duration  ---        Inline numeric input + unit dropdown
  selected**                    (Months/Years) + Cancel link.

  **Custom Schedule  ---        Inline numeric input + unit dropdown (Per
  selected**                    day/Per week/Per month) + Cancel link.

  **Scoped project   ---        Confirm Start Date step shown (S-08).
  context**                     Calendar not shown until \"Change Date\"
                                clicked.

  **No-scope         ---        Calendar picker shown directly (S-09).
  contract**                    Next Monday pre-selected.
  ------------------ ---------- ------------------------------------------

  --------------------- ------------ ------------------------ ------------------
  **Trigger**           **Type**     **Navigates To**         **Condition /
                                                              Notes**

  **Rate preset pill**  **Button**   (rate field updated)     Single-select.
                                                              Deselects
                                                              previous.

  **Custom Rate**       **Button**   (inline custom input     Renders below rate
                                     opens)                   selector.

  **Cancel (custom      **Link**     (custom input closes,    Returns to preset
  rate)**                            rate unselected)         selection.

  **Duration preset     **Button**   (duration field updated) Single-select.
  pill**                                                      

  **Custom Duration**   **Button**   (inline custom duration  Renders below
                                     input opens)             duration selector.

  **Cancel (custom      **Link**     (custom input closes)    Returns to
  duration)**                                                 presets.

  **Part Time / Full    **Button**   (schedule field updated) Single-select.
  Time / Custom**                                             

  **Custom Work         **Button**   (inline custom schedule  Renders below
  Schedule**                         input opens)             schedule selector.

  **Cancel (custom      **Link**     (custom input closes)    Returns to
  schedule)**                                                 presets.

  **Confirm Start Date  **Button**   (start date confirmed,   Scoped project
  (scoped)**                         advances form)           path only.

  **Change Date         **Button**   (calendar picker opens   Scoped project
  (scoped)**                         with suggested date      path only.
                                     pre-selected)            

  **Calendar date       **Button**   (start date updated,     Past dates
  selection**                        calendar closes)         disabled.

  **Send Offer**        **CTA**      S-10 --- Offer Sent      Only active when
                                     Confirmation             all required
                                                              fields complete.
                                                              Creates PENDING
                                                              offer record.

  **Back / X**          **Button**   S-04 --- Hire Me Modal   Returns to path
                                     (Path Selection)         selection. No
                                                              offer created.
  --------------------- ------------ ------------------------ ------------------

  -----------------------------------------------------------------------
  **S-07 Offer Creation Form --- Existing Contract** \[Client\] · Entry:
  existing contract selected from S-05

  -----------------------------------------------------------------------

Same layout and field logic as S-06. Differences noted below.

  ------------------ ---------- ------------------------------------------
  **State /          **Offer    **What Renders on This Screen**
  Condition**        Status**   

  **Contract context ---        Contract name + phase label shown in
  shown**                       header row. \"Change Project\" link shown.
  ------------------ ---------- ------------------------------------------

  --------------------- ---------- ------------------------ ------------------
  **Trigger**           **Type**   **Navigates To**         **Condition /
                                                            Notes**

  **Change Project**    **Link**   S-05 --- Existing        Allows switching
                                   Contract Selector        the associated
                                                            contract.

  **Send Offer**        **CTA**    S-10 --- Offer Sent      Same as S-06.
                                   Confirmation             

  **All other           **---**    (same as S-06)           See S-06 trigger
  triggers**                                                table.
  --------------------- ---------- ------------------------ ------------------

  -----------------------------------------------------------------------
  **S-10 Offer Sent Confirmation** \[Client\] · Shown after Send Offer is
  submitted successfully

  -----------------------------------------------------------------------

  ------------------ ---------- ------------------------------------------
  **State /          **Offer    **What Renders on This Screen**
  Condition**        Status**   

  **Single invite    ---        Confirmation message. Talent avatar as
  sent**                        pending chip in team stack. Review Your
                                Offer CTA + Continue Browsing CTA.

  **Multiple invites ---        Multiple pending chips in avatar stack (up
  in flight**                   to 5 visible + overflow count).
  ------------------ ---------- ------------------------------------------

  --------------------- ------------ ------------------------ ------------------
  **Trigger**           **Type**     **Navigates To**         **Condition /
                                                              Notes**

  **Review Your Offer** **CTA**      S-11 --- Active Offer    Opens the offer
                                     Modal (Client)           just sent.

  **Continue Browsing** **Button**   (modal closes, returns   Dismisses
                                     to talent profile)       confirmation
                                                              without navigating
                                                              away.

  **X (close)**         **Button**   (modal closes)           Same as Continue
                                                              Browsing.

  **Review Your Team**  **Link**     My Team Page (client     Links to client\'s
                                     nav)                     team management
                                                              page in nav.
  --------------------- ------------ ------------------------ ------------------

**Group 3 --- Client --- Active Offer Management**

  -----------------------------------------------------------------------
  **S-11 Active Offer Modal --- Client (Sent)** \[Client\] · PENDING
  offer sent by client

  -----------------------------------------------------------------------

  ------------------ ----------- ------------------------------------------
  **State /          **Offer     **What Renders on This Screen**
  Condition**        Status**    

  **PENDING --- no   PENDING     Full offer terms. Withdraw Offer + Edit
  counter offer**                Offer buttons. Message button. Offer
                                 History link.

  **COUNTERED ---    COUNTERED   Withdraw and Edit buttons hidden. Client
  counter offer                  directed to counter offer modal via chat
  received**                     card.

  **Any terminal     EXPIRED /   Routes to S-26, S-29, or S-31 based on
  status**           DECLINED /  status.
                     WITHDRAWN   
  ------------------ ----------- ------------------------------------------

  --------------------- ------------ ------------------------ ------------------
  **Trigger**           **Type**     **Navigates To**         **Condition /
                                                              Notes**

  **X (close)**         **Button**   (modal closes)           Returns to
                                                              chat/inbox.

  **Message**           **Button**   S-03 --- Chat/Inbox      Opens chat thread
                                     Thread                   with talent.

  **Offer History**     **Link**     S-35 --- Offer History   Opens full
                                     Modal                    negotiation
                                                              history.

  **View Job**          **Link**     Job Listing Page         Navigates to
                                                              associated job
                                                              listing.

  **@\[talent           **Link**     Talent Profile Page      Opens talent\'s
  username\]**                                                profile.

  **Edit Offer**        **Button**   S-12 --- Edit Offer      Only available
                                     Modal                    when status =
                                                              PENDING.

  **Withdraw Offer**    **Button**   S-14 --- Withdraw Offer  Only available
                                     Confirmation Modal       when status =
                                                              PENDING.
  --------------------- ------------ ------------------------ ------------------

  -----------------------------------------------------------------------
  **S-12 Edit Offer Modal** \[Client\] · Triggered from S-11 (PENDING) or
  from S-26/S-29/S-31 (terminal states)

  -----------------------------------------------------------------------

  -------------------------------- ---------------------------- ------------------------------------------
  **State / Condition**            **Offer Status**             **What Renders on This Screen**

  **Editing PENDING offer**        PENDING                      Left column: current values (read-only).
                                                                Right column: editable inputs. Contract
                                                                title editable. Change Contract link if
                                                                scoped project with phases.

  **Editing from terminal state    EXPIRED/DECLINED/WITHDRAWN   Same layout. This will create a NEW offer
  (expired/declined/withdrawn)**                                on submission --- not edit in-place.
  -------------------------------- ---------------------------- ------------------------------------------

  --------------------- ------------ ------------------------ ------------------
  **Trigger**           **Type**     **Navigates To**         **Condition /
                                                              Notes**

  **Change Contract**   **Link**     S-05 --- Existing        Allows switching
                                     Contract Selector        associated
                                                              project/phase.

  **Rate preset /       **Button**   (rate field updated)     See S-06 trigger
  Custom (right                                               logic.
  column)**                                                   

  **Duration preset /   **Button**   (duration field updated) See S-06.
  Custom**                                                    

  **Schedule preset /   **Button**   (schedule field updated) See S-06.
  Custom**                                                    

  **Calendar date       **Button**   (start date updated)     Same calendar
  selection**                                                 rules as S-06.

  **Cancel**            **Link**     (modal closes, returns   Returns to S-11,
                                     to originating screen)   S-26, S-29, or
                                                              S-31.

  **Review Offer**      **CTA**      S-13 --- Review Offer    Advances to
                                     Screen                   confirmation
                                                              screen.
  --------------------- ------------ ------------------------ ------------------

  -----------------------------------------------------------------------
  **S-13 Review Offer Screen** \[Client\] · Confirmation step before
  sending edited/new offer

  -----------------------------------------------------------------------

  ------------------ ---------------------------- ------------------------------------------
  **State /          **Offer Status**             **What Renders on This Screen**
  Condition**                                     

  **Editing PENDING  PENDING                      Changed fields show \"(was \$X)\" diff.
  offer in-place**                                Unchanged fields shown without annotation.
                                                  View Previous Offer link. Edit Offer +
                                                  Send Offer buttons.

  **Creating new     EXPIRED/DECLINED/WITHDRAWN   Same layout. Send Offer creates a new
  offer from                                      offer record.
  terminal state**                                
  ------------------ ---------------------------- ------------------------------------------

  --------------------- ------------ ------------------------ ------------------
  **Trigger**           **Type**     **Navigates To**         **Condition /
                                                              Notes**

  **View Previous       **Button**   S-36/S-37 --- Previous   Opens read-only
  Offer**                            Offer Modal              view of the prior
                                                              offer terms.

  **Edit Offer**        **Button**   S-12 --- Edit Offer      Returns to edit
                                     Modal                    form with all
                                                              values preserved.

  **Send Offer**        **CTA**      S-10 --- Offer Sent      For PENDING
                                     Confirmation             in-place edit:
                                                              updates offer
                                                              record, resets
                                                              expiry clock. For
                                                              terminal state:
                                                              creates new
                                                              PENDING offer
                                                              record.

  **X (close)**         **Button**   (modal closes)           Returns to
                                                              originating
                                                              screen.
  --------------------- ------------ ------------------------ ------------------

  -----------------------------------------------------------------------
  **S-14 Withdraw Offer Confirmation Modal** \[Client\] · Triggered from
  S-11 --- PENDING offer only

  -----------------------------------------------------------------------

  ------------------ ---------- ------------------------------------------
  **State /          **Offer    **What Renders on This Screen**
  Condition**        Status**   

  **Default**        PENDING    Title: \"Withdraw this offer?\" Body:
                                \"This will cancel the offer and notify
                                the recipient.\" Optional message
                                textarea. Cancel + Withdraw Offer buttons.

  **Submitting**     ---        Buttons disabled. Loading state.
  ------------------ ---------- ------------------------------------------

  --------------------- ------------ ------------------------ ------------------
  **Trigger**           **Type**     **Navigates To**         **Condition /
                                                              Notes**

  **Cancel**            **Link**     S-11 --- Active Offer    Dismisses
                                     Modal (Client)           confirmation.
                                                              Offer remains
                                                              PENDING.

  **Withdraw Offer**    **Button**   S-03 --- Chat/Inbox      Sets offer to
                                     Thread (offer card       WITHDRAWN. Chat
                                     updates to WITHDRAWN)    card updates.
                                                              Notification sent
                                                              to talent.
  --------------------- ------------ ------------------------ ------------------

**Group 4 --- Talent --- Receiving and Responding to an Offer**

  -----------------------------------------------------------------------
  **S-15 Active Offer Modal --- Talent (Received)** \[Talent\] · PENDING
  offer received by talent

  -----------------------------------------------------------------------

  ------------------ ----------- ------------------------------------------
  **State /          **Offer     **What Renders on This Screen**
  Condition**        Status**    

  **PENDING --- no   PENDING     Full offer terms. Counter Offer + Decline
  counter offer                  Offer + Accept Offer buttons. Message
  submitted**                    button. Offer History link. View Job link.

  **PENDING ---      COUNTERED   Action buttons hidden. Talent directed to
  talent\'s counter              S-20 (their pending counter offer modal)
  offer active                   via chat card.
  (COUNTERED primary             
  offer)**                       

  **Any terminal     ---         Routes to S-27/S-28 (expired), S-30
  status**                       (declined), S-32 (withdrawn).
  ------------------ ----------- ------------------------------------------

  --------------------- ------------ ------------------------ ------------------
  **Trigger**           **Type**     **Navigates To**         **Condition /
                                                              Notes**

  **X (close)**         **Button**   (modal closes)           Returns to chat.

  **Message**           **Button**   S-03 --- Chat/Inbox      Opens chat with
                                     Thread                   client.

  **Offer History**     **Link**     S-35 --- Offer History   Opens full
                                     Modal                    negotiation
                                                              history.

  **View Job**          **Link**     Job Listing Page (or NDA Opens the
                                     gated scope page)        associated
                                                              listing. If NDA
                                                              required and
                                                              unsigned: S-38 ---
                                                              NDA Review Modal.

  **@\[client           **Link**     Client Company Profile   Opens client
  username\]**                       Page                     profile.

  **Counter Offer**     **Button**   S-18 --- Make a Counter  Available when
                                     Offer Modal              status = PENDING.

  **Decline Offer**     **Button**   S-17 --- Decline This    Available when
                                     Offer Modal              status = PENDING.

  **Accept Offer**      **CTA**      S-16 --- Accept This     Available when
                                     Offer Modal              status = PENDING.
  --------------------- ------------ ------------------------ ------------------

  -----------------------------------------------------------------------
  **S-16 Accept This Offer Modal** \[Talent\] · Triggered from S-15 or
  S-36 (Previous Offer Modal)

  -----------------------------------------------------------------------

  ------------------ ---------- ------------------------------------------
  **State /          **Offer    **What Renders on This Screen**
  Condition**        Status**   

  **Default ---      PENDING    Title: \"Accept This Offer\". Optional
  consent                       message textarea. Unchecked consent
  unchecked**                   checkbox. Legal notice. Accept Offer
                                button disabled.

  **Consent          PENDING    Accept Offer button enabled.
  checked**                     

  **Submitting**     ---        Loading state. Both buttons disabled.

  **Error --- offer  EXPIRED    Inline error: \"This offer has expired and
  expired mid-flow**            can no longer be accepted.\"
  ------------------ ---------- ------------------------------------------

  --------------------- ------------ ------------------------ -------------------
  **Trigger**           **Type**     **Navigates To**         **Condition /
                                                              Notes**

  **Consent checkbox    **Button**   (Accept Offer button     Must be checked
  (check)**                          enables)                 before acceptance
                                                              is allowed.

  **Cancel**            **Link**     S-15 --- Active Offer    Dismisses. Offer
                                     Modal (Talent)           remains PENDING.

  **Accept Offer**      **CTA**      S-03 --- Chat/Inbox      Sets offer to
                                     Thread (offer card       ACCEPTED.
                                     updates to ACCEPTED +    offer.accepted
                                     View Contract CTA)       event emitted.
                                                              contracts-service
                                                              creates
                                                              ContractGroup.
  --------------------- ------------ ------------------------ -------------------

  -----------------------------------------------------------------------
  **S-17 Decline This Offer Modal** \[Talent\] · Triggered from S-15 or
  S-36

  -----------------------------------------------------------------------

  ------------------ ---------- ------------------------------------------
  **State /          **Offer    **What Renders on This Screen**
  Condition**        Status**   

  **Default --- no   PENDING    Title: \"Decline This Offer\". Subtitle.
  reason selected**             Textarea 0/500. Six reason chips. Decline
                                offer button disabled. Counter Offer
                                button active.

  **Chip selected or PENDING    Decline offer button enabled.
  text entered**                

  **Submitting**     ---        Loading state. Buttons disabled.
  ------------------ ---------- ------------------------------------------

  --------------------- ------------- ------------------------ ------------------
  **Trigger**           **Type**      **Navigates To**         **Condition /
                                                               Notes**

  **Reason chip         **Button**    (textarea                Multiple chips
  (select)**                          auto-populated, Decline  visible. Selecting
                                      offer button enables)    one auto-fills
                                                               textarea.

  **Textarea input**    **(field)**   (Decline offer button    Direct text entry
                                      enables when non-empty)  also enables the
                                                               button.

  **Counter Offer**     **Button**    S-18 --- Make a Counter  Closes decline
                                      Offer Modal              modal. No decline
                                                               recorded. Offer
                                                               remains PENDING.

  **Cancel**            **Link**      S-15 --- Active Offer    Dismisses. No
                                      Modal (Talent)           decline recorded.

  **Decline offer**     **CTA**       S-03 --- Chat/Inbox      Sets offer
                                      Thread (offer card       DECLINED.
                                      updates to DECLINED)     Notification to
                                                               client.
  --------------------- ------------- ------------------------ ------------------

  -----------------------------------------------------------------------
  **S-18 Make a Counter Offer Modal** \[Talent (or Client counter back)\]
  · Triggered from S-15, S-17, or S-23

  -----------------------------------------------------------------------

  ------------------ ---------- ------------------------------------------
  **State /          **Offer    **What Renders on This Screen**
  Condition**        Status**   

  **Talent           PENDING    Title: \"Make a Counter Offer\". Left col:
  initiating counter            original offer terms (read-only). Right
  offer**                       col: editable fields. Rate warning shown
                                if rate exceeds 25% threshold.

  **Client           CO PENDING Same layout. Title may differ. Rate
  countering back**             warning direction flipped.

  **Rate warning     ---        Advisory message below rate field. Does
  visible**                     not block submission.
  ------------------ ---------- ------------------------------------------

  --------------------- ------------ ------------------------ ------------------
  **Trigger**           **Type**     **Navigates To**         **Condition /
                                                              Notes**

  **Rate preset /       **Button**   (rate field updated)     Single-select.
  Custom (right col)**                                        Same logic as
                                                              S-06.

  **Duration preset /   **Button**   (duration field updated) Same logic as
  Custom**                                                    S-06.

  **Schedule preset /   **Button**   (schedule field updated) Same logic as
  Custom**                                                    S-06.

  **Calendar date       **Button**   (start date updated)     Past dates
  selection**                                                 disabled.

  **Cancel**            **Link**     (modal closes, returns   Returns to S-15,
                                     to originating screen)   S-17, or S-23.

  **Review              **CTA**      S-19 --- Review Counter  No data saved yet.
  Counteroffer**                     Offer Screen             Advances to
                                                              review.
  --------------------- ------------ ------------------------ ------------------

  -----------------------------------------------------------------------
  **S-19 Review Counter Offer Screen** \[Both\] · Confirmation step
  before submitting counter offer

  -----------------------------------------------------------------------

  ------------------ ---------- ------------------------------------------
  **State /          **Offer    **What Renders on This Screen**
  Condition**        Status**   

  **First round (no  ---        Diff shown for changed fields only. No
  prior offer in                \"View Previous Offer\" or shows with
  history)**                    first offer as base.

  **Multiple rounds  ---        View Previous Offer button shown. Diff
  (prior offers                 relative to last round.
  exist)**                      
  ------------------ ---------- ------------------------------------------

  --------------------- ------------ ------------------------ ------------------
  **Trigger**           **Type**     **Navigates To**         **Condition /
                                                              Notes**

  **Previous Offer /    **Button**   S-36 or S-37 ---         Shows prior offer
  View Previous Offer**              Previous Offer Modal     terms for context.

  **Edit Counter        **Button**   S-18 --- Make a Counter  Returns to form
  Offer**                            Offer Modal              with all values
                                                              preserved.

  **Submit Counter      **CTA**      S-03 --- Chat/Inbox      Creates PENDING
  Offer**                            Thread (counter offer    counter offer.
                                     card appears)            Primary offer →
                                                              COUNTERED.
                                                              Notification to
                                                              other party.

  **X (close)**         **Button**   (modal closes)           Returns to
                                                              originating
                                                              screen.
  --------------------- ------------ ------------------------ ------------------

  -----------------------------------------------------------------------
  **S-20 Pending Counter Offer Modal --- Talent View** \[Talent\] ·
  Talent viewing their own submitted counter offer

  -----------------------------------------------------------------------

  ------------------ ----------- ------------------------------------------
  **State /          **Offer     **What Renders on This Screen**
  Condition**        Status**    

  **Counter offer    CO PENDING  Header: \"Counter offer sent to
  PENDING**                      @\[client\]\". Terms with \"(was \$X)\"
                                 rate diff. Expiry notice. Withdraw Counter
                                 Offer + Edit Counter Offer buttons.

  **Counter offer    CO EXPIRED  Expiry details. Footer with View Offer
  EXPIRED**                      History. No edit/withdraw actions.

  **Counter offer    CO          Withdrawn details. View Offer History.
  WITHDRAWN**        WITHDRAWN   
  ------------------ ----------- ------------------------------------------

  --------------------- ------------ ------------------------ ------------------
  **Trigger**           **Type**     **Navigates To**         **Condition /
                                                              Notes**

  **X (close)**         **Button**   (modal closes)           Returns to chat.

  **Message**           **Button**   S-03 --- Chat/Inbox      Opens chat.
                                     Thread                   

  **View Job**          **Link**     Job Listing Page         Opens listing.

  **Offer History**     **Link**     S-35 --- Offer History   Full history.
                                     Modal                    

  **Withdraw Counter    **Button**   S-22 --- Withdraw        Only when CO
  Offer**                            Counter Offer            status = PENDING.
                                     Confirmation Modal       

  **Edit Counter        **Button**   S-21 --- Edit Counter    Only when CO
  Offer**                            Offer Modal              status = PENDING.
  --------------------- ------------ ------------------------ ------------------

  -----------------------------------------------------------------------
  **S-21 Edit Counter Offer Modal** \[Talent\] · In-place edit of a
  PENDING counter offer

  -----------------------------------------------------------------------

This is a TRUE in-place edit of the existing counter offer record ---
not a new submission. The same counter offer record is mutated. Event
emitted: offer.counter_edited.

  ------------------ ---------- ------------------------------------------
  **State /          **Offer    **What Renders on This Screen**
  Condition**        Status**   

  **Editing PENDING  CO PENDING Same layout as S-18 (Make Counter Offer).
  counter offer**               Title: \"Edit Your Counter Offer\".
                                Subtitle: \"Update the terms of your
                                counter offer.\" Right col pre-populated
                                with current counter offer values.
  ------------------ ---------- ------------------------------------------

  --------------------- -------------- ------------------------ ------------------
  **Trigger**           **Type**       **Navigates To**         **Condition /
                                                                Notes**

  **Rate / Duration /   **(fields)**   (counter offer fields    Same validation
  Schedule / Date                      updated locally)         rules as S-18.
  inputs**                                                      

  **Cancel**            **Link**       S-20 --- Pending Counter Returns without
                                       Offer Modal (Talent)     saving.

  **Review              **CTA**        S-19 --- Review Counter  Advances to
  Counteroffer**                       Offer Screen             review. On
                                                                submission:
                                                                counter offer
                                                                record updated
                                                                in-place.
  --------------------- -------------- ------------------------ ------------------

  -----------------------------------------------------------------------
  **S-22 Withdraw Counter Offer Confirmation Modal** \[Talent\] ·
  Triggered from S-20

  -----------------------------------------------------------------------

  ------------------ ---------- ------------------------------------------
  **State /          **Offer    **What Renders on This Screen**
  Condition**        Status**   

  **Default**        CO PENDING Title: \"Withdraw this counter offer?\"
                                Body: \"Do you want to withdraw your
                                counter offer? You can still accept the
                                client\'s active offer afterward.\"
                                Optional message. Cancel + Withdraw
                                Counter Offer buttons.
  ------------------ ---------- ------------------------------------------

  --------------------- ------------ ------------------------ ------------------
  **Trigger**           **Type**     **Navigates To**         **Condition /
                                                              Notes**

  **Cancel**            **Link**     S-20 --- Pending Counter Returns. Counter
                                     Offer Modal (Talent)     offer remains
                                                              PENDING.

  **Withdraw Counter    **Button**   S-03 --- Chat/Inbox      CO → WITHDRAWN.
  Offer**                            Thread (counter offer    Primary offer →
                                     card → WITHDRAWN, offer  PENDING. All
                                     card → PENDING restored) talent action
                                                              buttons
                                                              re-enabled.
  --------------------- ------------ ------------------------ ------------------

**Group 5 --- Client --- Responding to a Counter Offer**

  -----------------------------------------------------------------------
  **S-23 Counter Offer Modal --- Client View** \[Client\] · Client
  receives talent\'s counter offer

  -----------------------------------------------------------------------

  ------------------ -------------------- ------------------------------------------
  **State /          **Offer Status**     **What Renders on This Screen**
  Condition**                             

  **Counter offer    CO PENDING           Header: \"Counter offer from
  PENDING**                               @\[talent\]\". Terms: rate with arrow +
                                          \"(was \$X)\". Role, Duration, Schedule,
                                          Start Date. Message. Expiry notice.
                                          Counter Offer + Decline + Accept Offer
                                          buttons.

  **Counter offer    CO EXPIRED           Header: \"Counter offer from
  EXPIRED**                               @\[talent\]\". Expiry date shown. Terms.
                                          Footer: \"Want to revisit this? Ask the
                                          talent to see if they are still
                                          interested.\" + Ask Now button.

  **Counter offer    CO                   Read-only. No action buttons.
  terminal           WITHDRAWN/DECLINED   
  (withdrawn etc)**                       
  ------------------ -------------------- ------------------------------------------

  --------------------- ------------ ------------------------ -------------------
  **Trigger**           **Type**     **Navigates To**         **Condition /
                                                              Notes**

  **X (close)**         **Button**   (modal closes)           Returns to chat.

  **Message**           **Button**   S-03 --- Chat/Inbox      Opens chat.
                                     Thread                   

  **View Job**          **Link**     Job Listing Page         Opens listing.

  **Offer History**     **Link**     S-35 --- Offer History   Full history.
                                     Modal                    

  **@\[talent           **Link**     Talent Profile Page      Opens talent
  username\]**                                                profile.

  **Counter Offer**     **Button**   S-18 --- Make a Counter  Client counters
                                     Offer Modal              back. Only when CO
                                                              = PENDING.

  **Decline**           **Button**   S-03 --- Chat/Inbox      CO DECLINED.
                                     Thread (CO → DECLINED,   Primary offer
                                     primary offer → PENDING  restored to
                                     restored)                PENDING.
                                                              Notification to
                                                              talent.

  **Accept Offer**      **CTA**      S-03 --- Chat/Inbox      offer.accepted
                                     Thread (CO + primary     emitted.
                                     offer → ACCEPTED, View   contracts-service
                                     Contract CTA shown)      creates
                                                              ContractGroup.

  **Ask Now (expired    **Button**   S-03 --- Chat/Inbox      Sends chat message
  CO)**                              Thread (pre-populated    to talent asking if
                                     message sent)            still interested.
  --------------------- ------------ ------------------------ -------------------

**Group 6 --- Terminal State Detail Modals**

  -----------------------------------------------------------------------
  **S-26 Offer Expired Details Modal --- Client View** \[Client\] ·
  Client views their expired sent offer

  -----------------------------------------------------------------------

  ------------------ ---------- ------------------------------------------
  **State /          **Offer    **What Renders on This Screen**
  Condition**        Status**   

  **Default (not     EXPIRED    Title: \"This Offer Expired\". Full terms.
  reopened, not                 Footer: \"You can resend this offer or
  accepted                      edit the terms before sending.\" + Edit
  post-expiry)**                Offer + Resend Offer buttons.

  **Offer was        EXPIRED    Footer: \"This offer was reopened \[N\]
  reopened                      days ago.\" + View Current Offer button.
  (extension                    
  approved)**                   

  **Offer was        ACCEPTED   Footer: \"This offer was accepted \[N\]
  accepted                      days ago.\" + View Contract button.
  post-expiry**                 
  ------------------ ---------- ------------------------------------------

  --------------------- ------------ ------------------------ ------------------
  **Trigger**           **Type**     **Navigates To**         **Condition /
                                                              Notes**

  **X (close)**         **Button**   (modal closes)           Returns to chat.

  **Message**           **Button**   S-03 --- Chat/Inbox      Opens chat.
                                     Thread                   

  **@\[talent           **Link**     Talent Profile Page      Opens talent
  username\]**                                                profile.

  **Edit Offer**        **Button**   S-12 --- Edit Offer      Opens edit form
                                     Modal                    pre-populated with
                                                              expired offer
                                                              terms. Creates NEW
                                                              offer on send.

  **Resend Offer**      **Button**   S-33 --- Resend Offer    Confirms resend
                                     Modal                    with same terms.

  **View Current        **CTA**      S-11 --- Active Offer    Only when offer
  Offer**                            Modal (Client)           has been reopened.

  **View Contract**     **CTA**      S-45 --- Contract Detail Only when offer
                                     Page                     was accepted after
                                                              expiry.
  --------------------- ------------ ------------------------ ------------------

  -----------------------------------------------------------------------
  **S-27 / S-28 Offer Expired Details Modal --- Talent View** \[Talent\]
  · Talent views expired received offer. S-27 = ≤30d. S-28 = \>30d.

  -----------------------------------------------------------------------

  ------------------ ---------- ------------------------------------------
  **State /          **Offer    **What Renders on This Screen**
  Condition**        Status**   

  **Expired ≤ 30     EXPIRED    Title: \"This Offer Expired\". Full terms.
  days since expiry             Footer: \"Want to revisit this? You can
  (S-27)**                      ask the client to extend the offer.\" +
                                Request Extension button.

  **Expired \> 30    EXPIRED    Same title and terms. Footer: \"Want to
  days since expiry             revisit this? Ask the client to see if the
  (S-28)**                      role is still available.\" + Ask Now
                                button.
  ------------------ ---------- ------------------------------------------

  --------------------- ------------ ------------------------ --------------------
  **Trigger**           **Type**     **Navigates To**         **Condition /
                                                              Notes**

  **X (close)**         **Button**   (modal closes)           Returns to chat.

  **Message**           **Button**   S-03 --- Chat/Inbox      Opens chat.
                                     Thread                   

  **Offer from          **Link**     Client Company Profile   Opens client
  @\[client\]**                      Page                     profile.

  **Request Extension   **Button**   S-03 --- Chat/Inbox      Plain chat message.
  (S-27 only)**                      Thread (pre-populated    No backend state
                                     message with project     change on offer
                                     context tag sent)        record. Only
                                                              available ≤30d.

  **Ask Now (S-28       **Button**   S-03 --- Chat/Inbox      Plain chat message.
  only)**                            Thread (pre-populated    Available \>30d or
                                     message sent)            on
                                                              declined/withdrawn
                                                              offers.
  --------------------- ------------ ------------------------ --------------------

  -----------------------------------------------------------------------
  **S-29 Offer Declined Details Modal --- Client View** \[Client\] ·
  Client views declined offer

  -----------------------------------------------------------------------

  ------------------ ---------- ------------------------------------------
  **State /          **Offer    **What Renders on This Screen**
  Condition**        Status**   

  **Default**        DECLINED   Title: \"Your offer was declined\".
                                Contract type badge, decline date, Message
                                button. \"Sent to @\[talent\]\". Full
                                terms. Reason section (text or \"No reason
                                provided.\" fallback). Footer: \"You can
                                resend this offer or edit the terms before
                                sending.\" + Edit Offer + Resend Offer
                                buttons.
  ------------------ ---------- ------------------------------------------

  --------------------- ------------ ------------------------ ------------------
  **Trigger**           **Type**     **Navigates To**         **Condition /
                                                              Notes**

  **X (close)**         **Button**   (modal closes)           

  **Message**           **Button**   S-03 --- Chat/Inbox      
                                     Thread                   

  **@\[talent           **Link**     Talent Profile Page      
  username\]**                                                

  **Edit Offer**        **Button**   S-12 --- Edit Offer      Creates new offer
                                     Modal                    on send.

  **Resend Offer**      **Button**   S-33 --- Resend Offer    
                                     Modal                    
  --------------------- ------------ ------------------------ ------------------

  -----------------------------------------------------------------------
  **S-30 Offer Declined Details Modal --- Talent View** \[Talent\] ·
  Talent views offer they declined

  -----------------------------------------------------------------------

  ------------------ ---------- ------------------------------------------
  **State /          **Offer    **What Renders on This Screen**
  Condition**        Status**   

  **Default**        DECLINED   Title: \"You declined this offer\".
                                Contract type badge, decline date, Message
                                button. \"Offer from @\[client\]\". Full
                                terms. Reason (their own reason shown).
                                Footer: \"Want to revisit this? Ask the
                                client to see if the role is still
                                open.\" + Ask Now button.
  ------------------ ---------- ------------------------------------------

  --------------------- ------------ ------------------------ ------------------
  **Trigger**           **Type**     **Navigates To**         **Condition /
                                                              Notes**

  **X (close)**         **Button**   (modal closes)           

  **Message**           **Button**   S-03 --- Chat/Inbox      
                                     Thread                   

  **@\[client           **Link**     Client Company Profile   
  username\]**                       Page                     

  **Ask Now**           **Button**   S-03 --- Chat/Inbox      Plain chat
                                     Thread (pre-populated    message. No state
                                     message sent)            change.
  --------------------- ------------ ------------------------ ------------------

  -----------------------------------------------------------------------
  **S-31 Offer Withdrawn Details Modal --- Client View** \[Client\] ·
  Client views offer they withdrew

  -----------------------------------------------------------------------

  ------------------ ----------- ------------------------------------------
  **State /          **Offer     **What Renders on This Screen**
  Condition**        Status**    

  **Default**        WITHDRAWN   Title: \"You withdrew this offer\". Full
                                 terms. Message section (or \"No message
                                 was sent.\" fallback). Footer: Edit
                                 Offer + Resend Offer buttons.
  ------------------ ----------- ------------------------------------------

  --------------------- ------------ ------------------------ ------------------
  **Trigger**           **Type**     **Navigates To**         **Condition /
                                                              Notes**

  **X (close)**         **Button**   (modal closes)           

  **Message**           **Button**   S-03 --- Chat/Inbox      
                                     Thread                   

  **@\[talent           **Link**     Talent Profile Page      
  username\]**                                                

  **Edit Offer**        **Button**   S-12 --- Edit Offer      Creates new offer
                                     Modal                    on send.

  **Resend Offer**      **Button**   S-33 --- Resend Offer    
                                     Modal                    
  --------------------- ------------ ------------------------ ------------------

  -----------------------------------------------------------------------
  **S-32 Offer Withdrawn Details Modal --- Talent View** \[Talent\] ·
  Talent views an offer that was withdrawn

  -----------------------------------------------------------------------

  ------------------ ----------- ------------------------------------------
  **State /          **Offer     **What Renders on This Screen**
  Condition**        Status**    

  **Default**        WITHDRAWN   Title: \"This offer was withdrawn\". Full
                                 terms. Message section (or \"No message
                                 was sent.\" fallback). Footer: \"Want to
                                 revisit this? Ask the client to see if the
                                 role is still available.\" + Ask Now
                                 button.
  ------------------ ----------- ------------------------------------------

  --------------------- ------------ ------------------------ ------------------
  **Trigger**           **Type**     **Navigates To**         **Condition /
                                                              Notes**

  **X (close)**         **Button**   (modal closes)           

  **Message**           **Button**   S-03 --- Chat/Inbox      
                                     Thread                   

  **@\[client           **Link**     Client Company Profile   
  username\]**                       Page                     

  **Ask Now**           **Button**   S-03 --- Chat/Inbox      No state change.
                                     Thread (pre-populated    Plain chat
                                     message sent)            message.
  --------------------- ------------ ------------------------ ------------------

**Group 7 --- Resend Offer**

  -----------------------------------------------------------------------
  **S-33 Resend Offer Modal --- Client** \[Client\] · Triggered from
  S-26, S-29, S-31

  -----------------------------------------------------------------------

  ------------------ ---------------------------- ------------------------------------------
  **State /          **Offer Status**             **What Renders on This Screen**
  Condition**                                     

  **Default**        EXPIRED/DECLINED/WITHDRAWN   Title: \"Resend this offer?\" Body: \"This
                                                  will resend the offer with the same
                                                  terms.\" or \"Resending creates a new
                                                  offer.\" View Terms link. Optional message
                                                  textarea (0/500). Cancel + Resend Offer
                                                  buttons.

  **Submitting**     ---                          Loading state. Buttons disabled.
  ------------------ ---------------------------- ------------------------------------------

  --------------------- ---------- ------------------------ ------------------
  **Trigger**           **Type**   **Navigates To**         **Condition /
                                                            Notes**

  **View Terms**        **Link**   S-26/S-29/S-31 ---       Shows original
                                   Original Offer Details   terms for review
                                   Modal                    before resending.

  **Cancel**            **Link**   (modal closes, returns   
                                   to originating details   
                                   modal)                   

  **Resend Offer**      **CTA**    S-03 --- Chat/Inbox      Creates new
                                   Thread (new PENDING      PENDING offer
                                   offer card appears +     record. Same
                                   \"Offer Sent\" toast)    terms. Fresh
                                                            14-day expiry
                                                            clock.
                                                            offer.created
                                                            event emitted.
  --------------------- ---------- ------------------------ ------------------

  -----------------------------------------------------------------------
  **S-34 Resend Counter Offer --- Talent (inline in chat)** \[Talent\] ·
  Client asks talent to resend their expired counter offer. Two inline
  buttons appear on the message card.

  -----------------------------------------------------------------------

  ------------------ ---------- ------------------------------------------
  **State /          **Offer    **What Renders on This Screen**
  Condition**        Status**   

  **Client message   CO EXPIRED Message card with \"Resend
  requesting                    Counteroffer\" + \"Decline\" inline action
  resend**                      buttons.
  ------------------ ---------- ------------------------------------------

  --------------------- ------------ ------------------------ ------------------
  **Trigger**           **Type**     **Navigates To**         **Condition /
                                                              Notes**

  **Resend Counteroffer **Button**   S-03 --- Chat/Inbox      Creates new
  (inline button)**                  Thread (new counter      PENDING counter
                                     offer card + \"You       offer. Fresh
                                     resent your              expiry. Primary
                                     counteroffer\" message)  offer → COUNTERED.

  **Decline (inline     **Button**   S-03 --- Chat/Inbox      Plain message. No
  button)**                          Thread (decline message  state change on
                                     posted)                  offer record.
  --------------------- ------------ ------------------------ ------------------

**Group 8 --- Offer History and Previous Offer**

  -----------------------------------------------------------------------
  **S-35 Offer History Modal** \[Both\] · Accessible via Offer History
  link from any offer modal

  -----------------------------------------------------------------------

  ---------------------- ---------------------------- ------------------------------------------
  **State / Condition**  **Offer Status**             **What Renders on This Screen**

  **Active negotiation   PENDING/COUNTERED            Full chronological event list. Each row:
  (offer                                              avatar, action label, rate, relative
  pending/countered)**                                timestamp. Expandable rows show full
                                                      terms. No View Contract button yet.

  **Offer accepted,      ACCEPTED                     Same event list. View Contract CTA shown
  contract active**                                   at bottom.

  **Any terminal state** EXPIRED/DECLINED/WITHDRAWN   Same list. No View Contract unless a
                                                      contract exists.
  ---------------------- ---------------------------- ------------------------------------------

  --------------------- ------------ ------------------------ ------------------
  **Trigger**           **Type**     **Navigates To**         **Condition /
                                                              Notes**

  **Row chevron         **Button**   (row expands to show     Inline expand. No
  (expand/collapse)**                full terms for that      navigation.
                                     round)                   

  **View Contract**     **CTA**      S-45 --- Contract Detail Only shown when
                                     Page                     offer accepted and
                                                              contract exists.

  **X (close)**         **Button**   (modal closes, returns   
                                     to originating offer     
                                     modal)                   
  --------------------- ------------ ------------------------ ------------------

  -----------------------------------------------------------------------
  **S-36 Previous Offer Modal --- Talent View** \[Talent\] · Accessed via
  Offer History link during active negotiation

  -----------------------------------------------------------------------

  ------------------ ----------- ------------------------------------------
  **State /          **Offer     **What Renders on This Screen**
  Condition**        Status**    

  **Prior offer      PENDING     Same layout as S-15 but read-only header
  exists (active     (primary)   context. Full prior terms. Expiry date.
  negotiation in                 Decline Offer + Accept Offer buttons still
  progress)**                    active.
  ------------------ ----------- ------------------------------------------

  --------------------- ------------ ------------------------ ------------------
  **Trigger**           **Type**     **Navigates To**         **Condition /
                                                              Notes**

  **Offer History**     **Link**     S-35 --- Offer History   
                                     Modal                    

  **X (close)**         **Button**   (modal closes, returns   
                                     to originating offer     
                                     modal)                   

  **Message**           **Button**   S-03 --- Chat/Inbox      
                                     Thread                   

  **View Job**          **Link**     Job Listing Page         

  **Decline Offer**     **Button**   S-17 --- Decline This    Talent can act on
                                     Offer Modal              the offer from
                                                              this view.

  **Accept Offer**      **CTA**      S-16 --- Accept This     Talent can accept
                                     Offer Modal              from this view.
  --------------------- ------------ ------------------------ ------------------

  -----------------------------------------------------------------------
  **S-37 Previous Offer Modal --- Client View** \[Client\] · Accessed via
  Offer History link during active negotiation

  -----------------------------------------------------------------------

  ------------------ ----------- ------------------------------------------
  **State /          **Offer     **What Renders on This Screen**
  Condition**        Status**    

  **Prior offer      PENDING     Full prior terms. Expiry date. Withdraw
  exists**           (primary)   Offer button active.
  ------------------ ----------- ------------------------------------------

  --------------------- ------------ ------------------------ ------------------
  **Trigger**           **Type**     **Navigates To**         **Condition /
                                                              Notes**

  **Offer History**     **Link**     S-35 --- Offer History   
                                     Modal                    

  **X (close)**         **Button**   (modal closes)           

  **Message**           **Button**   S-03 --- Chat/Inbox      
                                     Thread                   

  **Withdraw Offer**    **Button**   S-14 --- Withdraw Offer  Client can
                                     Confirmation Modal       withdraw from this
                                                              view.
  --------------------- ------------ ------------------------ ------------------

**Group 9 --- NDA Signing Flow (Legal-Service --- Offer Context)**

NDA signing is owned by legal-service but is triggered within the offer
service context when a talent views a job listing with an NDA
requirement. Signing the NDA does not accept the offer.

  -----------------------------------------------------------------------
  **S-38 NDA Review Modal (Document View)** \[Talent\] · Triggered when
  talent clicks View Job on an NDA-required listing without having signed

  -----------------------------------------------------------------------

  ------------------ ---------- ------------------------------------------
  **State /          **Offer    **What Renders on This Screen**
  Condition**        Status**   

  **Default ---      ---        Title: \"Non-Disclosure Agreement (NDA)\".
  unsigned**                    Subtitle: \"Review and sign to continue.\"
                                Scrollable 2-page NDA document. Page
                                counter (1/2). Download PDF button.
                                Continue to Sign button.

  **Disclaimer       ---        \"Signing the NDA does not accept the
  shown**                       offer.\" shown below the scope content.
  ------------------ ---------- ------------------------------------------

  --------------------- ------------ ------------------------ ------------------
  **Trigger**           **Type**     **Navigates To**         **Condition /
                                                              Notes**

  **Download PDF**      **Button**   (PDF download)           Downloads NDA as
                                                              PDF. No
                                                              navigation.

  **Cancel**            **Link**     S-15 --- Active Offer    Returns without
                                     Modal (Talent) or S-03   signing.
                                     --- Chat                 

  **Continue to Sign**  **CTA**      S-39 --- NDA Sign Modal  Advances to
                                     (Upload)                 signature step.
  --------------------- ------------ ------------------------ ------------------

  -----------------------------------------------------------------------
  **S-39/S-40/S-41 NDA Sign Modal --- Upload / Type / Draw Modes**
  \[Talent\] · Three signature method modes within the same modal

  -----------------------------------------------------------------------

  ------------------ ---------- ------------------------------------------
  **State /          **Offer    **What Renders on This Screen**
  Condition**        Status**   

  **Upload mode      ---        Full Name\* + Initials\* fields. Upload
  (S-39)**                      area: \"Upload your signature image\"
                                (PNG, JPG, JPEG, SVG up to 10MB). Browse
                                File button. Cancel + Upload my
                                signature + Draw my signature buttons.
                                Sign NDA disabled until all fields
                                complete.

  **Draw mode        ---        Full Name\* + Initials\*. Two canvas
  (S-41)**                      areas: \"Draw Signature\" + \"Draw
                                Initials\". Type my signature + Upload my
                                signature alternative buttons. Sign NDA
                                disabled until all fields drawn.

  **Type mode        ---        Full Name\* + Initials\*. Preview area
  (S-40)**                      shows typed name + initials in signature
                                font. Upload my signature + Draw my
                                signature alternative buttons. Sign NDA
                                active once name entered.

  **Signature        ---        Signature preview shown. \"Clear
  completed (any                Signature\" + \"Clear Initials\" links
  mode)**                       shown. Sign NDA button enabled.
  ------------------ ---------- ------------------------------------------

  --------------------- ------------ ------------------------ -----------------------
  **Trigger**           **Type**     **Navigates To**         **Condition / Notes**

  **Back arrow**        **Link**     S-38 --- NDA Review      Returns to document
                                     Modal                    view.

  **X (close)**         **Button**   (modal closes)           Returns to
                                                              offer/listing context
                                                              without signing.

  **Upload my signature **Button**   (modal switches to       Switches between
  (mode switch)**                    Upload mode)             signature entry modes.

  **Draw my signature   **Button**   (modal switches to Draw  
  (mode switch)**                    mode)                    

  **Type my signature   **Button**   (modal switches to Type  
  (mode switch)**                    mode)                    

  **Browse File (upload **Button**   (file picker opens)      Accepts PNG, JPG, JPEG,
  mode)**                                                     SVG up to 10MB.

  **Clear Signature**   **Link**     (signature canvas        Only shown after
                                     cleared)                 signature drawn.

  **Clear Initials**    **Link**     (initials canvas         Only shown after
                                     cleared)                 initials drawn.

  **Cancel**            **Link**     S-38 --- NDA Review      Returns to document.
                                     Modal                    

  **Sign NDA**          **CTA**      S-42 --- NDA Signed      legal-service records
                                     Confirmation             signature. ndaSigned =
                                                              true for this
                                                              client-talent-project
                                                              pair permanently.
  --------------------- ------------ ------------------------ -----------------------

  -----------------------------------------------------------------------
  **S-42 NDA Signed Confirmation** \[Talent\] · After Sign NDA submitted
  successfully

  -----------------------------------------------------------------------

  ------------------ ---------- ------------------------------------------
  **State /          **Offer    **What Renders on This Screen**
  Condition**        Status**   

  **Signed**         ---        Title: \"Non-Disclosure Agreement (NDA)\".
                                Message: \"You can now view the project
                                scope.\" Signed status indicator.
  ------------------ ---------- ------------------------------------------

  --------------------- ---------- ------------------------ ------------------
  **Trigger**           **Type**   **Navigates To**         **Condition /
                                                            Notes**

  **(implicit close or  **CTA**    Job Listing Scope Tab    NDA signed. Talent
  View Scope)**                    (now unlocked)           can now view full
                                                            project/service
                                                            scope.
  --------------------- ---------- ------------------------ ------------------

**Group 10 --- Client Company Profile Page --- Offer Status Banners**

  -----------------------------------------------------------------------
  **S-43 Client Company Profile --- Active Offer Banner** \[Talent\] ·
  Talent visits client\'s company profile while an active offer from that
  client exists

  -----------------------------------------------------------------------

  ------------------ ---------- ------------------------------------------
  **State /          **Offer    **What Renders on This Screen**
  Condition**        Status**   

  **Active offer     PENDING    Banner at top of client profile: \"This
  exists (PENDING)**            client sent you an offer\" + offer context
                                text + View Offer CTA.
  ------------------ ---------- ------------------------------------------

  --------------------- ------------ ------------------------ ------------------
  **Trigger**           **Type**     **Navigates To**         **Condition /
                                                              Notes**

  **View Offer**        **CTA**      S-15 --- Active Offer    Opens the PENDING
                                     Modal (Talent)           offer from this
                                                              client.

  **X (dismiss          **Button**   (banner dismissed for    Banner hidden.
  banner)**                          this session)            Profile remains
                                                              visible.
  --------------------- ------------ ------------------------ ------------------

  -----------------------------------------------------------------------
  **S-44 Client Company Profile --- Expired Offer Banner** \[Talent\] ·
  Talent visits client\'s company profile while their offer has expired

  -----------------------------------------------------------------------

  ------------------ ---------- ------------------------------------------
  **State /          **Offer    **What Renders on This Screen**
  Condition**        Status**   

  **Offer expired**  EXPIRED    Banner: \"Offer from this client
                                expired\" + context text + View Details
                                CTA.
  ------------------ ---------- ------------------------------------------

  --------------------- ------------ ------------------------ ------------------
  **Trigger**           **Type**     **Navigates To**         **Condition /
                                                              Notes**

  **View Details**      **CTA**      S-27 or S-28 --- Offer   Routes based on
                                     Expired Details Modal    elapsed days since
                                     (Talent)                 expiry.

  **X (dismiss          **Button**   (banner dismissed)       
  banner)**                                                   
  --------------------- ------------ ------------------------ ------------------

**Group 11 --- Contract Handoff (Terminal Navigation)**

  -----------------------------------------------------------------------
  **S-45 Contract Detail Page** \[Both\] · Target destination after
  offer.accepted --- owned by contracts-service

  -----------------------------------------------------------------------

This screen is outside the offer service boundary. It is the final
destination triggered by View Contract CTAs throughout the offer flow.
Offer-service has no further responsibility once offer.accepted is
emitted.

  ------------------ ---------- ------------------------------------------
  **State /          **Offer    **What Renders on This Screen**
  Condition**        Status**   

  **Contract PENDING PENDING    Contract created. Awaiting
  (deposit                      deposit/activation. contracts-service
  awaiting)**                   scope.

  **Contract         ACTIVE     Full contract workspace: Overview, Tasks,
  ACTIVE**                      Chat, Scope, Team, Files, Contract,
                                Activity tabs.
  ------------------ ---------- ------------------------------------------

  --------------------- ---------- ------------------------ ------------------
  **Trigger**           **Type**   **Navigates To**         **Condition /
                                                            Notes**

  **All navigation from **---**    contracts-service scope  Outside
  this screen**                                             offer-service
                                                            documentation
                                                            boundary.
  --------------------- ---------- ------------------------ ------------------

**Master Navigation Map --- All Destinations**

Quick reference: every screen ID and what triggers navigation to it.

  ------------ ------------------ ---------------------------------------------
  **Screen**   **Screen Name**    **Triggered By**

  **S-01**     **Talent Profile   Direct URL / search results / My Favorites
               Page**             

  **S-02**     **Notification     Bell icon click (top nav)
               Bell Dropdown**    

  **S-03**     **Chat / Inbox     Inbox link / Message button (any modal) /
               Thread**           chat list row click

  **S-04**     **Hire Me Modal    Hire Me button on S-01
               --- Path           
               Selection**        

  **S-05**     **Existing         \"Add to existing\" on S-04 / \"Change
               Contract           Project\" on S-07/S-12
               Selector**         

  **S-06**     **Offer Creation   \"Invite to new contract\" on S-04
               Form (New          
               Contract)**        

  **S-07**     **Offer Creation   Contract row click on S-05
               Form (Existing     
               Contract)**        

  **S-10**     **Offer Sent       Send Offer on S-06 or S-07
               Confirmation**     

  **S-11**     **Active Offer     Review Your Offer on S-10 / View Offer (chat
               Modal --- Client** card, client) / View Offer (notification) /
                                  View Current Offer (S-26)

  **S-12**     **Edit Offer       Edit Offer on S-11 / Edit & Resend Offer
               Modal**            (inline chat card) / Edit Offer on S-26,
                                  S-29, S-31

  **S-13**     **Review Offer     Review Offer on S-12
               Screen**           

  **S-14**     **Withdraw Offer   Withdraw Offer on S-11 / Withdraw Offer on
               Confirmation       S-37
               Modal**            

  **S-15**     **Active Offer     View Offer (chat card, talent) / View Offer
               Modal --- Talent** (notification) / View Offer (S-43) / Accept
                                  Offer (S-16 cancel)

  **S-16**     **Accept This      Accept Offer on S-15 / Accept Offer on S-36
               Offer Modal**      

  **S-17**     **Decline This     Decline Offer on S-15 / Decline Offer on S-36
               Offer Modal**      

  **S-18**     **Make a Counter   Counter Offer on S-15 / Counter Offer on S-17
               Offer Modal**      / Counter Offer on S-36 / Counter Offer on
                                  S-23

  **S-19**     **Review Counter   Review Counteroffer on S-18 / Review
               Offer Screen**     Counteroffer on S-21

  **S-20**     **Pending Counter  View Counter Offer (chat card, talent)
               Offer Modal ---    
               Talent**           

  **S-21**     **Edit Counter     Edit Counter Offer on S-20
               Offer Modal**      

  **S-22**     **Withdraw Counter Withdraw Counter Offer on S-20
               Offer              
               Confirmation**     

  **S-23**     **Counter Offer    View Counter Offer (chat card, client) / View
               Modal --- Client** Counter Offer (notification)

  **S-24**     **Make Counter     Counter Offer on S-23 (same as S-18 --- same
               Offer Back         modal, different actor)
               (Client)**         

  **S-25**     **View Expired     View Details on expired CO card (client)
               Counter Offer ---  
               Client**           

  **S-26**     **Offer Expired    View Details (expired offer card, client) /
               Details ---        View Details (notification, client)
               Client**           

  **S-27**     **Offer Expired    View Details (expired offer card, talent) ---
               Details --- Talent elapsed ≤30 days
               (≤30d)**           

  **S-28**     **Offer Expired    View Details (expired offer card, talent) ---
               Details --- Talent elapsed \>30 days
               (\>30d)**          

  **S-29**     **Offer Declined   View Details (declined offer card, client)
               Details ---        
               Client**           

  **S-30**     **Offer Declined   View Details (declined offer card, talent)
               Details ---        
               Talent**           

  **S-31**     **Offer Withdrawn  View Details (withdrawn offer card, client)
               Details ---        
               Client**           

  **S-32**     **Offer Withdrawn  View Details (withdrawn offer card, talent)
               Details ---        
               Talent**           

  **S-33**     **Resend Offer     Resend Offer on S-26, S-29, S-31
               Modal**            

  **S-34**     **Resend Counter   Resend Counteroffer button on inline message
               Offer (inline      card in S-03
               chat)**            

  **S-35**     **Offer History    Offer History link on any offer modal (S-11,
               Modal**            S-15, S-20, S-23, S-36, S-37)

  **S-36**     **Previous Offer   Offer History / Previous Offer link from
               Modal --- Talent** S-15, S-17, S-18, S-19

  **S-37**     **Previous Offer   Offer History / View Previous Offer link from
               Modal --- Client** S-11, S-13

  **S-38**     **NDA Review       View Job on S-15 (when NDA required and
               Modal**            unsigned) / NDA Required badge on listing

  **S-39**     **NDA Sign Modal   Continue to Sign on S-38
               --- Upload**       

  **S-40**     **NDA Sign Modal   Type my signature on S-39 or S-41
               --- Type**         

  **S-41**     **NDA Sign Modal   Draw my signature on S-39 or S-40
               --- Draw**         

  **S-42**     **NDA Signed       Sign NDA on S-39, S-40, or S-41
               Confirmation**     

  **S-43**     **Client Profile   Talent navigates to client company profile
               --- Active Offer   while PENDING offer exists
               Banner**           

  **S-44**     **Client Profile   Talent navigates to client company profile
               --- Expired Offer  while offer is EXPIRED
               Banner**           

  **S-45**     **Contract Detail  View Contract (any modal or chat card after
               Page**             offer accepted)
  ------------ ------------------ ---------------------------------------------
