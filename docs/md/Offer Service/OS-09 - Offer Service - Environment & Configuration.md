**OS-09**

**Offer Service --- Environment & Configuration**

**Repo:** marketeq-projects-nestjs **Service:** offer-service **Config
file:** apps/offer-service/.env (gitignored)

All environment variables for offer-service are loaded via NestJS
ConfigModule using a validated ConfigService schema. No environment
variable is ever read directly from process.env in service code --- all
access goes through the typed ConfigService. The .env file is gitignored
in all environments. Secrets are injected via the platform secret
manager in staging and production.

  -------------- -------------------------------------------------------------
  **Req?**       **Meaning**

  **Required**   Must be set in all environments. Service will not start
                 without it.

  **Optional**   Has a sensible default. Can be overridden per environment.

  **Dev Only**   Only relevant in local development. Not set or used in
                 staging/production.
  -------------- -------------------------------------------------------------

+-----------------------------------------------------------------------+
| **1 Application**                                                     |
|                                                                       |
| Core NestJS app settings                                              |
+-----------------------------------------------------------------------+

  --------------------------- -------------- --------------- ------------ -------------------------
  **Variable**                **Req?**       **Default**     **Connects   **Description**
                                                             To**         

  **NODE_ENV**                **Required**   development     **App**      Runtime environment. One
                                                                          of: development \|
                                                                          staging \| production.
                                                                          Controls logging
                                                                          verbosity, error detail
                                                                          level, and debug tooling.

  **PORT**                    **Optional**   3005            **App**      HTTP port the
                                                                          offer-service listens on.
                                                                          Each service in the
                                                                          monorepo uses a unique
                                                                          port to avoid conflicts
                                                                          in local dev.

  **APP_NAME**                **Optional**   offer-service   **App**      Service name used in log
                                                                          output and health check
                                                                          responses.

  **API_PREFIX**              **Optional**   v1              **App**      Global route prefix. All
                                                                          endpoints are prefixed:
                                                                          /v1/offers,
                                                                          /v1/counter-offers, etc.

  **GLOBAL_THROTTLE_TTL**     **Optional**   60000           **App**      Rate limiting window in
                                                                          milliseconds. Default 60
                                                                          seconds.

  **GLOBAL_THROTTLE_LIMIT**   **Optional**   100             **App**      Maximum requests per
                                                                          window per IP. Default
                                                                          100.
  --------------------------- -------------- --------------- ------------ -------------------------

+-----------------------------------------------------------------------+
| **2 Database --- PostgreSQL**                                         |
|                                                                       |
| Connection config for the offer_service schema                        |
+-----------------------------------------------------------------------+

  ------------------ -------------- --------------- ---------------- -------------------------
  **Variable**       **Req?**       **Default**     **Connects To**  **Description**

  **DB_HOST**        **Required**   localhost       **PostgreSQL**   PostgreSQL server
                                                                     hostname.

  **DB_PORT**        **Optional**   5432            **PostgreSQL**   PostgreSQL server port.

  **DB_NAME**        **Required**   ---             **PostgreSQL**   Database name. Shared DB
                                                                     server --- use the
                                                                     platform database name.

  **DB_SCHEMA**      **Optional**   offer_service   **PostgreSQL**   Schema name within the
                                                                     database. offer-service
                                                                     uses its own dedicated
                                                                     schema for isolation.

  **DB_USERNAME**    **Required**   ---             **PostgreSQL**   Database user. Should
                                                                     have full access to the
                                                                     offer_service schema
                                                                     only.

  **DB_PASSWORD**    **Required**   ---             **PostgreSQL**   Database password.
                                                                     Injected via secret
                                                                     manager in
                                                                     staging/production.

  **DB_SSL**         **Optional**   false           **PostgreSQL**   Enable SSL for DB
                                                                     connection. Set to true
                                                                     in staging and
                                                                     production.

  **DB_SYNC**        **Dev Only**   false           **PostgreSQL**   TypeORM synchronize ---
                                                                     auto-syncs schema to
                                                                     entities. NEVER set to
                                                                     true in staging or
                                                                     production. Use
                                                                     migrations only.

  **DB_LOGGING**     **Dev Only**   false           **PostgreSQL**   TypeORM query logging.
                                                                     Set to true locally for
                                                                     debugging. Never enable
                                                                     in production.

  **DB_POOL_SIZE**   **Optional**   10              **PostgreSQL**   Connection pool size.
                                                                     Tune based on expected
                                                                     concurrent load.
  ------------------ -------------- --------------- ---------------- -------------------------

+-----------------------------------------------------------------------+
| **3 Cache --- Redis**                                                 |
|                                                                       |
| Idempotency key storage                                               |
+-----------------------------------------------------------------------+

  ---------------------- -------------- ------------- ------------ -------------------------
  **Variable**           **Req?**       **Default**   **Connects   **Description**
                                                      To**         

  **REDIS_HOST**         **Required**   localhost     **Redis**    Redis server hostname.

  **REDIS_PORT**         **Optional**   6379          **Redis**    Redis server port.

  **REDIS_PASSWORD**     **Optional**   ---           **Redis**    Redis auth password.
                                                                   Required in staging and
                                                                   production. Optional in
                                                                   local dev if Redis is
                                                                   running without auth.

  **REDIS_TLS**          **Optional**   false         **Redis**    Enable TLS for Redis
                                                                   connection. Set to true
                                                                   in staging and
                                                                   production.

  **REDIS_KEY_PREFIX**   **Optional**   offer-svc:    **Redis**    Prefix for all Redis keys
                                                                   from this service.
                                                                   Prevents key collisions
                                                                   if Redis is shared with
                                                                   other services.

  **IDEMPOTENCY_TTL**    **Optional**   86400         **Redis**    Idempotency key TTL in
                                                                   seconds. Default 86400 =
                                                                   24 hours.
  ---------------------- -------------- ------------- ------------ -------------------------

+-----------------------------------------------------------------------+
| **4 Message Broker --- RabbitMQ**                                     |
|                                                                       |
| Event bus connection and exchange config                              |
+-----------------------------------------------------------------------+

  ------------------------------ -------------- ----------------------- -------------- -----------------------------------
  **Variable**                   **Req?**       **Default**             **Connects     **Description**
                                                                        To**           

  **RABBITMQ_URL**               **Required**   amqp://localhost:5672   **RabbitMQ**   Full AMQP connection URL. Format:
                                                                                       amqp://user:pass@host:port/vhost.
                                                                                       Injected via secret manager in
                                                                                       staging/production.

  **RABBITMQ_EXCHANGE**          **Optional**   marketeq.offers         **RabbitMQ**   Exchange name for all offer-service
                                                                                       events. Must match the exchange
                                                                                       consumed by contracts-service,
                                                                                       notification-service, and
                                                                                       messaging-service.

  **RABBITMQ_EXCHANGE_TYPE**     **Optional**   topic                   **RabbitMQ**   Exchange type. topic allows routing
                                                                                       key pattern matching.

  **RABBITMQ_PREFETCH**          **Optional**   10                      **RabbitMQ**   Consumer prefetch count. Limits
                                                                                       unacknowledged messages in flight.

  **RABBITMQ_QUEUE_DURABLE**     **Optional**   true                    **RabbitMQ**   Whether queues survive broker
                                                                                       restart. Must be true in all
                                                                                       non-local environments.

  **RABBITMQ_RECONNECT_DELAY**   **Optional**   5000                    **RabbitMQ**   Milliseconds to wait before
                                                                                       attempting reconnect after
                                                                                       connection loss.
  ------------------------------ -------------- ----------------------- -------------- -----------------------------------

