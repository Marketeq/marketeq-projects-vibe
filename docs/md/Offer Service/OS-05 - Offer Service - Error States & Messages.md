**EM-OS --- Offer Service**

**Error States & Messages**

**Service:** offer-service **Tone:** Friendly · Clear · Action-oriented
**Covers:** Input validation · API errors · State conflicts · Network
failures · Empty states · Fallbacks

All error messages use a friendly, human tone. Input validation errors
follow the pattern \"Please enter / select \[field name\].\" Action and
state errors explain what happened and where possible tell the user what
they can do next. System errors are reassuring and avoid technical
jargon.

**Display Type Key**

  -------------- --------------------------------------------------------------
  **Display      **Description**
  Type**         

  **Inline**     Error appears directly beneath the field or action that caused
                 it. No modal, no toast. Field highlighted.

  **Toast**      Non-blocking notification slides in from the top or bottom of
                 the screen. Auto-dismisses after 4 seconds.

  **Disabled**   Button or action is visually disabled (greyed out). No error
                 text --- the disabled state itself is the signal.

  **Banner**     Full-width banner appears at the top of the modal or screen.
                 Remains until dismissed or resolved.

  **Modal**      Blocking message shown inside the current modal. Replaces
                 normal content or appended above footer.

  **Fallback**   Placeholder text rendered in an empty section. Not an error in
                 the traditional sense --- a graceful null state.
  -------------- --------------------------------------------------------------

+-----------------------------------------------------------------------+
| **Group 1 --- Offer Creation Form Input Validation**                  |
|                                                                       |
| Hire Me modal · Offer creation form · Applies to new offers, edits,   |
| and counter offers                                                    |
+-----------------------------------------------------------------------+

  ------------ ------------------ --------------------------- -------------- ------------------------
  **Error ID** **Trigger /        **User-Facing Message**     **Display**    **API Code**
               Location**                                                    

  **EM-001**   **Contract Title   *Please enter a contract    **Inline**     422 TITLE_REQUIRED
               --- empty or not   title.*                                    
               entered**                                                     

  **EM-002**   **Contract Title   *Please enter a contract    **Inline**     422 TITLE_REQUIRED
               --- whitespace     title.*                                    
               only**                                                        

  **EM-003**   **Contract Title   *Contract titles can be up  **Inline**     422 TITLE_TOO_LONG
               --- exceeds 200    to 200 characters. Looks                   
               characters**       like yours is a little                     
                                  long.*                                     

  **EM-004**   **Rate --- no      *Please select a rate.*     **Inline**     422 RATE_REQUIRED
               preset selected,                                              
               no custom rate                                                
               entered**                                                     

  **EM-005**   **Custom Rate ---  *Please enter a rate.*      **Inline**     422 RATE_REQUIRED
               field left empty**                                            

  **EM-006**   **Custom Rate ---  *Please enter a rate        **Inline**     422 INVALID_RATE
               value is zero**    greater than \$0.*                         

  **EM-007**   **Custom Rate ---  *Please enter a rate        **Inline**     422 INVALID_RATE
               negative value**   greater than \$0.*                         

  **EM-008**   **Custom Rate ---  *Please enter a valid       **Inline**     422 INVALID_RATE
               non-numeric        hourly rate --- numbers                    
               characters         only.*                                     
               entered**                                                     

  **EM-009**   **Contract         *Please select a contract   **Inline**     422 DURATION_REQUIRED
               Duration --- no    duration.*                                 
               preset selected,                                              
               no custom duration                                            
               entered**                                                     

  **EM-010**   **Custom Duration  *Please enter a duration.*  **Inline**     422 DURATION_REQUIRED
               --- numeric field                                             
               empty**                                                       

  **EM-011**   **Custom Duration  *Please select a duration   **Inline**     422
               --- unit not       unit --- months or years.*                 DURATION_UNIT_REQUIRED
               selected                                                      
               (Months/Years)**                                              

  **EM-012**   **Custom Duration  *Please enter a duration of **Inline**     422 INVALID_DURATION
               --- value is zero  at least 1 month.*                         
               or negative**                                                 

  **EM-013**   **Custom Duration  *Please enter a whole       **Inline**     422 INVALID_DURATION
               --- decimal value  number for the duration.*                  
               entered**                                                     

  **EM-014**   **Work Schedule    *Please select a work       **Inline**     422 SCHEDULE_REQUIRED
               --- no option      schedule.*                                 
               selected**                                                    

  **EM-015**   **Custom Work      *Please enter the number of **Inline**     422 SCHEDULE_REQUIRED
               Schedule --- hours hours.*                                    
               field empty**                                                 

  **EM-016**   **Custom Work      *Please select a time unit  **Inline**     422
               Schedule --- unit  --- per day, per week, or                  SCHEDULE_UNIT_REQUIRED
               not selected**     per month.*                                

  **EM-017**   **Custom Work      *Please enter at least 1    **Inline**     422 INVALID_SCHEDULE
               Schedule --- value hour.*                                     
               is zero or                                                    
               negative**                                                    

  **EM-018**   **Start Date ---   *Please select a start      **Inline**     422 START_DATE_REQUIRED
               no date selected   date.*                                     
               or confirmed**                                                

  **EM-019**   **Start Date ---   *Please select a date in    **Inline**     422 INVALID_START_DATE
               date selected is   the future.*                               
               in the past**                                                 

  **EM-020**   **Message ---      *Messages can be up to 500  **Inline**     422 MESSAGE_TOO_LONG
               exceeds 500        characters.*                               
               characters (direct                                            
               API bypass)**                                                 

  **EM-021**   **Send Offer ---   *---*                       **Disabled**   ---
               all fields not yet                                            
               complete (button                                              
               disabled)**                                                   
  ------------ ------------------ --------------------------- -------------- ------------------------

