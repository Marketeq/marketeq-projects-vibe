PS-07

**QA & Test Data**

Service: pricing-service

Marketeq Backend --- marketeq-projects-nestjs

# **1. Purpose**

This document defines all test cases, seed data, and the Postman
collection structure for pricing-service. Test cases cover rate queries,
budget calculation, currency conversion, stale data fallback, missing
data handling, and the daily rate refresh scheduled job.

API endpoint contracts are in PS-04. The fallback matrix tested here is
defined in PS-04 Section 9 and PS-05 Sections 3 and 4.

> *Important: Run the seed script in Section 8 before executing any test
> cases. Flush the Redis cache before running stale and no_data test
> cases to ensure the cache does not serve a previously cached fresh
> result. Command: redis-cli -u \$REDIS_URL keys \"ps:\*\" \| xargs
> redis-cli -u \$REDIS_URL del*

# **2. Test Environment Setup**

  ---------------------------------------------------------------------------
  **Service**                **Default       **Required For**
                             Port**          
  -------------------------- --------------- --------------------------------
  pricing-service            3016            All test cases

  Redis                      6379            TC-RATE-\*, TC-FX-\*,
                                             TC-BUDGET-\* --- cache behaviour
                                             verification

  PostgreSQL (test DB)       5432            Seed data, TC-RATE-\*,
                                             TC-STALE-\*, TC-REFRESH-\*

  fawazahmed0/exchange-api   8080            TC-FX-\* --- primary FX API
                                             tests. Can be mocked for
                                             fallback tests.

  transaction-service (mock) 3011            TC-REFRESH-\* --- mock the
                                             /v1/transactions/rate-averages
                                             endpoint
  ---------------------------------------------------------------------------

# **3. Rate Query Test Cases (GET /v1/rates)**

  ------------------------------------------------------------------------------------------------------------------------------------------------------------
  **ID**       **Scenario**          **Input**                                                                        **Expected**                  **HTTP**
  ------------ --------------------- -------------------------------------------------------------------------------- ----------------------------- ----------
  TC-RATE-01   Fresh rate --- all    role=UX+Designer&location=United+States&experience=mid&schedule=full_time        200\.                         200
               four params                                                                                            hourlyMedianUsdCents:10000.   
                                                                                                                      hourlyLowUsdCents:7500.       
                                                                                                                      hourlyHighUsdCents:13500.     
                                                                                                                      is_stale:false.               
                                                                                                                      no_data:false.                

  TC-RATE-02   Cache hit on second   Same query as TC-RATE-01 immediately after                                       200\. cache_hit:true. Values  200
               request                                                                                                identical to first response.  

  TC-RATE-03   Rate without location role=UX+Designer (no location)                                                   200\. Returns global average  200
               filter                                                                                                 or nearest match.             
                                                                                                                      no_data:false.                

  TC-RATE-04   Rate without          role=UX+Designer&location=United+States (no experience)                          200\. Returns average across  200
               experience filter                                                                                      all experience levels.        

  TC-RATE-05   Rate without schedule role=UX+Designer&location=United+States&experience=mid                           200\. Returns rate for        200
               filter                                                                                                 default full_time equivalent. 

  TC-RATE-06   No data --- unknown   role=Quantum+Architect&location=Antarctica                                       200\. no_data:true. All rate  200
               combination                                                                                            fields null. is_stale:false.  

  TC-RATE-07   Stale rate returned   role=DevOps+Engineer&location=Southeast+Asia&experience=mid&schedule=full_time   200\. is_stale:true.          200
                                     (seed record has updatedAt 48h ago)                                              stale_since populated. Rate   
                                                                                                                      values present.               
                                                                                                                      no_data:false.                

  TC-RATE-08   Missing role          GET /v1/rates (no role query param)                                              422\. PS_VALIDATION_ERROR.    422
               parameter                                                                                              role is required.             

  TC-RATE-09   Invalid experience    role=UX+Designer&experience=expert                                               422\. PS_VALIDATION_ERROR.    422
               value                                                                                                  experience must be junior,    
                                                                                                                      mid, or senior.               

  TC-RATE-10   Invalid schedule      role=UX+Designer&schedule=occasional                                             422\. PS_VALIDATION_ERROR.    422
               value                                                                                                  schedule must be full_time,   
                                                                                                                      part_time, or custom.         

  TC-RATE-11   Unauthenticated       GET /v1/rates with no JWT                                                        401\. PS_UNAUTHORIZED.        401
               request                                                                                                                              

  TC-RATE-12   Cache key isolation   TC-RATE-01 then role=UX+Designer&location=Eastern+Europe&experience=mid          200 both. Second request has  200
               --- different                                                                                          different values or no_data.  
               combinations                                                                                           Confirms separate cache keys. 

  TC-RATE-13   sampleSize returned   TC-RATE-01 (seed record has sampleSize:142)                                      200\. sampleSize:142 in       200
               in response                                                                                            response.                     

  TC-RATE-14   updatedAt returned in TC-RATE-01                                                                       200\. updatedAt is a valid    200
               response                                                                                               ISO 8601 timestamp string.    
  ------------------------------------------------------------------------------------------------------------------------------------------------------------