+-----------------------------------------------------------------------+
| **5 Real-time --- Ably**                                              |
|                                                                       |
| WebSocket event publishing                                            |
+-----------------------------------------------------------------------+

  ------------------------- -------------- ------------- ------------ -------------------------
  **Variable**              **Req?**       **Default**   **Connects   **Description**
                                                         To**         

  **ABLY_API_KEY**          **Required**   ---           **Ably**     Ably API key for the
                                                                      Marketeq Ably app. Full
                                                                      key format:
                                                                      appId.keyId:secret. Used
                                                                      server-side only ---
                                                                      never exposed to clients.
                                                                      Injected via secret
                                                                      manager.

  **ABLY_CHANNEL_PREFIX**   **Optional**   offer:        **Ably**     Prefix for all Ably
                                                                      channel names. Full
                                                                      channel format:
                                                                      offer:{offerId}. Must
                                                                      match the prefix used by
                                                                      the frontend Ably
                                                                      integration.

  **ABLY_LOG_LEVEL**        **Dev Only**   0             **Ably**     Ably SDK log verbosity.
                                                                      0=none, 4=verbose. Set to
                                                                      0 in all non-local
                                                                      environments.
  ------------------------- -------------- ------------- ------------ -------------------------

+-----------------------------------------------------------------------+
| **6 Authentication --- JWT**                                          |
|                                                                       |
| Token validation config                                               |
+-----------------------------------------------------------------------+

  -------------------- -------------- ------------- ------------------ -------------------------
  **Variable**         **Req?**       **Default**   **Connects To**    **Description**

  **JWT_PUBLIC_KEY**   **Required**   ---           **auth-service**   RSA public key used to
                                                                       verify JWT signatures.
                                                                       Must match the private
                                                                       key used by auth-service
                                                                       to sign tokens. PEM
                                                                       format. Injected via
                                                                       secret manager.

  **JWT_ALGORITHM**    **Optional**   RS256         **auth-service**   JWT signing algorithm.
                                                                       Must match auth-service
                                                                       configuration. RS256 is
                                                                       the platform standard.
  -------------------- -------------- ------------- ------------------ -------------------------

+-----------------------------------------------------------------------+
| **7 Internal Service URLs**                                           |
|                                                                       |
| Base URLs for synchronous HTTP calls to upstream services             |
+-----------------------------------------------------------------------+

  ------------------------------ -------------- ----------------------- ---------------------- -------------------------
  **Variable**                   **Req?**       **Default**             **Connects To**        **Description**

  **LISTINGS_SERVICE_URL**       **Required**   http://localhost:3001   **listings-service**   Base URL for
                                                                                               listings-service. Used to
                                                                                               fetch suggested start
                                                                                               dates for scoped
                                                                                               projects. Must be set in
                                                                                               all environments.

  **PRICING_SERVICE_URL**        **Required**   http://localhost:3002   **pricing-service**    Base URL for
                                                                                               pricing-service. Used to
                                                                                               fetch FX rates for
                                                                                               currency display.

  **LEGAL_SERVICE_URL**          **Required**   http://localhost:3003   **legal-service**      Base URL for
                                                                                               legal-service. Used to
                                                                                               check NDA signed status
                                                                                               for a
                                                                                               client-talent-project
                                                                                               combination.

  **INTERNAL_SERVICE_TIMEOUT**   **Optional**   5000                    **All upstream**       HTTP request timeout in
                                                                                               milliseconds for all
                                                                                               internal service calls.
                                                                                               Default 5 seconds. If
                                                                                               upstream does not respond
                                                                                               within this window,
                                                                                               offer-service uses its
                                                                                               fallback behaviour (see
                                                                                               OS-29).

  **INTERNAL_SERVICE_API_KEY**   **Required**   ---                     **All upstream**       Shared API key used for
                                                                                               service-to-service
                                                                                               authentication. Sent as
                                                                                               X-Service-Key header on
                                                                                               all internal HTTP calls.
                                                                                               Injected via secret
                                                                                               manager.
  ------------------------------ -------------- ----------------------- ---------------------- -------------------------

+-----------------------------------------------------------------------+
| **8 Scheduler --- TTL & Expiry Jobs**                                 |
|                                                                       |
| Cron job configuration                                                |
+-----------------------------------------------------------------------+

  ----------------------- -------------- ------------- --------------- -------------------------
  **Variable**            **Req?**       **Default**   **Connects To** **Description**

  **EXPIRY_CRON**         **Optional**   \* \* \* \*   **Scheduler**   Cron expression for the
                                         \*                            expiry processor.
                                                                       Default: every minute.
                                                                       Evaluates all PENDING
                                                                       offers with expiresAt \<=
                                                                       NOW() and transitions
                                                                       them to EXPIRED.

  **WARNING_CRON**        **Optional**   0 \* \* \* \* **Scheduler**   Cron expression for the
                                                                       48h warning processor.
                                                                       Default: every hour.
                                                                       Finds PENDING offers
                                                                       where expiresAt \<=
                                                                       NOW() + 48h AND
                                                                       warning_sent_at IS NULL.

  **OUTBOX_CRON**         **Optional**   \*/10 \* \*   **Scheduler**   Cron expression for the
                                         \* \* \*                      outbox poller. Default:
                                                                       every 10 seconds. Picks
                                                                       up unpublished outbox
                                                                       events and publishes them
                                                                       to RabbitMQ.

  **SCHEDULER_ENABLED**   **Optional**   true          **Scheduler**   Master switch for all
                                                                       scheduled jobs. Set to
                                                                       false in test
                                                                       environments to prevent
                                                                       background jobs from
                                                                       interfering with test
                                                                       runs.
  ----------------------- -------------- ------------- --------------- -------------------------

