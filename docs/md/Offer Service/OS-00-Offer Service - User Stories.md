**US-OS --- Offer Service**

**User Stories**

**Service:** offer-service **Series:** US-OS-01 through US-OS-56
**Format:** Given / When / Then

**Group A --- Offer Creation (Hire Me Entry Point)**

Covers the full offer creation flow initiated from the client clicking
Hire Me on a talent profile. Applies to all four contract types:
Project, Service, Team, and Contract (Individual).

+-------------------------------------+----------------------------------------------------------------+
| **US-OS-01 Open Hire Me modal from talent profile**                                                  |
+------------------------------------------------------------------------------------------------------+
| As a **client**, I want to open the Hire Me modal from a talent profile so I can begin the offer     |
| creation process.                                                                                    |
+-------------------------------------+----------------------------------------------------------------+
| **Given**                           | I am a logged-in client viewing a talent profile               |
+-------------------------------------+----------------------------------------------------------------+
| **When**                            | I click the Hire Me button                                     |
+-------------------------------------+----------------------------------------------------------------+
| **Then**                            | The Hire Me modal opens, showing the talent\'s name, role      |
|                                     | title, years of experience, and location                       |
+-------------------------------------+----------------------------------------------------------------+
| **And**                             | Any previously sent pending invites to this talent are shown   |
|                                     | as avatar chips in the modal header                            |
+-------------------------------------+----------------------------------------------------------------+
| **And**                             | I am presented with two paths: invite this talent to a new     |
|                                     | contract or add them to an existing contract                   |
+-------------------------------------+----------------------------------------------------------------+

+-------------------------------------+----------------------------------------------------------------+
| **US-OS-02 Add talent to an existing contract**                                                      |
+------------------------------------------------------------------------------------------------------+
| As a **client**, I want to add a talent to an existing contract so I can expand my team without      |
| creating a new one.                                                                                  |
+-------------------------------------+----------------------------------------------------------------+
| **Given**                           | I have at least one existing active contract (Project,         |
|                                     | Service, Team, or Individual)                                  |
+-------------------------------------+----------------------------------------------------------------+
| **When**                            | I select the \"Add to an existing contract\" option in the     |
|                                     | Hire Me modal                                                  |
+-------------------------------------+----------------------------------------------------------------+
| **Then**                            | A searchable list of my existing contracts is shown, each      |
|                                     | displaying the contract name, phase if applicable, and current |
|                                     | team member avatars                                            |
+-------------------------------------+----------------------------------------------------------------+
| **When**                            | I select a contract from the list                              |
+-------------------------------------+----------------------------------------------------------------+
| **Then**                            | The offer creation form loads pre-populated with the selected  |
|                                     | contract\'s context                                            |
+-------------------------------------+----------------------------------------------------------------+
| **And**                             | I can proceed to select rate, duration, schedule, and start    |
|                                     | date to complete the offer                                     |
+-------------------------------------+----------------------------------------------------------------+

+-------------------------------------+----------------------------------------------------------------+
| **US-OS-03 Create a new contract offer from Hire Me**                                                |
+------------------------------------------------------------------------------------------------------+
| As a **client**, I want to send an offer for a new contract so I can start a fresh engagement with   |
| this talent.                                                                                         |
+-------------------------------------+----------------------------------------------------------------+
| **Given**                           | I have selected \"Invite to a new contract\" in the Hire Me    |
|                                     | modal                                                          |
+-------------------------------------+----------------------------------------------------------------+
| **When**                            | I complete the offer form by selecting a rate, contract        |
|                                     | duration, work schedule, and start date                        |
+-------------------------------------+----------------------------------------------------------------+
| **Then**                            | The Send Offer button becomes active only when all required    |
|                                     | fields are filled                                              |
+-------------------------------------+----------------------------------------------------------------+
| **When**                            | I click Send Offer                                             |
+-------------------------------------+----------------------------------------------------------------+
| **Then**                            | Offer-service creates an Offer record in PENDING status with a |
|                                     | 2-week expiry clock                                            |
+-------------------------------------+----------------------------------------------------------------+
| **And**                             | The Offer Sent confirmation screen is shown with two CTAs:     |
|                                     | Review Your Offer and Continue Browsing                        |
+-------------------------------------+----------------------------------------------------------------+
| **And**                             | The talent\'s avatar appears as a pending invite chip in the   |
|                                     | team member stack on the confirmation screen                   |
+-------------------------------------+----------------------------------------------------------------+

+-------------------------------------+----------------------------------------------------------------+
| **US-OS-04 Select a preset rate when creating an offer**                                             |
+------------------------------------------------------------------------------------------------------+
| As a **client**, I want to choose a preset rate option so I can quickly set the offer rate without   |
| manual entry.                                                                                        |
+-------------------------------------+----------------------------------------------------------------+
| **Given**                           | I am on the offer creation form                                |
+-------------------------------------+----------------------------------------------------------------+
| **When**                            | I view the rate selector                                       |
+-------------------------------------+----------------------------------------------------------------+
| **Then**                            | I see preset rate options sourced from the job listing service |
|                                     | type (e.g. Logo Design \$45/hr, Web Development \$70/hr, UX/UI |
|                                     | Design \$85/hr) plus a Custom Rate option                      |
+-------------------------------------+----------------------------------------------------------------+
| **When**                            | I select a preset rate                                         |
+-------------------------------------+----------------------------------------------------------------+
| **Then**                            | That rate is selected and displayed on the form                |
+-------------------------------------+----------------------------------------------------------------+

+-------------------------------------+----------------------------------------------------------------+
| **US-OS-05 Enter a custom rate when creating an offer**                                              |
+------------------------------------------------------------------------------------------------------+
| As a **client**, I want to enter a custom hourly rate so I can offer a specific amount not covered   |
| by presets.                                                                                          |
+-------------------------------------+----------------------------------------------------------------+
| **Given**                           | I am on the offer creation form                                |
+-------------------------------------+----------------------------------------------------------------+
| **When**                            | I select Custom Rate                                           |
+-------------------------------------+----------------------------------------------------------------+
| **Then**                            | An inline text input appears for me to type a numeric rate     |
|                                     | value                                                          |
+-------------------------------------+----------------------------------------------------------------+
| **And**                             | A Cancel option is shown to dismiss the custom input and       |
|                                     | return to preset selection                                     |
+-------------------------------------+----------------------------------------------------------------+
| **When**                            | I enter a valid numeric rate and confirm                       |
+-------------------------------------+----------------------------------------------------------------+
| **Then**                            | The custom rate is saved and displayed on the form             |
+-------------------------------------+----------------------------------------------------------------+

+-------------------------------------+----------------------------------------------------------------+
| **US-OS-06 Select a preset contract duration**                                                       |
+------------------------------------------------------------------------------------------------------+
| As a **client**, I want to choose a preset contract duration so I can quickly define the contract    |
| length.                                                                                              |
+-------------------------------------+----------------------------------------------------------------+
| **Given**                           | I am on the offer creation form                                |
+-------------------------------------+----------------------------------------------------------------+
| **When**                            | I view the contract duration selector                          |
+-------------------------------------+----------------------------------------------------------------+
| **Then**                            | I see preset options: 3 Months, 6 Months, 1 Year, 18 Months, 2 |
|                                     | Years, Ongoing, and Custom Duration                            |
+-------------------------------------+----------------------------------------------------------------+
| **When**                            | I select a preset                                              |
+-------------------------------------+----------------------------------------------------------------+
| **Then**                            | That duration is selected and displayed on the form            |
+-------------------------------------+----------------------------------------------------------------+

+-------------------------------------+----------------------------------------------------------------+
| **US-OS-07 Enter a custom contract duration**                                                        |
+------------------------------------------------------------------------------------------------------+
| As a **client**, I want to enter a custom duration so I can specify a contract length not covered by |
| presets.                                                                                             |
+-------------------------------------+----------------------------------------------------------------+
| **Given**                           | I am on the offer creation form                                |
+-------------------------------------+----------------------------------------------------------------+
| **When**                            | I select Custom Duration                                       |
+-------------------------------------+----------------------------------------------------------------+
| **Then**                            | An inline input appears for me to enter a numeric value and    |
|                                     | select a unit (Months or Years)                                |
+-------------------------------------+----------------------------------------------------------------+
| **And**                             | A Cancel option is shown to dismiss the custom input           |
+-------------------------------------+----------------------------------------------------------------+
| **When**                            | I enter a valid duration and confirm                           |
+-------------------------------------+----------------------------------------------------------------+
| **Then**                            | The custom duration is saved and displayed on the form         |
+-------------------------------------+----------------------------------------------------------------+