+-----------------------------------------------------------------------+
| **Group 2 --- Accept Offer Validation**                               |
|                                                                       |
| Accept This Offer modal · Talent only                                 |
+-----------------------------------------------------------------------+

  ------------ --------------- --------------------------- -------------- ------------------------
  **Error ID** **Trigger /     **User-Facing Message**     **Display**    **API Code**
               Location**                                                 

  **EM-022**   **Accept Offer  *---*                       **Disabled**   ---
               --- consent                                                
               checkbox not                                               
               checked**                                                  

  **EM-023**   **Accept Offer  *You\'ll need to agree to   **Inline**     422
               --- consent not the terms before                           OFFER_CONSENT_REQUIRED
               confirmed       accepting.*                                
               (API-level                                                 
               bypass)**                                                  
  ------------ --------------- --------------------------- -------------- ------------------------

+-----------------------------------------------------------------------+
| **Group 3 --- Decline Offer Validation**                              |
|                                                                       |
| Decline This Offer modal · Talent only                                |
+-----------------------------------------------------------------------+

  ------------ --------------- --------------------------- -------------- ---------
  **Error ID** **Trigger /     **User-Facing Message**     **Display**    **API
               Location**                                                 Code**

  **EM-024**   **Decline Offer *---*                       **Disabled**   ---
               --- no reason                                              
               chip selected                                              
               and textarea is                                            
               empty**                                                    
  ------------ --------------- --------------------------- -------------- ---------

