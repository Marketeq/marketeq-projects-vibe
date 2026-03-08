**[MARKETEQ PLATFORM --- BACKEND DOCUMENTATION]{.smallcaps}**

**earnings-service**

**ES-11 --- Edge Cases & Data Limitations**

  -----------------------------------------------------------------------
  **Property**        **Value**
  ------------------- ---------------------------------------------------
  **Service**         earnings-service

  **Document**        ES-11 --- Edge Cases & Data Limitations

  **Version**         1.0

  **Status**          Draft --- Awaiting Engineering Review

  **Cases             8
  documented**        

  **Prerequisites**   ES-00 through ES-10

  **Next Document**   ES-12 --- Integration Test Suite
  -----------------------------------------------------------------------

+-----------------------------------------------------------------------+
| **Purpose**                                                           |
|                                                                       |
| Documents the 8 known edge cases and data limitations in              |
| earnings-service.                                                     |
|                                                                       |
| Each case records: what triggers it, the current system behaviour,    |
| data impact,                                                          |
|                                                                       |
| expected frontend handling, and the correct implementation action.    |
|                                                                       |
| Cases covered:                                                        |
|                                                                       |
| 01 \$0 balance display --- new contractor or fully paid-out balance   |
|                                                                       |
| 02 First-time contractor with no earnings history                     |
|                                                                       |
| 03 FX rate cache miss under load                                      |
|                                                                       |
| 04 Very large earnings history (50,000+ records)                      |
|                                                                       |
| 05 Mid-request displayCurrency change                                 |
|                                                                       |
| 06 Concurrent balance reads during payout processing                  |
|                                                                       |
| 07 YTD threshold breach timing race condition                         |
|                                                                       |
| 08 Geolocation currency mismatch on login from a new country          |
+=======================================================================+

# **1. Prerequisites**

  -----------------------------------------------------------------------
  **Document**                **Relevant sections**
  --------------------------- -------------------------------------------
  **ES-02 --- Contractor      BalanceService, EarningsService ---
  Endpoints**                 behaviour under zero/empty state

  **ES-04 --- RabbitMQ        transaction.created, payout.completed ---
  Consumers**                 balance mutation timing

  **ES-05 --- RabbitMQ        earnings.threshold.reached --- YTD guard
  Publishers**                key

  **ES-06 --- Currency        FX rate resolution order, emergency
  Conversion**                fallback

  **ES-07 --- Redis Caching** Cache-aside read path, SETEX/DEL ordering
  -----------------------------------------------------------------------

# **2. Edge Case Catalog**

+-----------------------------------------------------------------------------------+
| +---------------+---------------------------------------------------------------+ |
| | **01**        | **\$0 Balance Display**                                       | |
| +---------------+---------------------------------------------------------------+ |
| | **Cause**     | Two scenarios produce a \$0 balance: (a) Contractor has       | |
| |               | confirmed earnings but has paid out everything ---            | |
| |               | balance_snapshots.available_balance = 0.00 (b)                | |
| |               | balance_snapshots row exists (created on first                | |
| |               | transaction.created) but net_amount_usd for all entries was   | |
| |               | reversed                                                      | |
| +---------------+---------------------------------------------------------------+ |
| | **Behaviour** | GET /v1/earnings/balance returns 200 with                     | |
| |               | availableBalance=\"0.00\", availableBalanceDisplay=\"0\",     | |
| |               |                                                               | |
| |               | availableBalanceLocal=\"0\". The response is not a 404 ---    | |
| |               | the row exists.                                               | |
| |               |                                                               | |
| |               | CacheService caches the \$0 entry normally. TTL and           | |
| |               | invalidation apply identically to non-zero balances.          | |
| |               |                                                               | |
| |               | The displayLabel field is still populated: \"After reserve &  | |
| |               | threshold deductions\".                                       | |
| +---------------+---------------------------------------------------------------+ |
| | **Data        | balance_snapshots.available_balance = 0.00 (or a very small   | |
| | impact**      | positive from rounding).                                      | |
| |               |                                                               | |
| |               | total_earned_usd may be substantial. total_paid_out_usd       | |
| |               | approximately equals total_earned_usd.                        | |
| |               |                                                               | |
| |               | No data loss --- the balance is accurately \$0.               | |
| +---------------+---------------------------------------------------------------+ |
| | **Frontend**  | Show \"\$0\" prominently --- do not hide the balance card or  | |
| |               | replace with an empty state.                                  | |
| |               |                                                               | |
| |               | Show the balance card subtitle: \"After reserve & threshold   | |
| |               | deductions\".                                                 | |
| |               |                                                               | |
| |               | The earnings history list is still queryable --- show history | |
| |               | normally.                                                     | |
| |               |                                                               | |
| |               | Do NOT show the \"no earnings yet\" onboarding state (that is | |
| |               | Case 02, triggered by 404 not 200+\$0).                       | |
| +---------------+---------------------------------------------------------------+ |
| | **Code        | BalanceService.getBalance() --- no special handling needed.   | |
| | location**    | The \$0 path is the normal path.                              | |
| +---------------+---------------------------------------------------------------+ |
| | **Correct     | \$0 is valid data. The only action required is confirming the | |
| | action**      | frontend does not conflate a 200+\$0 response with a 404 (no  | |
| |               | balance row). These are different states with different UI    | |
| |               | treatments.                                                   | |
| +===============+===============================================================+ |
+===================================================================================+

