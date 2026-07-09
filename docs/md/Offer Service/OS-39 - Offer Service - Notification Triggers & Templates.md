**OS-39**

**Offer Service --- Notification Triggers & Templates**

**Triggered by:** offer-service RabbitMQ events **Consumed by:**
notification-service **Exchange:** marketeq.offers

This document defines every notification triggered by offer-service
events. offer-service publishes events to the marketeq.offers RabbitMQ
exchange. notification-service consumes these events and is responsible
for delivery --- bell icon, inbox message card, and push notification.
offer-service is the source of truth for what each notification should
say and where its CTA routes.

Variables in body copy use \[bracket\] notation. These are resolved by
notification-service from the event payload at delivery time.

  -----------------------------------------------------------------------------
  **Recipient**   **Meaning**
  --------------- -------------------------------------------------------------
  **Client**      The user who sent the original offer --- the hiring party.

  **Talent**      The user who received the original offer --- the talent being
                  hired.

  **Both**        Both the client and the talent receive this notification
                  simultaneously.
  -----------------------------------------------------------------------------

+-----------------------------------------------------------------------+
| **1 Primary Offer Notifications**                                     |
|                                                                       |
| Triggered by primary offer lifecycle events                           |
+=======================================================================+

  ---------------------------------------------------------------------------------------------------------------------------------------------
  **Event**                 **Recipient**   **Title**     **Body Copy**         **CTA        **CTA Destination**   **Notes**
                                                                                Label**                            
  ------------------------- --------------- ------------- --------------------- ------------ --------------------- ----------------------------
  **offer.created**         **Talent**      **New Offer** @\[clientUsername\]   **View       Active Offer Modal    Fires immediately on offer
                                                          sent you an offer to  Offer**      (Talent view)         creation. Bell badge
                                                          join \[contractType\]                                    increments by 1 for talent.
                                                          \[contractTitle\].                                       

  **offer.edited**          **Talent**      **Offer       @\[clientUsername\]   **View       Active Offer Modal    Fires when client edits any
                                            Updated**     updated their offer   Offer**      (Talent view)         field on a PENDING offer.
                                                          for \[contractType\]                                     Talent must be notified so
                                                          \[contractTitle\].                                       they can review the updated
                                                                                                                   terms before responding.

  **offer.accepted**        **Client**      **Offer       @\[talentUsername\]   **View       Contract Detail Page  CTA routes to newly created
                                            Accepted**    accepted your offer   Contract**   (contracts-service)   contract, not the offer.
                                                          to join                                                  
                                                          \[contractType\]                                         
                                                          \[contractTitle\].                                       

  **offer.declined**        **Client**      **Offer       @\[talentUsername\]   **View       Offer Declined        Decline REASON is NOT shown
                                            Declined**    declined your offer   Details**    Details Modal (Client in the notification. Only
                                                          to join                            view)                 visible in the details
                                                          \[contractType\]                                         modal.
                                                          \[contractTitle\].                                       

  **offer.withdrawn**       **Talent**      **Offer       @\[clientUsername\]   **View       Offer Withdrawn       Withdrawal message NOT shown
                                            Withdrawn**   withdrew their offer  Details**    Details Modal (Talent in notification. Only
                                                          for \[contractType\]               view)                 visible in details modal.
                                                          \[contractTitle\].                                       

  **offer.expiring_soon**   **Both**        **Offer       The offer for         **View       Active Offer Modal    Fires once per offer per
                                            Expiring      \[contractType\]      Offer**      (role-appropriate     expiry window. warningSentAt
                                            Soon**        \[contractTitle\]                  view)                 prevents duplicates. Resets
                                                          expires in 48 hours.                                     when expiresAt resets.

  **offer.expired**         **Both**        **Offer       The offer for         **View       Offer Expired Details Both parties notified
                                            Expired**     \[contractType\]      Details**    Modal                 simultaneously. Client CTA
                                                          \[contractTitle\] has              (role-appropriate     routes to resend/edit.
                                                          expired.                           view)                 Talent CTA routes to Request
                                                                                                                   Extension or Ask Now
                                                                                                                   depending on elapsed time.

  **offer.resent**          **Talent**      **New Offer** @\[clientUsername\]   **View       Active Offer Modal    Resent offer appears as a
                                                          resent you an offer   Offer**      (Talent view)         new offer notification ---
                                                          to join                                                  same copy as offer.created.
                                                          \[contractType\]                                         The original
                                                          \[contractTitle\].                                       expired/declined/withdrawn
                                                                                                                   offer remains in chat
                                                                                                                   history.
  ---------------------------------------------------------------------------------------------------------------------------------------------

