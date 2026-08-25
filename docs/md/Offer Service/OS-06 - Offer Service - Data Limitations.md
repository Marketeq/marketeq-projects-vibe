**DL-OS --- Offer Service**

**Data Limitations**

**Service:** offer-service **Covers:** Every field, type, min, max,
format, and constraint across all offer flows

This document defines every data limitation for the offer service. All
limits are enforced at both the frontend (UX guards) and the server
(authoritative validation). Frontend guards are first-line convenience;
server-side is the source of truth.

**Source Key**

  --------------- -------------------------------------------------------------
  **Source**      **Meaning**

  **Confirmed**   Explicitly confirmed in designs, session decisions, or client
                  direction.

  **Standard**    Industry standard / engineering best practice. Aligns with
                  comparable platforms (Upwork, Fiverr, LinkedIn).

  **Inferred**    Reasonably inferred from the design context or adjacent
                  confirmed rules. Should be validated with product before
                  final implementation.
  --------------- -------------------------------------------------------------

+-----------------------------------------------------------------------+
| **Group 1 --- Offer Record Fields**                                   |
|                                                                       |
| All fields stored on the core Offer record (primary offer and resent  |
| offer)                                                                |
+-----------------------------------------------------------------------+

  ------------ ---------- --------- --------- --------------------- ---------- ---------------
  **Field**    **Type**   **Min**   **Max**   **Format / Allowed    **Req?**   **Source**
                                              Values**                         

  **Contract   String     1 char    200 chars UTF-8. Trimmed before **Yes**    **Confirmed**
  Title**                                     validation.                      
                                              Whitespace-only =                
                                              invalid. Special                 
                                              characters and emoji             
                                              allowed.                         

  **Offer Rate Decimal    \$1       \$9,999   Whole numbers only.   **Yes**    **Standard**
  (preset)**                                  No decimals. Stored              
                                              with the account                 
                                              active currencyCode.             
                                              Preset values come               
                                              from talent profile              
                                              rates.                           

  **Offer Rate Integer    \$1       \$9,999   Whole numbers only.   **Yes**    **Confirmed**
  (custom)**                                  No decimals. Numeric             
                                              input only. No                   
                                              currency symbol in               
                                              the field ---                    
                                              appended by UI.                  
                                              Decimals and negative            
                                              values rejected.                 

  **Contract   Integer    1 month   60 months Preset options: 3     **Yes**    **Confirmed**
  Duration                                    months, 6 months, 1              
  (preset)**                                  year, 18 months, 2               
                                              years, Ongoing.                  
                                              \"Ongoing\" stores               
                                              NULL duration --- no             
                                              expiry on the                    
                                              contract.                        

  **Contract   Integer    1         60        Whole numbers only.   **Yes**    **Standard**
  Duration                                    Unit: Months or Years            
  (custom)**                                  (dropdown). Years                
                                              converted to months              
                                              on storage: 1 year =             
                                              12 months, max 5                 
                                              years = 60 months.               

  **Work       String     ---       ---       Part Time (up to 30   **Yes**    **Confirmed**
  Schedule                                    hrs/week) or Full                
  (preset)**                                  Time (over 30                    
                                              hrs/week). Stored as             
                                              enum: PART_TIME,                 
                                              FULL_TIME.                       

  **Work       Integer    1         80        Hours per day / per   **Yes**    **Standard**
  Schedule                                    week / per month.                
  (custom)**                                  Stored as                        
                                              hoursPerWeek after               
                                              normalisation (per               
                                              day × 5, per month ÷             
                                              4.33). Max 80                    
                                              hrs/week.                        

  **Start      Date       Today     5 years   Display format:       **Yes**    **Confirmed**
  Date**                            out       Monday, Jan 30, 2025.            
                                              Stored as ISO 8601               
                                              date (YYYY-MM-DD) in             
                                              UTC. No time                     
                                              component. Past dates            
                                              rejected. Calendar               
                                              disables past dates.             
                                              Max 5 years from                 
                                              creation date.                   

  **Offer      String     0 chars   500 chars Optional. Plain text. No         **Confirmed**
  Message**                                   Trimmed before                   
                                              storage.                         
                                              Whitespace-only                  
                                              stored as NULL.                  
                                              Character counter                
                                              shown in UI (live).              

  **Currency   String     ---       ---       ISO 4217 3-letter     **Yes**    **Standard**
  Code**                                      code (e.g. USD, EUR,             
                                              CAD, GBP). Determined            
                                              by the sending user              
                                              account currency                 
                                              setting at offer                 
                                              creation time. Fixed             
                                              on the offer record              
                                              --- does not change              
                                              for the lifetime of              
                                              this offer.                      

  **Expiry     Integer    ---       ---       Fixed: 14 days from   **Yes**    **Confirmed**
  TTL**                                       last meaningful                  
                                              activity. Stored as              
                                              expiresAt (UTC                   
                                              datetime). Cannot be             
                                              set manually.                    
  ------------ ---------- --------- --------- --------------------- ---------- ---------------