+-----------------------------------------------------------------------------------+
| +---------------+---------------------------------------------------------------+ |
| | **02**        | **First-Time Contractor --- No Earnings History**             | |
| +---------------+---------------------------------------------------------------+ |
| | **Cause**     | A contractor account exists in the platform but has never had | |
| |               | a transaction.created event processed.                        | |
| |               |                                                               | |
| |               | balance_snapshots has no row for this contractorId.           | |
| |               |                                                               | |
| |               | earnings_cache has no rows for this contractorId.             | |
| +---------------+---------------------------------------------------------------+ |
| | **Behaviour** | GET /v1/earnings/balance → 404 ERR_EARNINGS_BALANCE_NOT_FOUND | |
| |               |                                                               | |
| |               | GET /v1/earnings → 404 ERR_EARNINGS_NO_DATA_IN_RANGE          | |
| |               |                                                               | |
| |               | GET /v1/earnings/summary → 404 ERR_EARNINGS_NO_DATA_IN_RANGE  | |
| |               |                                                               | |
| |               | GET /v1/internal/earnings/balance/:userId → 200 with all      | |
| |               | fields = \"0.00\"                                             | |
| |               |                                                               | |
| |               | (Internal endpoint always returns 200 with zeros --- ES-03 §6 | |
| |               | specifies this explicitly.)                                   | |
| +---------------+---------------------------------------------------------------+ |
| | **Data        | No balance_snapshots row. No earnings_cache rows.             | |
| | impact**      | contract_label_cache may have rows if contract.activated was  | |
| |               | received. No data integrity issue.                            | |
| +---------------+---------------------------------------------------------------+ |
| | **Frontend**  | On 404 from GET /v1/earnings/balance: show the                | |
| |               | onboarding/empty state.                                       | |
| |               |                                                               | |
| |               | Copy: \"You\'ll see your earnings here once your first        | |
| |               | billing is confirmed.\"                                       | |
| |               |                                                               | |
| |               | Do not show an error toast --- 404 for a new contractor is    | |
| |               | expected and not an error.                                    | |
| |               |                                                               | |
| |               | On 404 from GET /v1/earnings: show an empty history state,    | |
| |               | not an error.                                                 | |
| |               |                                                               | |
| |               | Distinguish by errorCode: ERR_EARNINGS_BALANCE_NOT_FOUND vs   | |
| |               | any other 404.                                                | |
| +---------------+---------------------------------------------------------------+ |
| | **Code        | BalanceService.getBalance() --- throws NotFoundException when | |
| | location**    | no balance_snapshots row.                                     | |
| |               |                                                               | |
| |               | EarningsService.getEarnings() --- returns empty data array,   | |
| |               | triggers 404 via controller guard.                            | |
| |               |                                                               | |
| |               | InternalController.getBalance() --- explicitly returns zeros  | |
| |               | object, no throw (ES-03 §6).                                  | |
| +---------------+---------------------------------------------------------------+ |
| | **Correct     | Current behaviour is correct. No code change needed. Frontend | |
| | action**      | must handle the 404+ERR_EARNINGS_BALANCE_NOT_FOUND case as a  | |
| |               | non-error empty state, not a failure.                         | |
| +===============+===============================================================+ |
+===================================================================================+