+-----------------------------------------------------------------------+
| **9 Logging & Monitoring**                                            |
|                                                                       |
| Observability configuration                                           |
+-----------------------------------------------------------------------+

  ------------------------ -------------- ------------- ------------- -------------------------
  **Variable**             **Req?**       **Default**   **Connects    **Description**
                                                        To**          

  **LOG_LEVEL**            **Optional**   info          **Logging**   Minimum log level to
                                                                      emit. One of: error \|
                                                                      warn \| info \| debug \|
                                                                      verbose. Use debug or
                                                                      verbose locally only.

  **LOG_FORMAT**           **Optional**   json          **Logging**   Log output format. json
                                                                      for structured logging in
                                                                      staging/production.
                                                                      pretty for human-readable
                                                                      local dev output.

  **SENTRY_DSN**           **Optional**   ---           **Sentry**    Sentry DSN for error
                                                                      tracking. If not set,
                                                                      errors are logged only.
                                                                      Set in staging and
                                                                      production.

  **SENTRY_ENVIRONMENT**   **Optional**   development   **Sentry**    Environment label sent
                                                                      with Sentry events.
                                                                      Matches NODE_ENV by
                                                                      default.

  **TRACING_ENABLED**      **Optional**   false         **APM**       Enable distributed
                                                                      tracing. Set to true in
                                                                      staging and production.
                                                                      Requires APM agent
                                                                      configured at the
                                                                      platform level.

  **HEALTH_CHECK_PORT**    **Optional**   3005          **Health**    Port for /health and
                                                                      /ready endpoints.
                                                                      Defaults to PORT. Can be
                                                                      set separately if needed
                                                                      by Kubernetes liveness
                                                                      probes.
  ------------------------ -------------- ------------- ------------- -------------------------

+-----------------------------------------------------------------------+
| **10 Complete .env Files**                                            |
|                                                                       |
| Reference .env files for each environment                             |
+-----------------------------------------------------------------------+

**apps/offer-service/.env.example (commit this --- no secrets)**

+-------------------------------------------------------------------------------------------------+
| \# \-\-- Application                                                                            |
| \-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\--               |
|                                                                                                 |
| NODE_ENV=development                                                                            |
|                                                                                                 |
| PORT=3005                                                                                       |
|                                                                                                 |
| APP_NAME=offer-service                                                                          |
|                                                                                                 |
| API_PREFIX=v1                                                                                   |
|                                                                                                 |
| GLOBAL_THROTTLE_TTL=60000                                                                       |
|                                                                                                 |
| GLOBAL_THROTTLE_LIMIT=100                                                                       |
|                                                                                                 |
| \# \-\-- PostgreSQL                                                                             |
| \-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\--             |
|                                                                                                 |
| DB_HOST=localhost                                                                               |
|                                                                                                 |
| DB_PORT=5432                                                                                    |
|                                                                                                 |
| DB_NAME=marketeq                                                                                |
|                                                                                                 |
| DB_SCHEMA=offer_service                                                                         |
|                                                                                                 |
| DB_USERNAME=offer_user                                                                          |
|                                                                                                 |
| DB_PASSWORD=your_db_password_here                                                               |
|                                                                                                 |
| DB_SSL=false                                                                                    |
|                                                                                                 |
| DB_SYNC=false                                                                                   |
|                                                                                                 |
| DB_LOGGING=false                                                                                |
|                                                                                                 |
| DB_POOL_SIZE=10                                                                                 |
|                                                                                                 |
| \# \-\-- Redis                                                                                  |
| \-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\--   |
|                                                                                                 |
| REDIS_HOST=localhost                                                                            |
|                                                                                                 |
| REDIS_PORT=6379                                                                                 |
|                                                                                                 |
| REDIS_PASSWORD=                                                                                 |
|                                                                                                 |
| REDIS_TLS=false                                                                                 |
|                                                                                                 |
| REDIS_KEY_PREFIX=offer-svc:                                                                     |
|                                                                                                 |
| IDEMPOTENCY_TTL=86400                                                                           |
|                                                                                                 |
| \# \-\-- RabbitMQ                                                                               |
| \-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\--         |
|                                                                                                 |
| RABBITMQ_URL=amqp://guest:guest@localhost:5672                                                  |
|                                                                                                 |
| RABBITMQ_EXCHANGE=marketeq.offers                                                               |
|                                                                                                 |
| RABBITMQ_EXCHANGE_TYPE=topic                                                                    |
|                                                                                                 |
| RABBITMQ_PREFETCH=10                                                                            |
|                                                                                                 |
| RABBITMQ_QUEUE_DURABLE=true                                                                     |
|                                                                                                 |
| RABBITMQ_RECONNECT_DELAY=5000                                                                   |
|                                                                                                 |
| \# \-\-- Ably                                                                                   |
| \-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-- |
|                                                                                                 |
| ABLY_API_KEY=your_ably_api_key_here                                                             |
|                                                                                                 |
| ABLY_CHANNEL_PREFIX=offer:                                                                      |
|                                                                                                 |
| ABLY_LOG_LEVEL=0                                                                                |
|                                                                                                 |
| \# \-\-- Auth / JWT                                                                             |
| \-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\--             |
|                                                                                                 |
| JWT_PUBLIC_KEY=\"\-\-\-\--BEGIN PUBLIC KEY\-\-\-\--\\nYOUR_KEY_HERE\\n\-\-\-\--END PUBLIC       |
| KEY\-\-\-\--\"                                                                                  |
|                                                                                                 |
| JWT_ALGORITHM=RS256                                                                             |
|                                                                                                 |
| \# \-\-- Internal Service URLs \-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\--    |
|                                                                                                 |
| LISTINGS_SERVICE_URL=http://localhost:3001                                                      |
|                                                                                                 |
| PRICING_SERVICE_URL=http://localhost:3002                                                       |
|                                                                                                 |
| LEGAL_SERVICE_URL=http://localhost:3003                                                         |
|                                                                                                 |
| INTERNAL_SERVICE_TIMEOUT=5000                                                                   |
|                                                                                                 |
| INTERNAL_SERVICE_API_KEY=your_internal_api_key_here                                             |
|                                                                                                 |
| \# \-\-- Scheduler                                                                              |
| \-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\--           |
|                                                                                                 |
| EXPIRY_CRON=\* \* \* \* \*                                                                      |
|                                                                                                 |
| WARNING_CRON=0 \* \* \* \*                                                                      |
|                                                                                                 |
| OUTBOX_CRON=\*/10 \* \* \* \* \*                                                                |
|                                                                                                 |
| SCHEDULER_ENABLED=true                                                                          |
|                                                                                                 |
| \# \-\-- Logging & Monitoring \-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\--   |
|                                                                                                 |
| LOG_LEVEL=info                                                                                  |
|                                                                                                 |
| LOG_FORMAT=pretty                                                                               |
|                                                                                                 |
| SENTRY_DSN=                                                                                     |
|                                                                                                 |
| SENTRY_ENVIRONMENT=development                                                                  |
|                                                                                                 |
| TRACING_ENABLED=false                                                                           |
|                                                                                                 |
| HEALTH_CHECK_PORT=3005                                                                          |
+-------------------------------------------------------------------------------------------------+