+-----------------------------------------------------------------------+
| **Group 2 --- Counter Offer Record Fields**                           |
|                                                                       |
| Fields specific to the counter_offers table (talent and client        |
| counter offers)                                                       |
+-----------------------------------------------------------------------+

  ------------- ---------- --------- --------- -------------------------------------- ---------- ---------------
  **Field**     **Type**   **Min**   **Max**   **Format / Allowed Values**            **Req?**   **Source**

  **Counter     Integer    \$1       \$9,999   Whole numbers only. No decimals. Same  **Yes**    **Confirmed**
  Rate                                         rules as Offer Rate. Rate warning                 
  (custom)**                                   fires when counterRate \> originalRate            
                                               × 1.25 (strictly greater than).                   

  **Counter     Integer    1         60        Same rules as Offer Contract Duration. **Yes**    **Standard**
  Duration**                                   Must be a positive integer in months.             

  **Counter     String /   ---       ---       Same rules as Offer Work Schedule.     **Yes**    **Standard**
  Schedule**    Integer                        Preset or custom (1--80 hrs/week).                

  **Counter     Date       Today     5 years   Same rules as Offer Start Date.        **Yes**    **Confirmed**
  Start Date**                       out                                                         

  **Counter     String     0 chars   500 chars Optional. Same rules as Offer Message. No         **Confirmed**
  Message**                                    Character counter shown live.                     

  **Counter     Integer    ---       ---       Fixed: 14 days. Same TTL rule as       **Yes**    **Confirmed**
  Offer TTL**                                  primary offer. Clock starts at counter            
                                               offer submission.                                 

  **Rate        Decimal    ---       ---       COUNTER_OFFER_RATE_WARNING_THRESHOLD = ---        **Confirmed**
  Warning                                      1.25. Advisory only --- does not block            
  Threshold**                                  submission. Direction flips for client            
                                               counter offers.                                   
  ------------- ---------- --------- --------- -------------------------------------- ---------- ---------------

+-----------------------------------------------------------------------+
| **Group 3 --- Decline and Withdrawal Fields**                         |
|                                                                       |
| Fields captured when talent declines or client/talent withdraws       |
+-----------------------------------------------------------------------+

  -------------- ---------- --------- --------- --------------------- ---------- ---------------
  **Field**      **Type**   **Min**   **Max**   **Format / Allowed    **Req?**   **Source**
                                                Values**                         

  **Decline      String     1 char    500 chars Required to enable    **Yes**    **Confirmed**
  Reason Text**                                 the Decline offer                
                                                button. Chip                     
                                                selection                        
                                                auto-populates                   
                                                textarea. Trimmed                
                                                before storage.                  
                                                Cannot be                        
                                                whitespace-only if               
                                                chip selected and                
                                                textarea modified.               

  **Decline      Enum       ---       ---       One of: Budget        No         **Confirmed**
  Reason Chip**                                 doesn\'t work / Start            
                                                date doesn\'t work /             
                                                Requirements are                 
                                                unclear / Not a fit              
                                                for my skills / Too              
                                                busy right now / Need            
                                                different terms.                 
                                                Selecting a chip                 
                                                populates the                    
                                                textarea.                        

  **Withdrawal   String     0 chars   500 chars Optional. Same rules  No         **Confirmed**
  Message**                                     as Offer Message.                
                                                Stored on the offer              
                                                record as                        
                                                withdrawalMessage.               
                                                NULL if not provided             
                                                --- renders as \"No              
                                                message was sent.\"              
                                                in UI.                           

  **Counter      String     0 chars   500 chars Optional message when No         **Confirmed**
  Offer                                         withdrawing a counter            
  Withdrawal                                    offer. Same rules as             
  Message**                                     Withdrawal Message.              
  -------------- ---------- --------- --------- --------------------- ---------- ---------------