+-----------------------------------------------------------------------------------+
| +---------------+---------------------------------------------------------------+ |
| | **03**        | **FX Rate Cache Miss Under Load**                             | |
| +---------------+---------------------------------------------------------------+ |
| | **Cause**     | Redis key fx:usd:{currency} has expired (TTL elapsed) or been | |
| |               | flushed.                                                      | |
| |               |                                                               | |
| |               | Multiple concurrent requests all get a cache miss             | |
| |               | simultaneously.                                               | |
| |               |                                                               | |
| |               | All of them call CurrencyService.fetchFromPrimary() at the    | |
| |               | same time --- a \"thundering herd\".                          | |
| |               |                                                               | |
| |               | The fawazahmed0/exchange-api container receives N             | |
| |               | simultaneous identical requests.                              | |
| +---------------+---------------------------------------------------------------+ |
| | **Behaviour** | All N concurrent requests independently call the FX API and   | |
| |               | each writes the same rate to Redis.                           | |
| |               |                                                               | |
| |               | This is safe --- the race produces duplicate writes to the    | |
| |               | same Redis key, not conflicting values.                       | |
| |               |                                                               | |
| |               | The last SETEX wins, but all writes produce the same value so | |
| |               | the result is correct.                                        | |
| |               |                                                               | |
| |               | Under very high load (100+ concurrent misses), fawazahmed0    | |
| |               | container may be overwhelmed.                                 | |
| |               |                                                               | |
| |               | No request returns stale or incorrect data.                   | |
| +---------------+---------------------------------------------------------------+ |
| | **Data        | No data corruption. N identical reads hit the FX API instead  | |
| | impact**      | of 1. Redis ends up with the correct rate regardless of write | |
| |               | order.                                                        | |
| +---------------+---------------------------------------------------------------+ |
| | **Frontend**  | No special handling. Requests may be slightly slower (FX API  | |
| |               | call instead of Redis read) but all return correctly.         | |
| +---------------+---------------------------------------------------------------+ |
| | **Code        | CurrencyService.getRate() --- no mutex or single-flight       | |
| | location**    | pattern is currently implemented.                             | |
| +---------------+---------------------------------------------------------------+ |
| | **Correct     | Current behaviour is correct for the expected load. For       | |
| | action**      | high-scale scenarios, implement a                             | |
| |               |                                                               | |
| |               | single-flight/coalescing pattern: set a Redis lock key        | |
| |               | fx:lock:{from}:{to} with short TTL (5s)                       | |
| |               |                                                               | |
| |               | before the API call, and have concurrent requests wait on the | |
| |               | lock rather than all calling the API.                         | |
| |               |                                                               | |
| |               | Implementation: use Redis SET NX for the lock. If lock        | |
| |               | acquired, fetch and write rate, delete lock.                  | |
| |               |                                                               | |
| |               | If lock not acquired, poll (with 50ms sleep, max 10 retries)  | |
| |               | until the rate key appears.                                   | |
| |               |                                                               | |
| |               | This is a future optimisation --- not required at current     | |
| |               | scale.                                                        | |
| +===============+===============================================================+ |
+===================================================================================+

+-----------------------------------------------------------------------------------+
| +---------------+---------------------------------------------------------------+ |
| | **04**        | **Very Large Earnings History (50,000+ Records)**             | |
| +---------------+---------------------------------------------------------------+ |
| | **Cause**     | A long-tenured contractor with many small-denomination work   | |
| |               | entries can accumulate tens of thousands of rows in           | |
| |               | earnings_cache.                                               | |
| +---------------+---------------------------------------------------------------+ |
| | **Behaviour** | GET /v1/earnings uses cursor/offset pagination (limit max 100 | |
| |               | per page) --- pages are always fast.                          | |
| |               |                                                               | |
| |               | GET /v1/earnings/summary runs 4 parallel aggregation queries  | |
| |               | (SUM + COUNT) --- these use the                               | |
| |               |                                                               | |
| |               | earnings_cache index on (contractor_id, status,               | |
| |               | work_start_at) and remain fast even at 50k rows.              | |
| |               |                                                               | |
| |               | GET /v1/earnings/export with dateRange=all_time fetches all   | |
| |               | rows into memory. At 50k rows,                                | |
| |               |                                                               | |
| |               | the export file may be 10--15MB in memory before writing to   | |
| |               | R2.                                                           | |
| |               |                                                               | |
| |               | The sync threshold (5,000 rows) ensures large exports are     | |
| |               | handled asynchronously (ES-09).                               | |
| |               |                                                               | |
| |               | The async export row count check (500,000 max) prevents       | |
| |               | extreme cases.                                                | |
| +---------------+---------------------------------------------------------------+ |
| | **Data        | No data loss. Pagination ensures list reads are always        | |
| | impact**      | bounded.                                                      | |
| |               |                                                               | |
| |               | Memory: ExportService holds up to EXPORT_SYNC_ROW_LIMIT rows  | |
| |               | in memory synchronously.                                      | |
| |               |                                                               | |
| |               | Above the sync limit, the async path (Bull job) processes the | |
| |               | full dataset off the request thread.                          | |
| +---------------+---------------------------------------------------------------+ |
| | **Frontend**  | Pagination: always request one page at a time (limit \<=      | |
| |               | 100). Never request all rows in one call.                     | |
| |               |                                                               | |
| |               | Export: for dateRange=all_time, expect a 202 Async response   | |
| |               | rather than a direct 200 download.                            | |
| |               |                                                               | |
| |               | Summary cards: response time is unaffected by row count ---   | |
| |               | aggregations are indexed.                                     | |
| +---------------+---------------------------------------------------------------+ |
| | **Code        | EarningsService.getEarnings() --- paginated query, max 100    | |
| | location**    | rows per request.                                             | |
| |               |                                                               | |
| |               | EarningsService.getSummary() --- 4 parallel COUNT/SUM         | |
| |               | queries, not a full fetch.                                    | |
| |               |                                                               | |
| |               | ExportService.buildFile() --- full fetch for file generation. | |
| |               | Bounded by EXPORT_SYNC_ROW_LIMIT (sync) or                    | |
| |               | EXPORT_ASYNC_MAX_ROWS (async hard cap).                       | |
| +---------------+---------------------------------------------------------------+ |
| | **Correct     | Current architecture handles this correctly. Future hardening | |
| | action**      | if row counts exceed 500k:                                    | |
| |               |                                                               | |
| |               | • Implement streaming export: write CSV rows to R2 multipart  | |
| |               | upload incrementally.                                         | |
| |               |                                                               | |
| |               | • Add a cold-path index: earnings_cache(contractor_id,        | |
| |               | work_start_at) INCLUDE (net_amount_usd)                       | |
| |               |                                                               | |
| |               | for summary queries that scan wide date ranges.               | |
| |               |                                                               | |
| |               | • Consider partition pruning by year if rows exceed 1M per    | |
| |               | contractor.                                                   | |
| +===============+===============================================================+ |
+===================================================================================+