**Production overrides (set via secret manager --- not in .env file)**

+-----------------------------------------------------------------------+
| \# These values are NEVER stored in .env files.                       |
|                                                                       |
| \# They are injected at runtime by the platform secret manager.       |
|                                                                       |
| DB_PASSWORD=\<injected\>                                              |
|                                                                       |
| RABBITMQ_URL=\<injected\>                                             |
|                                                                       |
| ABLY_API_KEY=\<injected\>                                             |
|                                                                       |
| JWT_PUBLIC_KEY=\<injected\>                                           |
|                                                                       |
| INTERNAL_SERVICE_API_KEY=\<injected\>                                 |
|                                                                       |
| REDIS_PASSWORD=\<injected\>                                           |
|                                                                       |
| SENTRY_DSN=\<injected\>                                               |
|                                                                       |
| \# Production environment overrides                                   |
|                                                                       |
| NODE_ENV=production                                                   |
|                                                                       |
| DB_SSL=true                                                           |
|                                                                       |
| REDIS_TLS=true                                                        |
|                                                                       |
| DB_LOGGING=false                                                      |
|                                                                       |
| ABLY_LOG_LEVEL=0                                                      |
|                                                                       |
| LOG_FORMAT=json                                                       |
|                                                                       |
| LOG_LEVEL=warn                                                        |
|                                                                       |
| TRACING_ENABLED=true                                                  |
|                                                                       |
| SENTRY_ENVIRONMENT=production                                         |
|                                                                       |
| SCHEDULER_ENABLED=true                                                |
+-----------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| **11 ConfigService Schema --- Production-Ready Implementation**       |
|                                                                       |
| Full Joi validation + typed registerAs + module registration +        |
| injection pattern                                                     |
+-----------------------------------------------------------------------+

This section replaces the original stub with the four files required to
wire up configuration in offer-service correctly. The service will
refuse to start if any Required variable is missing or fails a
validation rule. Follow the steps in order.

+-----------------------------------------------------------------------+
| Step 1 of 4 --- Install Joi.                                          |
|                                                                       |
| Run from the monorepo root before writing any code.                   |
|                                                                       |
| Joi provides runtime type checking and constraint validation for all  |
| env vars.                                                             |
+-----------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| \# Run from the monorepo root                                         |
|                                                                       |
| npm install joi                                                       |
|                                                                       |
| \# Verify installation                                                |
|                                                                       |
| npm list joi                                                          |
|                                                                       |
| \# Expected: joi@17.x.x                                               |
+-----------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| Step 2 of 4 --- Create the Joi validation schema.                     |
|                                                                       |
| This file defines the exact shape, type, and constraints for every    |
| env var.                                                              |
|                                                                       |
| ConfigModule runs this schema at bootstrap. Any failure exits the     |
| process immediately.                                                  |
|                                                                       |
| abortEarly: false ensures ALL validation errors are reported at once, |
| not just the first.                                                   |
+-----------------------------------------------------------------------+

  -----------------------------------------------------------------------
  **FILE: apps/offer-service/src/config/validation.schema.ts**

  -----------------------------------------------------------------------