# **4. Price Guide Test Cases (GET /v1/rates/price-guide)**

  ---------------------------------------------------------------------------------------------------------------------------------
  **ID**     **Scenario**          **Input**                                                     **Expected**            **HTTP**
  ---------- --------------------- ------------------------------------------------------------- ----------------------- ----------
  TC-PG-01   Price guide --- all   role=UX+Designer&location=United+States&experience=mid        200\. low:7500.         200
             three tiers present                                                                 median:10000.           
                                                                                                 high:13500.             
                                                                                                 no_data:false.          

  TC-PG-02   Price guide maps      TC-PG-01 vs TC-RATE-01 values                                 low =                   200
             correctly to rate                                                                   hourlyLowUsdCents.      
             endpoint                                                                            median =                
                                                                                                 hourlyMedianUsdCents.   
                                                                                                 high =                  
                                                                                                 hourlyHighUsdCents.     
                                                                                                 Values are identical.   

  TC-PG-03   Price guide no data   role=Quantum+Architect&location=Antarctica                    200\. low:null.         200
                                                                                                 median:null. high:null. 
                                                                                                 no_data:true.           

  TC-PG-04   Price guide stale     role=DevOps+Engineer&location=Southeast+Asia&experience=mid   200\. is_stale:true.    200
                                   (stale seed)                                                  Values present (not     
                                                                                                 null).                  

  TC-PG-05   Role and filters      role=Backend+Developer&location=Eastern+Europe                200\. role:\"Backend    200
             echoed in response                                                                  Developer\".            
                                                                                                 location:\"Eastern      
                                                                                                 Europe\".               
                                                                                                 experience:null.        
                                                                                                 schedule:null.          

  TC-PG-06   Missing role          GET /v1/rates/price-guide (no role)                           422\.                   422
             parameter                                                                           PS_VALIDATION_ERROR.    
  ---------------------------------------------------------------------------------------------------------------------------------