+-----------------------------------------------------------------------------------+
| +---------------+---------------------------------------------------------------+ |
| | **05**        | **Mid-Request displayCurrency Change**                        | |
| +---------------+---------------------------------------------------------------+ |
| | **Cause**     | A contractor changes their displayCurrency in Settings while  | |
| |               | an earnings balance or history                                | |
| |               |                                                               | |
| |               | request is in flight. The JWT carries the old                 | |
| |               | displayCurrency. The new setting is saved to                  | |
| |               |                                                               | |
| |               | user-service but has not yet been re-issued in a new JWT.     | |
| +---------------+---------------------------------------------------------------+ |
| | **Behaviour** | The in-flight request completes using the displayCurrency     | |
| |               | from the JWT --- the old value.                               | |
| |               |                                                               | |
| |               | The response is self-consistent: all amounts in the response  | |
| |               | use the old displayCurrency.                                  | |
| |               |                                                               | |
| |               | The next request (with a refreshed JWT) returns amounts in    | |
| |               | the new displayCurrency.                                      | |
| |               |                                                               | |
| |               | The balance cache key (balance:{userId}) is NOT invalidated   | |
| |               | by a displayCurrency change.                                  | |
| |               |                                                               | |
| |               | The cached entry stores displayCurrency --- a cache hit with  | |
| |               | the old displayCurrency                                       | |
| |               |                                                               | |
| |               | value will apply the old currency to the display amount even  | |
| |               | after the setting changes.                                    | |
| |               |                                                               | |
| |               | TTL (300s) is the only mechanism that eventually refreshes    | |
| |               | the cached displayCurrency.                                   | |
| +---------------+---------------------------------------------------------------+ |
| | **Data        | No data corruption. The underlying availableBalance (USD) is  | |
| | impact**      | always correct.                                               | |
| |               |                                                               | |
| |               | The display amount shown to the contractor may be in the      | |
| |               | wrong currency for up to 300 seconds                          | |
| |               |                                                               | |
| |               | after a displayCurrency change --- until the cache key        | |
| |               | expires or is refreshed.                                      | |
| +---------------+---------------------------------------------------------------+ |
| | **Frontend**  | After saving a new displayCurrency in Settings, force a hard  | |
| |               | balance refresh:                                              | |
| |               |                                                               | |
| |               | 1\. Include a Cache-Control: no-cache header on the next      | |
| |               | balance request, OR                                           | |
| |               |                                                               | |
| |               | 2\. The frontend should trigger a logout+login after          | |
| |               | displayCurrency change to get a new JWT.                      | |
| |               |                                                               | |
| |               | Do not rely on the cached response being correct immediately  | |
| |               | after the settings change.                                    | |
| +---------------+---------------------------------------------------------------+ |
| | **Code        | BalanceService.getBalance() --- reads displayCurrency from    | |
| | location**    | JWT, not from the cached entry.                               | |
| +---------------+---------------------------------------------------------------+ |
| | **Correct     | Current behaviour is acceptable for the MVP. To fix properly: | |
| | action**      |                                                               | |
| |               | Option A (recommended): when the contractor saves a new       | |
| |               | displayCurrency in user-service,                              | |
| |               |                                                               | |
| |               | user-service emits a user.settings.updated event.             | |
| |               | earnings-service consumes it and calls                        | |
| |               |                                                               | |
| |               | cacheService.invalidateBalance(contractorId) to force a cache | |
| |               | refresh.                                                      | |
| |               |                                                               | |
| |               | Option B: reduce BALANCE_CACHE_TTL_SECONDS to 60s --- less    | |
| |               | optimal, higher DB read rate.                                 | |
| |               |                                                               | |
| |               | Option C: store displayCurrency in the cache entry and        | |
| |               | invalidate on mismatch at read time.                          | |
| |               |                                                               | |
| |               | This is a safe read-time check: if entry.displayCurrency !==  | |
| |               | jwt.displayCurrency, treat as miss.                           | |
| |               |                                                               | |
| |               | Option C requires one line change in                          | |
| |               | CacheService.getBalance().                                    | |
| +===============+===============================================================+ |
+===================================================================================+