+-----------------------------------------------------------------------+
| **Group 4 --- NDA Signing Validation**                                |
|                                                                       |
| NDA Sign Modal --- all signature modes                                |
+-----------------------------------------------------------------------+

  ------------ --------------- --------------------------- -------------- ------------------------
  **Error ID** **Trigger /     **User-Facing Message**     **Display**    **API Code**
               Location**                                                 

  **EM-025**   **Full Name --- *Please enter your full     **Inline**     422 NDA_NAME_REQUIRED
               empty**         name.*                                     

  **EM-026**   **Initials ---  *Please enter your          **Inline**     422
               empty**         initials.*                                 NDA_INITIALS_REQUIRED

  **EM-027**   **Signature --- *Please upload your         **Inline**     422
               not provided    signature image to                         NDA_SIGNATURE_REQUIRED
               (Upload mode)** continue.*                                 

  **EM-028**   **Signature --- *Please draw your signature **Inline**     422
               not drawn (Draw and initials to continue.*                 NDA_SIGNATURE_REQUIRED
               mode)**                                                    

  **EM-029**   **Signature     *We couldn\'t read that     **Inline**     422
               image ---       file. Please try a                         INVALID_SIGNATURE_FILE
               corrupt or      different image, or use                    
               unreadable      Type or Draw instead.*                     
               file**                                                     

  **EM-030**   **Signature     *Please upload a PNG, JPG,  **Inline**     422 INVALID_FILE_TYPE
               image --- wrong JPEG, or SVG file.*                        
               file type**                                                

  **EM-031**   **Signature     *That file is too large.    **Inline**     422 FILE_TOO_LARGE
               image --- file  Please upload an image                     
               exceeds 10MB**  under 10MB.*                               

  **EM-032**   **Sign NDA ---  *---*                       **Disabled**   ---
               all required                                               
               fields not yet                                             
               complete**                                                 
  ------------ --------------- --------------------------- -------------- ------------------------

+-----------------------------------------------------------------------+
| **Group 5 --- Offer State Conflict Errors**                           |
|                                                                       |
| Triggered when the offer status has changed between modal open and    |
| submission                                                            |
+-----------------------------------------------------------------------+

  ------------ --------------- --------------------------- ------------- ------------------------------
  **Error ID** **Trigger /     **User-Facing Message**     **Display**   **API Code**
               Location**                                                

  **EM-033**   **Accept Offer  *This offer has expired.    **Modal**     409 OFFER_EXPIRED
               --- offer has   You can ask the client to                 
               expired by the  resend it.*                               
               time talent                                               
               submits**                                                 

  **EM-034**   **Accept Offer  *Looks like this offer has  **Modal**     409 OFFER_ALREADY_ACCEPTED
               --- offer has   already been accepted.*                   
               already been                                              
               accepted**                                                

  **EM-035**   **Accept Offer  *This offer has been        **Modal**     409 OFFER_WITHDRAWN
               --- offer has   withdrawn and is no longer                
               been withdrawn  available.*                               
               by client**                                               

  **EM-036**   **Decline Offer *This offer has already     **Modal**     409 OFFER_EXPIRED
               --- offer has   expired --- nothing to                    
               already         decline here.*                            
               expired**                                                 

  **EM-037**   **Counter Offer *This offer has expired.    **Modal**     409 OFFER_EXPIRED
               --- offer has   You\'ll need to request an                
               expired before  extension or ask if the                   
               submission**    role is still open.*                      

  **EM-038**   **Counter Offer *Looks like this offer has  **Modal**     409 OFFER_ALREADY_ACCEPTED
               --- offer has   already been accepted.*                   
               already been                                              
               accepted**                                                

  **EM-039**   **Edit Offer    *This offer has already     **Modal**     409 OFFER_NOT_ACTIONABLE
               --- offer has   been responded to and                     
               been responded  can\'t be edited right                    
               to before       now.*                                     
               client submits                                            
               edit**                                                    

  **EM-040**   **Edit Offer    *This offer has expired.    **Modal**     409 OFFER_EXPIRED
               --- offer has   You can resend it or edit                 
               expired before  the terms to start fresh.*                
               client submits                                            
               edit**                                                    

  **EM-041**   **Withdraw      *This offer has already     **Modal**     409 OFFER_ALREADY_ACCEPTED
               Offer --- offer been accepted --- it can\'t               
               has already     be withdrawn anymore.*                    
               been accepted**                                           

  **EM-042**   **Withdraw      *This offer has already     **Modal**     409 OFFER_EXPIRED
               Offer --- offer expired. You can resend it                
               has already     from the details screen.*                 
               expired**                                                 

  **EM-043**   **Accept        *This counter offer has     **Modal**     409 COUNTER_OFFER_WITHDRAWN
               Counter Offer   been withdrawn. The                       
               (client) ---    original offer is still                   
               counter offer   active.*                                  
               has been                                                  
               withdrawn by                                              
               talent**                                                  

  **EM-044**   **Accept        *This counter offer has     **Modal**     409 COUNTER_OFFER_EXPIRED
               Counter Offer   expired. The original offer               
               (client) ---    is still active.*                         
               counter offer                                             
               has expired**                                             

  **EM-045**   **Withdraw      *Looks like this counter    **Modal**     409
               Counter Offer   offer has already been                    COUNTER_OFFER_NOT_ACTIONABLE
               (talent) ---    resolved.*                                
               counter offer                                             
               already in                                                
               terminal                                                  
               state**                                                   

  **EM-046**   **Resend Offer  *This offer is still active **Toast**     409 OFFER_NOT_RESENDABLE
               --- offer is    --- there\'s nothing to                   
               still active    resend right now.*                        
               (PENDING)**                                               

  **EM-047**   **Send Offer    *You already have an active **Toast**     409 OFFER_ALREADY_EXISTS
               --- active      offer out for this talent.                
               offer already   You\'ll need to withdraw it               
               exists for this before sending a new one.*                
               talent**                                                  

  **EM-048**   **Resend Offer  *This talent is no longer   **Modal**     422 TALENT_NOT_AVAILABLE
               --- talent      available on Marketeq.*                   
               account                                                   
               deactivated**                                             
  ------------ --------------- --------------------------- ------------- ------------------------------