+-------------------------------------+----------------------------------------------------------------+
| **US-OS-08 Select a preset work schedule**                                                           |
+------------------------------------------------------------------------------------------------------+
| As a **client**, I want to choose a work schedule so the talent knows the expected time commitment.  |
+-------------------------------------+----------------------------------------------------------------+
| **Given**                           | I am on the offer creation form                                |
+-------------------------------------+----------------------------------------------------------------+
| **When**                            | I view the work schedule selector                              |
+-------------------------------------+----------------------------------------------------------------+
| **Then**                            | I see three options: Part Time (up to 30 hrs/week), Full Time  |
|                                     | (over 30 hrs/week), and Custom Work Schedule                   |
+-------------------------------------+----------------------------------------------------------------+
| **When**                            | I select Part Time or Full Time                                |
+-------------------------------------+----------------------------------------------------------------+
| **Then**                            | That schedule is selected and displayed on the form            |
+-------------------------------------+----------------------------------------------------------------+

+-------------------------------------+----------------------------------------------------------------+
| **US-OS-09 Enter a custom work schedule**                                                            |
+------------------------------------------------------------------------------------------------------+
| As a **client**, I want to specify a custom number of hours so I can define a non-standard work      |
| schedule.                                                                                            |
+-------------------------------------+----------------------------------------------------------------+
| **Given**                           | I am on the offer creation form                                |
+-------------------------------------+----------------------------------------------------------------+
| **When**                            | I select Custom Work Schedule                                  |
+-------------------------------------+----------------------------------------------------------------+
| **Then**                            | An inline input appears for me to enter total hours and select |
|                                     | a time unit: Per day, Per week, or Per month                   |
+-------------------------------------+----------------------------------------------------------------+
| **And**                             | A Cancel option is shown to dismiss the custom input           |
+-------------------------------------+----------------------------------------------------------------+
| **When**                            | I enter a valid number and unit and confirm                    |
+-------------------------------------+----------------------------------------------------------------+
| **Then**                            | The custom schedule is saved and displayed on the form         |
+-------------------------------------+----------------------------------------------------------------+

+-------------------------------------+----------------------------------------------------------------+
| **US-OS-10 Confirm system-suggested start date for a scoped project**                                |
+------------------------------------------------------------------------------------------------------+
| As a **client**, I want to confirm or change the system-suggested start date so I can control when   |
| work begins.                                                                                         |
+-------------------------------------+----------------------------------------------------------------+
| **Given**                           | I am creating an offer for a scoped project and the system has |
|                                     | calculated an estimated start date from the project phases     |
|                                     | (sourced from listings-service)                                |
+-------------------------------------+----------------------------------------------------------------+
| **When**                            | I reach the start date step                                    |
+-------------------------------------+----------------------------------------------------------------+
| **Then**                            | I see a Confirm Start Date step showing: \"Based on the        |
|                                     | project scope, the anticipated start date is \[date\]\"        |
+-------------------------------------+----------------------------------------------------------------+
| **And**                             | I am given two options: Confirm Start Date or Change Date      |
+-------------------------------------+----------------------------------------------------------------+
| **When**                            | I click Confirm Start Date                                     |
+-------------------------------------+----------------------------------------------------------------+
| **Then**                            | The suggested date is saved as the offer start date and I      |
|                                     | proceed to the message step                                    |
+-------------------------------------+----------------------------------------------------------------+

+-------------------------------------+----------------------------------------------------------------+
| **US-OS-11 Change the system-suggested start date**                                                  |
+------------------------------------------------------------------------------------------------------+
| As a **client**, I want to override the suggested start date so I can set a date that better fits my |
| schedule.                                                                                            |
+-------------------------------------+----------------------------------------------------------------+
| **Given**                           | The Confirm Start Date step is shown with a suggested date     |
+-------------------------------------+----------------------------------------------------------------+
| **When**                            | I click Change Date                                            |
+-------------------------------------+----------------------------------------------------------------+
| **Then**                            | A calendar picker opens with the suggested date pre-selected   |
+-------------------------------------+----------------------------------------------------------------+
| **When**                            | I select a different date                                      |
+-------------------------------------+----------------------------------------------------------------+
| **Then**                            | The new date is saved and displayed on the form                |
+-------------------------------------+----------------------------------------------------------------+
| **And**                             | I proceed to the message step                                  |
+-------------------------------------+----------------------------------------------------------------+

+-------------------------------------+----------------------------------------------------------------+
| **US-OS-12 Select a start date for a no-scope contract**                                             |
+------------------------------------------------------------------------------------------------------+
| As a **client**, I want to select a start date for a no-scope contract so I can indicate when I      |
| expect work to begin.                                                                                |
+-------------------------------------+----------------------------------------------------------------+
| **Given**                           | I am creating an offer for a no-scope contract type (Team,     |
|                                     | Service Ongoing, or Individual)                                |
+-------------------------------------+----------------------------------------------------------------+
| **When**                            | I reach the start date step                                    |
+-------------------------------------+----------------------------------------------------------------+
| **Then**                            | The default start date is set to the next Monday from today    |
+-------------------------------------+----------------------------------------------------------------+
| **And**                             | A calendar picker is shown with the default date pre-selected  |
+-------------------------------------+----------------------------------------------------------------+
| **When**                            | I select a different date or confirm the default               |
+-------------------------------------+----------------------------------------------------------------+
| **Then**                            | The selected start date is saved on the offer                  |
+-------------------------------------+----------------------------------------------------------------+

+-------------------------------------+----------------------------------------------------------------+
| **US-OS-13 Add an optional message when sending an offer**                                           |
+------------------------------------------------------------------------------------------------------+
| As a **client**, I want to add a personalised message to my offer so the talent understands my       |
| intent.                                                                                              |
+-------------------------------------+----------------------------------------------------------------+
| **Given**                           | I am on the offer creation form                                |
+-------------------------------------+----------------------------------------------------------------+
| **When**                            | I type in the optional message field                           |
+-------------------------------------+----------------------------------------------------------------+
| **Then**                            | A live character counter is shown (e.g. 0/500)                 |
+-------------------------------------+----------------------------------------------------------------+
| **And**                             | The field accepts up to 500 characters maximum                 |
+-------------------------------------+----------------------------------------------------------------+
| **When**                            | I leave the field empty and click Send Offer                   |
+-------------------------------------+----------------------------------------------------------------+
| **Then**                            | The offer is sent without a message and no error is shown      |
+-------------------------------------+----------------------------------------------------------------+

+-------------------------------------+----------------------------------------------------------------+
| **US-OS-14 View Offer Sent confirmation**                                                            |
+------------------------------------------------------------------------------------------------------+
| As a **client**, I want to see a confirmation after sending an offer so I know the offer was         |
| successfully submitted.                                                                              |
+-------------------------------------+----------------------------------------------------------------+
| **Given**                           | I have completed the offer creation form and clicked Send      |
|                                     | Offer                                                          |
+-------------------------------------+----------------------------------------------------------------+
| **When**                            | Offer-service successfully creates the PENDING offer record    |
+-------------------------------------+----------------------------------------------------------------+
| **Then**                            | The Offer Sent confirmation screen is displayed                |
+-------------------------------------+----------------------------------------------------------------+
| **And**                             | The confirmation shows the talent name, contract type context, |
|                                     | and pending invite status                                      |
+-------------------------------------+----------------------------------------------------------------+
| **And**                             | Two CTAs are available: Review Your Offer and Continue         |
|                                     | Browsing                                                       |
+-------------------------------------+----------------------------------------------------------------+
| **And**                             | The talent\'s avatar chip appears in the team member pending   |
|                                     | invite stack                                                   |
+-------------------------------------+----------------------------------------------------------------+

**Group B --- Talent Receiving & Viewing an Offer**

+-------------------------------------+----------------------------------------------------------------+
| **US-OS-15 View a received offer**                                                                   |
+------------------------------------------------------------------------------------------------------+
| As a **talent**, I want to view the full details of an offer I received so I can decide whether to   |
| accept, decline, or negotiate.                                                                       |
+-------------------------------------+----------------------------------------------------------------+
| **Given**                           | A client has sent me an offer and it is in PENDING status      |
+-------------------------------------+----------------------------------------------------------------+
| **When**                            | I open the offer from chat or a notification                   |
+-------------------------------------+----------------------------------------------------------------+
| **Then**                            | The offer modal displays: contract type badge, received date,  |
|                                     | contract/project name, View Job link, offer rate, role,        |
|                                     | contract duration, work schedule, start date, and expiry date  |
+-------------------------------------+----------------------------------------------------------------+
| **And**                             | The client\'s optional message is shown if one was sent        |
+-------------------------------------+----------------------------------------------------------------+
| **And**                             | Three action buttons are shown: Counter Offer, Decline Offer,  |
|                                     | Accept Offer                                                   |
+-------------------------------------+----------------------------------------------------------------+
| **And**                             | A Message button is available to open a chat with the client   |
+-------------------------------------+----------------------------------------------------------------+

