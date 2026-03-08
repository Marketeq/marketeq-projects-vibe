**[MARKETEQ BACKEND]{.smallcaps}**

**transaction-service**

**Doc 07 \-- QA & Test Data**

  -----------------------------------------------------------------------
  **Field**          **Value**
  ------------------ ----------------------------------------------------
  Service Name       transaction-service

  Doc Number         Doc 07

  Prerequisites      Doc 00 through Doc 06

  Test Runner        Jest + Supertest (unit & integration)

  Consumer Tests     Jest with \@golevelup/nestjs-rabbitmq mocked

  Seed Tool          TypeScript seed scripts \-- ts-node src/seeds/run.ts

  API Collection     REST Client (.http files) + Postman collection JSON

  Load Test Tool     k6 \-- export endpoint load spec included

  Total Test Cases   147 (unit: 52, integration: 68, consumer: 27)

  Total Error States 37 mapped from error messages specification
  -----------------------------------------------------------------------

# **1. Purpose**

This document contains the full QA specification for
transaction-service. It defines every test case mapped from the
acceptance criteria and the 37 error states from the error messages
specification, the seed scripts needed to populate all transaction types
and status combinations, REST Client and Postman collections for manual
and automated API testing, filter combination fixtures, and a k6 load
test spec for the export endpoint.

Test cases are grouped by area: consumer event handling, HTTP endpoints
(one section per endpoint), serialization and DTO validation, caching
behaviour, and scheduled jobs. Each test case has a unique ID that can
be referenced in PR descriptions and bug reports.

# **2. Test Environment Setup**

## **2.1 Dependencies**

+-----------------------------------------------------------------------+
| **Test dependency installation**                                      |
+-----------------------------------------------------------------------+
| \# Install test dependencies                                          |
|                                                                       |
| npm install \--save-dev jest \@types/jest ts-jest supertest           |
| \@types/supertest                                                     |
|                                                                       |
| npm install \--save-dev \@golevelup/testing jest-mock-extended        |
|                                                                       |
| \# k6 load testing (install separately)                               |
|                                                                       |
| \# macOS: brew install k6                                             |
|                                                                       |
| \# Linux: sudo gpg \--no-default-keyring \--keyring                   |
| /usr/share/keyrings/k6-archive-keyring.gpg \\                         |
|                                                                       |
| \# \--keyserver hkp://keyserver.ubuntu.com:80 \--recv-keys            |
| C5AD17C747E3415A3642D57D77C6C491D6AC1D69                              |
|                                                                       |
| \# echo \'deb                                                         |
| \[signed-by=/usr/share/keyrings/k6-archive-keyring.gpg\]              |
| https://dl.k6.io/deb stable main\' \\                                 |
|                                                                       |
| \# \| sudo tee /etc/apt/sources.list.d/k6.list                        |
|                                                                       |
| \# sudo apt-get update && sudo apt-get install k6                     |
+=======================================================================+

## **2.2 Jest Configuration**

**/apps/transaction-service/jest.config.ts**