+-----------------------------------------------------------------------+
| **Group 6 --- Permission and Access Errors**                          |
|                                                                       |
| Unauthorised access, wrong role, expired sessions                     |
+-----------------------------------------------------------------------+

  ------------ ----------------- --------------------------- ------------- ------------------------
  **Error ID** **Trigger /       **User-Facing Message**     **Display**   **API Code**
               Location**                                                  

  **EM-049**   **Any offer       *Please sign in to          **Modal**     401 UNAUTHORIZED
               action --- user   continue.*                                
               is not                                                      
               authenticated**                                             

  **EM-050**   **Any offer       *Your session has expired.  **Banner**    401 UNAUTHORIZED
               action --- user   Signing you back in\...*                  
               session has                                                 
               expired**                                                   

  **EM-051**   **Any offer       *You don\'t have access to  **Modal**     403 OFFER_ACCESS_DENIED
               action --- user   this offer.*                              
               is not a party to                                           
               this offer**                                                

  **EM-052**   **Talent tries to *You don\'t have permission **Toast**     403 FORBIDDEN_FOR_ROLE
               perform a         to do that.*                              
               client-only                                                 
               action**                                                    

  **EM-053**   **Client tries to *You don\'t have permission **Toast**     403 FORBIDDEN_FOR_ROLE
               accept their own  to do that.*                              
               offer**                                                     

  **EM-054**   **Offer ID not    *This offer is no longer    **Modal**     404 OFFER_NOT_FOUND
               found (deleted,   available.*                               
               invalid, or                                                 
               enumeration                                                 
               attempt)**                                                  

  **EM-055**   **Client sends an *You can\'t send an offer   **Toast**     422
               offer to          to your own account.*                     SELF_OFFER_NOT_ALLOWED
               themselves**                                                
  ------------ ----------------- --------------------------- ------------- ------------------------