# **5. Budget Calculation Test Cases (POST /v1/budget/calculate)**

  ---------------------------------------------------------------------------------------------------------------------
  **ID**      **Scenario**          **Input**                     **Expected**                               **HTTP**
  ----------- --------------------- ----------------------------- ------------------------------------------ ----------
  TC-BUD-01   Single role ---       { roles: \[{ roleTitle:\"UX   200\.                                      200
              correct subtotal      Designer\", location:\"United breakdown\[0\].subtotalUsdCents:1600000.   
                                    States\", experience:\"mid\", totalUsdCents:1600000.                     
                                    workSchedule:\"full_time\",   has_missing_data:false.                    
                                    estimatedHours:160 }\] }                                                 

  TC-BUD-02   Math.round applied to { roles: \[{ roleTitle:\"UX   200\. subtotalUsdCents:70000. No rounding  200
              subtotal              Designer\", \...,             error.                                     
                                    estimatedHours:7 }\] } (7h \*                                            
                                    10000 = 70000 exactly)                                                   

  TC-BUD-03   Multiple roles ---    { roles: \[UX Designer 160h,  200\. totalUsdCents = 1600000 + 2240000 =  200
              total sums breakdown  Backend Developer 320h\] }    3840000. breakdown has 2 entries.          

  TC-BUD-04   Partial result ---    { roles: \[UX Designer 160h,  200\. has_missing_data:true. Quantum       200
              one role has no data  Quantum Architect 80h\] }     Architect: subtotalUsdCents:null.          
                                                                  totalUsdCents = UX Designer subtotal only. 

  TC-BUD-05   Partial result ---    { roles: \[UX Designer 160h,  200\. has_stale_data:true. Both subtotals  200
              stale role included   DevOps Engineer (stale) 80h\] present. Total includes both.              
                                    }                                                                        

  TC-BUD-06   All roles have no     { roles: \[Quantum Architect  200\. totalUsdCents:0.                     200
              data                  80h, Time Traveller 40h\] }   has_missing_data:true. Both breakdown      
                                                                  entries have no_data:true.                 

  TC-BUD-07   Empty roles array     { roles: \[\] }               422\. PS_VALIDATION_ERROR. roles must not  422
                                                                  be empty.                                  

  TC-BUD-08   estimatedHours below  { roles: \[{ \...,            422\. PS_VALIDATION_ERROR. estimatedHours  422
              minimum               estimatedHours:0 }\] }        Min(1).                                    

  TC-BUD-09   roleTitle exceeds 100 { roles: \[{ roleTitle:       422\. PS_VALIDATION_ERROR. roleTitle       422
              chars                 string(101 chars), \... }\] } MaxLength(100).                            

  TC-BUD-10   Unauthenticated       POST /v1/budget/calculate     401\. PS_UNAUTHORIZED.                     401
              request               with no JWT                                                              

  TC-BUD-11   Budget uses median    TC-BUD-01 --- confirm which   subtotalUsdCents = hourlyMedianUsdCents \* 200
              rate not low or high  rate tier is used             estimatedHours. Never low or high.         

  TC-BUD-12   Breakdown echoes      TC-BUD-01                     breakdown\[0\].roleTitle:\"UX Designer\".  200
              input fields                                        breakdown\[0\].estimatedHours:160.         
  ---------------------------------------------------------------------------------------------------------------------

# **6. Currency Conversion Test Cases**

## **6.1 GET /v1/currency/convert**

  ---------------------------------------------------------------------------------------------------------
  **ID**     **Scenario**          **Input**                              **Expected**           **HTTP**
  ---------- --------------------- -------------------------------------- ---------------------- ----------
  TC-FX-01   USD to EUR conversion amount=1000&from=USD&to=EUR            200\. converted is     200
                                                                          amount \* cached rate. 
                                                                          is_stale:false.        
                                                                          from:USD. to:EUR.      

  TC-FX-02   Same currency ---     amount=500&from=USD&to=USD             200\. converted:500.   200
             rate is 1                                                    rate:1.                
                                                                          is_stale:false.        

  TC-FX-03   Currency codes        amount=100&from=usd&to=eur             200\. Same result as   200
             case-insensitive                                             uppercase. from and to 
                                                                          returned in uppercase. 

  TC-FX-04   Zero amount           amount=0&from=USD&to=GBP               200\. converted:0.     200
                                                                          rate is the current    
                                                                          GBP rate. No error.    

  TC-FX-05   Rounding to 2 decimal amount=333&from=USD&to=EUR             200\. converted:306.86 200
             places                (rate:0.9215 → 333\*0.9215 = 306.8595) (rounded to 2dp). Not  
                                                                          306.8595.              

  TC-FX-06   Cache hit on second   TC-FX-01 twice in quick succession     200 both times. Rate   200
             request                                                      values identical.      
                                                                          Confirms Redis cache   
                                                                          is being used.         

  TC-FX-07   Missing amount        GET                                    422\.                  422
             parameter             /v1/currency/convert?from=USD&to=EUR   PS_VALIDATION_ERROR.   
                                                                          amount is required.    

  TC-FX-08   Currency code not 3   from=USDT&to=EUR                       422\.                  422
             chars                                                        PS_VALIDATION_ERROR.   
                                                                          from Length(3, 3).     

  TC-FX-09   Negative amount       amount=-100&from=USD&to=EUR            422\.                  422
                                                                          PS_VALIDATION_ERROR.   
                                                                          amount Min(0).         

  TC-FX-10   Unauthenticated       No JWT                                 401\. PS_UNAUTHORIZED. 401
  ---------------------------------------------------------------------------------------------------------