+-------------------------------------+----------------------------------------------------------------+
| **US-OS-16 View offer history from within an offer modal**                                           |
+------------------------------------------------------------------------------------------------------+
| As a **talent**, I want to access the offer history so I can review the full negotiation trail       |
| before acting.                                                                                       |
+-------------------------------------+----------------------------------------------------------------+
| **Given**                           | I am viewing an offer modal                                    |
+-------------------------------------+----------------------------------------------------------------+
| **When**                            | I click the Offer History link                                 |
+-------------------------------------+----------------------------------------------------------------+
| **Then**                            | The Offer History modal opens showing a chronological list of  |
|                                     | all negotiation events                                         |
+-------------------------------------+----------------------------------------------------------------+
| **And**                             | Each row shows: actor avatar, action label (e.g. Laura sent an |
|                                     | offer), rate at that point, and timestamp                      |
+-------------------------------------+----------------------------------------------------------------+
| **And**                             | Each row can be expanded to show the full offer terms for that |
|                                     | round                                                          |
+-------------------------------------+----------------------------------------------------------------+
| **And**                             | A View Contract CTA is shown at the bottom when the offer has  |
|                                     | been accepted and a contract exists                            |
+-------------------------------------+----------------------------------------------------------------+

**Group C --- Talent Accepting an Offer**

+-------------------------------------+----------------------------------------------------------------+
| **US-OS-17 Accept an offer**                                                                         |
+------------------------------------------------------------------------------------------------------+
| As a **talent**, I want to accept a received offer so I can formally agree to the terms and start    |
| the contract process.                                                                                |
+-------------------------------------+----------------------------------------------------------------+
| **Given**                           | I am viewing a PENDING offer                                   |
+-------------------------------------+----------------------------------------------------------------+
| **When**                            | I click Accept Offer                                           |
+-------------------------------------+----------------------------------------------------------------+
| **Then**                            | The Accept This Offer modal opens                              |
+-------------------------------------+----------------------------------------------------------------+
| **And**                             | I see an optional message field (0/500 character limit) and a  |
|                                     | required consent checkbox reading: \"I agree to Marketeq\'s    |
|                                     | Terms of Service, Privacy Policy, Dispute Policy, and Work     |
|                                     | Protection Guidelines\"                                        |
+-------------------------------------+----------------------------------------------------------------+
| **And**                             | A notice reads: \"Once you accept, this offer becomes an       |
|                                     | active contract\"                                              |
+-------------------------------------+----------------------------------------------------------------+
| **When**                            | I check the consent checkbox and click Accept Offer            |
+-------------------------------------+----------------------------------------------------------------+
| **Then**                            | Offer-service sets the offer status to ACCEPTED and records    |
|                                     | acceptedAt timestamp                                           |
+-------------------------------------+----------------------------------------------------------------+
| **And**                             | Offer-service emits the offer.accepted event with the full     |
|                                     | agreed terms --- contracts-service consumes this to create the |
|                                     | ContractGroup in PENDING state                                 |
+-------------------------------------+----------------------------------------------------------------+
| **And**                             | The offer card in chat updates to Offer Accepted status with   |
|                                     | the contract start date                                        |
+-------------------------------------+----------------------------------------------------------------+

+-------------------------------------+----------------------------------------------------------------+
| **US-OS-18 Accept offer blocked when consent is not checked**                                        |
+------------------------------------------------------------------------------------------------------+
| As a **talent**, I want to be prevented from accepting an offer without agreeing to the terms so the |
| acceptance is always legally valid.                                                                  |
+-------------------------------------+----------------------------------------------------------------+
| **Given**                           | I am on the Accept This Offer modal                            |
+-------------------------------------+----------------------------------------------------------------+
| **When**                            | I do not check the consent checkbox                            |
+-------------------------------------+----------------------------------------------------------------+
| **Then**                            | The Accept Offer button remains disabled                       |
+-------------------------------------+----------------------------------------------------------------+
| **And**                             | I cannot proceed until the checkbox is checked                 |
+-------------------------------------+----------------------------------------------------------------+

**Group D --- Talent Declining an Offer**

+-------------------------------------+----------------------------------------------------------------+
| **US-OS-19 Decline an offer with a reason**                                                          |
+------------------------------------------------------------------------------------------------------+
| As a **talent**, I want to decline an offer with a reason so the client understands why I am not     |
| proceeding.                                                                                          |
+-------------------------------------+----------------------------------------------------------------+
| **Given**                           | I am viewing a PENDING offer                                   |
+-------------------------------------+----------------------------------------------------------------+
| **When**                            | I click Decline Offer                                          |
+-------------------------------------+----------------------------------------------------------------+
| **Then**                            | The Decline This Offer modal opens with a free-text reason     |
|                                     | field (0/500) and six quick-select reason chips: Budget        |
|                                     | doesn\'t work, Start date doesn\'t work, Requirements are      |
|                                     | unclear, Not a fit for my skills, Too busy right now, Need     |
|                                     | different terms                                                |
+-------------------------------------+----------------------------------------------------------------+
| **And**                             | Two action buttons are shown: Counter Offer and Decline offer  |
+-------------------------------------+----------------------------------------------------------------+
| **When**                            | I select a reason chip or type a reason and click Decline      |
|                                     | offer                                                          |
+-------------------------------------+----------------------------------------------------------------+
| **Then**                            | Offer-service sets the offer status to DECLINED and records    |
|                                     | declinedAt and the reason                                      |
+-------------------------------------+----------------------------------------------------------------+
| **And**                             | The offer is permanently closed and no further actions are     |
|                                     | available on it                                                |
+-------------------------------------+----------------------------------------------------------------+

+-------------------------------------+----------------------------------------------------------------+
| **US-OS-20 Pivot from decline to counter offer**                                                     |
+------------------------------------------------------------------------------------------------------+
| As a **talent**, I want to switch from declining to making a counter offer so I can negotiate        |
| instead of walking away.                                                                             |
+-------------------------------------+----------------------------------------------------------------+
| **Given**                           | I am on the Decline This Offer modal                           |
+-------------------------------------+----------------------------------------------------------------+
| **When**                            | I click Counter Offer                                          |
+-------------------------------------+----------------------------------------------------------------+
| **Then**                            | The Decline modal closes and the Make a Counter Offer modal    |
|                                     | opens with the original terms pre-populated                    |
+-------------------------------------+----------------------------------------------------------------+
| **And**                             | No decline is recorded --- the offer remains in PENDING status |
+-------------------------------------+----------------------------------------------------------------+

**Group E --- Talent Making a Counter Offer**

+-------------------------------------+----------------------------------------------------------------+
| **US-OS-21 Make a counter offer**                                                                    |
+------------------------------------------------------------------------------------------------------+
| As a **talent**, I want to propose different terms so I can negotiate the rate, duration, schedule,  |
| or start date.                                                                                       |
+-------------------------------------+----------------------------------------------------------------+
| **Given**                           | I am viewing a PENDING offer                                   |
+-------------------------------------+----------------------------------------------------------------+
| **When**                            | I click Counter Offer                                          |
+-------------------------------------+----------------------------------------------------------------+
| **Then**                            | The Make a Counter Offer modal opens showing original terms on |
|                                     | the left and editable fields on the right                      |
+-------------------------------------+----------------------------------------------------------------+
| **And**                             | I can modify: rate (preset or custom), contract duration       |
|                                     | (preset or custom), work schedule (Part Time / Full Time /     |
|                                     | custom hours), and start date (via calendar picker)            |
+-------------------------------------+----------------------------------------------------------------+
| **And**                             | An optional message field is shown (0/500)                     |
+-------------------------------------+----------------------------------------------------------------+
| **When**                            | I click Review Counteroffer                                    |
+-------------------------------------+----------------------------------------------------------------+
| **Then**                            | A review screen is shown with changed fields highlighted using |
|                                     | \"(was \$X)\" diff notation                                    |
+-------------------------------------+----------------------------------------------------------------+
| **And**                             | A legal notice reads: \"By submitting, you agree to work under |
|                                     | these terms if the client accepts your offer\"                 |
+-------------------------------------+----------------------------------------------------------------+
| **When**                            | I click Submit Counter Offer                                   |
+-------------------------------------+----------------------------------------------------------------+
| **Then**                            | Offer-service creates a counter offer record in PENDING status |
|                                     | and sets the primary offer status to COUNTERED                 |
+-------------------------------------+----------------------------------------------------------------+
| **And**                             | Any previously pending counter offer is set to SUPERSEDED      |
+-------------------------------------+----------------------------------------------------------------+