+-----------------------------------------------------------------------+
| **Group 7 --- Modal and Data Load Errors**                            |
|                                                                       |
| When a modal or screen fails to load its content                      |
+-----------------------------------------------------------------------+

  ------------ ------------------ --------------------------- ------------- -------------------
  **Error ID** **Trigger /        **User-Facing Message**     **Display**   **API Code**
               Location**                                                   

  **EM-056**   **Offer modal ---  *We couldn\'t load this     **Modal**     500 / network
               offer data fails   offer right now. Please try               
               to load**          again.*                                   

  **EM-057**   **Offer History    *We couldn\'t load the      **Modal**     500 / network
               modal --- history  offer history. Please try                 
               fails to load**    again.*                                   

  **EM-058**   **Existing         *We couldn\'t load your     **Modal**     500 / network
               contract list ---  contracts right now. Please               
               fails to load in   try again.*                               
               Hire Me modal**                                              

  **EM-059**   **NDA document --- *We couldn\'t load the      **Modal**     500 / network
               fails to load in   agreement right now. Please               
               NDA Review modal** try again.*                               

  **EM-060**   **Start date       *We couldn\'t retrieve the  **Inline**    listings-service
               suggestion ---     estimated start date for                  5xx
               listings-service   this project. Please select               
               unavailable**      one manually.*                            

  **EM-061**   **Review Your      *We couldn\'t open your     **Toast**     500 / network
               Offer CTA on       offer right now. Please try               
               confirmation       again.*                                   
               screen --- offer                                             
               fails to load**                                              

  **EM-062**   **View Contract    *We couldn\'t open the      **Toast**     contracts-service
               CTA --- contract   contract right now. Please                5xx
               fails to load**    try again.*                               

  **EM-063**   **View Job link    *This listing is no longer  **Toast**     404 from
               --- job listing no available.*                               listings-service
               longer exists**                                              
  ------------ ------------------ --------------------------- ------------- -------------------

+-----------------------------------------------------------------------+
| **Group 8 --- Network and Connectivity Errors**                       |
|                                                                       |
| Offline state, timeouts, and server failures                          |
+-----------------------------------------------------------------------+

  ------------ --------------- --------------------------- ------------- -----------------------
  **Error ID** **Trigger /     **User-Facing Message**     **Display**   **API Code**
               Location**                                                

  **EM-064**   **Any action    *You\'re offline. Please    **Banner**    network / no response
               submitted while check your connection and                 
               device is       try again.*                               
               offline**                                                 

  **EM-065**   **Any action    *That took longer than      **Toast**     network timeout
               --- request     expected. Please try                      
               times out**     again.*                                   

  **EM-066**   **Any action    *Something went wrong on    **Toast**     500
               --- server      our end. Please try again                 INTERNAL_SERVER_ERROR
               returns 500**   in a moment.*                             

  **EM-067**   **Any action    *We\'re doing a little      **Banner**    503 SERVICE_UNAVAILABLE
               --- server      maintenance right now.                    
               returns 503     Please try again shortly.*                
               (maintenance or                                           
               overload)**                                               

  **EM-068**   **Ably          *Reconnecting\...*          **Banner**    Ably disconnect
               real-time                                                 
               connection                                                
               lost**                                                    

  **EM-069**   **Ably          *You\'re back online.       **Banner**    Ably reconnect
               reconnected --- Refreshing your offer                     
               offer state may status\...*                               
               have changed**                                            
  ------------ --------------- --------------------------- ------------- -----------------------

+-----------------------------------------------------------------------+
| **Group 9 --- Contract Title Conflict at Acceptance**                 |
|                                                                       |
| Triggered by contracts-service when offer.accepted fires              |
+-----------------------------------------------------------------------+

  ------------ --------------- --------------------------- ------------- -------------------------
  **Error ID** **Trigger /     **User-Facing Message**     **Display**   **API Code**
               Location**                                                

  **EM-070**   **Offer         *You already have a         **Modal**     409
               accepted but    contract called that.                     CONTRACT_TITLE_CONFLICT
               contract title  Please update the title to                
               conflicts with  continue.*                                
               existing                                                  
               contract**                                                
  ------------ --------------- --------------------------- ------------- -------------------------