+-----------------------------------------------------------------------------------+
| +---------------+---------------------------------------------------------------+ |
| | **06**        | **Concurrent Balance Reads During Payout Processing**         | |
| +---------------+---------------------------------------------------------------+ |
| | **Cause**     | A payout attempt by payout-service triggers this sequence in  | |
| |               | quick succession:                                             | |
| |               |                                                               | |
| |               | 1\. payout-service reads balance via GET                      | |
| |               | /v1/internal/earnings/balance/:userId                         | |
| |               |                                                               | |
| |               | 2\. payout-service initiates the bank transfer                | |
| |               |                                                               | |
| |               | 3\. payout-service publishes payout.completed to RabbitMQ     | |
| |               |                                                               | |
| |               | 4\. PayoutCompletedConsumer (ES-04) decrements balance and    | |
| |               | DELs Redis key                                                | |
| |               |                                                               | |
| |               | Between steps 1 and 4, a contractor refreshing their balance  | |
| |               | page gets a cache hit                                         | |
| |               |                                                               | |
| |               | or a DB read that still shows the pre-payout balance.         | |
| +---------------+---------------------------------------------------------------+ |
| | **Behaviour** | The stale pre-payout balance is shown until step 4 completes  | |
| |               | (typically 50--200ms).                                        | |
| |               |                                                               | |
| |               | After step 4: cache is invalidated, next read returns the     | |
| |               | decremented balance.                                          | |
| |               |                                                               | |
| |               | The window of staleness is bounded by the time between        | |
| |               | payout-service\'s balance check                               | |
| |               |                                                               | |
| |               | and the consumer processing payout.completed --- in practice  | |
| |               | \< 500ms.                                                     | |
| |               |                                                               | |
| |               | The displayed balance never goes negative: GREATEST(0,\...)   | |
| |               | guards all decrements (ES-04 §9.2).                           | |
| +---------------+---------------------------------------------------------------+ |
| | **Data        | No data corruption. The DB and balance_snapshots are always   | |
| | impact**      | consistent after step 4.                                      | |
| |               |                                                               | |
| |               | A contractor might briefly see the pre-payout balance on a    | |
| |               | page refresh during the window.                               | |
| |               |                                                               | |
| |               | This is eventually consistent behaviour --- not a bug.        | |
| +---------------+---------------------------------------------------------------+ |
| | **Frontend**  | After initiating a payout, show an in-progress state rather   | |
| |               | than immediately refreshing the balance.                      | |
| |               |                                                               | |
| |               | Listen for the payout.completed notification from             | |
| |               | notification-service before re-polling the balance.           | |
| |               |                                                               | |
| |               | If the balance is polled and shows the pre-payout value,      | |
| |               | retry once after 2 seconds.                                   | |
| +---------------+---------------------------------------------------------------+ |
| | **Code        | PayoutCompletedConsumer.process() --- step 4 timing (ES-04    | |
| | location**    | §10)                                                          | |
| |               |                                                               | |
| |               | CacheService.invalidateBalance() --- DEL called after DB      | |
| |               | commit (ES-07 §7.1)                                           | |
| +---------------+---------------------------------------------------------------+ |
| | **Correct     | Current behaviour is correct for the consistency model chosen | |
| | action**      | (eventual consistency).                                       | |
| |               |                                                               | |
| |               | The window of staleness is acceptable. No code change         | |
| |               | required.                                                     | |
| |               |                                                               | |
| |               | If strict read-your-writes is required: payout-service should | |
| |               | pass a cache-bypass header                                    | |
| |               |                                                               | |
| |               | (X-Cache-Bypass: true) on its internal balance check.         | |
| |               | earnings-service reads DB directly                            | |
| |               |                                                               | |
| |               | when this header is present, skipping the Redis cache         | |
| |               | entirely.                                                     | |
| +===============+===============================================================+ |
+===================================================================================+