## **6.2 GET /v1/currency/rates**

  --------------------------------------------------------------------------------------
  **ID**        **Scenario**          **Input**            **Expected**       **HTTP**
  ------------- --------------------- -------------------- ------------------ ----------
  TC-RATES-01   Returns all cached    GET                  200\.              200
                rates                 /v1/currency/rates   base:\"USD\".      
                                                           rates object       
                                                           contains at least  
                                                           EUR, GBP, CAD.     
                                                           fetched_at is an   
                                                           ISO timestamp.     

  TC-RATES-02   Cache hit on second   TC-RATES-01 twice    200 both.          200
                call                                       cache_hit:true on  
                                                           second call.       

  TC-RATES-03   Unauthenticated       No JWT               401\.              401
                                                           PS_UNAUTHORIZED.   
  --------------------------------------------------------------------------------------

# **7. Fallback and Stale Data Test Cases**

## **7.1 Rate Data Stale Behaviour**

  --------------------------------------------------------------------------------------------------
  **ID**        **Scenario**          **Input**              **Expected**                 **HTTP**
  ------------- --------------------- ---------------------- ---------------------------- ----------
  TC-STALE-01   Stale rate flag set   GET /v1/rates for      200\. is_stale:true.         200
                correctly             DevOps Engineer seed   stale_since matches          
                                      (updatedAt 48h ago).   updatedAt of DB record.      
                                      Flush Redis first.                                  

  TC-STALE-02   Stale rate still      TC-STALE-01            200\.                        200
                returns values                               hourlyMedianUsdCents:4500.   
                                                             Values are not null. Only    
                                                             flag is set.                 

  TC-STALE-03   Fresh rate has no     GET /v1/rates for UX   200\. is_stale:false.        200
                stale flag            Designer seed          stale_since absent from      
                                      (updatedAt now)        response.                    

  TC-STALE-04   Budget reflects stale POST                   200\. has_stale_data:true.   200
                flag                  /v1/budget/calculate   breakdown shows              
                                      with DevOps Engineer   is_stale:true for that role. 
                                      role                                                

  TC-STALE-05   Threshold boundary    Seed a record with     200\. is_stale:true. The     200
                --- exactly at        updatedAt = exactly 24 threshold is inclusive       
                threshold             hours ago. Flush       (\>=).                       
                                      Redis.                                              

  TC-STALE-06   Threshold boundary    Seed a record with     200\. is_stale:false. One    200
                --- one second before updatedAt = 23h 59m    second before threshold is   
                threshold             59s ago. Flush Redis.  still fresh.                 
  --------------------------------------------------------------------------------------------------