+-----------------------------------------------------------------------+
| **Group 4 --- NDA Signing Fields**                                    |
|                                                                       |
| Fields captured during the NDA signing flow --- owned by              |
| legal-service                                                         |
+-----------------------------------------------------------------------+

  -------------- ---------- --------- --------- --------------------- ---------- ---------------
  **Field**      **Type**   **Min**   **Max**   **Format / Allowed    **Req?**   **Source**
                                                Values**                         

  **Full Name**  String     1 char    100 chars Required. UTF-8.      **Yes**    **Standard**
                                                Trimmed.                         
                                                Whitespace-only                  
                                                rejected.                        
                                                Pre-populated from               
                                                user account name if             
                                                available.                       

  **Initials**   String     1 char    10 chars  Required. UTF-8.      **Yes**    **Standard**
                                                Trimmed. Typically               
                                                2--3 characters (e.g.            
                                                AS). No format                   
                                                restriction ---                  
                                                international                    
                                                initials accepted.               

  **Signature    File       ---       10 MB     Accepted types: PNG,  Cond.      **Confirmed**
  Image                                         JPG, JPEG, SVG. File             
  (Upload)**                                    validated for type               
                                                and readability                  
                                                before acceptance.               
                                                Corrupt or unreadable            
                                                files rejected.                  

  **Signature    Canvas     ---       ---       Freehand drawing on   Cond.      **Confirmed**
  Canvas                                        HTML5 canvas. Both               
  (Draw)**                                      Draw Signature and               
                                                Draw Initials                    
                                                canvases must contain            
                                                at least one stroke              
                                                before Sign NDA is               
                                                enabled.                         

  **Signature    String     1 char    100 chars Typed name rendered   Cond.      **Standard**
  (Type)**                                      in a signature font.             
                                                Must match or be                 
                                                derived from the Full            
                                                Name field. Same max             
                                                as Full Name.                    

  **NDA Document Integer    ---       ---       Fixed: 2 pages.       ---        **Confirmed**
  Pages**                                       Read-only scrollable             
                                                view. Download PDF               
                                                available before and             
                                                after signing.                   
  -------------- ---------- --------- --------- --------------------- ---------- ---------------

Note --- \"Cond.\" in the Required column means conditionally required:
exactly one of Upload, Draw, or Type must be completed. All three are
available but only one needs to be used.

+-----------------------------------------------------------------------+
| **Group 5 --- File Upload Limits**                                    |
|                                                                       |
| All file upload constraints across the offer service                  |
+-----------------------------------------------------------------------+

  -------------- ---------- --------- --------- --------------------- ---------- ---------------
  **Field**      **Type**   **Min**   **Max**   **Format / Allowed    **Req?**   **Source**
                                                Values**                         

  **Signature    File       ---       10 MB     Enforced by           **Yes**    **Confirmed**
  Image --- Max                                 legal-service before             
  Size**                                        storage. Frontend                
                                                validates size before            
                                                upload attempt.                  

  **Signature    File       ---       ---       Allowed: PNG, JPG,    **Yes**    **Confirmed**
  Image --- File                                JPEG, SVG. All other             
  Types**                                       types rejected with              
                                                EM-030.                          

  **Signature    ---        ---       ---       No minimum or maximum No         **Standard**
  Image ---                                     pixel dimensions                 
  Dimensions**                                  enforced. Any                    
                                                resolution accepted.             
  -------------- ---------- --------- --------- --------------------- ---------- ---------------