+-------------------------------------+----------------------------------------------------------------+
| **US-OS-22 See a rate warning on a high counter offer rate**                                         |
+------------------------------------------------------------------------------------------------------+
| As a **talent**, I want to be warned when my counter offer rate is too high so I can make a more     |
| competitive proposal.                                                                                |
+-------------------------------------+----------------------------------------------------------------+
| **Given**                           | I am on the Make a Counter Offer modal                         |
+-------------------------------------+----------------------------------------------------------------+
| **When**                            | I enter a rate that significantly exceeds the original offer   |
|                                     | rate                                                           |
+-------------------------------------+----------------------------------------------------------------+
| **Then**                            | Offer-service returns a threshold-based warning and the UI     |
|                                     | displays an advisory message: \"The client will be more likely |
|                                     | to accept if your counteroffer is closer to \$\[X\]/hr\"       |
+-------------------------------------+----------------------------------------------------------------+
| **And**                             | I am not blocked from submitting --- the warning is advisory   |
|                                     | only                                                           |
+-------------------------------------+----------------------------------------------------------------+

+-------------------------------------+----------------------------------------------------------------+
| **US-OS-23 Edit counter offer before submitting**                                                    |
+------------------------------------------------------------------------------------------------------+
| As a **talent**, I want to edit my counter offer from the review screen before submitting so I can   |
| correct any mistakes.                                                                                |
+-------------------------------------+----------------------------------------------------------------+
| **Given**                           | I am on the Review Counter Offer screen                        |
+-------------------------------------+----------------------------------------------------------------+
| **When**                            | I click Edit Counter Offer                                     |
+-------------------------------------+----------------------------------------------------------------+
| **Then**                            | I am returned to the Make a Counter Offer form with my         |
|                                     | proposed terms still populated                                 |
+-------------------------------------+----------------------------------------------------------------+
| **And**                             | I can change any field before resubmitting                     |
+-------------------------------------+----------------------------------------------------------------+

+-------------------------------------+----------------------------------------------------------------+
| **US-OS-24 View a pending counter offer I submitted**                                                |
+------------------------------------------------------------------------------------------------------+
| As a **talent**, I want to view my pending counter offer so I can see what terms I proposed and take |
| action if needed.                                                                                    |
+-------------------------------------+----------------------------------------------------------------+
| **Given**                           | I have submitted a counter offer that is in PENDING status     |
+-------------------------------------+----------------------------------------------------------------+
| **When**                            | I open the counter offer from chat                             |
+-------------------------------------+----------------------------------------------------------------+
| **Then**                            | I see the counter offer details including my proposed rate     |
|                                     | with \"(was \$X)\" notation, role, duration, schedule, start   |
|                                     | date, and my message                                           |
+-------------------------------------+----------------------------------------------------------------+
| **And**                             | The expiry date is shown: \"This counteroffer expires          |
|                                     | \[date\]. You can edit or withdraw it anytime before then\"    |
+-------------------------------------+----------------------------------------------------------------+
| **And**                             | Two action buttons are shown: Withdraw Counter Offer and Edit  |
|                                     | Counter Offer                                                  |
+-------------------------------------+----------------------------------------------------------------+

+-------------------------------------+----------------------------------------------------------------+
| **US-OS-25 Withdraw a pending counter offer**                                                        |
+------------------------------------------------------------------------------------------------------+
| As a **talent**, I want to withdraw my counter offer so I can cancel my proposed terms while keeping |
| the original offer active.                                                                           |
+-------------------------------------+----------------------------------------------------------------+
| **Given**                           | I have a counter offer in PENDING status                       |
+-------------------------------------+----------------------------------------------------------------+
| **When**                            | I click Withdraw Counter Offer                                 |
+-------------------------------------+----------------------------------------------------------------+
| **Then**                            | A confirmation modal opens with the message: \"Do you want to  |
|                                     | withdraw your counter offer? You can still accept the          |
|                                     | client\'s active offer afterward\"                             |
+-------------------------------------+----------------------------------------------------------------+
| **And**                             | An optional message field is shown (0/500)                     |
+-------------------------------------+----------------------------------------------------------------+
| **When**                            | I confirm the withdrawal                                       |
+-------------------------------------+----------------------------------------------------------------+
| **Then**                            | Offer-service sets the counter offer status to WITHDRAWN       |
+-------------------------------------+----------------------------------------------------------------+
| **And**                             | The primary offer is restored to PENDING status --- I can      |
|                                     | still accept the original offer                                |
+-------------------------------------+----------------------------------------------------------------+

+-------------------------------------+----------------------------------------------------------------+
| **US-OS-26 Resend an expired counter offer when requested by client**                                |
+------------------------------------------------------------------------------------------------------+
| As a **talent**, I want to resend my expired counter offer when the client asks so I can resume the  |
| negotiation.                                                                                         |
+-------------------------------------+----------------------------------------------------------------+
| **Given**                           | My counter offer has expired and the client sends me a message |
|                                     | asking if I can resend it                                      |
+-------------------------------------+----------------------------------------------------------------+
| **When**                            | I choose to resend from the chat prompt                        |
+-------------------------------------+----------------------------------------------------------------+
| **Then**                            | Offer-service creates a new counter offer record with the same |
|                                     | terms and a fresh 2-week expiry clock                          |
+-------------------------------------+----------------------------------------------------------------+
| **And**                             | The original expired counter offer remains in history with     |
|                                     | EXPIRED status                                                 |
+-------------------------------------+----------------------------------------------------------------+
| **And**                             | The chat shows \"You resent your counteroffer\" and an updated |
|                                     | Counter Offer Resent event card                                |
+-------------------------------------+----------------------------------------------------------------+

**Group F --- Client Managing a Sent Offer**

+-------------------------------------+----------------------------------------------------------------+
| **US-OS-27 View a sent offer**                                                                       |
+------------------------------------------------------------------------------------------------------+
| As a **client**, I want to view the details of an offer I sent so I can track its status and take    |
| action if needed.                                                                                    |
+-------------------------------------+----------------------------------------------------------------+
| **Given**                           | I have sent an offer that is in PENDING status                 |
+-------------------------------------+----------------------------------------------------------------+
| **When**                            | I open the offer from chat                                     |
+-------------------------------------+----------------------------------------------------------------+
| **Then**                            | The offer modal shows: contract type badge, sent date, Offer   |
|                                     | History link, contract/project name, View Job link, rate,      |
|                                     | role, duration, work schedule, start date, expiry date, and my |
|                                     | optional message                                               |
+-------------------------------------+----------------------------------------------------------------+
| **And**                             | Two action buttons are shown: Withdraw Offer and Edit Offer    |
+-------------------------------------+----------------------------------------------------------------+

+-------------------------------------+----------------------------------------------------------------+
| **US-OS-28 Edit a pending offer**                                                                    |
+------------------------------------------------------------------------------------------------------+
| As a **client**, I want to edit the terms of a pending offer so I can update the proposal before the |
| talent responds.                                                                                     |
+-------------------------------------+----------------------------------------------------------------+
| **Given**                           | I have an offer in PENDING status                              |
+-------------------------------------+----------------------------------------------------------------+
| **When**                            | I click Edit Offer                                             |
+-------------------------------------+----------------------------------------------------------------+
| **Then**                            | The Edit Offer modal opens showing original values on the left |
|                                     | and editable fields on the right for: rate, duration, work     |
|                                     | schedule, start date, and message                              |
+-------------------------------------+----------------------------------------------------------------+
| **And**                             | A contract title field is shown and editable                   |
+-------------------------------------+----------------------------------------------------------------+
| **And**                             | A Change Contract link is visible when the contract has        |
|                                     | phases, allowing me to switch the associated project           |
+-------------------------------------+----------------------------------------------------------------+
| **When**                            | I update any fields and click Review Offer                     |
+-------------------------------------+----------------------------------------------------------------+
| **Then**                            | A review screen shows changed fields with \"(was \$X)\" diff   |
|                                     | notation alongside the new values                              |
+-------------------------------------+----------------------------------------------------------------+
| **And**                             | A View Previous Offer link is shown so I can compare           |
+-------------------------------------+----------------------------------------------------------------+
| **When**                            | I click Send Offer on the review screen                        |
+-------------------------------------+----------------------------------------------------------------+
| **Then**                            | Offer-service updates the Offer record and resets the expiry   |
|                                     | clock to a fresh 2 weeks                                       |
+-------------------------------------+----------------------------------------------------------------+