+-----------------------------------------------------------------------+
| **2 Counter Offer Notifications**                                     |
|                                                                       |
| Triggered by counter offer lifecycle events                           |
+=======================================================================+

  ---------------------------------------------------------------------------------------------------------------------------------------
  **Event**                     **Recipient**   **Title**     **Body Copy**         **CTA        **CTA Destination**   **Notes**
                                                                                    Label**                            
  ----------------------------- --------------- ------------- --------------------- ------------ --------------------- ------------------
  **offer.countered**           **Client**      **Counter     @\[talentUsername\]   **View       Counter Offer Modal   Fires when talent
                                                Offer         sent you a counter    Counter      (Client view)         submits their
                                                Received**    offer for             Offer**                            first counter
                                                              \[contractType\]                                         offer. Client must
                                                              \[contractTitle\].                                       respond before
                                                                                                                       making further
                                                                                                                       edits to the
                                                                                                                       primary offer.

  **offer.counter_edited**      **Client**      **Counter     @\[talentUsername\]   **View       Counter Offer Modal   Fires when talent
                                                Offer         updated their counter Counter      (Client view)         edits their
                                                Updated**     offer for             Offer**                            counter offer
                                                              \[contractType\]                                         in-place via Edit
                                                              \[contractTitle\].                                       Counter Offer.
                                                                                                                       Distinct from
                                                                                                                       offer.countered.

  **offer.counter_accepted**    **Talent**      **Counter     @\[clientUsername\]   **View       Contract Detail Page  CTA routes to the
                                                Offer         accepted your counter Contract**   (contracts-service)   contract, not the
                                                Accepted**    offer for                                                counter offer.
                                                              \[contractType\]                                         Contract created
                                                              \[contractTitle\].                                       from counter offer
                                                                                                                       terms.

  **offer.counter_declined**    **Talent**      **Counter     @\[clientUsername\]   **View       Active Offer Modal    CTA routes to the
                                                Offer         declined your counter Active       (Talent view)         restored active
                                                Declined**    offer for             Offer**                            offer --- not the
                                                              \[contractType\]                                         declined counter
                                                              \[contractTitle\].                                       offer. Talent can
                                                                                                                       still accept the
                                                                                                                       original offer.

  **offer.counter_withdrawn**   **Client**      **Counter     @\[talentUsername\]   **View       Active Offer Modal    CTA routes to the
                                                Offer         withdrew their        Active       (Client view)         restored active
                                                Withdrawn**   counter offer for     Offer**                            primary offer.
                                                              \[contractType\]                                         Client can now
                                                              \[contractTitle\].                                       edit or withdraw
                                                                                                                       the original offer
                                                                                                                       again.

  **offer.counter_expired**     **Both**        **Counter     The counter offer for **View       Active Offer Modal    Both parties
                                                Offer         \[contractType\]      Active       (role-appropriate     notified. Primary
                                                Expired**     \[contractTitle\] has Offer**      view)                 offer restored to
                                                              expired.                                                 PENDING. CTA
                                                                                                                       routes to the
                                                                                                                       restored active
                                                                                                                       offer for both
                                                                                                                       parties.
  ---------------------------------------------------------------------------------------------------------------------------------------

+-----------------------------------------------------------------------+
| **3 Client Counter Offer Notifications**                              |
|                                                                       |
| When the CLIENT submits a counter offer back to the talent            |
+=======================================================================+