## **7.2 FX API Fallback**

  --------------------------------------------------------------------------------------------------------------------
  **ID**     **Scenario**          **Input**                                         **Expected**           **HTTP**
  ---------- --------------------- ------------------------------------------------- ---------------------- ----------
  TC-FB-01   Primary FX            Set FX_API_URL to invalid URL. Flush Redis fx     200\. Converted amount 200
             unavailable ---       keys. GET                                         returned.              
             fallback used         /v1/currency/convert?amount=100&from=USD&to=EUR   is_stale:false.        
                                                                                     Confirms fallback      
                                                                                     (Frankfurter.app) was  
                                                                                     used.                  

  TC-FB-02   Both FX APIs          Set FX_API_URL and FX_API_FALLBACK_URL to invalid 200\. is_stale:true.   200
             unavailable --- stale URLs. Ensure stale key exists in Redis            Rate from stale Redis  
             key served            (ps:fx:USD:EUR:stale). Flush TTL key. GET         key.                   
                                   /v1/currency/convert.                                                    

  TC-FB-03   Both APIs unavailable Set both API URLs invalid. Flush all ps:fx:\*     503\.                  503
             and no stale key      keys including stale. GET /v1/currency/convert.   PS_DEPENDENCY_ERROR.   

  TC-FB-04   Stale key persists    Run TC-FB-01 to seed stale key. Wait for TTL to   redis-cli get          db
             after TTL expiry      expire (FX_CACHE_TTL_SECONDS). Confirm stale key  ps:fx:USD:EUR:stale    
                                   still exists.                                     returns the rate. Key  
                                                                                     has no TTL.            

  TC-FB-05   Fallback updates      TC-FB-01 (fallback succeeds). Check stale key     ps:fx:USD:EUR:stale    db
             stale key             value.                                            updated to the new     
                                                                                     rate from the fallback 
                                                                                     API.                   
  --------------------------------------------------------------------------------------------------------------------

# **8. Daily Rate Refresh Test Cases**

These tests target the daily scheduled job in RatesRefreshService. In
the test environment, trigger the job by calling the internal method
directly rather than waiting for the cron schedule.

  ---------------------------------------------------------------------------------------------------------
  **ID**          **Scenario**            **Input**                 **Expected**                 **HTTP**
  --------------- ----------------------- ------------------------- ---------------------------- ----------
  TC-REFRESH-01   Successful refresh      Mock transaction-service  cron. 3 records upserted in  cron
                  upserts records         to return 3 rate          ps_platform_rate_averages.   
                                          aggregates. Trigger       updatedAt set to now.        
                                          refreshPlatformRates().                                

  TC-REFRESH-02   Refresh invalidates     Seed Redis with           cron. All ps:rates:\* keys   cron
                  Redis cache             ps:rates:\* keys. Trigger deleted after successful     
                                          refresh. Check Redis.     refresh.                     

  TC-REFRESH-03   New combination         Mock transaction-service  cron. New                    cron
                  inserted on refresh     to return a role/region   PlatformRateAverage record   
                                          combination not in the    created. Not an update to    
                                          DB. Trigger refresh.      existing.                    

  TC-REFRESH-04   Existing combination    Mock transaction-service  cron. Existing record        cron
                  updated on refresh      to return updated rates   updated. updatedAt advances. 
                                          for UX Designer / United  Old rates replaced.          
                                          States. Trigger refresh.                               

  TC-REFRESH-05   transaction-service     Set                       cron. Error logged. No DB    cron
                  unreachable --- refresh TRANSACTION_SERVICE_URL   writes. Existing records     
                  fails gracefully        to invalid URL. Trigger   unchanged. Redis not         
                                          refresh.                  invalidated.                 

  TC-REFRESH-06   Rate immediately        TC-REFRESH-01. Then GET   200\. is_stale:false. Data   200
                  available after refresh /v1/rates for one of the  reflects the newly refreshed 
                                          refreshed combinations.   values.                      

  TC-REFRESH-07   Stale rate becomes      Seed stale record         200\. is_stale:false.        200
                  fresh after refresh     (updatedAt 48h ago).      updatedAt is now current.    
                                          TC-REFRESH-01 includes                                 
                                          that combination. GET                                  
                                          /v1/rates.                                             

  TC-REFRESH-08   Refresh respects        Mock transaction-service  cron. sinceDate = today      cron
                  RATE_DATA_WINDOW_DAYS   endpoint. Confirm         minus 90 days (default).     
                                          sinceDate query param     Configurable via env var.    
                                          equals today minus                                     
                                          RATE_DATA_WINDOW_DAYS.                                 
  ---------------------------------------------------------------------------------------------------------