+-------------------------------------+----------------------------------------------------------------+
| **US-OS-29 Withdraw a pending offer**                                                                |
+------------------------------------------------------------------------------------------------------+
| As a **client**, I want to withdraw an offer I sent so I can cancel it before the talent responds.   |
+-------------------------------------+----------------------------------------------------------------+
| **Given**                           | I have an offer in PENDING status                              |
+-------------------------------------+----------------------------------------------------------------+
| **When**                            | I click Withdraw Offer                                         |
+-------------------------------------+----------------------------------------------------------------+
| **Then**                            | A confirmation modal opens with the message: \"This will       |
|                                     | cancel the offer and notify the recipient\"                    |
+-------------------------------------+----------------------------------------------------------------+
| **And**                             | An optional message to talent field is shown (0/500)           |
+-------------------------------------+----------------------------------------------------------------+
| **When**                            | I confirm the withdrawal                                       |
+-------------------------------------+----------------------------------------------------------------+
| **Then**                            | Offer-service sets the offer status to WITHDRAWN and records   |
|                                     | withdrawnAt                                                    |
+-------------------------------------+----------------------------------------------------------------+
| **And**                             | The chat displays an Offer Withdrawn event card: \"The talent  |
|                                     | can no longer accept this offer\"                              |
+-------------------------------------+----------------------------------------------------------------+

**Group G --- Client Responding to a Counter Offer**

+-------------------------------------+----------------------------------------------------------------+
| **US-OS-30 View a counter offer from talent**                                                        |
+------------------------------------------------------------------------------------------------------+
| As a **client**, I want to view the counter offer terms a talent proposed so I can decide how to     |
| respond.                                                                                             |
+-------------------------------------+----------------------------------------------------------------+
| **Given**                           | Talent has submitted a counter offer on my offer               |
+-------------------------------------+----------------------------------------------------------------+
| **When**                            | I open the counter offer from chat or notification             |
+-------------------------------------+----------------------------------------------------------------+
| **Then**                            | The Counter Offer modal shows: talent username, contract type  |
|                                     | badge, received date, contract/project name, View Job link,    |
|                                     | proposed rate with arrow and \"(was \$X)\" notation, role,     |
|                                     | duration, work schedule, start date, talent\'s message         |
+-------------------------------------+----------------------------------------------------------------+
| **And**                             | The expiry notice reads: \"This counteroffer expires \[date\]. |
|                                     | If you decline, your original offer stays active unless it     |
|                                     | expires\"                                                      |
+-------------------------------------+----------------------------------------------------------------+
| **And**                             | Three action buttons are shown: Counter Offer, Decline, Accept |
|                                     | Offer                                                          |
+-------------------------------------+----------------------------------------------------------------+

+-------------------------------------+----------------------------------------------------------------+
| **US-OS-31 Accept a counter offer**                                                                  |
+------------------------------------------------------------------------------------------------------+
| As a **client**, I want to accept a talent\'s counter offer so I can agree to their proposed terms   |
| and proceed to contract.                                                                             |
+-------------------------------------+----------------------------------------------------------------+
| **Given**                           | I am viewing a PENDING counter offer                           |
+-------------------------------------+----------------------------------------------------------------+
| **When**                            | I click Accept Offer                                           |
+-------------------------------------+----------------------------------------------------------------+
| **Then**                            | Offer-service sets both the counter offer and the primary      |
|                                     | offer status to ACCEPTED and records acceptedAt                |
+-------------------------------------+----------------------------------------------------------------+
| **And**                             | Offer-service emits offer.accepted with the counter offer      |
|                                     | terms as the agreed terms                                      |
+-------------------------------------+----------------------------------------------------------------+
| **And**                             | Contracts-service consumes offer.accepted and creates the      |
|                                     | ContractGroup in PENDING state                                 |
+-------------------------------------+----------------------------------------------------------------+
| **And**                             | The chat shows an Offer Accepted event card with the contract  |
|                                     | start date and a View Contract CTA                             |
+-------------------------------------+----------------------------------------------------------------+

+-------------------------------------+----------------------------------------------------------------+
| **US-OS-32 Decline a counter offer**                                                                 |
+------------------------------------------------------------------------------------------------------+
| As a **client**, I want to decline a talent\'s counter offer so I can reject their proposed terms    |
| while keeping my original offer active.                                                              |
+-------------------------------------+----------------------------------------------------------------+
| **Given**                           | I am viewing a PENDING counter offer                           |
+-------------------------------------+----------------------------------------------------------------+
| **When**                            | I click Decline                                                |
+-------------------------------------+----------------------------------------------------------------+
| **Then**                            | Offer-service sets the counter offer status to DECLINED        |
+-------------------------------------+----------------------------------------------------------------+
| **And**                             | The primary offer is restored to PENDING status --- it remains |
|                                     | active for the talent to accept                                |
+-------------------------------------+----------------------------------------------------------------+
| **And**                             | The chat shows a Counter Offer Declined event card: \"These    |
|                                     | changes weren\'t accepted\"                                    |
+-------------------------------------+----------------------------------------------------------------+

+-------------------------------------+----------------------------------------------------------------+
| **US-OS-33 Counter a talent\'s counter offer**                                                       |
+------------------------------------------------------------------------------------------------------+
| As a **client**, I want to respond to a talent\'s counter offer with my own revised terms so I can   |
| continue negotiating.                                                                                |
+-------------------------------------+----------------------------------------------------------------+
| **Given**                           | I am viewing a PENDING counter offer from talent               |
+-------------------------------------+----------------------------------------------------------------+
| **When**                            | I click Counter Offer                                          |
+-------------------------------------+----------------------------------------------------------------+
| **Then**                            | The Make a Counter Offer modal opens pre-populated with the    |
|                                     | original offer terms                                           |
+-------------------------------------+----------------------------------------------------------------+
| **And**                             | I can modify rate, duration, schedule, start date, and message |
+-------------------------------------+----------------------------------------------------------------+
| **When**                            | I submit my counter offer                                      |
+-------------------------------------+----------------------------------------------------------------+
| **Then**                            | Offer-service creates a new counter offer record, sets the     |
|                                     | talent\'s counter offer to SUPERSEDED, and the negotiation     |
|                                     | continues                                                      |
+-------------------------------------+----------------------------------------------------------------+

**Group H --- Offer Expiry & Recovery**

+-------------------------------------+----------------------------------------------------------------+
| **US-OS-34 Offer auto-expires after 2 weeks of inactivity**                                          |
+------------------------------------------------------------------------------------------------------+
| As a **offer-service system**, I want to automatically expire an offer after 2 weeks of no           |
| significant activity so inactive offers do not remain open indefinitely.                             |
+-------------------------------------+----------------------------------------------------------------+
| **Given**                           | An offer has been in PENDING status for 14 days with no        |
|                                     | accept, decline, or counter action                             |
+-------------------------------------+----------------------------------------------------------------+
| **When**                            | The expiry clock reaches zero                                  |
+-------------------------------------+----------------------------------------------------------------+
| **Then**                            | Offer-service sets the offer status to EXPIRED and records     |
|                                     | expiredAt                                                      |
+-------------------------------------+----------------------------------------------------------------+
| **And**                             | The offer is permanently inactive --- it cannot be accepted,   |
|                                     | declined, or countered                                         |
+-------------------------------------+----------------------------------------------------------------+
| **And**                             | Offer-service emits offer.expired --- notification-service     |
|                                     | consumes this to alert both client and talent                  |
+-------------------------------------+----------------------------------------------------------------+

+-------------------------------------+----------------------------------------------------------------+
| **US-OS-35 Both parties receive an expiry warning 48 hours before an offer expires**                 |
+------------------------------------------------------------------------------------------------------+
| As a **offer-service system**, I want to send a 48-hour expiry warning so both parties have a chance |
| to act before the offer closes.                                                                      |
+-------------------------------------+----------------------------------------------------------------+
| **Given**                           | An offer has 48 hours remaining before its expiry timestamp    |
+-------------------------------------+----------------------------------------------------------------+
| **When**                            | The 48-hour threshold is reached                               |
+-------------------------------------+----------------------------------------------------------------+
| **Then**                            | Offer-service emits offer.expiring_soon ---                    |
|                                     | notification-service consumes this and sends an expiry warning |
|                                     | to both client and talent                                      |
+-------------------------------------+----------------------------------------------------------------+