When a client submits a counter offer in response to a talent counter
offer, the same event types are used (offer.countered,
offer.counter_edited, etc.) but the recipient and copy flip.
notification-service resolves the correct recipient and copy direction
from the submittedBy field in the event payload.

  ---------------------------------------------------------------------------------------------------------------------------------
  **Event**                  **Recipient**   **Title**    **Body Copy**         **CTA        **CTA           **Notes**
                                                                                Label**      Destination**   
  -------------------------- --------------- ------------ --------------------- ------------ --------------- ----------------------
  **offer.countered (client  **Talent**      **Counter    @\[clientUsername\]   **View       Counter Offer   Same event type as
  submitting)**                              Offer        sent you a counter    Counter      Modal (Talent   talent-initiated
                                             Received**   offer for             Offer**      view)           counter offer.
                                                          \[contractType\]                                   submittedBy = CLIENT
                                                          \[contractTitle\].                                 in payload.
                                                                                                             notification-service
                                                                                                             routes to talent.

  **offer.counter_edited     **Talent**      **Counter    @\[clientUsername\]   **View       Counter Offer   submittedBy = CLIENT.
  (client editing)**                         Offer        updated their counter Counter      Modal (Talent   notification-service
                                             Updated**    offer for             Offer**      view)           routes to talent.
                                                          \[contractType\]                                   
                                                          \[contractTitle\].                                 

  **offer.counter_accepted   **Client**      **Counter    @\[talentUsername\]   **View       Contract Detail submittedBy = CLIENT.
  (talent accepting client                   Offer        accepted your counter Contract**   Page            Acceptance is by
  CO)**                                      Accepted**   offer for                                          talent.
                                                          \[contractType\]                                   notification-service
                                                          \[contractTitle\].                                 notifies client.

  **offer.counter_declined   **Client**      **Counter    @\[talentUsername\]   **View       Active Offer    Active offer restored
  (talent declining client                   Offer        declined your counter Active       Modal (Client   = client\'s most
  CO)**                                      Declined**   offer for             Offer**      view)           recent counter offer
                                                          \[contractType\]                                   terms. CTA routes to
                                                          \[contractTitle\].                                 this restored active
                                                                                                             offer.
  ---------------------------------------------------------------------------------------------------------------------------------

+-----------------------------------------------------------------------+
| **4 Notification Event Payload**                                      |
|                                                                       |
| What offer-service includes in every event for notification-service   |
| to resolve copy                                                       |
+=======================================================================+

Every event published to marketeq.offers includes a standardized
notifications block in the payload. notification-service uses this to
resolve recipient IDs, copy variables, CTA routing, and deduplication
keys without needing to query offer-service.

+-----------------------------------------------------------------------+
| // Example: offer.declined event payload                              |
|                                                                       |
| {                                                                     |
|                                                                       |
| \"eventType\": \"offer.declined\",                                    |
|                                                                       |
| \"offerId\": \"uuid\",                                                |
|                                                                       |
| \"clientId\": \"uuid\",                                               |
|                                                                       |
| \"talentId\": \"uuid\",                                               |
|                                                                       |
| \"contractType\": \"PROJECT\",                                        |
|                                                                       |
| \"contractTitle\":\"The Ultimate Mobile App Experience\",             |
|                                                                       |
| \"submittedBy\": \"TALENT\", // CLIENT \| TALENT \| SYSTEM --- who    |
| triggered the event                                                   |
|                                                                       |
| \"occurredAt\": \"2025-01-30T10:00:00Z\",                             |
|                                                                       |
| // Resolved usernames for notification copy --- pre-fetched by        |
| offer-service                                                         |
|                                                                       |
| // to avoid notification-service needing to call user-service         |
|                                                                       |
| \"clientUsername\": \"@lauradesign21\",                               |
|                                                                       |
| \"talentUsername\": \"@designome234i\",                               |
|                                                                       |
| // Notification routing --- tells notification-service exactly what   |
| to send                                                               |
|                                                                       |
| \"notification\": {                                                   |
|                                                                       |
| \"recipients\": \[\"CLIENT\"\], // CLIENT \| TALENT \| BOTH           |
|                                                                       |
| \"suppressDeclineReason\": true, // Decline reason NOT shown in       |
| notification                                                          |
|                                                                       |
| \"cta\": {                                                            |
|                                                                       |
| \"client\": {                                                         |
|                                                                       |
| \"label\": \"View Details\",                                          |
|                                                                       |
| \"destination\": \"OFFER_DECLINED_DETAILS_CLIENT\",                   |
|                                                                       |
| \"resourceId\": \"uuid\" // offerId --- frontend resolves the route   |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
|                                                                       |
| },                                                                    |
|                                                                       |
| // Full offer terms --- for chat card rendering by messaging-service  |
|                                                                       |
| \"terms\": {                                                          |
|                                                                       |
| \"rate\": 45,                                                         |
|                                                                       |
| \"currencyCode\": \"USD\",                                            |
|                                                                       |
| \"durationMonths\": 4,                                                |
|                                                                       |
| \"workSchedule\": { \"type\": \"FULL_TIME\", \"hoursPerWeek\": 40 },  |
|                                                                       |
| \"startDate\": \"2025-01-30\",                                        |
|                                                                       |
| \"startDateDisplay\": \"Thursday, Jan 30, 2025\"                      |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
+=======================================================================+