+-----------------------------------------------------------------------+
| **Group 6 --- TTL and Timing Rules**                                  |
|                                                                       |
| All time-based rules governing offer lifecycle                        |
+-----------------------------------------------------------------------+

  --------------- ---------- --------- --------- ----------------------- ---------- ---------------
  **Field**       **Type**   **Min**   **Max**   **Format / Allowed      **Req?**   **Source**
                                                 Values**                           

  **Default Offer Duration   ---       ---       14 days from last       **Yes**    **Confirmed**
  TTL**                                          meaningful activity                
                                                 (creation, edit,                   
                                                 counter offer                      
                                                 submission, resend).               
                                                 Stored as expiresAt in             
                                                 UTC.                               

  **TTL Reset     Events     ---       ---       Clock resets on:        **Yes**    **Confirmed**
  Triggers**                                     offer.created,                     
                                                 offer.edited,                      
                                                 offer.countered,                   
                                                 offer.counter_edited,              
                                                 offer.resent. Does NOT             
                                                 reset on: accept,                  
                                                 decline, withdraw (all             
                                                 terminal).                         

  **48h Expiry    Duration   ---       ---       Warning fires when      **Yes**    **Confirmed**
  Warning                                        (expiresAt − NOW()) ≤              
  Window**                                       48 hours AND                       
                                                 warningSentAt IS NULL.             
                                                 warningSentAt reset to             
                                                 NULL whenever expiresAt            
                                                 is reset.                          

  **Extension     Duration   0d        30d       Request Extension CTA   **Yes**    **Confirmed**
  Window ---                                     shown when elapsed days            
  Request                                        since expiredAt ≤ 30.              
  Extension**                                    Floor calculation used:            
                                                 Math.floor(elapsedMs /             
                                                 86400000). At exactly              
                                                 30 days: still shows               
                                                 Request Extension.                 

  **Extension     Duration   31d       ---       Ask Now CTA shown when  **Yes**    **Confirmed**
  Window --- Ask                                 elapsed days since                 
  Now**                                          expiredAt \> 30 (floor             
                                                 value ≥ 31). Also shown            
                                                 on DECLINED and                    
                                                 WITHDRAWN offers                   
                                                 regardless of elapsed              
                                                 time.                              

  **Expiry        Timezone   ---       ---       All expiry timestamps   **Yes**    **Standard**
  Timestamp                                      stored and evaluated in            
  Timezone**                                     UTC. Frontend converts             
                                                 to user\'s local                   
                                                 timezone for display               
                                                 only.                              

  **Start Date    Duration   ---       5 yrs     Start date cannot be    **Yes**    **Standard**
  Max Future                                     more than 5 years from             
  Limit**                                        the offer creation                 
                                                 date. Enforced                     
                                                 server-side.                       

  **Idempotency   Duration   ---       24h       X-Idempotency-Key       **Yes**    **Standard**
  Key TTL**                                      headers are stored for             
                                                 24 hours. Duplicate                
                                                 requests within this               
                                                 window return the                  
                                                 cached response.                   
  --------------- ---------- --------- --------- ----------------------- ---------- ---------------

+-----------------------------------------------------------------------+
| **Group 7 --- UI Display and Pagination Limits**                      |
|                                                                       |
| Limits on what is shown in UI components                              |
+-----------------------------------------------------------------------+

  ----------------- ---------- --------- ----------- --------------------- ---------- ---------------
  **Field**         **Type**   **Min**   **Max**     **Format / Allowed    **Req?**   **Source**
                                                     Values**                         

  **Pending Invite  Integer    0         5 visible   Maximum 5 avatars     ---        **Confirmed**
  Avatar Stack                                       shown. Additional                
  (Offer Sent                                        invites shown as +N              
  confirmation)**                                    overflow badge.                  
                                                     Overflow badge links             
                                                     to My Team page.                 

  **Offer History   Integer    ---       50          History modal loads   ---        **Standard**
  --- rows per                                       first 50 events.                 
  page**                                             \"Load more\" control            
                                                     for histories                    
                                                     exceeding 50.                    
                                                     Cursor-based                     
                                                     pagination.                      

  **Offer History   Integer    ---       Unlimited   Any number of rows    ---        **Inferred**
  --- max                                            can be expanded                  
  expandable rows                                    simultaneously. No               
  at once**                                          limit on concurrent              
                                                     expanded rows.                   

  **Chat avatar     Integer    ---       ---         Badge shows total     ---        **Confirmed**
  overflow badge (+                                  count beyond visible             
  count)**                                           avatars. No cap on               
                                                     total pending invites            
                                                     in flight --- only               
                                                     display is capped at             
                                                     5 visible.                       

  **Notification    Integer    ---       5           Up to 5 notifications ---        **Confirmed**
  Bell --- visible                                   visible in the bell              
  items in                                           dropdown. \"View                 
  dropdown**                                         All\" navigates to               
                                                     full notification                
                                                     list.                            

  **Character       Counter    0         500         Live character        ---        **Confirmed**
  counter --- all                                    counter shown as                 
  message fields**                                   X/500. Counter shown             
                                                     on: Offer Message,               
                                                     Counter Offer                    
                                                     Message, Withdrawal              
                                                     Message, Decline                 
                                                     Reason, Resend                   
                                                     Message.                         

  **Rate format**   Integer    ---       ---         Rates are whole       ---        **Confirmed**
                                                     numbers only --- no              
                                                     decimal places.                  
                                                     Displayed as                     
                                                     \$\[amount\]/hr. No              
                                                     rounding or decimal              
                                                     formatting required.             

  **Contract title  Chars      ---       ---         Long titles may be    ---        **Standard**
  display                                            truncated with                   
  truncation**                                       ellipsis in compact              
                                                     views (offer cards in            
                                                     chat). Full title                
                                                     always visible in the            
                                                     offer modal.                     
  ----------------- ---------- --------- ----------- --------------------- ---------- ---------------