+-------------------------------------+----------------------------------------------------------------+
| **US-OS-36 Talent requests an extension on a recently expired offer**                                |
+------------------------------------------------------------------------------------------------------+
| As a **talent**, I want to request an extension on an expired offer so I can ask the client to       |
| reopen it without losing the negotiation context.                                                    |
+-------------------------------------+----------------------------------------------------------------+
| **Given**                           | An offer I received has expired within the last 30 days        |
+-------------------------------------+----------------------------------------------------------------+
| **When**                            | I view the expired offer details                               |
+-------------------------------------+----------------------------------------------------------------+
| **Then**                            | The recovery action shown is: \"Want to revisit this? You can  |
|                                     | ask the client to extend the offer\" with a Request Extension  |
|                                     | button                                                         |
+-------------------------------------+----------------------------------------------------------------+
| **When**                            | I click Request Extension                                      |
+-------------------------------------+----------------------------------------------------------------+
| **Then**                            | Offer-service sets a pending extension flag on the expired     |
|                                     | offer and notifies the client                                  |
+-------------------------------------+----------------------------------------------------------------+
| **And**                             | The client must approve the extension for a new offer to be    |
|                                     | created                                                        |
+-------------------------------------+----------------------------------------------------------------+

+-------------------------------------+----------------------------------------------------------------+
| **US-OS-37 Client approves a talent extension request**                                              |
+------------------------------------------------------------------------------------------------------+
| As a **client**, I want to approve a talent\'s extension request so I can reopen the offer and       |
| continue the negotiation.                                                                            |
+-------------------------------------+----------------------------------------------------------------+
| **Given**                           | A talent has requested an extension on an expired offer        |
+-------------------------------------+----------------------------------------------------------------+
| **When**                            | I approve the extension                                        |
+-------------------------------------+----------------------------------------------------------------+
| **Then**                            | Offer-service creates a new Offer record with the same terms   |
|                                     | and a fresh 2-week expiry clock                                |
+-------------------------------------+----------------------------------------------------------------+
| **And**                             | The new offer is linked to the original via                    |
|                                     | reopenedFromOfferId                                            |
+-------------------------------------+----------------------------------------------------------------+
| **And**                             | The original offer remains in EXPIRED status in history        |
+-------------------------------------+----------------------------------------------------------------+
| **And**                             | The chat shows the new offer as an active pending offer        |
+-------------------------------------+----------------------------------------------------------------+

+-------------------------------------+----------------------------------------------------------------+
| **US-OS-38 Talent asks if role is still open after 30+ days of expiry**                              |
+------------------------------------------------------------------------------------------------------+
| As a **talent**, I want to ask the client if the role is still available when my offer has been      |
| expired for more than 30 days.                                                                       |
+-------------------------------------+----------------------------------------------------------------+
| **Given**                           | An offer I received expired more than 30 days ago              |
+-------------------------------------+----------------------------------------------------------------+
| **When**                            | I view the expired offer details                               |
+-------------------------------------+----------------------------------------------------------------+
| **Then**                            | The recovery action shown is: \"Want to revisit this? Ask the  |
|                                     | client to see if the role is still available\" with an Ask Now |
|                                     | button                                                         |
+-------------------------------------+----------------------------------------------------------------+
| **And**                             | The Request Extension option is NOT shown --- it is only       |
|                                     | available within 30 days of expiry                             |
+-------------------------------------+----------------------------------------------------------------+
| **When**                            | I click Ask Now                                                |
+-------------------------------------+----------------------------------------------------------------+
| **Then**                            | A message is sent to the client in the existing chat thread    |
+-------------------------------------+----------------------------------------------------------------+

+-------------------------------------+----------------------------------------------------------------+
| **US-OS-39 Client views an expired offer they sent**                                                 |
+------------------------------------------------------------------------------------------------------+
| As a **client**, I want to view an expired offer I sent so I can decide whether to resend or edit    |
| the terms.                                                                                           |
+-------------------------------------+----------------------------------------------------------------+
| **Given**                           | An offer I sent has expired                                    |
+-------------------------------------+----------------------------------------------------------------+
| **When**                            | I open the expired offer                                       |
+-------------------------------------+----------------------------------------------------------------+
| **Then**                            | The modal shows: \"This Offer Expired\" with the expiry date,  |
|                                     | contract type, contract name, sent-to talent, and all original |
|                                     | offer terms                                                    |
+-------------------------------------+----------------------------------------------------------------+
| **And**                             | A Message button is available                                  |
+-------------------------------------+----------------------------------------------------------------+
| **And**                             | The footer shows: \"You can resend this offer or edit the      |
|                                     | terms before sending\" with Edit Offer and Resend Offer        |
|                                     | buttons                                                        |
+-------------------------------------+----------------------------------------------------------------+
| **And**                             | If the offer was subsequently reopened, the footer instead     |
|                                     | shows: \"This offer was reopened \[X\] days ago\" with a View  |
|                                     | Current Offer CTA                                              |
+-------------------------------------+----------------------------------------------------------------+
| **And**                             | If the offer was accepted after expiry, the footer shows:      |
|                                     | \"This offer was accepted \[X\] days ago\" with a View         |
|                                     | Contract CTA                                                   |
+-------------------------------------+----------------------------------------------------------------+

**Group I --- Declined Offer Details**

+-------------------------------------+----------------------------------------------------------------+
| **US-OS-40 Client views a declined offer**                                                           |
+------------------------------------------------------------------------------------------------------+
| As a **client**, I want to view the details of an offer the talent declined so I can understand why  |
| and decide on next steps.                                                                            |
+-------------------------------------+----------------------------------------------------------------+
| **Given**                           | An offer I sent has been declined by the talent                |
+-------------------------------------+----------------------------------------------------------------+
| **When**                            | I open the declined offer                                      |
+-------------------------------------+----------------------------------------------------------------+
| **Then**                            | The modal title reads \"Your offer was declined\" with the     |
|                                     | contract type badge, decline date, Message button, contract    |
|                                     | name, and \"Sent to @\[talent\]\"                              |
+-------------------------------------+----------------------------------------------------------------+
| **And**                             | All offer terms are displayed: rate, role, duration, work      |
|                                     | schedule, start date                                           |
+-------------------------------------+----------------------------------------------------------------+
| **And**                             | The talent\'s decline reason is shown in a Reason section      |
+-------------------------------------+----------------------------------------------------------------+
| **And**                             | The footer reads: \"You can resend this offer or edit the      |
|                                     | terms before sending\" with Edit Offer and Resend Offer        |
|                                     | buttons                                                        |
+-------------------------------------+----------------------------------------------------------------+

+-------------------------------------+----------------------------------------------------------------+
| **US-OS-41 Talent views an offer they declined**                                                     |
+------------------------------------------------------------------------------------------------------+
| As a **talent**, I want to view the details of an offer I declined so I can review my decision or    |
| ask if the role is still open.                                                                       |
+-------------------------------------+----------------------------------------------------------------+
| **Given**                           | I have declined an offer                                       |
+-------------------------------------+----------------------------------------------------------------+
| **When**                            | I open the declined offer                                      |
+-------------------------------------+----------------------------------------------------------------+
| **Then**                            | The modal title reads \"You declined this offer\" with the     |
|                                     | contract type badge, decline date, Message button, contract    |
|                                     | name, and \"Offer from @\[client\]\"                           |
+-------------------------------------+----------------------------------------------------------------+
| **And**                             | All offer terms and my decline reason are displayed            |
+-------------------------------------+----------------------------------------------------------------+
| **And**                             | The footer reads: \"Want to revisit this? Ask the client to    |
|                                     | see if the role is still open\" with an Ask Now button         |
+-------------------------------------+----------------------------------------------------------------+

**Group J --- Withdrawn Offer Details**

+-------------------------------------+----------------------------------------------------------------+
| **US-OS-42 Client views an offer they withdrew**                                                     |
+------------------------------------------------------------------------------------------------------+
| As a **client**, I want to view the details of an offer I withdrew so I can resend or edit it if     |
| needed.                                                                                              |
+-------------------------------------+----------------------------------------------------------------+
| **Given**                           | I have withdrawn an offer                                      |
+-------------------------------------+----------------------------------------------------------------+
| **When**                            | I open the withdrawn offer                                     |
+-------------------------------------+----------------------------------------------------------------+
| **Then**                            | The modal title reads \"You withdrew this offer\" with the     |
|                                     | contract type, withdrawal date, Message button, contract name, |
|                                     | and \"Sent to @\[talent\]\"                                    |
+-------------------------------------+----------------------------------------------------------------+
| **And**                             | All offer terms are shown                                      |
+-------------------------------------+----------------------------------------------------------------+
| **And**                             | The message section shows the withdrawal message or \"No       |
|                                     | message was sent\" as a fallback                               |
+-------------------------------------+----------------------------------------------------------------+
| **And**                             | The footer shows Edit Offer and Resend Offer buttons           |
+-------------------------------------+----------------------------------------------------------------+