+-----------------------------------------------------------------------+
| **Group 10 --- Resend Offer Modal Errors**                            |
|                                                                       |
| Triggered within the Resend Offer confirmation flow                   |
+-----------------------------------------------------------------------+

  ------------ --------------- --------------------------- ------------- ----------------------
  **Error ID** **Trigger /     **User-Facing Message**     **Display**   **API Code**
               Location**                                                

  **EM-071**   **Resend fails  *We couldn\'t resend your   **Toast**     500 / network
               --- new offer   offer right now. Please try               
               creation failed again.*                                   
               server-side**                                             

  **EM-072**   **Resend fails  *This talent is no longer   **Modal**     422
               --- talent no   available on Marketeq.*                   TALENT_NOT_AVAILABLE
               longer                                                    
               available**                                               
  ------------ --------------- --------------------------- ------------- ----------------------

+-----------------------------------------------------------------------+
| **Group 11 --- NDA Signing Errors**                                   |
|                                                                       |
| Triggered during or after the NDA sign flow                           |
+-----------------------------------------------------------------------+

  ------------ ---------------- --------------------------- ------------- ---------------
  **Error ID** **Trigger /      **User-Facing Message**     **Display**   **API Code**
               Location**                                                 

  **EM-073**   **Sign NDA ---   *We couldn\'t save your     **Modal**     500 from
               submission fails signature right now. Please               legal-service
               (legal-service   try again.*                               
               error)**                                                   

  **EM-074**   **Sign NDA ---   *Your session expired while **Banner**    401
               session expired  you were signing. Signing                 UNAUTHORIZED
               mid-signing**    you back in\...*                          
  ------------ ---------------- --------------------------- ------------- ---------------

+-----------------------------------------------------------------------+
| **Group 12 --- Empty States and Fallbacks**                           |
|                                                                       |
| Null states that render friendly placeholder text instead of blank    |
| sections                                                              |
+-----------------------------------------------------------------------+

  ------------ --------------- --------------------------- -------------- ---------
  **Error ID** **Trigger /     **User-Facing Message**     **Display**    **API
               Location**                                                 Code**

  **EM-075**   **Offer message *No message was sent.*      **Fallback**   ---
               --- no message                                             
               was sent with                                              
               the offer**                                                

  **EM-076**   **Withdrawal    *No message was sent.*      **Fallback**   ---
               message --- no                                             
               message was                                                
               sent with                                                  
               withdrawal**                                               

  **EM-077**   **Decline       *No reason was provided.*   **Fallback**   ---
               reason --- no                                              
               reason was                                                 
               stored**                                                   

  **EM-078**   **Existing      *You don\'t have any active **Fallback**   ---
               contract list   contracts yet. You can                     
               --- client has  invite this talent to a new                
               no active       contract instead.*                         
               contracts**                                                

  **EM-079**   **Offer History *No history available.*     **Fallback**   ---
               --- no events                                              
               found                                                      
               (defensive                                                 
               fallback                                                   
               only)**                                                    

  **EM-080**   **Client        *---*                       **Fallback**   ---
               Profile --- no                                             
               offer exists                                               
               between this                                               
               client and                                                 
               talent (no                                                 
               banner shown)**                                            
  ------------ --------------- --------------------------- -------------- ---------

+-----------------------------------------------------------------------+
| **Group 13 --- Rate Warning (Advisory)**                              |
|                                                                       |
| Informational --- shown on Make Counter Offer when rate exceeds 25%   |
| threshold. Does not block submission.                                 |
+-----------------------------------------------------------------------+

  ------------ --------------- --------------------------- ------------- ----------
  **Error ID** **Trigger /     **User-Facing Message**     **Display**   **API
               Location**                                                Code**

  **EM-081**   **Counter Offer *The client will be more    **Inline**    advisory
               rate exceeds    likely to accept if your                  only
               25% above       counter offer is closer to                
               original offer  \$\[X\]/hr.*                              
               rate (talent                                              
               side)**                                                   

  **EM-082**   **Counter Offer *The talent will be more    **Inline**    advisory
               rate is         likely to accept if your                  only
               significantly   offer is closer to                        
               below current   \$\[X\]/hr.*                              
               counter terms                                             
               (client counter                                           
               back)**                                                   
  ------------ --------------- --------------------------- ------------- ----------