+-----------------------------------------------------------------------+
| **Group 8 --- Business Rule Limits**                                  |
|                                                                       |
| Platform-level constraints on offer behaviour                         |
+-----------------------------------------------------------------------+

  --------------- ------------ --------- ----------- -------------------------------- ---------- ---------------
  **Field**       **Type**     **Min**   **Max**     **Format / Allowed Values**      **Req?**   **Source**

  **Active offers Integer      0         1           Only ONE active (PENDING) offer  **Yes**    **Confirmed**
  per                                                allowed per client-talent pair              
  client-talent                                      at any time. Global constraint              
  pair**                                             --- not scoped per listing or               
                                                     contract. Second offer attempt              
                                                     returns 409                                 
                                                     OFFER_ALREADY_EXISTS.                       

  **Active        Integer      0         1           Only ONE PENDING counter offer   **Yes**    **Confirmed**
  counter offers                                     allowed per primary offer at a              
  per offer**                                        time. New submission while one              
                                                     is PENDING returns 409                      
                                                     COUNTER_OFFER_ALREADY_PENDING.              

  **Negotiation   Integer      1         Unlimited   No hard cap on the number of     **Yes**    **Confirmed**
  rounds**                                           back-and-forth counter offer                
                                                     rounds. Natural throttle is the             
                                                     14-day TTL clock which resets               
                                                     each round.                                 

  **Rate warning  Multiplier   ---       ---         1.25× original offer rate.       **Yes**    **Confirmed**
  threshold**                                        Warning fires when counterRate              
                                                     \> originalRate × 1.25 (strictly            
                                                     greater than --- at exactly                 
                                                     1.25× no warning fires).                    

  **One Active    State        ---       ---         Exactly one offer (primary or    **Yes**    **Confirmed**
  Offer concept**                                    client counter offer) is the                
                                                     \"Active Offer\" at all times               
                                                     --- the one that can be accepted            
                                                     to create a contract. Client                
                                                     counter offers supersede and                
                                                     become the new Active Offer.                

  **Contract      Scope        ---       ---         Unique per client across ALL     **Yes**    **Confirmed**
  title                                              contracts regardless of status              
  uniqueness                                         --- including PENDING, ACTIVE,              
  scope**                                            CANCELLED, COMPLETED, and                   
                                                     EXPIRED. A contract title once              
                                                     used by any contract for that               
                                                     client can never be reused.                 
                                                     Enforced by contracts-service at            
                                                     the time offer.accepted fires.              

  **NDA signature Boolean      ---       ---         Once signed, the NDA is          **Yes**    **Confirmed**
  permanence**                                       permanent for the lifetime of               
                                                     the client-project relationship.            
                                                     Never requires re-signing                   
                                                     regardless of scope changes,                
                                                     offer changes, or new offers                
                                                     from the same client.                       

  **Offer title   Rule         ---       ---         There is no separate \"offer     **Yes**    **Confirmed**
  vs contract                                        title.\" The contract title                 
  title**                                            entered during offer creation is            
                                                     the contract title throughout               
                                                     the entire lifecycle.                       
  --------------- ------------ --------- ----------- -------------------------------- ---------- ---------------