# **9. Seed Data & Fixtures**

> // apps/pricing-service/src/rates/seeds/pricing-service.seed.ts
>
> import { DataSource } from \'typeorm\';
>
> import { PlatformRateAverage } from
> \'../entities/platform-rate-average.entity\';
>
> export async function seedPricingService(dataSource: DataSource):
> Promise\<void\> {
>
> const repo = dataSource.getRepository(PlatformRateAverage);
>
> // Seed rate records covering the combinations used by test cases.
>
> await repo.save(\[
>
> {
>
> roleTitle: \'UX Designer\',
>
> region: \'United States\',
>
> experienceLevel: \'mid\',
>
> workSchedule: \'full_time\',
>
> hourlyLowUsdCents: 7500,
>
> hourlyMedianUsdCents: 10000,
>
> hourlyHighUsdCents: 13500,
>
> sampleSize: 142,
>
> updatedAt: new Date(),
>
> },
>
> {
>
> roleTitle: \'Backend Developer\',
>
> region: \'Eastern Europe\',
>
> experienceLevel: \'senior\',
>
> workSchedule: \'full_time\',
>
> hourlyLowUsdCents: 5000,
>
> hourlyMedianUsdCents: 7000,
>
> hourlyHighUsdCents: 9500,
>
> sampleSize: 98,
>
> updatedAt: new Date(),
>
> },
>
> {
>
> roleTitle: \'Product Manager\',
>
> region: \'Western Europe\',
>
> experienceLevel: \'junior\',
>
> workSchedule: \'part_time\',
>
> hourlyLowUsdCents: 4000,
>
> hourlyMedianUsdCents: 5500,
>
> hourlyHighUsdCents: 7000,
>
> sampleSize: 31,
>
> updatedAt: new Date(),
>
> },
>
> // Stale record --- updatedAt set to 48 hours ago.
>
> {
>
> roleTitle: \'DevOps Engineer\',
>
> region: \'Southeast Asia\',
>
> experienceLevel: \'mid\',
>
> workSchedule: \'full_time\',
>
> hourlyLowUsdCents: 3000,
>
> hourlyMedianUsdCents: 4500,
>
> hourlyHighUsdCents: 6000,
>
> sampleSize: 22,
>
> updatedAt: new Date(Date.now() - 48 \* 3600 \* 1000),
>
> },
>
> \]);
>
> }

## **9.1 Redis Pre-Conditions**

The following Redis pre-conditions apply to specific test groups. Apply
them before running the relevant tests.

  ----------------------------------------------------------------------------------------------------
  **Test Group**     **Redis               **Command**
                     Pre-Condition**       
  ------------------ --------------------- -----------------------------------------------------------
  TC-RATE-02 (cache  Cache must be warm.   No action needed --- TC-RATE-01 populates the cache.
  hit)               Run TC-RATE-01 first. 

  TC-STALE-01        Cache must be cold    redis-cli -u \$REDIS_URL del
  through            for the test role.    \'ps:rates:devops_engineer:southeast_asia:mid:full_time\'
  TC-STALE-06                              

  TC-FB-02, TC-FB-03 TTL key must be       redis-cli -u \$REDIS_URL del \'ps:fx:USD:EUR\' (for
                     absent. Stale key     TC-FB-03 also del the :stale key)
                     present for TC-FB-02, 
                     absent for TC-FB-03.  

  TC-REFRESH-02      Rate cache must       Run any TC-RATE-\* test first to populate the cache.
                     contain at least one  
                     ps:rates:\* key.      
  ----------------------------------------------------------------------------------------------------