+-----------------------------------------------------------------------+
| **5 Deduplication & Suppression Rules**                               |
|                                                                       |
| When notifications must NOT fire or must be suppressed                |
+=======================================================================+

  -----------------------------------------------------------------------
  **Rule**                 **Detail**
  ------------------------ ----------------------------------------------
  **48h warning --- once   warningSentAt is set atomically when the
  per expiry window only** warning fires. Only fires when warningSentAt
                           IS NULL AND (expiresAt − NOW()) ≤ 48h. When
                           expiresAt resets (due to edit, counter offer,
                           resend), warningSentAt is reset to NULL ---
                           the warning can fire again for the new window.

  **Notification on offer  When a client edits a primary pending offer, a
  edit**                   notification IS sent to the talent --- title:
                           \"Offer Updated\". The talent must be informed
                           of changed terms before responding. The
                           notification CTA routes to the Active Offer
                           Modal (Talent view) where the updated terms
                           are shown.

  **Decline reason not in  The decline reason text entered by the talent
  notification**           is stored on the offer record but is NOT
                           included in the Offer Declined notification
                           sent to the client. The client sees the reason
                           only when they open the Offer Declined Details
                           modal.

  **No notification for    When a counter offer is superseded by a new
  superseded counter       one in the same round (talent submits a second
  offers**                 CO while the first is being processed --- edge
                           case), no notification fires for the
                           supersession. Only the new CO triggers a
                           notification.

  **Stale notification CTA When the user taps a notification CTA,
  check**                  offer-service returns the CURRENT offer state
                           --- not the state at notification send time.
                           If the offer has moved to a new status between
                           notification send and CTA tap, the UI renders
                           the correct current state.
                           notification-service should check current
                           offer status before displaying the
                           notification if possible and suppress
                           notifications for already-terminal offers.

  **Offer expiring soon    The 48h warning scheduler only selects offers
  --- terminal state       where status = PENDING. If an offer is
  check**                  accepted, declined, or withdrawn in the window
                           between the scheduler queuing the warning and
                           delivery, notification-service should suppress
                           the warning for non-PENDING offers.

  **No duplicate           offer.resent and offer.created are both
  offer.created on         emitted on resend. notification-service should
  resend**                 use offer.resent (not offer.created) to send
                           the resend notification to the talent, to
                           avoid sending two notifications.
  -----------------------------------------------------------------------

+-----------------------------------------------------------------------+
| **6 Bell Icon Badge & Dropdown Behaviour**                            |
|                                                                       |
| How the notification bell renders offer-related notifications         |
+=======================================================================+