+-----------------------------------------------------------------------------------+
| +---------------+---------------------------------------------------------------+ |
| | **07**        | **YTD Threshold Breach Timing Race Condition**                | |
| +---------------+---------------------------------------------------------------+ |
| | **Cause**     | Two transaction.created events for the same contractor arrive | |
| |               | at nearly the same time.                                      | |
| |               |                                                               | |
| |               | Both are processed concurrently by separate consumer          | |
| |               | instances (if RABBITMQ_PREFETCH \> 1).                        | |
| |               |                                                               | |
| |               | Both independently compute the YTD total after their          | |
| |               | respective DB write.                                          | |
| |               |                                                               | |
| |               | Both see ytdTotal \>= 600.00 and attempt to SET NX the        | |
| |               | threshold_fired:{userId}:{year} key.                          | |
| +---------------+---------------------------------------------------------------+ |
| | **Behaviour** | Redis SET NX is atomic. Only one consumer wins the race ---   | |
| |               | the first to execute SET NX gets \"OK\".                      | |
| |               |                                                               | |
| |               | The second consumer gets null from SET NX and skips           | |
| |               | publishing.                                                   | |
| |               |                                                               | |
| |               | Exactly one earnings.threshold.reached event is published.    | |
| |               |                                                               | |
| |               | The YTD total used in the published event reflects the state  | |
| |               | at the moment the winning consumer                            | |
| |               |                                                               | |
| |               | read it --- which may be slightly different from the final    | |
| |               | total after both transactions settle.                         | |
| +---------------+---------------------------------------------------------------+ |
| | **Data        | No duplicate events. Redis atomicity guarantees exactly-once  | |
| | impact**      | publication.                                                  | |
| |               |                                                               | |
| |               | The ytdTotalUsd in the event payload may be the value after   | |
| |               | the first transaction, not the second.                        | |
| |               |                                                               | |
| |               | e.g. First transaction brings YTD to \$620. Second brings it  | |
| |               | to \$650.                                                     | |
| |               |                                                               | |
| |               | The published ytdTotalUsd is \$620. The actual settled YTD is | |
| |               | \$650.                                                        | |
| |               |                                                               | |
| |               | This is acceptable --- kyc-identity-service re-reads the YTD  | |
| |               | from GET /v1/internal/earnings/ytd (ES-03)                    | |
| |               |                                                               | |
| |               | after receiving the event, so it always acts on the           | |
| |               | authoritative settled value.                                  | |
| +---------------+---------------------------------------------------------------+ |
| | **Frontend**  | No frontend action. This is an internal event timing issue    | |
| |               | invisible to the UI.                                          | |
| +---------------+---------------------------------------------------------------+ |
| | **Code        | TransactionCreatedConsumer.checkAndPublishThreshold() --- SET | |
| | location**    | NX guard (ES-05 §6.4)                                         | |
| |               |                                                               | |
| |               | InternalController.getYtd() --- kyc-identity-service re-reads | |
| |               | the authoritative YTD (ES-03 §7)                              | |
| +---------------+---------------------------------------------------------------+ |
| | **Correct     | Current implementation is correct. The Redis SET NX race      | |
| | action**      | guard handles concurrent consumers safely.                    | |
| |               |                                                               | |
| |               | kyc-identity-service must always re-read YTD from the         | |
| |               | internal endpoint after receiving the event.                  | |
| |               |                                                               | |
| |               | It must not trust ytdTotalUsd in the event payload as the     | |
| |               | final value.                                                  | |
| |               |                                                               | |
| |               | This expectation is documented in ES-05 §6.3 consumer         | |
| |               | expectations.                                                 | |
| +===============+===============================================================+ |
+===================================================================================+