+-------------------------------------+----------------------------------------------------------------+
| **US-OS-43 Talent views an offer that was withdrawn**                                                |
+------------------------------------------------------------------------------------------------------+
| As a **talent**, I want to view an offer that the client withdrew so I can decide whether to ask if  |
| it is still available.                                                                               |
+-------------------------------------+----------------------------------------------------------------+
| **Given**                           | A client has withdrawn an offer they sent me                   |
+-------------------------------------+----------------------------------------------------------------+
| **When**                            | I open the withdrawn offer                                     |
+-------------------------------------+----------------------------------------------------------------+
| **Then**                            | The modal title reads \"This offer was withdrawn\" with the    |
|                                     | contract type, withdrawal date, Message button, contract name, |
|                                     | and \"Offer from @\[client\]\"                                 |
+-------------------------------------+----------------------------------------------------------------+
| **And**                             | All offer terms are shown                                      |
+-------------------------------------+----------------------------------------------------------------+
| **And**                             | The message section shows the withdrawal message or \"No       |
|                                     | message was sent\" as a fallback                               |
+-------------------------------------+----------------------------------------------------------------+
| **And**                             | The footer reads: \"Want to revisit this? Ask the client to    |
|                                     | see if the role is still available\" with an Ask Now button    |
+-------------------------------------+----------------------------------------------------------------+

**Group K --- Resend Offer**

+-------------------------------------+----------------------------------------------------------------+
| **US-OS-44 Resend an offer with the same terms**                                                     |
+------------------------------------------------------------------------------------------------------+
| As a **client**, I want to resend an expired, declined, or withdrawn offer with the same terms so I  |
| can give the talent another chance to respond.                                                       |
+-------------------------------------+----------------------------------------------------------------+
| **Given**                           | An offer I sent is in EXPIRED, DECLINED, or WITHDRAWN status   |
+-------------------------------------+----------------------------------------------------------------+
| **When**                            | I click Resend Offer from the offer details modal              |
+-------------------------------------+----------------------------------------------------------------+
| **Then**                            | The Resend Offer confirmation modal opens with the message:    |
|                                     | \"This will resend the offer with the same terms\"             |
+-------------------------------------+----------------------------------------------------------------+
| **And**                             | A View Terms link allows me to review the original terms       |
|                                     | before resending                                               |
+-------------------------------------+----------------------------------------------------------------+
| **And**                             | An optional message to talent field is shown (0/500)           |
+-------------------------------------+----------------------------------------------------------------+
| **When**                            | I click Resend Offer                                           |
+-------------------------------------+----------------------------------------------------------------+
| **Then**                            | Offer-service creates a new Offer record with the same terms   |
|                                     | and a fresh 2-week expiry clock                                |
+-------------------------------------+----------------------------------------------------------------+
| **And**                             | The original offer record retains its terminal status and      |
|                                     | remains in offer history                                       |
+-------------------------------------+----------------------------------------------------------------+
| **And**                             | The chat shows \"Offer Sent --- New offer sent with the same   |
|                                     | terms\"                                                        |
+-------------------------------------+----------------------------------------------------------------+

+-------------------------------------+----------------------------------------------------------------+
| **US-OS-45 Edit and resend an offer with updated terms**                                             |
+------------------------------------------------------------------------------------------------------+
| As a **client**, I want to edit the terms of an expired or declined offer before resending so I can  |
| make a more competitive proposal.                                                                    |
+-------------------------------------+----------------------------------------------------------------+
| **Given**                           | An offer I sent is in EXPIRED or DECLINED status               |
+-------------------------------------+----------------------------------------------------------------+
| **When**                            | I click Edit Offer from the offer details modal                |
+-------------------------------------+----------------------------------------------------------------+
| **Then**                            | The Edit Offer modal opens pre-populated with the original     |
|                                     | terms                                                          |
+-------------------------------------+----------------------------------------------------------------+
| **When**                            | I update one or more fields and click Review Offer             |
+-------------------------------------+----------------------------------------------------------------+
| **Then**                            | The review screen shows the updated terms with \"(was \$X)\"   |
|                                     | diff notation for any changed fields                           |
+-------------------------------------+----------------------------------------------------------------+
| **And**                             | A View Previous Offer link is available                        |
+-------------------------------------+----------------------------------------------------------------+
| **When**                            | I click Send Offer                                             |
+-------------------------------------+----------------------------------------------------------------+
| **Then**                            | Offer-service creates a new Offer record with the updated      |
|                                     | terms and a fresh 2-week expiry clock                          |
+-------------------------------------+----------------------------------------------------------------+
| **And**                             | The original offer remains in its terminal status in history   |
+-------------------------------------+----------------------------------------------------------------+

**Group L --- Previous Offer & Offer History Access**

+-------------------------------------+----------------------------------------------------------------+
| **US-OS-46 Talent accesses previous offer during active negotiation**                                |
+------------------------------------------------------------------------------------------------------+
| As a **talent**, I want to view the previous offer terms during an active negotiation so I have full |
| context when deciding how to respond.                                                                |
+-------------------------------------+----------------------------------------------------------------+
| **Given**                           | There is an active negotiation with at least one prior offer   |
|                                     | round                                                          |
+-------------------------------------+----------------------------------------------------------------+
| **When**                            | I click Offer History from within the offer modal              |
+-------------------------------------+----------------------------------------------------------------+
| **Then**                            | The Previous Offer modal opens showing the prior offer terms:  |
|                                     | rate, role, duration, work schedule, start date                |
+-------------------------------------+----------------------------------------------------------------+
| **And**                             | The offer expiry date is shown                                 |
+-------------------------------------+----------------------------------------------------------------+
| **And**                             | Decline Offer and Accept Offer actions remain available from   |
|                                     | this view                                                      |
+-------------------------------------+----------------------------------------------------------------+

+-------------------------------------+----------------------------------------------------------------+
| **US-OS-47 Client accesses previous offer during active negotiation**                                |
+------------------------------------------------------------------------------------------------------+
| As a **client**, I want to view the previous offer I sent during an active negotiation so I can      |
| compare it to a counter offer.                                                                       |
+-------------------------------------+----------------------------------------------------------------+
| **Given**                           | I have a sent offer and there is an active negotiation         |
+-------------------------------------+----------------------------------------------------------------+
| **When**                            | I click Offer History from within the offer modal              |
+-------------------------------------+----------------------------------------------------------------+
| **Then**                            | The Previous Offer modal shows my sent offer terms and the     |
|                                     | Offer History link                                             |
+-------------------------------------+----------------------------------------------------------------+
| **And**                             | The offer expiry date and Withdraw Offer action are available  |
|                                     | from this view                                                 |
+-------------------------------------+----------------------------------------------------------------+

+-------------------------------------+----------------------------------------------------------------+
| **US-OS-48 Both parties view the full offer history at any time**                                    |
+------------------------------------------------------------------------------------------------------+
| As a **client or talent**, I want to view the complete offer history at any time so I have a         |
| permanent record of every negotiation round.                                                         |
+-------------------------------------+----------------------------------------------------------------+
| **Given**                           | An offer negotiation exists in any status (active, accepted,   |
|                                     | declined, withdrawn, expired)                                  |
+-------------------------------------+----------------------------------------------------------------+
| **When**                            | I open the Offer History modal                                 |
+-------------------------------------+----------------------------------------------------------------+
| **Then**                            | A chronological list of all events is shown: each with actor   |
|                                     | avatar, action label, rate at the time, and timestamp          |
+-------------------------------------+----------------------------------------------------------------+
| **And**                             | Each row can be expanded to show the full offer terms for that |
|                                     | round (role, duration, schedule, start date, message)          |
+-------------------------------------+----------------------------------------------------------------+
| **And**                             | Expired, withdrawn, and declined offers are permanently        |
|                                     | visible in history --- they are never deleted                  |
+-------------------------------------+----------------------------------------------------------------+
| **And**                             | When a contract is active, a View Contract CTA is shown at the |
|                                     | bottom of the history modal                                    |
+-------------------------------------+----------------------------------------------------------------+

**Group M --- Offer State Machine & System Rules**