The bell icon in the top nav shows a badge count of unread
notifications. The dropdown shows the 5 most recent unread
notifications. All offer notifications appear in this dropdown. The
following rules apply specifically to offer notifications.

  -----------------------------------------------------------------------
  **Behaviour**          **Detail**
  ---------------------- ------------------------------------------------
  **Badge increment**    Badge increments by 1 for each new unread
                         notification. Each recipient gets their own
                         notification --- a notification sent to \"Both\"
                         increments the badge for each party
                         independently.

  **Badge decrement**    Badge decrements when the user reads
                         (taps/clicks) a notification. Reading a
                         notification marks it as read.
                         notification-service owns read state ---
                         offer-service has no involvement.

  **Dropdown --- max     5 notifications visible in the bell dropdown.
  visible**              \"View All\" navigates to the full notification
                         history page.

  **Dropdown --- CTA     Each offer notification in the dropdown has a
  highlighting**         highlighted CTA button (View Offer, View
                         Details, View Contract, View Counter Offer, View
                         Active Offer). The CTA label and destination are
                         determined by the event type and the current
                         offer status at render time.

  **CTA --- stale state  If the offer status has changed since the
  routing**              notification was sent, the CTA routes to the
                         current state. Example: \"View Offer\" on an
                         offer that has since been accepted routes to
                         \"View Contract\" instead --- offer-service
                         returns the current state when the frontend
                         requests the offer by ID.

  **Notification for     The bell badge increments for the talent when a
  offer edits**          client edits a pending offer. The notification
                         title is \"Offer Updated\" and the CTA routes to
                         the Active Offer Modal so the talent can review
                         the new terms.
  -----------------------------------------------------------------------

+-----------------------------------------------------------------------+
| **7 Notification Index --- Quick Reference**                          |
|                                                                       |
| All notifications at a glance                                         |
+=======================================================================+

  --------------------------------------------------------------------------------------------------------
  **\#**   **Event**                     **Recipient**   **Title**     **CTA**      **Notes**
  -------- ----------------------------- --------------- ------------- ------------ ----------------------
  **1**    **offer.created**             **Talent**      **New Offer** **View       ---
                                                                       Offer**      

  **2**    **offer.edited**              **Talent**      **Offer       **View       Fires on any field
                                                         Updated**     Offer**      edit to PENDING offer

  **3**    **offer.accepted**            **Client**      **Offer       **View       Routes to contract
                                                         Accepted**    Contract**   

  **4**    **offer.declined**            **Client**      **Offer       **View       Reason not shown
                                                         Declined**    Details**    

  **5**    **offer.withdrawn**           **Talent**      **Offer       **View       ---
                                                         Withdrawn**   Details**    

  **6**    **offer.expiring_soon**       **Both**        **Offer       **View       Once per expiry window
                                                         Expiring      Offer**      
                                                         Soon**                     

  **7**    **offer.expired**             **Both**        **Offer       **View       Separate modals per
                                                         Expired**     Details**    role

  **8**    **offer.resent**              **Talent**      **New Offer** **View       Same copy as
                                                                       Offer**      offer.created

  **9**    **offer.countered (talent)**  **Client**      **Counter     **View       ---
                                                         Offer         Counter      
                                                         Received**    Offer**      

  **10**   **offer.counter_edited        **Client**      **Counter     **View       ---
           (talent)**                                    Offer         Counter      
                                                         Updated**     Offer**      

  **11**   **offer.counter_accepted**    **Talent**      **Counter     **View       Routes to contract
                                                         Offer         Contract**   
                                                         Accepted**                 

  **12**   **offer.counter_declined**    **Talent**      **Counter     **View       Active offer restored
                                                         Offer         Active       
                                                         Declined**    Offer**      

  **13**   **offer.counter_withdrawn**   **Client**      **Counter     **View       Active offer restored
                                                         Offer         Active       
                                                         Withdrawn**   Offer**      

  **14**   **offer.counter_expired**     **Both**        **Counter     **View       Active offer restored
                                                         Offer         Active       
                                                         Expired**     Offer**      

  **15**   **offer.countered (client)**  **Talent**      **Counter     **View       submittedBy=CLIENT
                                                         Offer         Counter      
                                                         Received**    Offer**      

  **16**   **offer.counter_edited        **Talent**      **Counter     **View       submittedBy=CLIENT
           (client)**                                    Offer         Counter      
                                                         Updated**     Offer**      
  --------------------------------------------------------------------------------------------------------