+-----------------------------------------------------------------------------------+
| +---------------+---------------------------------------------------------------+ |
| | **08**        | **Geolocation Currency Mismatch on Login from a New Country** | |
| +---------------+---------------------------------------------------------------+ |
| | **Cause**     | A contractor based in India (INR) travels to the UK and logs  | |
| |               | in from a UK IP.                                              | |
| |               |                                                               | |
| |               | GeoService.detectCurrency() returns GBP based on the UK IP.   | |
| |               |                                                               | |
| |               | The JWT is issued with localCurrency=GBP.                     | |
| |               |                                                               | |
| |               | The contractor\'s displayCurrency is still INR (saved in      | |
| |               | user-service from previous sessions).                         | |
| |               |                                                               | |
| |               | balance_snapshots.local_currency still says INR from the last | |
| |               | login.                                                        | |
| +---------------+---------------------------------------------------------------+ |
| | **Behaviour** | GET /v1/earnings/balance:                                     | |
| |               |                                                               | |
| |               | availableBalanceLocal is in GBP (from the new JWT             | |
| |               | localCurrency).                                               | |
| |               |                                                               | |
| |               | availableBalanceDisplay is still in INR (displayCurrency from | |
| |               | JWT, sourced from user-service).                              | |
| |               |                                                               | |
| |               | The response is internally consistent for this session.       | |
| |               |                                                               | |
| |               | balance_snapshots.local_currency is NOT updated on login ---  | |
| |               | it reflects the last value                                    | |
| |               |                                                               | |
| |               | written during balance_snapshots upsert (transaction.created  | |
| |               | consumer, ES-04).                                             | |
| |               |                                                               | |
| |               | The balance card shows two different currencies: GBP local,   | |
| |               | INR display.                                                  | |
| |               |                                                               | |
| |               | This is correct and expected --- the contractor is currently  | |
| |               | in the UK.                                                    | |
| |               |                                                               | |
| |               | On next login from India, GeoService returns INR again and    | |
| |               | the local amount reverts.                                     | |
| +---------------+---------------------------------------------------------------+ |
| | **Data        | balance_snapshots.local_currency may be stale (shows last     | |
| | impact**      | country, not current).                                        | |
| |               |                                                               | |
| |               | No financial data is incorrect --- localCurrency only affects | |
| |               | the display secondary amount.                                 | |
| |               |                                                               | |
| |               | The availableBalance (USD) and all billing amounts are        | |
| |               | unaffected.                                                   | |
| +---------------+---------------------------------------------------------------+ |
| | **Frontend**  | Show both localCurrency and displayCurrency amounts on the    | |
| |               | balance card.                                                 | |
| |               |                                                               | |
| |               | If localCurrency === displayCurrency, show only one amount    | |
| |               | (no duplication).                                             | |
| |               |                                                               | |
| |               | Do not show a mismatch warning --- it is expected and correct | |
| |               | that they differ.                                             | |
| |               |                                                               | |
| |               | If the contractor is surprised by the local currency, guide   | |
| |               | them to Settings to update displayCurrency.                   | |
| +---------------+---------------------------------------------------------------+ |
| | **Code        | GeoService.detectCurrency() --- detects from current request  | |
| | location**    | IP (ES-06 §6)                                                 | |
| |               |                                                               | |
| |               | JwtAuthGuard --- reads localCurrency from JWT, which was set  | |
| |               | by auth-service on login                                      | |
| |               |                                                               | |
| |               | BalanceService.getBalance() --- applies localCurrency from    | |
| |               | JWT to availableBalanceLocal                                  | |
| +---------------+---------------------------------------------------------------+ |
| | **Correct     | Current behaviour is correct by design --- localCurrency is   | |
| | action**      | session-scoped and travel-aware.                              | |
| |               |                                                               | |
| |               | If balance_snapshots.local_currency staleness is a concern    | |
| |               | for internal reporting:                                       | |
| |               |                                                               | |
| |               | Emit a user.login event from auth-service including the new   | |
| |               | localCurrency.                                                | |
| |               |                                                               | |
| |               | earnings-service consumes it and updates                      | |
| |               | balance_snapshots.local_currency.                             | |
| |               |                                                               | |
| |               | This is a future enhancement --- not required for MVP.        | |
| +===============+===============================================================+ |
+===================================================================================+

# **3. Summary Table**