+-----------------------------------------------------------------------+
| **Group 9 --- Currency and Rate Storage**                             |
|                                                                       |
| How rate and currency data is stored and handled                      |
+-----------------------------------------------------------------------+

  ------------- ---------- --------- --------- ------------------------- ---------- ---------------
  **Field**     **Type**   **Min**   **Max**   **Format / Allowed        **Req?**   **Source**
                                               Values**                             

  **Currency    String     ---       ---       Determined by the user    **Yes**    **Confirmed**
  --- default**                                account settings. Pre-set            
                                               based on geolocation at              
                                               signup. User can change              
                                               it in account settings at            
                                               any time. Not fixed to               
                                               USD or any specific                  
                                               currency.                            

  **Currency    String     ---       ---       Multi-currency supported  **Yes**    **Confirmed**
  ---                                          via pricing-service FX.              
  supported**                                  Currency code stored on              
                                               each offer record                    
                                               alongside the numeric                
                                               rate value.                          

  **Rate ---    Integer    ---       ---       Stored as INTEGER. Whole  **Yes**    **Confirmed**
  storage                                      numbers only. No decimal             
  precision**                                  component. Max value                 
                                               \$9,999. FX conversion               
                                               for display only.                    

  **Rate ---    String     ---       ---       Displayed as              **Yes**    **Standard**
  display                                      \[symbol\]\[amount\]/hr              
  format**                                     using the symbol for the             
                                               stored currencyCode (e.g.            
                                               \$45/hr, £45/hr, €45/hr).            
                                               No decimal places shown.             

  **Rate --- FX Rule       ---       ---       Rate is fixed in the      **Yes**    **Confirmed**
  handling**                                   offer\'s currency at                 
                                               creation time. FX                    
                                               conversion for                       
                                               cross-currency display is            
                                               computed at render time              
                                               by pricing-service. The              
                                               rate passed in                       
                                               offer.accepted is the                
                                               original value +                     
                                               currencyCode.                        
                                               contracts-service bills              
                                               from this fixed value.               

  **Rate ---    Rule       ---       ---       When an offer is edited,  **Yes**    **Standard**
  change on                                    the new rate replaces the            
  edit**                                       old one on the same                  
                                               record. The currency code            
                                               can be changed on edit.              
                                               The new rate +                       
                                               currencyCode are what                
                                               appear in the review                 
                                               screen diff.                         
  ------------- ---------- --------- --------- ------------------------- ---------- ---------------

+-----------------------------------------------------------------------+
| **Group 10 --- API and System Limits**                                |
|                                                                       |
| Technical constraints on API requests and system behaviour            |
+-----------------------------------------------------------------------+

  --------------------- ---------- --------- --------- --------------------- ---------- --------------
  **Field**             **Type**   **Min**   **Max**   **Format / Allowed    **Req?**   **Source**
                                                       Values**                         

  **X-Idempotency-Key   UUID v4    ---       ---       Required on all write **Yes**    **Standard**
  header**                                             operations (POST,                
                                                       PATCH, DELETE).                  
                                                       Generated client-side            
                                                       as UUID v4 before the            
                                                       first attempt. Stored            
                                                       server-side for 24               
                                                       hours.                           

  **Offer ID format**   UUID v4    ---       ---       All offer and counter **Yes**    **Standard**
                                                       offer records                    
                                                       identified by UUID               
                                                       v4. Never sequential             
                                                       integers --- prevents            
                                                       enumeration attacks.             

  **Request timeout**   Duration   ---       30s       API requests time out **Yes**    **Standard**
                                                       after 30 seconds.                
                                                       Frontend retries with            
                                                       the same idempotency             
                                                       key on timeout.                  

  **Max request body    Integer    ---       1 MB      POST/PATCH request    **Yes**    **Standard**
  size**                                               bodies capped at 1               
                                                       MB. This is well                 
                                                       above any offer                  
                                                       payload size.                    
                                                       Primarily relevant               
                                                       for signature image              
                                                       data if embedded in              
                                                       JSON (not recommended            
                                                       --- use multipart                
                                                       upload).                         

  **Ably real-time      Duration   ---       2 min     Ably buffers events   **Yes**    **Standard**
  buffer**                                             for disconnected                 
                                                       clients for up to 2              
                                                       minutes. Events older            
                                                       than 2 minutes may be            
                                                       missed and require a             
                                                       REST fetch on                    
                                                       reconnect.                       

  **Outbox retry ---    Integer    ---       10        RabbitMQ event        **Yes**    **Standard**
  max attempts**                                       publication retried              
                                                       up to 10 times with              
                                                       exponential backoff.             
                                                       After 10 failures,               
                                                       event is                         
                                                       dead-lettered and                
                                                       engineering is                   
                                                       alerted.                         

  **Pagination ---      Integer    ---       50        Offer history         **Yes**    **Standard**
  history page size**                                  endpoint returns max             
                                                       50 events per page.              
                                                       Cursor-based                     
                                                       pagination for                   
                                                       subsequent pages.                

  **Idempotency dedup   Duration   ---       24h       Duplicate requests    **Yes**    **Standard**
  window**                                             with the same                    
                                                       X-Idempotency-Key                
                                                       within 24 hours                  
                                                       return the cached                
                                                       original response                
                                                       without reprocessing.            
  --------------------- ---------- --------- --------- --------------------- ---------- --------------