+-----------------------------------------------------------------------+
| **Group 14 --- Platform Context Messages**                            |
|                                                                       |
| Informational messages shown in context, not triggered by errors      |
+-----------------------------------------------------------------------+

  ------------ --------------- --------------------------- ------------- ---------
  **Error ID** **Trigger /     **User-Facing Message**     **Display**   **API
               Location**                                                Code**

  **EM-083**   **Client        *This client sent you an    **Banner**    ---
               Profile ---     offer.*                                   
               active offer                                              
               exists (talent                                            
               visiting client                                           
               profile)**                                                

  **EM-084**   **Client        *Offer from this client     **Banner**    ---
               Profile ---     expired.*                                 
               offer has                                                 
               expired (talent                                           
               visiting client                                           
               profile)**                                                

  **EM-085**   **Offer modal   *Signing the NDA does not   **Inline**    ---
               --- NDA notice  accept the offer.*                        
               on scoped                                                 
               project**                                                 

  **EM-086**   **Accept This   *Once you accept, this      **Inline**    ---
               Offer modal --- offer becomes an active                   
               legal notice    contract.*                                
               before                                                    
               acceptance**                                              

  **EM-087**   **Make Counter  *By submitting, you agree   **Inline**    ---
               Offer / Edit    to work under these terms                 
               Offer --- legal if the client accepts your                
               agreement       offer.*                                   
               notice**                                                  

  **EM-088**   **Offer Expired *You can resend this offer  **Inline**    ---
               Details ---     or edit the terms before                  
               client,         sending.*                                 
               resendable                                                
               state**                                                   

  **EM-089**   **Offer Expired *Want to revisit this? You  **Inline**    ---
               Details ---     can ask the client to                     
               talent, ≤30     extend the offer.*                        
               days**                                                    

  **EM-090**   **Offer Expired *Want to revisit this? Ask  **Inline**    ---
               Details ---     the client to see if the                  
               talent, \>30    role is still available.*                 
               days**                                                    

  **EM-091**   **Offer         *You can resend this offer  **Inline**    ---
               Declined        or edit the terms before                  
               Details ---     sending.*                                 
               client**                                                  

  **EM-092**   **Offer         *Want to revisit this? Ask  **Inline**    ---
               Declined        the client to see if the                  
               Details ---     role is still open.*                      
               talent**                                                  

  **EM-093**   **Offer         *You can resend this offer  **Inline**    ---
               Withdrawn       or edit the terms before                  
               Details ---     sending.*                                 
               client**                                                  

  **EM-094**   **Offer         *Want to revisit this? Ask  **Inline**    ---
               Withdrawn       the client to see if the                  
               Details ---     role is still available.*                 
               talent**                                                  

  **EM-095**   **Withdraw      *This will cancel the offer **Inline**    ---
               Offer           and notify the recipient.*                
               confirmation                                              
               --- reminder                                              
               that talent                                               
               will be                                                   
               notified**                                                

  **EM-096**   **Withdraw      *Do you want to withdraw    **Inline**    ---
               Counter Offer   your counter offer? You can               
               --- reminder    still accept the client\'s                
               that original   active offer afterward.*                  
               offer is still                                            
               active**                                                  

  **EM-097**   **Counter Offer *This counteroffer expires  **Inline**    ---
               modal (client)  \[date\]. If you decline,                 
               --- active      your original offer stays                 
               offer safety    active unless it expires.*                
               notice**                                                  

  **EM-098**   **Resend Offer  *This will resend the offer **Inline**    ---
               modal --- new   with the same terms.                      
               offer notice**  Resending creates a new                   
                               offer.*                                   

  **EM-099**   **Offer Expired *This offer was reopened    **Inline**    ---
               Details         \[N\] days ago.*                          
               (client) ---                                              
               offer was                                                 
               reopened**                                                

  **EM-100**   **Offer Expired *This offer was accepted    **Inline**    ---
               Details         \[N\] days ago.*                          
               (client) ---                                              
               offer was                                                 
               accepted                                                  
               post-expiry**                                             
  ------------ --------------- --------------------------- ------------- ---------