Quick-reference for all 8 cases. \"Correct\" means the current
implementation handles the case correctly. \"Action needed\" means a
code change is recommended.

  ----------------------------------------------------------------------------------------------------
  **\#**   **Case**              **Current behaviour**  **Action needed?**      **Owner**
  -------- --------------------- ---------------------- ----------------------- ----------------------
  **01**   \$0 balance display   Returns 200 with zero  No --- frontend must    Frontend
                                 amounts                not conflate 200+\$0    
                                                        with 404                

  **02**   First-time            Returns 404 with       No --- frontend must    Frontend
           contractor, no        correct error codes    show empty state, not   
           earnings                                     error                   

  **03**   FX rate cache miss    Duplicate FX API       No for MVP. Future:     Backend (future)
           thundering herd       calls, safe race on    single-flight           
                                 Redis write            coalescing              

  **04**   50,000+ earnings      Pagination + async     No --- monitor; add     Backend (future)
           records               export handle this     streaming export if \>  
                                 correctly              500k rows               

  **05**   Mid-request           Stale display currency Recommended: invalidate Backend
           displayCurrency       for up to 300s         cache on                
           change                                       user.settings.updated   
                                                        event                   

  **06**   Concurrent reads      Briefly stale balance  No --- eventual         None
           during payout         for \< 500ms           consistency is          
                                                        acceptable              

  **07**   YTD threshold breach  SET NX atomicity       No ---                  kyc-identity-service
           race condition        ensures exactly-once   kyc-identity-service    
                                 event                  must re-read YTD after  
                                                        event                   

  **08**   Geo currency mismatch GBP local + INR        No --- expected         None
           on travel             display --- both       behaviour by design     
                                 correct                                        
  ----------------------------------------------------------------------------------------------------

# **4. Testing Notes**

Reproduction steps and assertions for each case in the integration test
suite (ES-12).

  ---------------------------------------------------------------------------------------------------------
  **Case**            **How to reproduce in tests**             **Key assertion**
  ------------------- ----------------------------------------- -------------------------------------------
  **01 --- \$0        Insert balance_snapshots row with         HTTP 200. availableBalanceDisplay=\"0\".
  balance**           available_balance=0.00. Call GET          displayLabel present. No 404.
                      /v1/earnings/balance.                     

  **02 --- No         Call GET /v1/earnings/balance with a      HTTP 404.
  earnings**          contractorId that has no                  errorCode=ERR_EARNINGS_BALANCE_NOT_FOUND.
                      balance_snapshots row.                    Internal GET returns 200 with zeros.

  **03 --- FX cache   FLUSHDB Redis. Send 50 concurrent GET     All 50 return 200 with consistent non-zero
  miss**              /v1/earnings/balance requests.            display amounts. Redis key exists after all
                                                                requests complete.

  **04 --- Large      Seed 6,000 earnings_cache rows. Call GET  HTTP 202 (async). jobId in response. Bull
  history**           /v1/earnings/export?dateRange=all_time.   queue depth = 1.

  **05 --- Currency   Seed balance. GET /v1/earnings/balance    Second response still shows INR (cache
  change**            with displayCurrency=INR. Update JWT to   hit). Third response after DEL shows GBP.
                      displayCurrency=GBP. GET                  
                      /v1/earnings/balance again before TTL     
                      expires.                                  

  **06 --- Concurrent Publish payout.completed. Immediately GET Pre-payout balance returned. After 200ms,
  payout**            balance before consumer processes.        GET balance returns decremented value.

  **07 --- YTD race** Publish two transaction.created events    Exactly one earnings.threshold.reached
                      simultaneously, each crossing \$600       event in the test queue. Redis key
                      individually.                             threshold_fired exists.

  **08 --- Geo        Issue JWT with localCurrency=GBP,         availableBalanceLocal in GBP.
  mismatch**          displayCurrency=INR. GET                  availableBalanceDisplay in INR. Both
                      /v1/earnings/balance.                     non-zero.
  ---------------------------------------------------------------------------------------------------------

# **5. References**

  -----------------------------------------------------------------------
  **Document**              **Cases addressed**
  ------------------------- ---------------------------------------------
  **ES-02 --- Contractor    Cases 01, 02, 05, 08 --- balance and history
  Endpoints**               endpoint behaviour

  **ES-04 --- RabbitMQ      Cases 06, 07 --- payout and transaction event
  Consumers**               timing

  **ES-05 --- RabbitMQ      Case 07 --- threshold_fired Redis guard
  Publishers**              

  **ES-06 --- Currency      Cases 03, 08 --- FX rate resolution and
  Conversion**              localCurrency detection

  **ES-07 --- Redis         Cases 03, 05, 06 --- cache-aside behaviour,
  Caching**                 TTL, invalidation

  **ES-09 --- Export        Case 04 --- async export threshold, Bull job
  Endpoint**                path

  **ES-10 --- Error         Cases 01, 02 ---
  Catalog**                 ERR_EARNINGS_BALANCE_NOT_FOUND,
                            ERR_EARNINGS_NO_DATA_IN_RANGE
  -----------------------------------------------------------------------

CONFIDENTIAL --- Marketeq Internal Engineering Documentation \|
earnings-service ES-11 \| v1.0