## **9.2 Mock transaction-service Response**

For TC-REFRESH-\* tests, configure the mock server at
TRANSACTION_SERVICE_URL to return this response on GET
/v1/transactions/rate-averages:

> {
>
> \"averages\": \[
>
> {
>
> \"roleTitle\": \"UX Designer\", \"region\": \"United States\",
>
> \"experienceLevel\": \"mid\", \"workSchedule\": \"full_time\",
>
> \"p25RateUsdCents\": 8000, \"p50RateUsdCents\": 10500,
> \"p75RateUsdCents\": 14000,
>
> \"sampleSize\": 150
>
> },
>
> {
>
> \"roleTitle\": \"Data Scientist\", \"region\": \"Western Europe\",
>
> \"experienceLevel\": \"senior\", \"workSchedule\": \"full_time\",
>
> \"p25RateUsdCents\": 9000, \"p50RateUsdCents\": 12000,
> \"p75RateUsdCents\": 16000,
>
> \"sampleSize\": 45
>
> }
>
> \]
>
> }

# **10. Postman Collection**

Collection file location:

> apps/pricing-service/src/rates/postman/pricing-service-collection.json

## **10.1 Collection Variables**

  -------------------------------------------------------------------------
  **Variable**       **Description**                **Default Value**
  ------------------ ------------------------------ -----------------------
  baseUrl            pricing-service base URL       http://localhost:3016

  internalJwt        Valid JWT from auth-service.   Obtain from
                     pricing-service uses           auth-service login
                     InternalJwtGuard --- any valid 
                     platform JWT is accepted.      

  freshRole          Role title with a fresh seed   UX Designer
                     record.                        

  staleRole          Role title with a stale seed   DevOps Engineer
                     record (updatedAt 48h ago).    

  noDataRole         Role title with no seed        Quantum Architect
                     record.                        
  -------------------------------------------------------------------------

## **10.2 Collection Folder Structure**

> Pricing Service Collection
>
> ├─ Rates
>
> │ ├─ GET Rates --- fresh data (cache hit)
>
> │ ├─ GET Rates --- no location filter
>
> │ ├─ GET Rates --- stale record
>
> │ ├─ GET Rates --- no data (missing combination) \[expect no_data:
> true\]
>
> │ ├─ GET Rates --- missing role param \[expect 422\]
>
> │ └─ GET Rates --- invalid experience value \[expect 422\]
>
> ├─ Price Guide
>
> │ ├─ GET Price Guide --- all three tiers present
>
> │ └─ GET Price Guide --- no data \[expect no_data: true\]
>
> ├─ Budget
>
> │ ├─ POST Calculate --- single role
>
> │ ├─ POST Calculate --- multiple roles
>
> │ ├─ POST Calculate --- partial (one no_data role)
>
> │ ├─ POST Calculate --- empty roles array \[expect 422\]
>
> │ └─ POST Calculate --- estimatedHours below min \[expect 422\]
>
> ├─ Currency
>
> │ ├─ GET Convert --- USD to EUR
>
> │ ├─ GET Convert --- same currency (USD to USD)
>
> │ ├─ GET Convert --- invalid from code \[expect 422\]
>
> │ ├─ GET All Rates
>
> └─ Health
>
> └─ GET /health

# **11. References**

- PS-03 --- Data Models & DTOs --- PlatformRateAverage entity
  constraints verified in TC-RATE-\* tests

- PS-04 --- API Endpoints --- endpoint contracts and fallback matrix
  that this test suite validates

- PS-05 --- Integrations & Events --- Redis key schema and fallback
  decision tree tested in TC-FB-\* and TC-STALE-\*

- PS-06 --- Observability & Health --- log query patterns for diagnosing
  test failures