+-------------------------------------+----------------------------------------------------------------+
| **US-OS-49 Offer status reflects the current negotiation state in chat**                             |
+------------------------------------------------------------------------------------------------------+
| As a **client or talent**, I want to see the current offer status on the in-chat offer card so I     |
| always know where the negotiation stands without opening the full modal.                             |
+-------------------------------------+----------------------------------------------------------------+
| **Given**                           | An offer exists in any state                                   |
+-------------------------------------+----------------------------------------------------------------+
| **When**                            | I view the chat thread                                         |
+-------------------------------------+----------------------------------------------------------------+
| **Then**                            | The offer card displays the contract type badge, contract      |
|                                     | name, status label, status context line, and key terms summary |
|                                     | (rate, role, duration, schedule)                               |
+-------------------------------------+----------------------------------------------------------------+
| **And**                             | The status label and context line update to reflect each state |
|                                     | change: Pending, Accepted, Declined, Countered, Withdrawn,     |
|                                     | Expired                                                        |
+-------------------------------------+----------------------------------------------------------------+
| **And**                             | A contextual CTA link is shown per state: View Offer           |
|                                     | (pending), View Contract (accepted), View Details              |
|                                     | (declined/withdrawn/expired), View Offer History (after        |
|                                     | counter)                                                       |
+-------------------------------------+----------------------------------------------------------------+

+-------------------------------------+----------------------------------------------------------------+
| **US-OS-50 Counter offer expiry does not close the original offer**                                  |
+------------------------------------------------------------------------------------------------------+
| As a **client or talent**, I want to see the original offer remain active when a counter offer       |
| expires so neither party loses the negotiation progress.                                             |
+-------------------------------------+----------------------------------------------------------------+
| **Given**                           | Talent has submitted a counter offer that subsequently expires |
+-------------------------------------+----------------------------------------------------------------+
| **When**                            | The counter offer expiry clock reaches zero                    |
+-------------------------------------+----------------------------------------------------------------+
| **Then**                            | Offer-service sets the counter offer status to EXPIRED         |
+-------------------------------------+----------------------------------------------------------------+
| **And**                             | The primary offer is restored to PENDING --- the client\'s     |
|                                     | original offer remains active                                  |
+-------------------------------------+----------------------------------------------------------------+
| **And**                             | The talent can still accept the original offer or submit a new |
|                                     | counter offer                                                  |
+-------------------------------------+----------------------------------------------------------------+

+-------------------------------------+----------------------------------------------------------------+
| **US-OS-51 Withdrawing a counter offer restores the original offer**                                 |
+------------------------------------------------------------------------------------------------------+
| As a **talent**, I want to have the original offer restored when I withdraw my counter offer so I    |
| can still accept the client\'s terms.                                                                |
+-------------------------------------+----------------------------------------------------------------+
| **Given**                           | I have a pending counter offer in PENDING status               |
+-------------------------------------+----------------------------------------------------------------+
| **When**                            | I withdraw the counter offer                                   |
+-------------------------------------+----------------------------------------------------------------+
| **Then**                            | Offer-service sets the counter offer to WITHDRAWN              |
+-------------------------------------+----------------------------------------------------------------+
| **And**                             | The primary offer is restored to PENDING status                |
+-------------------------------------+----------------------------------------------------------------+
| **And**                             | I can still accept, decline, or counter the original offer     |
+-------------------------------------+----------------------------------------------------------------+

+-------------------------------------+----------------------------------------------------------------+
| **US-OS-52 Declined counter offer restores the original offer**                                      |
+------------------------------------------------------------------------------------------------------+
| As a **client**, I want to have the original offer remain active when I decline a counter offer so   |
| the talent can still accept the original terms.                                                      |
+-------------------------------------+----------------------------------------------------------------+
| **Given**                           | I have declined a talent\'s counter offer                      |
+-------------------------------------+----------------------------------------------------------------+
| **Then**                            | Offer-service sets the counter offer to DECLINED               |
+-------------------------------------+----------------------------------------------------------------+
| **And**                             | The primary offer is restored to PENDING unless it has         |
|                                     | independently expired                                          |
+-------------------------------------+----------------------------------------------------------------+
| **And**                             | The talent can still accept the original offer                 |
+-------------------------------------+----------------------------------------------------------------+

+-------------------------------------+----------------------------------------------------------------+
| **US-OS-53 New counter offer supersedes a previous pending counter offer**                           |
+------------------------------------------------------------------------------------------------------+
| As a **talent or client**, I want to have a new counter offer automatically supersede any existing   |
| pending counter offer so there is always only one active counter offer per negotiation.              |
+-------------------------------------+----------------------------------------------------------------+
| **Given**                           | There is a counter offer in PENDING status                     |
+-------------------------------------+----------------------------------------------------------------+
| **When**                            | Either party submits a new counter offer                       |
+-------------------------------------+----------------------------------------------------------------+
| **Then**                            | Offer-service sets the previous counter offer status to        |
|                                     | SUPERSEDED                                                     |
+-------------------------------------+----------------------------------------------------------------+
| **And**                             | The new counter offer becomes the active pending counter offer |
+-------------------------------------+----------------------------------------------------------------+
| **And**                             | The superseded counter offer is visible in offer history with  |
|                                     | SUPERSEDED status                                              |
+-------------------------------------+----------------------------------------------------------------+

+-------------------------------------+----------------------------------------------------------------+
| **US-OS-54 Expired offer cannot be accepted, declined, or countered**                                |
+------------------------------------------------------------------------------------------------------+
| As a **talent**, I want to be prevented from acting on an expired offer so the system stays in a     |
| consistent state.                                                                                    |
+-------------------------------------+----------------------------------------------------------------+
| **Given**                           | An offer has status EXPIRED                                    |
+-------------------------------------+----------------------------------------------------------------+
| **When**                            | I attempt to accept, decline, or counter the offer             |
+-------------------------------------+----------------------------------------------------------------+
| **Then**                            | Offer-service rejects the request                              |
+-------------------------------------+----------------------------------------------------------------+
| **And**                             | The only available recovery actions are Request Extension (if  |
|                                     | ≤ 30 days since expiry) or Ask Now (if \> 30 days)             |
+-------------------------------------+----------------------------------------------------------------+

+-------------------------------------+----------------------------------------------------------------+
| **US-OS-55 Offer accepted event triggers contract creation**                                         |
+------------------------------------------------------------------------------------------------------+
| As a **offer-service system**, I want to emit an offer.accepted event when an offer is accepted so   |
| contracts-service can create the ContractGroup automatically.                                        |
+-------------------------------------+----------------------------------------------------------------+
| **Given**                           | An offer or counter offer has been accepted by the talent (or  |
|                                     | the client accepts a counter offer)                            |
+-------------------------------------+----------------------------------------------------------------+
| **When**                            | Offer-service sets the offer status to ACCEPTED                |
+-------------------------------------+----------------------------------------------------------------+
| **Then**                            | Offer-service emits the offer.accepted event containing:       |
|                                     | offerId, clientId, talentId, agreed rate, schedule, duration,  |
|                                     | title, start date, jobListingId, and contractType              |
+-------------------------------------+----------------------------------------------------------------+
| **And**                             | Contracts-service consumes offer.accepted and creates the      |
|                                     | ContractGroup and individual Contract record(s) in PENDING     |
|                                     | state                                                          |
+-------------------------------------+----------------------------------------------------------------+
| **And**                             | The offer lifecycle in offer-service is complete --- all       |
|                                     | subsequent contract management belongs to contracts-service    |
+-------------------------------------+----------------------------------------------------------------+

+-------------------------------------+----------------------------------------------------------------+
| **US-OS-56 All offer messages are limited to 500 characters**                                        |
+------------------------------------------------------------------------------------------------------+
| As a **client or talent**, I want to be limited to 500 characters in any offer-related message field |
| so messages stay concise.                                                                            |
+-------------------------------------+----------------------------------------------------------------+
| **Given**                           | I am on any offer modal that includes a message field (send    |
|                                     | offer, edit offer, counter offer, accept offer, decline offer, |
|                                     | withdraw offer, resend offer, withdraw counter offer)          |
+-------------------------------------+----------------------------------------------------------------+
| **When**                            | I type in the message field                                    |
+-------------------------------------+----------------------------------------------------------------+
| **Then**                            | A live character counter is shown (e.g. 0/500)                 |
+-------------------------------------+----------------------------------------------------------------+
| **And**                             | The field stops accepting input at 500 characters              |
+-------------------------------------+----------------------------------------------------------------+
| **And**                             | All message fields are optional unless a specific flow         |
|                                     | requires otherwise                                             |
+-------------------------------------+----------------------------------------------------------------+