+-----------------------------------------------------------------------------------------------+
| import \* as Joi from \'joi\';                                                                |
|                                                                                               |
| /\*\*                                                                                         |
|                                                                                               |
| \* Joi validation schema for all offer-service environment variables.                         |
|                                                                                               |
| \* Executed at service startup by ConfigModule.forRoot({ validationSchema }).                 |
|                                                                                               |
| \* If any Required variable is absent or any value fails its rule, the                        |
|                                                                                               |
| \* process throws and refuses to start.                                                       |
|                                                                                               |
| \*                                                                                            |
|                                                                                               |
| \* Conventions used here:                                                                     |
|                                                                                               |
| \* Required = Joi.string().required() / Joi.number().required() etc.                          |
|                                                                                               |
| \* = no .default() call                                                                       |
|                                                                                               |
| \* Optional = has .default(value)                                                             |
|                                                                                               |
| \* Dev Only = has .default() but we document it should not be set in prod                     |
|                                                                                               |
| \*/                                                                                           |
|                                                                                               |
| export const validationSchema = Joi.object({                                                  |
|                                                                                               |
| // \-\-- Application                                                                          |
| \-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\--         |
|                                                                                               |
| NODE_ENV: Joi.string()                                                                        |
|                                                                                               |
| .valid(\'development\', \'staging\', \'production\')                                          |
|                                                                                               |
| .default(\'development\'),                                                                    |
|                                                                                               |
| PORT: Joi.number().integer().min(1024).max(65535).default(3005),                              |
|                                                                                               |
| APP_NAME: Joi.string().default(\'offer-service\'),                                            |
|                                                                                               |
| API_PREFIX: Joi.string().default(\'v1\'),                                                     |
|                                                                                               |
| GLOBAL_THROTTLE_TTL: Joi.number().integer().min(1000).default(60000),                         |
|                                                                                               |
| GLOBAL_THROTTLE_LIMIT: Joi.number().integer().min(1).default(100),                            |
|                                                                                               |
| // \-\-- PostgreSQL                                                                           |
| \-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\--         |
|                                                                                               |
| DB_HOST: Joi.string().required(),                                                             |
|                                                                                               |
| DB_PORT: Joi.number().integer().default(5432),                                                |
|                                                                                               |
| DB_NAME: Joi.string().required(),                                                             |
|                                                                                               |
| DB_SCHEMA: Joi.string().default(\'offer_service\'),                                           |
|                                                                                               |
| DB_USERNAME: Joi.string().required(),                                                         |
|                                                                                               |
| DB_PASSWORD: Joi.string().required(),                                                         |
|                                                                                               |
| DB_SSL: Joi.boolean().default(false),                                                         |
|                                                                                               |
| // SAFETY: DB_SYNC must always be false in non-development environments.                      |
|                                                                                               |
| // TypeORM sync can DROP columns if entity definitions change.                                |
|                                                                                               |
| // Only migrations are permitted in staging and production.                                   |
|                                                                                               |
| DB_SYNC: Joi.boolean().default(false).when(\'NODE_ENV\', {                                    |
|                                                                                               |
| is: Joi.valid(\'staging\', \'production\'),                                                   |
|                                                                                               |
| then: Joi.valid(false).messages({                                                             |
|                                                                                               |
| \'any.only\': \'DB_SYNC must be false in staging and production. Use migrations.\',           |
|                                                                                               |
| }),                                                                                           |
|                                                                                               |
| }),                                                                                           |
|                                                                                               |
| DB_LOGGING: Joi.boolean().default(false),                                                     |
|                                                                                               |
| DB_POOL_SIZE: Joi.number().integer().min(1).max(100).default(10),                             |
|                                                                                               |
| // \-\-- Redis                                                                                |
| \-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-- |
|                                                                                               |
| REDIS_HOST: Joi.string().required(),                                                          |
|                                                                                               |
| REDIS_PORT: Joi.number().integer().default(6379),                                             |
|                                                                                               |
| REDIS_PASSWORD: Joi.string().allow(\'\').optional(),                                          |
|                                                                                               |
| REDIS_TLS: Joi.boolean().default(false),                                                      |
|                                                                                               |
| REDIS_KEY_PREFIX: Joi.string().default(\'offer-svc:\'),                                       |
|                                                                                               |
| IDEMPOTENCY_TTL: Joi.number().integer().min(60).default(86400),                               |
|                                                                                               |
| // \-\-- RabbitMQ                                                                             |
| \-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\--         |
|                                                                                               |
| RABBITMQ_URL: Joi.string().uri({ scheme: \[\'amqp\', \'amqps\'\] }).required(),               |
|                                                                                               |
| RABBITMQ_EXCHANGE: Joi.string().default(\'marketeq.offers\'),                                 |
|                                                                                               |
| RABBITMQ_EXCHANGE_TYPE:                                                                       |
| Joi.string().valid(\'direct\',\'topic\',\'fanout\',\'headers\').default(\'topic\'),           |
|                                                                                               |
| RABBITMQ_PREFETCH: Joi.number().integer().min(1).default(10),                                 |
|                                                                                               |
| RABBITMQ_QUEUE_DURABLE: Joi.boolean().default(true),                                          |
|                                                                                               |
| RABBITMQ_RECONNECT_DELAY: Joi.number().integer().min(100).default(5000),                      |
|                                                                                               |
| // \-\-- Ably                                                                                 |
| \-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-- |
|                                                                                               |
| ABLY_API_KEY: Joi.string().required(),                                                        |
|                                                                                               |
| ABLY_CHANNEL_PREFIX: Joi.string().default(\'offer:\'),                                        |
|                                                                                               |
| ABLY_LOG_LEVEL: Joi.number().integer().min(0).max(4).default(0),                              |
|                                                                                               |
| // \-\-- Auth / JWT                                                                           |
| \-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\--             |
|                                                                                               |
| JWT_PUBLIC_KEY: Joi.string().required(),                                                      |
|                                                                                               |
| JWT_ALGORITHM: Joi.string().valid(\'RS256\',\'RS384\',\'RS512\').default(\'RS256\'),          |
|                                                                                               |
| // \-\-- Internal Service URLs \-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\--    |
|                                                                                               |
| LISTINGS_SERVICE_URL: Joi.string().uri().required(),                                          |
|                                                                                               |
| PRICING_SERVICE_URL: Joi.string().uri().required(),                                           |
|                                                                                               |
| LEGAL_SERVICE_URL: Joi.string().uri().required(),                                             |
|                                                                                               |
| INTERNAL_SERVICE_TIMEOUT: Joi.number().integer().min(500).max(30000).default(5000),           |
|                                                                                               |
| INTERNAL_SERVICE_API_KEY: Joi.string().required(),                                            |
|                                                                                               |
| // \-\-- Scheduler                                                                            |
| \-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\--           |
|                                                                                               |
| EXPIRY_CRON: Joi.string().default(\'\* \* \* \* \*\'),                                        |
|                                                                                               |
| WARNING_CRON: Joi.string().default(\'0 \* \* \* \*\'),                                        |
|                                                                                               |
| OUTBOX_CRON: Joi.string().default(\'\*/10 \* \* \* \* \*\'),                                  |
|                                                                                               |
| SCHEDULER_ENABLED: Joi.boolean().default(true),                                               |
|                                                                                               |
| // \-\-- Logging & Monitoring \-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-- |
|                                                                                               |
| LOG_LEVEL:                                                                                    |
| Joi.string().valid(\'error\',\'warn\',\'info\',\'debug\',\'verbose\').default(\'info\'),      |
|                                                                                               |
| LOG_FORMAT: Joi.string().valid(\'json\',\'pretty\').default(\'json\'),                        |
|                                                                                               |
| SENTRY_DSN: Joi.string().uri().allow(\'\').optional(),                                        |
|                                                                                               |
| SENTRY_ENVIRONMENT: Joi.string().default(\'development\'),                                    |
|                                                                                               |
| TRACING_ENABLED: Joi.boolean().default(false),                                                |
|                                                                                               |
| HEALTH_CHECK_PORT: Joi.number().integer().default(3005),                                      |
|                                                                                               |
| });                                                                                           |
+-----------------------------------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| Step 3 of 4 --- Create the typed config namespace using registerAs.   |
|                                                                       |
| This is the single source of truth for reading any config value in    |
| service code.                                                         |
|                                                                       |
| The OfferConfig type at the bottom gives you full TypeScript          |
| autocomplete everywhere.                                              |
|                                                                       |
| Never call process.env directly after this file exists.               |
+-----------------------------------------------------------------------+

  -----------------------------------------------------------------------
  **FILE: apps/offer-service/src/config/offer.config.ts**

  -----------------------------------------------------------------------

+-----------------------------------------------------------------------+
| import { registerAs } from \'@nestjs/config\';                        |
|                                                                       |
| /\*\*                                                                 |
|                                                                       |
| \* Typed configuration namespace for offer-service, registered as     |
| \'offer\'.                                                            |
|                                                                       |
| \* Inject via ConfigService.get\<OfferConfig\>(\'offer\') in any      |
| provider.                                                             |
|                                                                       |
| \*                                                                    |
|                                                                       |
| \* All values have already been validated by validation.schema.ts at  |
| startup.                                                              |
|                                                                       |
| \* Never read process.env directly in a service, guard, or            |
| interceptor.                                                          |
|                                                                       |
| \*/                                                                   |
|                                                                       |
| export const offerConfig = registerAs(\'offer\', () =\> ({            |
|                                                                       |
| app: {                                                                |
|                                                                       |
| nodeEnv: process.env.NODE_ENV \|\| \'development\',                   |
|                                                                       |
| port: parseInt(process.env.PORT, 10) \|\| 3005,                       |
|                                                                       |
| name: process.env.APP_NAME \|\| \'offer-service\',                    |
|                                                                       |
| apiPrefix: process.env.API_PREFIX \|\| \'v1\',                        |
|                                                                       |
| throttleTtl: parseInt(process.env.GLOBAL_THROTTLE_TTL, 10) \|\|       |
| 60000,                                                                |
|                                                                       |
| throttleLimit: parseInt(process.env.GLOBAL_THROTTLE_LIMIT, 10) \|\|   |
| 100,                                                                  |
|                                                                       |
| isProduction: process.env.NODE_ENV === \'production\',                |
|                                                                       |
| isDevelopment: process.env.NODE_ENV === \'development\',              |
|                                                                       |
| },                                                                    |
|                                                                       |
| db: {                                                                 |
|                                                                       |
| host: process.env.DB_HOST,                                            |
|                                                                       |
| port: parseInt(process.env.DB_PORT, 10) \|\| 5432,                    |
|                                                                       |
| name: process.env.DB_NAME,                                            |
|                                                                       |
| schema: process.env.DB_SCHEMA \|\| \'offer_service\',                 |
|                                                                       |
| username: process.env.DB_USERNAME,                                    |
|                                                                       |
| password: process.env.DB_PASSWORD,                                    |
|                                                                       |
| ssl: process.env.DB_SSL === \'true\',                                 |
|                                                                       |
| sync: process.env.DB_SYNC === \'true\',                               |
|                                                                       |
| logging: process.env.DB_LOGGING === \'true\',                         |
|                                                                       |
| poolSize: parseInt(process.env.DB_POOL_SIZE, 10) \|\| 10,             |
|                                                                       |
| },                                                                    |
|                                                                       |
| redis: {                                                              |
|                                                                       |
| host: process.env.REDIS_HOST \|\| \'localhost\',                      |
|                                                                       |
| port: parseInt(process.env.REDIS_PORT, 10) \|\| 6379,                 |
|                                                                       |
| password: process.env.REDIS_PASSWORD \|\| undefined,                  |
|                                                                       |
| tls: process.env.REDIS_TLS === \'true\',                              |
|                                                                       |
| keyPrefix: process.env.REDIS_KEY_PREFIX \|\| \'offer-svc:\',          |
|                                                                       |
| idempotencyTtl: parseInt(process.env.IDEMPOTENCY_TTL, 10) \|\| 86400, |
|                                                                       |
| },                                                                    |
|                                                                       |
| rabbitmq: {                                                           |
|                                                                       |
| url: process.env.RABBITMQ_URL,                                        |
|                                                                       |
| exchange: process.env.RABBITMQ_EXCHANGE \|\| \'marketeq.offers\',     |
|                                                                       |
| exchangeType: process.env.RABBITMQ_EXCHANGE_TYPE \|\| \'topic\',      |
|                                                                       |
| prefetch: parseInt(process.env.RABBITMQ_PREFETCH, 10) \|\| 10,        |
|                                                                       |
| durable: process.env.RABBITMQ_QUEUE_DURABLE !== \'false\',            |
|                                                                       |
| reconnectDelay: parseInt(process.env.RABBITMQ_RECONNECT_DELAY, 10)    |
| \|\| 5000,                                                            |
|                                                                       |
| },                                                                    |
|                                                                       |
| ably: {                                                               |
|                                                                       |
| apiKey: process.env.ABLY_API_KEY,                                     |
|                                                                       |
| channelPrefix: process.env.ABLY_CHANNEL_PREFIX \|\| \'offer:\',       |
|                                                                       |
| logLevel: parseInt(process.env.ABLY_LOG_LEVEL, 10) \|\| 0,            |
|                                                                       |
| },                                                                    |
|                                                                       |
| auth: {                                                               |
|                                                                       |
| jwtPublicKey: process.env.JWT_PUBLIC_KEY,                             |
|                                                                       |
| jwtAlgorithm: process.env.JWT_ALGORITHM \|\| \'RS256\',               |
|                                                                       |
| },                                                                    |
|                                                                       |
| services: {                                                           |
|                                                                       |
| listingsUrl: process.env.LISTINGS_SERVICE_URL,                        |
|                                                                       |
| pricingUrl: process.env.PRICING_SERVICE_URL,                          |
|                                                                       |
| legalUrl: process.env.LEGAL_SERVICE_URL,                              |
|                                                                       |
| timeout: parseInt(process.env.INTERNAL_SERVICE_TIMEOUT, 10) \|\|      |
| 5000,                                                                 |
|                                                                       |
| apiKey: process.env.INTERNAL_SERVICE_API_KEY,                         |
|                                                                       |
| },                                                                    |
|                                                                       |
| scheduler: {                                                          |
|                                                                       |
| expiryCron: process.env.EXPIRY_CRON \|\| \'\* \* \* \* \*\',          |
|                                                                       |
| warningCron: process.env.WARNING_CRON \|\| \'0 \* \* \* \*\',         |
|                                                                       |
| outboxCron: process.env.OUTBOX_CRON \|\| \'\*/10 \* \* \* \* \*\',    |
|                                                                       |
| enabled: process.env.SCHEDULER_ENABLED !== \'false\',                 |
|                                                                       |
| },                                                                    |
|                                                                       |
| logging: {                                                            |
|                                                                       |
| level: process.env.LOG_LEVEL \|\| \'info\',                           |
|                                                                       |
| format: process.env.LOG_FORMAT \|\| \'json\',                         |
|                                                                       |
| sentryDsn: process.env.SENTRY_DSN \|\| undefined,                     |
|                                                                       |
| sentryEnv: process.env.SENTRY_ENVIRONMENT \|\| \'development\',       |
|                                                                       |
| tracingEnabled: process.env.TRACING_ENABLED === \'true\',             |
|                                                                       |
| },                                                                    |
|                                                                       |
| }));                                                                  |
|                                                                       |
| // Full typed shape of the offer config namespace.                    |
|                                                                       |
| // Use this type when injecting ConfigService to get autocomplete.    |
|                                                                       |
| export type OfferConfig = ReturnType\<typeof offerConfig\>;           |
+-----------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| Step 4 of 4 --- Register ConfigModule in AppModule.                   |
|                                                                       |
| This wires validation.schema.ts and offer.config.ts into the NestJS   |
| DI container.                                                         |
|                                                                       |
| ConfigModule.forRoot() must be called before any module that uses     |
| ConfigService.                                                        |
|                                                                       |
| isGlobal: true means you never need to import ConfigModule again in a |
| feature module.                                                       |
+-----------------------------------------------------------------------+

  -----------------------------------------------------------------------
  **FILE: apps/offer-service/src/app.module.ts**

  -----------------------------------------------------------------------

+-------------------------------------------------------------------------------------------------------------------------+
| import { Module } from \'@nestjs/common\';                                                                              |
|                                                                                                                         |
| import { ConfigModule } from \'@nestjs/config\';                                                                        |
|                                                                                                                         |
| import { TypeOrmModule } from \'@nestjs/typeorm\';                                                                      |
|                                                                                                                         |
| import { ScheduleModule } from \'@nestjs/schedule\';                                                                    |
|                                                                                                                         |
| import { offerConfig } from \'./config/offer.config\';                                                                  |
|                                                                                                                         |
| import { validationSchema } from \'./config/validation.schema\';                                                        |
|                                                                                                                         |
| import { databaseConfig } from \'./config/database.config\'; // see OS-15                                               |
|                                                                                                                         |
| import { OffersModule } from \'./offers/offers.module\';                                                                |
|                                                                                                                         |
| import { CounterOffersModule } from \'./counter-offers/counter-offers.module\';                                         |
|                                                                                                                         |
| import { OfferHistoryModule } from \'./offer-history/offer-history.module\';                                            |
|                                                                                                                         |
| import { OutboxModule } from \'./outbox/outbox.module\';                                                                |
|                                                                                                                         |
| import { SchedulerModule } from \'./scheduler/scheduler.module\';                                                       |
|                                                                                                                         |
| import { RealtimeModule } from \'./realtime/realtime.module\';                                                          |
|                                                                                                                         |
| \@Module({                                                                                                              |
|                                                                                                                         |
| imports: \[                                                                                                             |
|                                                                                                                         |
| //                                                                                                                      |
| \-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-- |
|                                                                                                                         |
| // Config --- must be first.                                                                                            |
|                                                                                                                         |
| // isGlobal: true ConfigService is injectable in every module.                                                          |
|                                                                                                                         |
| // cache: true Parse env vars once; avoid re-reading on every get().                                                    |
|                                                                                                                         |
| // expandVariables: true Support \${VAR} references in .env files.                                                      |
|                                                                                                                         |
| // validationSchema Joi runs at startup. Any failure exits the process.                                                 |
|                                                                                                                         |
| // validationOptions abortEarly: false = report ALL errors at once.                                                     |
|                                                                                                                         |
| // load: \[offerConfig\] Registers the typed namespace under the key \"offer\".                                         |
|                                                                                                                         |
| //                                                                                                                      |
| \-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-- |
|                                                                                                                         |
| ConfigModule.forRoot({                                                                                                  |
|                                                                                                                         |
| isGlobal: true,                                                                                                         |
|                                                                                                                         |
| cache: true,                                                                                                            |
|                                                                                                                         |
| expandVariables: true,                                                                                                  |
|                                                                                                                         |
| envFilePath: \'.env\',                                                                                                  |
|                                                                                                                         |
| validationSchema,                                                                                                       |
|                                                                                                                         |
| validationOptions: {                                                                                                    |
|                                                                                                                         |
| abortEarly: false,                                                                                                      |
|                                                                                                                         |
| allowUnknown: true,                                                                                                     |
|                                                                                                                         |
| stripUnknown: false,                                                                                                    |
|                                                                                                                         |
| },                                                                                                                      |
|                                                                                                                         |
| load: \[offerConfig\],                                                                                                  |
|                                                                                                                         |
| }),                                                                                                                     |
|                                                                                                                         |
| // TypeORM --- reads DB config from offerConfig.db via databaseConfig factory.                                          |
|                                                                                                                         |
| TypeOrmModule.forRootAsync(databaseConfig),                                                                             |
|                                                                                                                         |
| // Enables \@Cron decorators used by expiry and outbox scheduler jobs.                                                  |
|                                                                                                                         |
| ScheduleModule.forRoot(),                                                                                               |
|                                                                                                                         |
| OffersModule,                                                                                                           |
|                                                                                                                         |
| CounterOffersModule,                                                                                                    |
|                                                                                                                         |
| OfferHistoryModule,                                                                                                     |
|                                                                                                                         |
| OutboxModule,                                                                                                           |
|                                                                                                                         |
| SchedulerModule,                                                                                                        |
|                                                                                                                         |
| RealtimeModule,                                                                                                         |
|                                                                                                                         |
| \],                                                                                                                     |
|                                                                                                                         |
| })                                                                                                                      |
|                                                                                                                         |
| export class AppModule {}                                                                                               |
+-------------------------------------------------------------------------------------------------------------------------+

**How to inject and use ConfigService in any service class**

After the above four steps are complete, ConfigService is available
everywhere without any additional imports. Inject it via the constructor
and access config via the typed namespace. This pattern is the same in
every service, guard, interceptor, and module factory across the entire
offer-service codebase.

  -----------------------------------------------------------------------
  **FILE: apps/offer-service/src/offers/offers.service.ts (injection
  example)**

  -----------------------------------------------------------------------

+-----------------------------------------------------------------------+
| import { Injectable } from \'@nestjs/common\';                        |
|                                                                       |
| import { ConfigService } from \'@nestjs/config\';                     |
|                                                                       |
| import { OfferConfig } from \'../config/offer.config\';               |
|                                                                       |
| \@Injectable()                                                        |
|                                                                       |
| export class OffersService {                                          |
|                                                                       |
| constructor(                                                          |
|                                                                       |
| // ConfigService is provided globally --- no need to import           |
| ConfigModule here.                                                    |
|                                                                       |
| private readonly config: ConfigService,                               |
|                                                                       |
| ) {}                                                                  |
|                                                                       |
| // Helper: returns the typed \'offer\' namespace.                     |
|                                                                       |
| // All config access goes through this method.                        |
|                                                                       |
| private get cfg(): OfferConfig {                                      |
|                                                                       |
| return this.config.get\<OfferConfig\>(\'offer\');                     |
|                                                                       |
| }                                                                     |
|                                                                       |
| // \-\-- Example usages \-\--                                         |
|                                                                       |
| // Access RabbitMQ exchange name                                      |
|                                                                       |
| getExchange(): string {                                               |
|                                                                       |
| return this.cfg.rabbitmq.exchange; // -\> \"marketeq.offers\"         |
|                                                                       |
| }                                                                     |
|                                                                       |
| // Access internal service base URL                                   |
|                                                                       |
| getListingsUrl(): string {                                            |
|                                                                       |
| return this.cfg.services.listingsUrl;                                 |
|                                                                       |
| }                                                                     |
|                                                                       |
| // Access timeout for upstream calls                                  |
|                                                                       |
| getServiceTimeout(): number {                                         |
|                                                                       |
| return this.cfg.services.timeout; // -\> 5000                         |
|                                                                       |
| }                                                                     |
|                                                                       |
| // Check environment                                                  |
|                                                                       |
| isProduction(): boolean {                                             |
|                                                                       |
| return this.cfg.app.isProduction;                                     |
|                                                                       |
| }                                                                     |
|                                                                       |
| // Check if scheduler is active (used by cron jobs to self-disable in |
| tests)                                                                |
|                                                                       |
| isSchedulerEnabled(): boolean {                                       |
|                                                                       |
| return this.cfg.scheduler.enabled;                                    |
|                                                                       |
| }                                                                     |
|                                                                       |
| // Access Ably channel prefix for building channel names              |
|                                                                       |
| buildChannelName(offerId: string): string {                           |
|                                                                       |
| return \`\${this.cfg.ably.channelPrefix}\${offerId}\`;                |
|                                                                       |
| // -\> \"offer:a1b2c3d4-\...\"                                        |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
+-----------------------------------------------------------------------+

**What startup validation failure looks like**

If any Required variable is missing or fails its Joi rule, NestJS prints
all errors and exits before serving any requests. This is intentional
--- a misconfigured service must not start silently.

+-----------------------------------------------------------------------+
| \# Example: DB_PASSWORD missing, RABBITMQ_URL has wrong scheme        |
|                                                                       |
| \[Nest\] ERROR \[ExceptionHandler\] Config validation error:          |
|                                                                       |
| \"DB_PASSWORD\" is required                                           |
|                                                                       |
| \"RABBITMQ_URL\" must be a valid uri with a scheme matching the       |
| amqp\|amqps pattern                                                   |
|                                                                       |
| Process exited with code 1                                            |
|                                                                       |
| \# Fix: set the correct values in .env and restart.                   |
|                                                                       |
| \# Never suppress this error. Fix the environment instead.            |
+-----------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| NEVER set DB_SYNC=true in staging or production.                      |
|                                                                       |
| TypeORM will attempt to reconcile entity definitions with the live    |
| schema,                                                               |
|                                                                       |
| which can silently drop columns. The Joi schema enforces this: it     |
| will reject                                                           |
|                                                                       |
| DB_SYNC=true when NODE_ENV is staging or production and exit the      |
| process.                                                              |
+-----------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| **12 Local Development Setup**                                        |
|                                                                       |
| Step-by-step guide to running offer-service locally                   |
+-----------------------------------------------------------------------+

**Prerequisites**

The following must already be running before starting offer-service
locally. All are available via the monorepo docker-compose.

  ---------------------- --------------- ----------------------------------------
  **Service**            **Default       **Notes**
                         Port**          

  **PostgreSQL**         5432            offer_service schema must be created.
                                         Run migrations after first start.

  **Redis**              6379            No auth required in local dev.

  **RabbitMQ**           5672 / 15672    15672 is the management UI. Create
                                         marketeq.offers exchange on first run.

  **listings-service**   3001            Required for start date suggestions on
                                         scoped projects.

  **pricing-service**    3002            Required for FX rate display.

  **legal-service**      3003            Required for NDA status checks.

  **auth-service**       3000            Required for JWT public key. Ensure
                                         JWT_PUBLIC_KEY matches auth-service
                                         signing key.
  ---------------------- --------------- ----------------------------------------

**Step 1 --- Clone and install**

+-----------------------------------------------------------------------+
| git clone git@github.com:marketeq/marketeq-projects-nestjs.git        |
|                                                                       |
| cd marketeq-projects-nestjs                                           |
|                                                                       |
| npm install                                                           |
+-----------------------------------------------------------------------+

**Step 2 --- Start infrastructure**

+-----------------------------------------------------------------------+
| docker-compose up -d postgres redis rabbitmq                          |
|                                                                       |
| docker-compose ps                                                     |
+-----------------------------------------------------------------------+

**Step 3 --- Configure environment**

+-----------------------------------------------------------------------+
| cd apps/offer-service                                                 |
|                                                                       |
| cp .env.example .env                                                  |
|                                                                       |
| \# Edit .env and fill in all Required variables:                      |
|                                                                       |
| \# DB_HOST, DB_NAME, DB_USERNAME, DB_PASSWORD                         |
|                                                                       |
| \# REDIS_HOST                                                         |
|                                                                       |
| \# RABBITMQ_URL                                                       |
|                                                                       |
| \# ABLY_API_KEY                                                       |
|                                                                       |
| \# JWT_PUBLIC_KEY (copy PEM from auth-service .env)                   |
|                                                                       |
| \# LISTINGS_SERVICE_URL, PRICING_SERVICE_URL, LEGAL_SERVICE_URL       |
|                                                                       |
| \# INTERNAL_SERVICE_API_KEY                                           |
+-----------------------------------------------------------------------+

**Step 4 --- Create database schema and run migrations**

+-----------------------------------------------------------------------+
| psql -h localhost -U postgres -d marketeq -c \"CREATE SCHEMA IF NOT   |
| EXISTS offer_service;\"                                               |
|                                                                       |
| npm run migration:run \--project=offer-service                        |
+-----------------------------------------------------------------------+

**Step 5 --- Seed development data (optional)**

  -----------------------------------------------------------------------
  npm run seed:run \--project=offer-service

  -----------------------------------------------------------------------

**Step 6 --- Start the service**

+-----------------------------------------------------------------------+
| npm run start:dev \--project=offer-service                            |
|                                                                       |
| \# Or from monorepo root                                              |
|                                                                       |
| npx nest start offer-service \--watch                                 |
+-----------------------------------------------------------------------+

**Step 7 --- Verify**

+-----------------------------------------------------------------------+
| curl http://localhost:3005/v1/health                                  |
|                                                                       |
| \# Expected: { \"status\": \"ok\", \"service\": \"offer-service\" }   |
|                                                                       |
| curl http://localhost:3005/v1/ready                                   |
|                                                                       |
| \# Expected: { \"status\": \"ready\", \"db\": \"connected\",          |
| \"redis\": \"connected\",                                             |
|                                                                       |
| \# \"rabbitmq\": \"connected\", \"ably\": \"connected\" }             |
+-----------------------------------------------------------------------+

**Common Local Dev Issues**

  ---------------------- ------------------------------------------------
  **Issue**              **Fix**

  **Config validation    Read ALL lines in the error output. Each line
  error at startup**     names the failing variable and rule. Fix in .env
                         and restart. Do not suppress the error.

  **\"DB_PASSWORD\" is   Copy .env.example to .env and fill in all
  required**             Required variables.

  **Migrations fail ---  Run: psql -h localhost -U postgres -d marketeq
  schema does not        -c \"CREATE SCHEMA IF NOT EXISTS
  exist**                offer_service;\"

  **JWT \"invalid        JWT_PUBLIC_KEY must match the private key
  signature\"**          auth-service signs with. Copy the public key
                         from auth-service .env.

  **RabbitMQ exchange    Open http://localhost:15672 (management UI).
  not found**            Create exchange: marketeq.offers, type: topic,
                         durable: true.

  **listings-service 503 listings-service is not running. Start it
  on start date fetch**  separately. Offer creation still works --- start
                         date falls back to manual entry.

  **Scheduler fires      Set SCHEDULER_ENABLED=false in the test
  during tests**         environment to prevent cron jobs from
                         interfering with test assertions.
  ---------------------- ------------------------------------------------