+-----------------------------------------------------------------------+
| **jest.config.ts**                                                    |
+-----------------------------------------------------------------------+
| import type { Config } from \'jest\';                                 |
|                                                                       |
| const config: Config = {                                              |
|                                                                       |
| moduleFileExtensions: \[\'js\',\'json\',\'ts\'\],                     |
|                                                                       |
| rootDir: \'src\',                                                     |
|                                                                       |
| testRegex: \'.\*\\.spec\\.ts\$\',                                     |
|                                                                       |
| transform: { \'\^.+\\.(t\|j)s\$\': \'ts-jest\' },                     |
|                                                                       |
| collectCoverageFrom: \[\'\*\*/\*.(t\|j)s\'\],                         |
|                                                                       |
| coverageDirectory: \'../coverage\',                                   |
|                                                                       |
| testEnvironment: \'node\',                                            |
|                                                                       |
| // Integration tests use a real DB \-- tag them so they can be        |
| skipped in CI unit runs                                               |
|                                                                       |
| testPathIgnorePatterns: \[\],                                         |
|                                                                       |
| globals: {                                                            |
|                                                                       |
| \'ts-jest\': { tsconfig: \'./tsconfig.json\' }                        |
|                                                                       |
| }                                                                     |
|                                                                       |
| };                                                                    |
|                                                                       |
| export default config;                                                |
+=======================================================================+

## **2.3 Test Database**

Integration tests run against a dedicated test schema
(transaction_service_test) on the same Supabase project. The test schema
is created by running the migration script against the test URL. It is
wiped and re-seeded before each test suite via beforeAll hooks.

+--------------------------------------------------------------------------------------------------------+
| **.env.test**                                                                                          |
+--------------------------------------------------------------------------------------------------------+
| \# .env.test                                                                                           |
|                                                                                                        |
| DATABASE_URL=postgresql://postgres:\<password\>@\<host\>:5432/postgres?schema=transaction_service_test |
|                                                                                                        |
| JWT_SECRET=test-secret-not-for-production                                                              |
|                                                                                                        |
| RABBITMQ_URL=amqp://localhost \# mocked in most tests                                                  |
|                                                                                                        |
| REDIS_URL=redis://localhost:6379/1 \# DB index 1 avoids polluting dev cache                            |
|                                                                                                        |
| ABLY_API_KEY=test-key \# mocked                                                                        |
|                                                                                                        |
| STRIPE_SECRET_KEY=sk_test_xxx                                                                          |
|                                                                                                        |
| NODE_ENV=test                                                                                          |
+========================================================================================================+

# **3. Consumer Test Cases**

Consumer tests mock the RabbitMQ transport and call handler methods
directly with controlled payloads. The database is a real test database.
Cache and Ably are mocked.

## **3.1 billing.payment.completed**

  -----------------------------------------------------------------------------------------------------------
  **Test   **Category**   **Test           **Input / Setup**                 **Expected Result**
  ID**                    Description**                                      
  -------- -------------- ---------------- --------------------------------- --------------------------------
  TC-C01   Consumer       Happy path \--   Valid payload, eventId not in DB  Transaction row created with
                          new payment                                        status=paid,
                          event                                              amountDirection=DEBIT, paidAt
                                                                             set, cache invalidated, Ably
                                                                             publishStatusUpdate called with
                                                                             status=paid

  TC-C02   Consumer       Idempotency \--  Same eventId already in DB        Handler returns early, no new
                          duplicate event                                    row written, no Ably call, log
                                                                             shows \'Duplicate event \--
                                                                             skipping\'

  TC-C03   Consumer       project contract contractType=project,             Row has descriptionProjectName
                          with project     descriptionProjectName set        populated,
                          name                                               descriptionContractorHandle is
                                                                             null

  TC-C04   Consumer       individual       contractType=individual,          Row has
                          contract with    descriptionContractorHandle set   descriptionContractorHandle
                          contractor                                         populated,
                          handle                                             descriptionProjectName is null

  TC-C05   Consumer       Hourly payment   transactionType=hourly_payment,   Row has descriptionHours=8
                          with hours       descriptionHours=8                

  TC-C06   Consumer       Membership tier  membershipTier=pro in payload     Row has membershipTier=pro,
                          mapping                                            descriptionType=pro_membership

  TC-C07   Consumer       DB constraint    eventId collides with existing    Exception thrown, message
                          violation        transactionId via race condition  nacked, logged at error level
  -----------------------------------------------------------------------------------------------------------

## **3.2 billing.refund.issued**

  -------------------------------------------------------------------------------------------------
  **Test   **Category**   **Test           **Input / Setup**       **Expected Result**
  ID**                    Description**                            
  -------- -------------- ---------------- ----------------------- --------------------------------
  TC-C08   Consumer       Full refund      isPartial=false         New row:
                                                                   descriptionType=refund_issued,
                                                                   amountDirection=CREDIT,
                                                                   status=refunded,
                                                                   parentTransactionId set to
                                                                   originalTransactionId

  TC-C09   Consumer       Partial refund   isPartial=true,         New row:
                                           refundAmount \<         status=partially_refunded,
                                           original                amount=refundAmount only (not
                                                                   original)

  TC-C10   Consumer       Original record  Run findOne on original Original row status, amount,
                          untouched        after refund processed  paidAt all unchanged \--
                                                                   immutability preserved

  TC-C11   Consumer       Parent FK valid  originalTransactionId   Row saves successfully with
                                           references existing row parentTransactionId FK satisfied

  TC-C12   Consumer       Parent FK        originalTransactionId   FK violation thrown, message
                          invalid          does not exist in DB    nacked, routed to DLQ
  -------------------------------------------------------------------------------------------------

## **3.3 billing.invoice.generated**

  -------------------------------------------------------------------------------------------------
  **Test   **Category**   **Test            **Input / Setup**                **Expected Result**
  ID**                    Description**                                      
  -------- -------------- ----------------- -------------------------------- ----------------------
  TC-C13   Consumer       New invoice       Valid payload, invoiceId not in  Invoice row created
                                            DB                               with all fields,
                                                                             stripeInvoiceId stored
                                                                             if present

  TC-C14   Consumer       Idempotency       Same invoiceId already in DB     Returns early, no
                                                                             duplicate, no error

  TC-C15   Consumer       Null              stripeInvoiceId=null in payload  Row saved with
                          stripeInvoiceId                                    stripeInvoiceId=null
                                                                             \-- no error

  TC-C16   Consumer       Invoice status    Send                             Invoice row status
                          updated           billing.invoice.status.updated   updated, updatedAt
                                            after creation                   changed
  -------------------------------------------------------------------------------------------------

## **3.4 billing.wire.transfer.confirmed**

  ------------------------------------------------------------------------------------
  **Test   **Category**   **Test           **Input / Setup**     **Expected Result**
  ID**                    Description**                          
  -------- -------------- ---------------- --------------------- ---------------------
  TC-C17   Consumer       Wire with fee    wireFeeAmount=25      Two rows created:
                                                                 project_payment +
                                                                 wire_transfer_fee
                                                                 with
                                                                 parentTransactionId
                                                                 pointing to payment

  TC-C18   Consumer       Wire without fee wireFeeAmount=0       One row created:
                                                                 project_payment only,
                                                                 no fee row

  TC-C19   Consumer       Fee row FK       Fee                   FK satisfied, both
                                           parentTransactionId   rows queryable by
                                           references the wire   parentTransactionId
                                           payment row           
  ------------------------------------------------------------------------------------

## **3.5 billing.subscription.charged**

  -----------------------------------------------------------------------------------------------------------
  **Test   **Category**   **Test           **Input / Setup**          **Expected Result**
  ID**                    Description**                               
  -------- -------------- ---------------- -------------------------- ---------------------------------------
  TC-C20   Consumer       Basic tier       membershipTier=basic       descriptionType=basic_membership,
                                                                      contractType=SERVICE

  TC-C21   Consumer       Agency tier maps membershipTier=agency      descriptionType=enterprise_membership
                          to enterprise                               

  TC-C22   Consumer       Billing          billingFrequency=monthly   Row has billingFrequency=monthly
                          frequency stored                            
  -----------------------------------------------------------------------------------------------------------

## **3.6 timetracking.hours.logged**

  ------------------------------------------------------------------------------------------
  **Test   **Category**   **Test           **Input / Setup**  **Expected Result**
  ID**                    Description**                       
  -------- -------------- ---------------- ------------------ ------------------------------
  TC-C23   Consumer       Earning credit   Valid payload      Row userId=contractorId (not
                          created                             clientId),
                                                              amountDirection=CREDIT,
                                                              status=credited,
                                                              descriptionHours=hoursLogged

  TC-C24   Consumer       Client has       After TC-C23,      No row found \-- earning is
                          separate record  query by clientId  scoped to contractor only
  ------------------------------------------------------------------------------------------

## **3.7 payout events**

  --------------------------------------------------------------------------------
  **Test   **Category**   **Test           **Input / Setup**  **Expected Result**
  ID**                    Description**                       
  -------- -------------- ---------------- ------------------ --------------------
  TC-C25   Consumer       Payout initiated payout.initiated   Row created
                                           payload            status=processing,
                                                              Ably called with
                                                              status=processing

  TC-C26   Consumer       Payout completed payout.completed   Existing row status
                                           with               updated to
                                           originalEventId    succeeded, paidAt
                                           matching TC-C25    set, Ably called
                                                              with
                                                              status=succeeded

  TC-C27   Consumer       Payout failed    payout.failed with Existing row status
                                           originalEventId    updated to failed,
                                           matching TC-C25    Ably called with
                                                              status=failed
  --------------------------------------------------------------------------------

# **4. HTTP Endpoint Test Cases**

## **4.1 GET /v1/transactions**

  --------------------------------------------------------------------------------------------------------------------------
  **Test   **Category**   **Test              **Input / Setup**                        **Expected Result**
  ID**                    Description**                                                
  -------- -------------- ------------------- ---------------------------------------- -------------------------------------
  TC-H01   Transactions   Happy path \-- no   Valid JWT, user has 15 transactions      200, data array length \<= 10,
           List           filters                                                      meta.total=15, meta.totalPages=2,
                                                                                       meta.hasNextPage=true

  TC-H02   Transactions   Empty result        Valid JWT, user has 0 transactions       200, data=\[\], meta.total=0,
           List                                                                        meta.hasNextPage=false

  TC-H03   Transactions   Pagination page 2   ?page=2&limit=5, user has 12 records     200, data.length=5 (records 6-10),
           List                                                                        meta.page=2

  TC-H04   Transactions   Limit boundary max  ?limit=100                               200, accepted
           List                                                                        

  TC-H05   Transactions   Limit over max      ?limit=101                               400, code=VALIDATION_ERROR
           List                                                                        

  TC-H06   Transactions   Date range filter   ?dateFrom=2025-01-01&dateTo=2025-03-31   200, all returned dates within range
           List                                                                        

  TC-H07   Transactions   dateFrom after      ?dateFrom=2025-06-01&dateTo=2025-01-01   400, message=\'Your start date cannot
           List           dateTo                                                       be after your end date. Please adjust
                                                                                       your selection.\'

  TC-H08   Transactions   Future dateFrom     ?dateFrom=2099-01-01                     400, message=\'Start date cannot be
           List                                                                        in the future.\'

  TC-H09   Transactions   Invalid dateFrom    ?dateFrom=not-a-date                     400, code=VALIDATION_ERROR
           List           format                                                       

  TC-H10   Transactions   Type filter         ?type=monthly_installment                200, all returned rows have
           List                                                                        descriptionType=monthly_installment

  TC-H11   Transactions   Invalid type enum   ?type=fake_type                          400, message=\'Invalid transaction
           List                                                                        type filter value.\'

  TC-H12   Transactions   PaymentMethodType   ?paymentMethodType=bank_ach              200, all returned rows have
           List           filter                                                       paymentMethodType=bank_ach

  TC-H13   Transactions   ContractId filter   ?contractId=valid-uuid                   200, all returned rows have
           List                                                                        contractId matching

  TC-H14   Transactions   Invalid contractId  ?contractId=not-a-uuid                   400, message=\'Invalid contract
           List           UUID                                                         identifier.\'

  TC-H15   Transactions   Search by project   ?search=UX+Audit                         200, all returned rows contain \'UX
           List           name                                                         Audit\' in descriptionProjectName

  TC-H16   Transactions   Search by amount    ?search=515                              200, rows with amount containing
           List                                                                        \'515\' returned

  TC-H17   Transactions   Search too short    ?search=a                                400, message=\'Please enter a valid
           List                                                                        search term.\'

  TC-H18   Transactions   Search whitespace   ?search=++++                             400, message=\'Please enter a valid
           List           only                                                         search term.\'

  TC-H19   Transactions   No JWT              No Authorization header                  401, message=\'Your session has
           List                                                                        expired. Please log in again to
                                                                                       continue.\'

  TC-H20   Transactions   Expired JWT         Expired token                            401, same message
           List                                                                        

  TC-H21   Transactions   User isolation      JWT of user B, records belong to user A  200, data=\[\] \-- user B cannot see
           List                                                                        user A records

  TC-H22   Transactions   Cache hit           Make same request twice, verify Redis    Second request returns identical
           List                               hit on second                            data, txn_cache_hits_total
                                                                                       incremented

  TC-H23   Transactions   Cache invalidated   Request, write new transaction via       Second request reflects new row \--
           List           on write            consumer, request again                  not stale cache

  TC-H24   Transactions   userId never in     Any 200 response                         Response objects have no userId field
           List           response                                                     

  TC-H25   Transactions   Sorted by date DESC User has transactions on different dates First record has the most recent date
           List                                                                        
  --------------------------------------------------------------------------------------------------------------------------

## **4.2 GET /v1/transactions/:id**

  --------------------------------------------------------------------------------------------------
  **Test   **Category**   **Test Description**  **Input / Setup**  **Expected Result**
  ID**                                                             
  -------- -------------- --------------------- ------------------ ---------------------------------
  TC-H26   Transaction    Happy path            Valid id belonging 200, id matches, detail object
           Detail                               to authed user     present with accountLabel,
                                                                   disclaimerText

  TC-H27   Transaction    Not found             ID does not exist  404, message=\'We could not load
           Detail                                                  the details for this transaction.
                                                                   Please try again.\'

  TC-H28   Transaction    Wrong user            ID exists but      404, same message \-- no
           Detail                               belongs to         cross-user data leakage
                                                different user     

  TC-H29   Transaction    Audit log created     Call endpoint      AuditLog row written with
           Detail                                                  action=VIEW_TRANSACTION_DETAIL,
                                                                   transactionId, userId

  TC-H30   Transaction    No JWT                No token           401
           Detail                                                  

  TC-H31   Transaction    Refund has            Transaction is a   Response includes
           Detail         parentTransactionId   refund             parentTransactionId pointing to
                                                                   original
  --------------------------------------------------------------------------------------------------

## **4.3 GET /v1/transactions/:id/receipt**

  -------------------------------------------------------------------------------------------------
  **Test   **Category**   **Test           **Input / Setup**        **Expected Result**
  ID**                    Description**                             
  -------- -------------- ---------------- ------------------------ -------------------------------
  TC-H32   Receipt        Happy path \--   Transaction status=paid  200,
                          paid                                      Content-Type=application/pdf,
                                                                    Content-Disposition has correct
                                                                    filename

  TC-H33   Receipt        Succeeded status Transaction              200, PDF returned
                                           status=succeeded         

  TC-H34   Receipt        Refunded status  Transaction              200, PDF returned
                                           status=refunded          

  TC-H35   Receipt        Processing       Transaction              422, message=\'Your receipt
                          blocked          status=processing        will be available once this
                                                                    payment is complete.\'

  TC-H36   Receipt        Pending blocked  Transaction              422, same message
                                           status=payment_pending   

  TC-H37   Receipt        Failed blocked   Transaction              422, same message
                                           status=failed            

  TC-H38   Receipt        Audit log        Successful download      AuditLog row written with
                          created                                   action=DOWNLOAD_RECEIPT

  TC-H39   Receipt        Not found        ID does not exist        404
  -------------------------------------------------------------------------------------------------

## **4.4 GET /v1/invoices**

  -----------------------------------------------------------------------------------------------------
  **Test   **Category**   **Test           **Input / Setup**                        **Expected Result**
  ID**                    Description**                                             
  -------- -------------- ---------------- ---------------------------------------- -------------------
  TC-H40   Invoices List  Happy path       Valid JWT, user has invoices             200, pagination
                                                                                    envelope, no
                                                                                    stripeInvoiceId in
                                                                                    list response

  TC-H41   Invoices List  Status filter    ?status=paid                             200, all rows have
                                                                                    status=paid

  TC-H42   Invoices List  Overdue          Invoice has due_date in past,            Response shows
                          read-time        status=payment_pending in DB             status=overdue even
                          override                                                  before nightly cron
                                                                                    runs

  TC-H43   Invoices List  Invalid status   ?status=not_valid                        400,
                          enum                                                      message=\'Invalid
                                                                                    status filter
                                                                                    value.\'

  TC-H44   Invoices List  Date range       ?dateFrom=2025-01-01&dateTo=2025-06-30   200, all dateIssued
                          filter                                                    within range

  TC-H45   Invoices List  User isolation   User B JWT querying invoices belonging   200, data=\[\]
                                           to user A                                
  -----------------------------------------------------------------------------------------------------

## **4.5 GET /v1/invoices/:id**

  ----------------------------------------------------------------------------------------
  **Test   **Category**   **Test           **Input / Setup**  **Expected Result**
  ID**                    Description**                       
  -------- -------------- ---------------- ------------------ ----------------------------
  TC-H46   Invoice Detail Happy path with  Invoice has        200, stripeHostedUrl and
                          Stripe URLs      stripeInvoiceId,   stripePdfUrl present and
                                           Stripe API returns non-null
                                           URLs               

  TC-H47   Invoice Detail Null Stripe ID   Invoice has no     200, stripeHostedUrl=null,
                                           stripeInvoiceId    stripePdfUrl=null \-- no
                                                              error

  TC-H48   Invoice Detail Stripe API       Stripe call throws 200, invoice data returned,
                          unreachable                         stripeHostedUrl=null, log
                                                              warn emitted

  TC-H49   Invoice Detail Not found        ID does not exist  404, message=\'This invoice
                                                              ID appears to be invalid.
                                                              Please contact support if
                                                              you believe this is an
                                                              error.\'

  TC-H50   Invoice Detail Wrong user       ID exists,         404, same message
                                           different user     

  TC-H51   Invoice Detail Audit log        Successful call    AuditLog row with
                          written                             action=VIEW_INVOICE_DETAIL
  ----------------------------------------------------------------------------------------

## **4.6 POST /v1/transactions/export**

  --------------------------------------------------------------------------------------
  **Test   **Category**   **Test           **Input / Setup**     **Expected Result**
  ID**                    Description**                          
  -------- -------------- ---------------- --------------------- -----------------------
  TC-H52   Export         Happy path CSV   format=csv,           202, queued=false,
                          \-- transactions scope=transactions,   filename ends in .csv
                                           user has records      

  TC-H53   Export         Happy path PDF   format=pdf,           202, queued=false,
                          \-- invoices     scope=invoices        filename ends in .pdf

  TC-H54   Export         With filters     format=csv,           202, export honours
                                           scope=transactions,   filters \-- row count
                                           dateFrom, type        matches filtered query
                                           filters applied       

  TC-H55   Export         Zero records     Filters match nothing 422, message=\'There is
                                                                 nothing to export. Try
                                                                 adjusting your filters
                                                                 to include more
                                                                 transactions.\'

  TC-H56   Export         Async threshold  Record count \> 1000  202, queued=true,
                                                                 message contains email
                                                                 notification text,
                                                                 estimatedRecords \>
                                                                 1000

  TC-H57   Export         Invalid format   format=xml            400, message=\'Invalid
                                                                 export format. Use csv
                                                                 or pdf.\'

  TC-H58   Export         Invalid scope    scope=payments        400, message=\'Invalid
                                                                 export scope. Use
                                                                 transactions or
                                                                 invoices.\'

  TC-H59   Export         Missing format   format omitted        400,
                                                                 code=VALIDATION_ERROR

  TC-H60   Export         Audit log        Successful export     AuditLog row with
                          written                                action=EXPORT, scope,
                                                                 format
  --------------------------------------------------------------------------------------

## **4.7 POST /v1/transactions/:id/report**

  ----------------------------------------------------------------------------------------
  **Test   **Category**   **Test           **Input / Setup**  **Expected Result**
  ID**                    Description**                       
  -------- -------------- ---------------- ------------------ ----------------------------
  TC-H61   Report         Happy path       Valid id,          201, caseReference present,
                                           category,          message present
                                           description        

  TC-H62   Report         All valid        Send each of 5     201 for each \--
                          categories       categories         incorrect_amount,
                                                              duplicate_charge,
                                                              payment_not_received,
                                                              unauthorized, other

  TC-H63   Report         Missing category category omitted   400, message=\'Please select
                                                              a problem category.\'

  TC-H64   Report         Missing          description        400, message=\'Please
                          description      omitted            describe the problem.\'

  TC-H65   Report         Description at   description=500    201, accepted
                          max length       chars exactly      

  TC-H66   Report         Description over description=501    400, message=\'Description
                          max length       chars              must be 500 characters or
                                                              less.\'

  TC-H67   Report         Rate limit \--   Submit 4 reports   429, message=\'The maximum
                          4th report       for same           number of reports for this
                                           transactionId      transaction has been
                                                              reached. Please contact
                                                              support directly.\'

  TC-H68   Report         Rate limit \--   Submit exactly 3   201, third report accepted
                          3rd report       reports            
                          allowed                             

  TC-H69   Report         Not found        transactionId does 404, message=\'We could not
                                           not exist          load the details for this
                                                              transaction. Please try
                                                              again.\'

  TC-H70   Report         Wrong user       transactionId      404, same message
                                           belongs to         
                                           different user     

  TC-H71   Report         Audit log        Successful report  AuditLog row with
                          written                             action=REPORT_TRANSACTION,
                                                              reportId, category
  ----------------------------------------------------------------------------------------

# **5. All 37 Error States**

Every error state from the error messages specification is listed here
with its test case ID, the endpoint or trigger that produces it, the
exact user-facing message, and the HTTP status code.

  ----------------------------------------------------------------------------------------------------------
  **\#**   **HTTP     **Code**                  **Endpoint**                **User-Facing          **Test
           Status**                                                         Message**              ID(s)**
  -------- ---------- ------------------------- --------------------------- ---------------------- ---------
  1        401        UNAUTHORIZED              All endpoints               Your session has       TC-H19,
                                                                            expired. Please log in TC-H20,
                                                                            again to continue.     TC-H30

  2        403        FORBIDDEN                 Any resource                You do not have        \--
                                                                            permission to access   
                                                                            this resource.         

  3        404        NOT_FOUND                 GET /transactions/:id       We could not load the  TC-H27,
                                                                            details for this       TC-H28,
                                                                            transaction. Please    TC-H39
                                                                            try again.             

  4        404        NOT_FOUND                 GET /invoices/:id           This invoice ID        TC-H49,
                                                                            appears to be invalid. TC-H50
                                                                            Please contact support 
                                                                            if you believe this is 
                                                                            an error.              

  5        404        NOT_FOUND                 POST                        We could not load the  TC-H69,
                                                /transactions/:id/report    details for this       TC-H70
                                                                            transaction. Please    
                                                                            try again.             

  6        400        VALIDATION_ERROR          GET /transactions           Please enter a valid   TC-H17,
                                                                            search term.           TC-H18

  7        400        VALIDATION_ERROR          GET /transactions           Your start date cannot TC-H07
                                                                            be after your end      
                                                                            date. Please adjust    
                                                                            your selection.        

  8        400        VALIDATION_ERROR          GET /transactions           Your end date cannot   TC-H07
                                                                            be before your start   
                                                                            date. Please adjust    
                                                                            your selection.        

  9        400        VALIDATION_ERROR          GET /transactions           Start date cannot be   TC-H08
                                                                            in the future.         

  10       400        VALIDATION_ERROR          GET /transactions           Your start date is     TC-H09
                                                                            invalid. Please select 
                                                                            a valid date.          

  11       400        VALIDATION_ERROR          GET /transactions           Your end date is       \--
                                                                            invalid. Please select 
                                                                            a valid date.          

  12       400        VALIDATION_ERROR          GET /transactions           Invalid transaction    TC-H11
                                                                            type filter value.     

  13       400        VALIDATION_ERROR          GET /transactions           Invalid payment method \--
                                                                            filter value.          

  14       400        VALIDATION_ERROR          GET /transactions           Invalid contract       TC-H14
                                                                            identifier.            

  15       400        VALIDATION_ERROR          GET /transactions           Page number must be a  TC-H05
                                                                            positive integer.      

  16       400        VALIDATION_ERROR          GET /transactions           Results per page must  TC-H05
                                                                            be between 1 and 100.  

  17       400        VALIDATION_ERROR          GET /invoices               Please enter a valid   TC-H44
                                                                            search term.           

  18       400        VALIDATION_ERROR          GET /invoices               Your start date cannot TC-H44
                                                                            be after your end      
                                                                            date. Please adjust    
                                                                            your selection.        

  19       400        VALIDATION_ERROR          GET /invoices               Invalid status filter  TC-H43
                                                                            value.                 

  20       400        VALIDATION_ERROR          POST /export                Invalid export format. TC-H57
                                                                            Use csv or pdf.        

  21       400        VALIDATION_ERROR          POST /export                Invalid export scope.  TC-H58
                                                                            Use transactions or    
                                                                            invoices.              

  22       400        VALIDATION_ERROR          POST /report                Please select a        TC-H63
                                                                            problem category.      

  23       400        VALIDATION_ERROR          POST /report                Please describe the    TC-H64
                                                                            problem.               

  24       400        VALIDATION_ERROR          POST /report                Description must be    TC-H66
                                                                            500 characters or      
                                                                            less.                  

  25       422        BUSINESS_RULE_VIOLATION   GET                         Your receipt will be   TC-H35,
                                                /transactions/:id/receipt   available once this    TC-H36,
                                                                            payment is complete.   TC-H37

  26       422        BUSINESS_RULE_VIOLATION   POST /export                There is nothing to    TC-H55
                                                                            export. Try adjusting  
                                                                            your filters to        
                                                                            include more           
                                                                            transactions.          

  27       409        IMMUTABLE_RECORD          Internal guard              This transaction       \--
                                                                            cannot be modified.    

  28       429        RATE_LIMITED              POST /report                The maximum number of  TC-H67
                                                                            reports for this       
                                                                            transaction has been   
                                                                            reached. Please        
                                                                            contact support        
                                                                            directly.              

  29       503        SERVICE_UNAVAILABLE       GET /invoices/:id (Stripe)  Invoice details        TC-H48
                                                                            loaded. Download link  
                                                                            temporarily            
                                                                            unavailable.           

  30       500        INTERNAL_ERROR            GET /transactions           We are having trouble  \--
                                                                            loading your           
                                                                            transactions. Please   
                                                                            refresh the page.      

  31       500        INTERNAL_ERROR            GET /invoices               We are having trouble  \--
                                                                            loading your invoices. 
                                                                            Please refresh the     
                                                                            page.                  

  32       500        INTERNAL_ERROR            GET /transactions/:id       We could not load the  \--
                                                                            details for this       
                                                                            transaction. Please    
                                                                            try again.             

  33       500        INTERNAL_ERROR            GET                         We could not generate  \--
                                                /transactions/:id/receipt   your receipt. Please   
                                                                            try again.             

  34       500        INTERNAL_ERROR            POST /export                We could not generate  \--
                                                                            your export. Please    
                                                                            try again. If the      
                                                                            issue continues,       
                                                                            contact support.       

  35       500        INTERNAL_ERROR            POST /report                We could not submit    \--
                                                                            your report. Please    
                                                                            try again or contact   
                                                                            support directly.      

  36       503        SERVICE_UNAVAILABLE       GET /ready                  status=degraded with   \--
                                                                            failed check details   

  37       401        UNAUTHORIZED              All endpoints               Your session has       TC-H19
                                                                            expired. Please log in 
                                                                            again to continue.     
                                                                            (malformed token       
                                                                            variant)               
  ----------------------------------------------------------------------------------------------------------

# **6. Serialization & DTO Validation Tests**

  --------------------------------------------------------------------------------------------
  **Test   **Category**    **Test            **Input / Setup**  **Expected Result**
  ID**                     Description**                        
  -------- --------------- ----------------- ------------------ ------------------------------
  TC-S01   Serialization   userId excluded   Fetch any          Response object has no userId
                           from transaction  transaction        field at any nesting level
                           response                             

  TC-S02   Serialization   usdEquivalent     Fetch any          Response has no usdEquivalent
                           excluded          transaction        field

  TC-S03   Serialization   date formatted as Transaction with   Response date is string
                           YYYY-MM-DD        date=2025-04-02    \'2025-04-02\' not a Date
                                                                object or ISO timestamp

  TC-S04   Serialization   paidAt as ISO     Transaction with   Response paidAt is ISO string
                           string            paidAt set         e.g.
                                                                \'2025-04-02T10:30:00.000Z\'

  TC-S05   Serialization   paidAt null       Transaction with   Response paidAt is null not
                           preserved         paidAt=null        undefined or omitted

  TC-S06   Serialization   amount as number  Transaction amount Response amount is JS number
                                             stored as NUMERIC  515.00 not string \'515.00\'
                                             in PG              

  TC-S07   Serialization   Null fields       Transaction with   Nulls present in response \--
                           preserved         several null       not stripped by serializer
                                             description fields 

  TC-S08   Serialization   stripeInvoiceId   GET /v1/invoices   No stripeInvoiceId in any list
                           excluded from     response           item
                           invoice list                         

  TC-S09   DTO Validation  Extra fields      POST /export with  400 VALIDATION_ERROR \--
                           stripped          unknown field      forbidNonWhitelisted=true
                                             \'hack=true\'      active

  TC-S10   DTO Validation  Empty body        GET                200 \-- all filter fields are
                           accepted on       /v1/transactions   optional
                           filter endpoints  with no params     

  TC-S11   DTO Validation  Default           GET                meta.page=1, meta.limit=10 in
                           pagination        /v1/transactions   response
                           applied           with no page/limit 
  --------------------------------------------------------------------------------------------

# **7. Caching Behaviour Tests**

  -------------------------------------------------------------------------------------
  **Test    **Category**   **Test           **Input / Setup**  **Expected Result**
  ID**                     Description**                       
  --------- -------------- ---------------- ------------------ ------------------------
  TC-CA01   Cache          Cache miss on    Cold cache, GET    txn_cache_misses_total
                           first request    /v1/transactions   incremented, DB queried

  TC-CA02   Cache          Cache hit on     Same user, same    txn_cache_hits_total
                           identical second params, warm cache incremented, no DB query
                           request                             

  TC-CA03   Cache          Different filter Same user,         Cache miss \-- separate
                           = different      different ?type=   key per filter hash
                           cache key        param              

  TC-CA04   Cache          Cache            Consumer writes    Cache miss \-- stale
                           invalidated      transaction, then  entries removed, fresh
                           after consumer   list requested     DB data returned
                           write                               

  TC-CA05   Cache          Cache miss on    Redis unavailable  DB queried, 200
                           Redis failure                       returned, warn log
                                                               emitted \-- no 500 error

  TC-CA06   Cache          Cache write      Redis write throws 200 returned, data
                           failure                             served from DB, warn log
                           non-fatal                           emitted

  TC-CA07   Cache          TTL respected    Set cache entry,   Entry expired, next
                                            advance time by 5+ request is a cache miss
                                            minutes (mock)     

  TC-CA08   Cache          User isolation   User A and user B  Separate cache keys \--
                           in cache         make identical     user A cache cannot
                                            filter requests    serve user B
  -------------------------------------------------------------------------------------

# **8. Scheduled Job Tests**

  -------------------------------------------------------------------------------------------------------------------------
  **Test   **Category**   **Test           **Input / Setup**        **Expected Result**
  ID**                    Description**                             
  -------- -------------- ---------------- ------------------------ -------------------------------------------------------
  TC-J01   Cron           Overdue          Invoice with due_date    After cron runs: status=overdue, updatedAt updated, log
                          escalation \--   yesterday,               shows invoicesUpdated count
                          happy path       status=payment_pending   

  TC-J02   Cron           Paid invoice not Invoice with due_date    Status remains paid after cron
                          touched          yesterday, status=paid   

  TC-J03   Cron           Cancelled        Invoice with due_date    Status remains cancelled
                          invoice not      yesterday,               
                          touched          status=cancelled         

  TC-J04   Cron           Future invoice   Invoice with due_date    Status unchanged
                          not touched      tomorrow,                
                                           status=payment_pending   

  TC-J05   Cron           Read-time        Past-due invoice, cron   GET /v1/invoices returns status=overdue via CASE
                          override before  not yet run              expression even before DB update
                          cron                                      

  TC-J06   Cron           DLQ poller \--   All DLQs have 0 messages txn_dlq_depth gauge set to 0 for all queue labels
                          empty queue                               

  TC-J07   Cron           DLQ poller \--   One DLQ has 3 messages   txn_dlq_depth{queue=\'txn-svc.billing.events.dlq\'}=3
                          non-empty                                 

  TC-J08   Cron           DLQ poller       RabbitMQ management API  Warn log, gauge retains previous value, no service
                          failure          unreachable              crash
                          non-fatal                                 
  -------------------------------------------------------------------------------------------------------------------------

# **9. Seed Scripts**

Seed scripts populate the test database with a representative set of
records covering all transaction types, all status states, and a variety
of filter combinations. Run order matters \-- contracts must exist
before transactions.

**/apps/transaction-service/src/seeds/**

  ------------------------------------------------------------------------------
  **File**                     **Runs    **Creates**
                               Order**   
  ---------------------------- --------- ---------------------------------------
  01-contracts.seed.ts         1st       4 contracts (one per contractType:
                                         project, service, team, individual)

  02-payment-methods.seed.ts   2nd       5 payment methods (one per type:
                                         bank_ach, credit_card, klarna,
                                         google_pay, apple_pay)

  03-transactions.seed.ts      3rd       One transaction per transactionType (19
                                         types) \-- see detail below

  04-statuses.seed.ts          4th       One additional transaction per
                                         TransactionStatus (13 statuses) \--
                                         covers all states

  05-invoices.seed.ts          5th       7 invoices covering all InvoiceStatus
                                         values + 1 past-due for overdue test

  06-refunds.seed.ts           6th       2 refund records linked to transactions
                                         from seed 03 (1 full, 1 partial)

  07-wire.seed.ts              7th       1 wire transfer + 1 wire fee record
                                         with parentTransactionId set

  run.ts                       \--       Orchestrator \-- runs all seeds in
                                         order, clears tables first
  ------------------------------------------------------------------------------

## **9.1 Transaction Type Seed (all 19 types)**

+-----------------------------------------------------------------------+
| **src/seeds/03-transactions.seed.ts**                                 |
+-----------------------------------------------------------------------+
| // src/seeds/03-transactions.seed.ts                                  |
|                                                                       |
| import { DataSource } from \'typeorm\';                               |
|                                                                       |
| import { Transaction } from \'../entities/transaction.entity\';       |
|                                                                       |
| import { TransactionType, TransactionStatus, AmountDirection,         |
|                                                                       |
| PaymentMethodType, ContractType } from \'../entities/enums\';         |
|                                                                       |
| const SEED_USER_ID = \'00000000-0000-0000-0000-000000000001\';        |
|                                                                       |
| const SEED_CONTRACT_ID = \'00000000-0000-0000-0000-000000000010\'; // |
| project contract                                                      |
|                                                                       |
| const transactionTypes: Array\<{                                      |
|                                                                       |
| type: TransactionType;                                                |
|                                                                       |
| direction: AmountDirection;                                           |
|                                                                       |
| contractType: ContractType;                                           |
|                                                                       |
| extras?: Partial\<Transaction\>;                                      |
|                                                                       |
| }\> = \[                                                              |
|                                                                       |
| { type: TransactionType.DAILY_INSTALLMENT, direction:                 |
| AmountDirection.DEBIT, contractType: ContractType.PROJECT },          |
|                                                                       |
| { type: TransactionType.WEEKLY_INSTALLMENT, direction:                |
| AmountDirection.DEBIT, contractType: ContractType.PROJECT },          |
|                                                                       |
| { type: TransactionType.MONTHLY_INSTALLMENT, direction:               |
| AmountDirection.DEBIT, contractType: ContractType.PROJECT },          |
|                                                                       |
| { type: TransactionType.QUARTERLY_INSTALLMENT, direction:             |
| AmountDirection.DEBIT, contractType: ContractType.PROJECT },          |
|                                                                       |
| { type: TransactionType.ANNUAL_INSTALLMENT, direction:                |
| AmountDirection.DEBIT, contractType: ContractType.PROJECT },          |
|                                                                       |
| { type: TransactionType.HOURLY_PAYMENT, direction:                    |
| AmountDirection.DEBIT, contractType: ContractType.INDIVIDUAL,         |
|                                                                       |
| extras: { descriptionHours: 8, descriptionContractorHandle:           |
| \'@dev_seed_001\' } },                                                |
|                                                                       |
| { type: TransactionType.FINAL_PAYMENT, direction:                     |
| AmountDirection.DEBIT, contractType: ContractType.PROJECT },          |
|                                                                       |
| { type: TransactionType.PAID_IN_FULL, direction:                      |
| AmountDirection.DEBIT, contractType: ContractType.PROJECT },          |
|                                                                       |
| { type: TransactionType.REFUND_ISSUED, direction:                     |
| AmountDirection.CREDIT, contractType: ContractType.PROJECT },         |
|                                                                       |
| { type: TransactionType.CREDIT_APPLIED, direction:                    |
| AmountDirection.CREDIT, contractType: ContractType.PROJECT },         |
|                                                                       |
| { type: TransactionType.DEPOSIT, direction: AmountDirection.DEBIT,    |
| contractType: ContractType.PROJECT },                                 |
|                                                                       |
| { type: TransactionType.WIRE_TRANSFER_FEE, direction:                 |
| AmountDirection.DEBIT, contractType: ContractType.PROJECT },          |
|                                                                       |
| { type: TransactionType.PURCHASE, direction: AmountDirection.DEBIT,   |
| contractType: ContractType.SERVICE },                                 |
|                                                                       |
| { type: TransactionType.BASIC_MEMBERSHIP, direction:                  |
| AmountDirection.DEBIT, contractType: ContractType.SERVICE },          |
|                                                                       |
| { type: TransactionType.PRO_MEMBERSHIP, direction:                    |
| AmountDirection.DEBIT, contractType: ContractType.SERVICE },          |
|                                                                       |
| { type: TransactionType.ENTERPRISE_MEMBERSHIP, direction:             |
| AmountDirection.DEBIT, contractType: ContractType.SERVICE },          |
|                                                                       |
| { type: TransactionType.LEDGER_CORRECTION, direction:                 |
| AmountDirection.CREDIT, contractType: ContractType.PROJECT },         |
|                                                                       |
| { type: TransactionType.CASE, direction: AmountDirection.DEBIT,       |
| contractType: ContractType.PROJECT },                                 |
|                                                                       |
| { type: TransactionType.PROJECT_PAYMENT, direction:                   |
| AmountDirection.DEBIT, contractType: ContractType.PROJECT },          |
|                                                                       |
| \];                                                                   |
|                                                                       |
| export async function seedTransactionTypes(ds: DataSource):           |
| Promise\<void\> {                                                     |
|                                                                       |
| const repo = ds.getRepository(Transaction);                           |
|                                                                       |
| for (const \[i, entry\] of transactionTypes.entries()) {              |
|                                                                       |
| await repo.save(repo.create({                                         |
|                                                                       |
| transactionId: \'SEED-TYPE-\' + String(i + 1).padStart(4, \'0\'),     |
|                                                                       |
| date: new Date(\'2025-04-\' + String((i % 28) + 1).padStart(2,        |
| \'0\')),                                                              |
|                                                                       |
| descriptionType: entry.type,                                          |
|                                                                       |
| descriptionProjectName: entry.contractType !==                        |
| ContractType.INDIVIDUAL ? \'Seed Project \' + (i+1) : null,           |
|                                                                       |
| descriptionContractorHandle:                                          |
| entry.extras?.descriptionContractorHandle ?? null,                    |
|                                                                       |
| descriptionHours: entry.extras?.descriptionHours ?? null,             |
|                                                                       |
| amount: 100 + (i \* 25),                                              |
|                                                                       |
| amountDirection: entry.direction,                                     |
|                                                                       |
| status: TransactionStatus.PAID,                                       |
|                                                                       |
| paymentMethodType: PaymentMethodType.BANK_ACH,                        |
|                                                                       |
| paymentMethodLabel: \'Chase Bank\',                                   |
|                                                                       |
| paymentMethodIdentifier: \'4553\',                                    |
|                                                                       |
| contractType: entry.contractType,                                     |
|                                                                       |
| contractId: SEED_CONTRACT_ID,                                         |
|                                                                       |
| userId: SEED_USER_ID,                                                 |
|                                                                       |
| usdEquivalent: 100 + (i \* 25),                                       |
|                                                                       |
| paidAt: new Date(),                                                   |
|                                                                       |
| \...entry.extras,                                                     |
|                                                                       |
| }));                                                                  |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
+=======================================================================+

## **9.2 Status Coverage Seed (all 13 statuses)**

+-----------------------------------------------------------------------+
| **src/seeds/04-statuses.seed.ts**                                     |
+-----------------------------------------------------------------------+
| // src/seeds/04-statuses.seed.ts                                      |
|                                                                       |
| import { TransactionStatus } from \'../entities/enums\';              |
|                                                                       |
| const allStatuses = \[                                                |
|                                                                       |
| TransactionStatus.PAID,                                               |
|                                                                       |
| TransactionStatus.PROCESSING,                                         |
|                                                                       |
| TransactionStatus.SCHEDULED,                                          |
|                                                                       |
| TransactionStatus.PAYMENT_PENDING,                                    |
|                                                                       |
| TransactionStatus.FAILED,                                             |
|                                                                       |
| TransactionStatus.OVERDUE,                                            |
|                                                                       |
| TransactionStatus.SUCCEEDED,                                          |
|                                                                       |
| TransactionStatus.CREDITED,                                           |
|                                                                       |
| TransactionStatus.REFUNDED,                                           |
|                                                                       |
| TransactionStatus.PENDING,                                            |
|                                                                       |
| TransactionStatus.PARTIALLY_REFUNDED,                                 |
|                                                                       |
| TransactionStatus.CANCELLED,                                          |
|                                                                       |
| TransactionStatus.IN_DISPUTE,                                         |
|                                                                       |
| \];                                                                   |
|                                                                       |
| export async function seedAllStatuses(ds: DataSource):                |
| Promise\<void\> {                                                     |
|                                                                       |
| const repo = ds.getRepository(Transaction);                           |
|                                                                       |
| for (const \[i, status\] of allStatuses.entries()) {                  |
|                                                                       |
| await repo.save(repo.create({                                         |
|                                                                       |
| transactionId: \'SEED-STATUS-\' + String(i + 1).padStart(4, \'0\'),   |
|                                                                       |
| date: new Date(\'2025-05-01\'),                                       |
|                                                                       |
| descriptionType: TransactionType.PROJECT_PAYMENT,                     |
|                                                                       |
| descriptionProjectName: \'Status Seed Project\',                      |
|                                                                       |
| amount: 250.00,                                                       |
|                                                                       |
| amountDirection: AmountDirection.DEBIT,                               |
|                                                                       |
| status,                                                               |
|                                                                       |
| paymentMethodType: PaymentMethodType.CREDIT_CARD,                     |
|                                                                       |
| paymentMethodLabel: \'Visa\',                                         |
|                                                                       |
| paymentMethodIdentifier: \'4242\',                                    |
|                                                                       |
| contractType: ContractType.PROJECT,                                   |
|                                                                       |
| contractId: SEED_CONTRACT_ID,                                         |
|                                                                       |
| userId: SEED_USER_ID,                                                 |
|                                                                       |
| usdEquivalent: 250.00,                                                |
|                                                                       |
| }));                                                                  |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
+=======================================================================+

## **9.3 Seed Runner**

+-----------------------------------------------------------------------+
| **src/seeds/run.ts**                                                  |
+-----------------------------------------------------------------------+
| // src/seeds/run.ts                                                   |
|                                                                       |
| import \'dotenv/config\';                                             |
|                                                                       |
| import { DataSource } from \'typeorm\';                               |
|                                                                       |
| import { seedContracts } from \'./01-contracts.seed\';                |
|                                                                       |
| import { seedPaymentMethods } from \'./02-payment-methods.seed\';     |
|                                                                       |
| import { seedTransactionTypes } from \'./03-transactions.seed\';      |
|                                                                       |
| import { seedAllStatuses } from \'./04-statuses.seed\';               |
|                                                                       |
| import { seedInvoices } from \'./05-invoices.seed\';                  |
|                                                                       |
| import { seedRefunds } from \'./06-refunds.seed\';                    |
|                                                                       |
| import { seedWireTransfers } from \'./07-wire.seed\';                 |
|                                                                       |
| async function run() {                                                |
|                                                                       |
| const ds = new DataSource({                                           |
|                                                                       |
| type: \'postgres\',                                                   |
|                                                                       |
| url: process.env.DATABASE_URL,                                        |
|                                                                       |
| schema: \'transaction_service_test\',                                 |
|                                                                       |
| entities: \[\'src/entities/\*.entity.ts\'\],                          |
|                                                                       |
| synchronize: false,                                                   |
|                                                                       |
| });                                                                   |
|                                                                       |
| await ds.initialize();                                                |
|                                                                       |
| console.log(\'Clearing test schema\...\');                            |
|                                                                       |
| await ds.query(\'TRUNCATE TABLE                                       |
| transaction_service_test.transaction_detail CASCADE\');               |
|                                                                       |
| await ds.query(\'TRUNCATE TABLE transaction_service_test.transactions |
| CASCADE\');                                                           |
|                                                                       |
| await ds.query(\'TRUNCATE TABLE transaction_service_test.invoices     |
| CASCADE\');                                                           |
|                                                                       |
| await ds.query(\'TRUNCATE TABLE transaction_service_test.contracts    |
| CASCADE\');                                                           |
|                                                                       |
| await ds.query(\'TRUNCATE TABLE                                       |
| transaction_service_test.payment_methods CASCADE\');                  |
|                                                                       |
| console.log(\'Seeding\...\');                                         |
|                                                                       |
| await seedContracts(ds);                                              |
|                                                                       |
| await seedPaymentMethods(ds);                                         |
|                                                                       |
| await seedTransactionTypes(ds);                                       |
|                                                                       |
| await seedAllStatuses(ds);                                            |
|                                                                       |
| await seedInvoices(ds);                                               |
|                                                                       |
| await seedRefunds(ds);                                                |
|                                                                       |
| await seedWireTransfers(ds);                                          |
|                                                                       |
| console.log(\'Done.\');                                               |
|                                                                       |
| await ds.destroy();                                                   |
|                                                                       |
| }                                                                     |
|                                                                       |
| run().catch(err =\> { console.error(err); process.exit(1); });        |
|                                                                       |
| // Run: npx ts-node src/seeds/run.ts                                  |
+=======================================================================+

# **10. Filter Combination Fixtures**

These fixtures define the filter parameter combinations used in
integration tests and the Postman collection. Each fixture has a name,
the query parameters, and the expected result shape given the seed data
above.

  ------------------------------------------------------------------------------------------------------
  **Fixture Name**       **Query Parameters**                            **Expected Behaviour**
  ---------------------- ----------------------------------------------- -------------------------------
  no-filters             (none)                                          Returns all seed transactions
                                                                         for the user, page 1 of N,
                                                                         sorted date DESC

  type-monthly           ?type=monthly_installment                       Returns only SEED-TYPE-0003
                                                                         (monthly_installment type)

  type-refund            ?type=refund_issued                             Returns refund seed
                                                                         transactions, all have
                                                                         amountDirection=CREDIT

  status-paid            ?status=paid                                    Invoices: only invoices with
                                                                         status=paid

  status-overdue         ?status=overdue                                 Returns past-due invoices
                                                                         escalated by cron or read-time
                                                                         override

  date-q1-2025           ?dateFrom=2025-01-01&dateTo=2025-03-31          Only transactions with date in
                                                                         Q1 2025

  payment-credit-card    ?paymentMethodType=credit_card                  Only SEED-STATUS-\* records
                                                                         seeded with credit_card

  search-seed-project    ?search=Seed+Project                            All transactions with \'Seed
                                                                         Project\' in
                                                                         descriptionProjectName

  search-amount          ?search=250                                     All status-seed transactions
                                                                         (amount=250)

  pagination-page2       ?page=2&limit=5                                 Records 6-10 from full result
                                                                         set

  max-limit              ?limit=100                                      Up to 100 records returned

  combined-type-date     ?type=monthly_installment&dateFrom=2025-04-01   Intersection of type and date
                                                                         filters \-- AND logic verified

  combined-search-type   ?type=project_payment&search=Seed               Intersection of type and search
                                                                         term

  zero-results           ?dateFrom=2099-01-01&dateTo=2099-12-31          data=\[\], meta.total=0 \-- no
                                                                         crash on empty result
  ------------------------------------------------------------------------------------------------------

# **11. REST Client Collection (.http files)**

REST Client files (.http) work in VS Code with the REST Client extension
and are committed to the repository. They cover all 7 endpoints with all
major filter combinations.

**/apps/transaction-service/http/transaction-service.http**

+-------------------------------------------------------------------------------------------------+
| **http/transaction-service.http**                                                               |
+-------------------------------------------------------------------------------------------------+
| \### ── Variables ────────────────────────────────────────────────────────────                  |
|                                                                                                 |
| \@baseUrl = http://localhost:3002/v1                                                            |
|                                                                                                 |
| \@token = Bearer                                                                                |
| eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIwMDAwMDAwMC0wMDAwLTAwMDAtMDAwMC0wMDAwMDAwMDAwMDEifQ.PLACEHOLDER |
|                                                                                                 |
| \@txnId = 00000000-0000-0000-0000-000000000100                                                  |
|                                                                                                 |
| \@invId = 00000000-0000-0000-0000-000000000200                                                  |
|                                                                                                 |
| \### ── Health ───────────────────────────────────────────────────────────────                  |
|                                                                                                 |
| \# \@name health                                                                                |
|                                                                                                 |
| GET {{baseUrl}}/../health                                                                       |
|                                                                                                 |
| \###                                                                                            |
|                                                                                                 |
| \# \@name ready                                                                                 |
|                                                                                                 |
| GET {{baseUrl}}/../ready                                                                        |
|                                                                                                 |
| \### ── GET /v1/transactions ──────────────────────────────────────────────────                 |
|                                                                                                 |
| \# \@name transactions-list                                                                     |
|                                                                                                 |
| GET {{baseUrl}}/transactions                                                                    |
|                                                                                                 |
| Authorization: {{token}}                                                                        |
|                                                                                                 |
| \###                                                                                            |
|                                                                                                 |
| \# \@name transactions-filter-type                                                              |
|                                                                                                 |
| GET {{baseUrl}}/transactions?type=monthly_installment&page=1&limit=10                           |
|                                                                                                 |
| Authorization: {{token}}                                                                        |
|                                                                                                 |
| \###                                                                                            |
|                                                                                                 |
| \# \@name transactions-filter-date-range                                                        |
|                                                                                                 |
| GET {{baseUrl}}/transactions?dateFrom=2025-01-01&dateTo=2025-06-30                              |
|                                                                                                 |
| Authorization: {{token}}                                                                        |
|                                                                                                 |
| \###                                                                                            |
|                                                                                                 |
| \# \@name transactions-search                                                                   |
|                                                                                                 |
| GET {{baseUrl}}/transactions?search=Seed+Project                                                |
|                                                                                                 |
| Authorization: {{token}}                                                                        |
|                                                                                                 |
| \###                                                                                            |
|                                                                                                 |
| \# \@name transactions-combined                                                                 |
|                                                                                                 |
| GET                                                                                             |
| {{baseUrl}}/transactions?type=project_payment&dateFrom=2025-01-01&paymentMethodType=bank_ach    |
|                                                                                                 |
| Authorization: {{token}}                                                                        |
|                                                                                                 |
| \### ── GET /v1/transactions/:id ──────────────────────────────────────────────                 |
|                                                                                                 |
| \# \@name transaction-detail                                                                    |
|                                                                                                 |
| GET {{baseUrl}}/transactions/{{txnId}}                                                          |
|                                                                                                 |
| Authorization: {{token}}                                                                        |
|                                                                                                 |
| \### ── GET /v1/transactions/:id/receipt ─────────────────────────────────────                  |
|                                                                                                 |
| \# \@name receipt-download                                                                      |
|                                                                                                 |
| GET {{baseUrl}}/transactions/{{txnId}}/receipt                                                  |
|                                                                                                 |
| Authorization: {{token}}                                                                        |
|                                                                                                 |
| \### ── GET /v1/invoices ──────────────────────────────────────────────────────                 |
|                                                                                                 |
| \# \@name invoices-list                                                                         |
|                                                                                                 |
| GET {{baseUrl}}/invoices                                                                        |
|                                                                                                 |
| Authorization: {{token}}                                                                        |
|                                                                                                 |
| \###                                                                                            |
|                                                                                                 |
| \# \@name invoices-filter-status                                                                |
|                                                                                                 |
| GET {{baseUrl}}/invoices?status=paid                                                            |
|                                                                                                 |
| Authorization: {{token}}                                                                        |
|                                                                                                 |
| \### ── GET /v1/invoices/:id ──────────────────────────────────────────────────                 |
|                                                                                                 |
| \# \@name invoice-detail                                                                        |
|                                                                                                 |
| GET {{baseUrl}}/invoices/{{invId}}                                                              |
|                                                                                                 |
| Authorization: {{token}}                                                                        |
|                                                                                                 |
| \### ── POST /v1/transactions/export ─────────────────────────────────────────                  |
|                                                                                                 |
| \# \@name export-csv-transactions                                                               |
|                                                                                                 |
| POST {{baseUrl}}/transactions/export                                                            |
|                                                                                                 |
| Authorization: {{token}}                                                                        |
|                                                                                                 |
| Content-Type: application/json                                                                  |
|                                                                                                 |
| {                                                                                               |
|                                                                                                 |
| \"format\": \"csv\",                                                                            |
|                                                                                                 |
| \"scope\": \"transactions\"                                                                     |
|                                                                                                 |
| }                                                                                               |
|                                                                                                 |
| \###                                                                                            |
|                                                                                                 |
| \# \@name export-pdf-invoices-filtered                                                          |
|                                                                                                 |
| POST {{baseUrl}}/transactions/export                                                            |
|                                                                                                 |
| Authorization: {{token}}                                                                        |
|                                                                                                 |
| Content-Type: application/json                                                                  |
|                                                                                                 |
| {                                                                                               |
|                                                                                                 |
| \"format\": \"pdf\",                                                                            |
|                                                                                                 |
| \"scope\": \"invoices\",                                                                        |
|                                                                                                 |
| \"dateFrom\": \"2025-01-01\",                                                                   |
|                                                                                                 |
| \"dateTo\": \"2025-12-31\"                                                                      |
|                                                                                                 |
| }                                                                                               |
|                                                                                                 |
| \### ── POST /v1/transactions/:id/report ──────────────────────────────────────                 |
|                                                                                                 |
| \# \@name report-problem                                                                        |
|                                                                                                 |
| POST {{baseUrl}}/transactions/{{txnId}}/report                                                  |
|                                                                                                 |
| Authorization: {{token}}                                                                        |
|                                                                                                 |
| Content-Type: application/json                                                                  |
|                                                                                                 |
| {                                                                                               |
|                                                                                                 |
| \"category\": \"incorrect_amount\",                                                             |
|                                                                                                 |
| \"description\": \"The amount charged was \$515 but my contract shows \$490.\"                  |
|                                                                                                 |
| }                                                                                               |
|                                                                                                 |
| \### ── Error cases ───────────────────────────────────────────────────────────                 |
|                                                                                                 |
| \# \@name error-no-token                                                                        |
|                                                                                                 |
| GET {{baseUrl}}/transactions                                                                    |
|                                                                                                 |
| \###                                                                                            |
|                                                                                                 |
| \# \@name error-bad-date                                                                        |
|                                                                                                 |
| GET {{baseUrl}}/transactions?dateFrom=2025-06-01&dateTo=2025-01-01                              |
|                                                                                                 |
| Authorization: {{token}}                                                                        |
|                                                                                                 |
| \###                                                                                            |
|                                                                                                 |
| \# \@name error-search-too-short                                                                |
|                                                                                                 |
| GET {{baseUrl}}/transactions?search=a                                                           |
|                                                                                                 |
| Authorization: {{token}}                                                                        |
|                                                                                                 |
| \###                                                                                            |
|                                                                                                 |
| \# \@name error-export-empty                                                                    |
|                                                                                                 |
| POST {{baseUrl}}/transactions/export                                                            |
|                                                                                                 |
| Authorization: {{token}}                                                                        |
|                                                                                                 |
| Content-Type: application/json                                                                  |
|                                                                                                 |
| {                                                                                               |
|                                                                                                 |
| \"format\": \"csv\",                                                                            |
|                                                                                                 |
| \"scope\": \"transactions\",                                                                    |
|                                                                                                 |
| \"dateFrom\": \"2099-01-01\"                                                                    |
|                                                                                                 |
| }                                                                                               |
+=================================================================================================+

# **12. Postman Collection**

The Postman collection JSON is committed at
/apps/transaction-service/http/transaction-service.postman_collection.json.
Key configuration:

  -------------------------------------------------------------------------
  **Variable**    **Value**               **Notes**
  --------------- ----------------------- ---------------------------------
  baseUrl         http://localhost:3002   Override with staging URL for CI
                                          smoke tests

  jwtToken        (set in Postman         Use the \'Generate Test JWT\'
                  environment)            pre-request script below

  testTxnId       UUID of a seeded paid   Set after running seed scripts
                  transaction             

  testInvId       UUID of a seeded paid   Set after running seed scripts
                  invoice                 
  -------------------------------------------------------------------------

### **Pre-request Script \-- Generate Test JWT**

+-----------------------------------------------------------------------+
| **Postman pre-request script**                                        |
+-----------------------------------------------------------------------+
| // Postman Pre-request Script \-- run on collection level             |
|                                                                       |
| // Generates a valid HS256 JWT using the test secret                  |
|                                                                       |
| const header = btoa(JSON.stringify({ alg: \'HS256\', typ: \'JWT\'     |
| })).replace(/=/g,\'\');                                               |
|                                                                       |
| const payload = btoa(JSON.stringify({                                 |
|                                                                       |
| sub: \'00000000-0000-0000-0000-000000000001\',                        |
|                                                                       |
| email: \'seed@marketeq.com\',                                         |
|                                                                       |
| iat: Math.floor(Date.now()/1000),                                     |
|                                                                       |
| exp: Math.floor(Date.now()/1000) + 3600                               |
|                                                                       |
| })).replace(/=/g,\'\');                                               |
|                                                                       |
| // NOTE: full HMAC signing requires CryptoJS in Postman sandbox       |
|                                                                       |
| // Use a pre-signed token from: npx ts-node                           |
| scripts/generate-test-jwt.ts                                          |
|                                                                       |
| pm.environment.set(\'jwtToken\',                                      |
| pm.environment.get(\'preSignedToken\'));                              |
+=======================================================================+

### **Test JWT Generator Script**

**/apps/transaction-service/scripts/generate-test-jwt.ts**

+-----------------------------------------------------------------------+
| **scripts/generate-test-jwt.ts**                                      |
+-----------------------------------------------------------------------+
| import \* as jwt from \'jsonwebtoken\';                               |
|                                                                       |
| import \'dotenv/config\';                                             |
|                                                                       |
| const token = jwt.sign(                                               |
|                                                                       |
| { sub: \'00000000-0000-0000-0000-000000000001\', email:               |
| \'seed@marketeq.com\' },                                              |
|                                                                       |
| process.env.JWT_SECRET \|\| \'test-secret-not-for-production\',       |
|                                                                       |
| { expiresIn: \'24h\' }                                                |
|                                                                       |
| );                                                                    |
|                                                                       |
| console.log(\'Bearer \' + token);                                     |
|                                                                       |
| // Run: npx ts-node scripts/generate-test-jwt.ts                      |
+=======================================================================+

# **13. Load Test Spec \-- Export Endpoint**

The export endpoint is the most resource-intensive in the service. This
k6 spec validates that synchronous exports complete within the SLO (10
seconds at p95 for \<= 1000 records) and that the service handles
concurrent export requests without degrading list endpoint performance.

**/apps/transaction-service/load-tests/export.k6.js**

+-----------------------------------------------------------------------+
| **load-tests/export.k6.js**                                           |
+-----------------------------------------------------------------------+
| import http from \'k6/http\';                                         |
|                                                                       |
| import { check, sleep } from \'k6\';                                  |
|                                                                       |
| import { Rate, Trend } from \'k6/metrics\';                           |
|                                                                       |
| // Custom metrics                                                     |
|                                                                       |
| const exportErrors = new Rate(\'export_errors\');                     |
|                                                                       |
| const exportDuration = new Trend(\'export_duration_ms\', true);       |
|                                                                       |
| const listDuration = new Trend(\'list_duration_ms\', true);           |
|                                                                       |
| export const options = {                                              |
|                                                                       |
| scenarios: {                                                          |
|                                                                       |
| // Scenario 1: Steady export load \-- 10 concurrent users, 2 min      |
|                                                                       |
| steady_export: {                                                      |
|                                                                       |
| executor: \'constant-vus\',                                           |
|                                                                       |
| vus: 10,                                                              |
|                                                                       |
| duration: \'2m\',                                                     |
|                                                                       |
| tags: { scenario: \'steady_export\' },                                |
|                                                                       |
| },                                                                    |
|                                                                       |
| // Scenario 2: Spike \-- sudden burst of 50 concurrent export         |
| requests                                                              |
|                                                                       |
| spike_export: {                                                       |
|                                                                       |
| executor: \'ramping-vus\',                                            |
|                                                                       |
| startVUs: 0,                                                          |
|                                                                       |
| stages: \[                                                            |
|                                                                       |
| { duration: \'30s\', target: 50 },                                    |
|                                                                       |
| { duration: \'1m\', target: 50 },                                     |
|                                                                       |
| { duration: \'30s\', target: 0 },                                     |
|                                                                       |
| \],                                                                   |
|                                                                       |
| startTime: \'2m10s\',                                                 |
|                                                                       |
| tags: { scenario: \'spike_export\' },                                 |
|                                                                       |
| },                                                                    |
|                                                                       |
| // Scenario 3: Concurrent export + list \-- verify list is not        |
| starved                                                               |
|                                                                       |
| mixed_load: {                                                         |
|                                                                       |
| executor: \'constant-vus\',                                           |
|                                                                       |
| vus: 20,                                                              |
|                                                                       |
| duration: \'2m\',                                                     |
|                                                                       |
| startTime: \'5m\',                                                    |
|                                                                       |
| tags: { scenario: \'mixed_load\' },                                   |
|                                                                       |
| },                                                                    |
|                                                                       |
| },                                                                    |
|                                                                       |
| // SLO thresholds \-- test FAILS if these are breached                |
|                                                                       |
| thresholds: {                                                         |
|                                                                       |
| // Export SLO: 95% of exports complete within 10s                     |
|                                                                       |
| \'export_duration_ms{scenario:steady_export}\': \[\'p(95) \<          |
| 10000\'\],                                                            |
|                                                                       |
| // Spike tolerance: 99% of exports complete within 30s during spike   |
|                                                                       |
| \'export_duration_ms{scenario:spike_export}\': \[\'p(99) \<           |
| 30000\'\],                                                            |
|                                                                       |
| // List endpoint must not be degraded by concurrent exports           |
|                                                                       |
| \'list_duration_ms{scenario:mixed_load}\': \[\'p(99) \< 3000\'\],     |
|                                                                       |
| // Error rate must stay below 1%                                      |
|                                                                       |
| \'export_errors\': \[\'rate \< 0.01\'\],                              |
|                                                                       |
| // Overall HTTP error rate                                            |
|                                                                       |
| \'http_req_failed\': \[\'rate \< 0.01\'\],                            |
|                                                                       |
| },                                                                    |
|                                                                       |
| };                                                                    |
|                                                                       |
| const BASE_URL = \_\_ENV.BASE_URL \|\| \'http://localhost:3002\';     |
|                                                                       |
| const JWT = \_\_ENV.JWT_TOKEN;                                        |
|                                                                       |
| const headers = {                                                     |
|                                                                       |
| \'Authorization\': \'Bearer \' + JWT,                                 |
|                                                                       |
| \'Content-Type\': \'application/json\',                               |
|                                                                       |
| };                                                                    |
|                                                                       |
| // Small export body (\< 1000 records \-- synchronous path)           |
|                                                                       |
| const exportPayload = JSON.stringify({                                |
|                                                                       |
| format: \'csv\',                                                      |
|                                                                       |
| scope: \'transactions\',                                              |
|                                                                       |
| dateFrom: \'2025-01-01\',                                             |
|                                                                       |
| dateTo: \'2025-12-31\',                                               |
|                                                                       |
| });                                                                   |
|                                                                       |
| export default function () {                                          |
|                                                                       |
| const scenario = \_\_ENV.K6_SCENARIO \|\| \'steady_export\';          |
|                                                                       |
| if (scenario === \'mixed_load\' && (\_\_VU % 2 === 0)) {              |
|                                                                       |
| // Half of mixed_load VUs hit the list endpoint                       |
|                                                                       |
| const start = Date.now();                                             |
|                                                                       |
| const res = http.get(BASE_URL + \'/v1/transactions\', { headers });   |
|                                                                       |
| listDuration.add(Date.now() - start);                                 |
|                                                                       |
| check(res, { \'list 200\': r =\> r.status === 200 });                 |
|                                                                       |
| } else {                                                              |
|                                                                       |
| // Export request                                                     |
|                                                                       |
| const start = Date.now();                                             |
|                                                                       |
| const res = http.post(BASE_URL + \'/v1/transactions/export\',         |
| exportPayload, { headers });                                          |
|                                                                       |
| const elapsed = Date.now() - start;                                   |
|                                                                       |
| exportDuration.add(elapsed);                                          |
|                                                                       |
| const ok = check(res, {                                               |
|                                                                       |
| \'export 202\': r =\> r.status === 202,                               |
|                                                                       |
| \'has filename or queued\': r =\> {                                   |
|                                                                       |
| const body = JSON.parse(r.body);                                      |
|                                                                       |
| return body.filename !== undefined \|\| body.queued === true;         |
|                                                                       |
| },                                                                    |
|                                                                       |
| });                                                                   |
|                                                                       |
| exportErrors.add(!ok);                                                |
|                                                                       |
| }                                                                     |
|                                                                       |
| sleep(0.5);                                                           |
|                                                                       |
| }                                                                     |
|                                                                       |
| // Run: k6 run \--env BASE_URL=http://localhost:3002 \--env           |
| JWT_TOKEN=\<token\> load-tests/export.k6.js                           |
|                                                                       |
| // CI: k6 run \--out json=results.json load-tests/export.k6.js        |
+=======================================================================+

## **13.1 Load Test Scenarios Summary**

  --------------------------------------------------------------------------------
  **Scenario**    **VUs**   **Duration**   **What It Tests**   **SLO Being
                                                               Verified**
  --------------- --------- -------------- ------------------- -------------------
  steady_export   10        2 min          Normal concurrent   p95 export \< 10s
                                           export load         

  spike_export    0-50      2 min ramp     Sudden burst of     p99 export \< 30s,
                                           concurrent exports  error rate \< 1%

  mixed_load      20        2 min          Export and list     List p99 \< 3s \--
                                           traffic             not starved by
                                           simultaneously      exports
  --------------------------------------------------------------------------------

+-----------------------------------------------------------------------+
| **Run Load Tests Against Staging Only**                               |
|                                                                       |
| Never run k6 load tests against production. The export endpoint       |
| generates full query results sets \-- 50 concurrent exports against   |
| production would spike DB CPU and consume Redis memory. Target the    |
| staging environment with seeded data only.                            |
+=======================================================================+

# **14. Summary & Coverage**

  ----------------------------------------------------------------------------
  **Area**               **Count**   **Coverage**
  ---------------------- ----------- -----------------------------------------
  Consumer test cases    27          All 11 consumed events, idempotency, DLQ
                                     routing

  HTTP endpoint test     71          All 7 endpoints, all filter combinations,
  cases                              all auth scenarios

  Serialization & DTO    11          All \@Exclude/@Expose rules, type
  tests                              transforms, extra field stripping

  Cache behaviour tests  8           Hit, miss, invalidation, Redis failure,
                                     TTL, user isolation

  Scheduled job tests    8           Overdue escalation, DLQ poller, failure
                                     non-fatality

  Error states covered   37          All error codes from error messages
                                     specification

  Transaction types      19          All TransactionType enum values
  seeded                             

  Transaction statuses   13          All TransactionStatus enum values
  seeded                             

  Invoice statuses       7           All InvoiceStatus enum values + past-due
  seeded                             fixture

  Filter combination     14          Single-filter and combined-filter cases
  fixtures                           

  REST Client requests   20          All endpoints + common error cases

  k6 load test scenarios 3           Steady, spike, and mixed traffic
  ----------------------------------------------------------------------------
