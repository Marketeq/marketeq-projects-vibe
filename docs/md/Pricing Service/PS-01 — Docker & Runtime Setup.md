PS-01

**Docker & Runtime Setup**

Service: pricing-service

Marketeq Backend --- marketeq-projects-nestjs

# **1. Purpose**

This document covers everything required to build and run the
pricing-service container. It covers the Dockerfile, the full
environment variable set, the health check endpoint, npm dependencies,
local development setup, and Supabase deployment notes.

pricing-service is a new microservice. The repo entry is
apps/pricing-service/. Module wiring is in PS-02. Entity and DTO
definitions are in PS-03. API endpoints are in PS-04. Redis cache
strategy and FX API integration are in PS-05.

> *Important: pricing-service must be deployed and healthy before
> listings-service is deployed. listings-service calls pricing-service
> synchronously during Step 4 of the job creation wizard for every
> budget calculator update. If pricing-service is unavailable at
> startup, the budget calculator will degrade to stale-indicator mode
> immediately on first use.*

# **2. Prerequisites**

- Node.js 20 is installed (same version used by all other services in
  the monorepo).

- The shared PostgreSQL instance on Supabase is accessible.
  pricing-service uses its own table prefix (ps\_) within the shared
  database.

- Redis is running and accessible. pricing-service requires Redis for
  rate and FX rate caching. The same Redis instance used by other
  services in the monorepo is used here.

- The shared fawazahmed0/exchange-api self-hosted container is running.
  This is the same instance used by earnings-service and payout-service.
  The base URL is set via FX_API_URL.

- transaction-service is deployed and reachable. pricing-service calls
  transaction-service via its daily scheduled job to pull payout data
  for rate averaging.

- The shared JWT_SECRET is the same value used across all other
  services.

# **3. Dockerfile**

Place this file at apps/pricing-service/Dockerfile.

> apps/pricing-service/Dockerfile
>
> FROM node:20-alpine
>
> WORKDIR /usr/src/app
>
> COPY package\*.json ./
>
> RUN npm ci
>
> COPY . .
>
> RUN npm run build
>
> EXPOSE \$PORT
>
> CMD \[\"node\", \"dist/apps/pricing-service/src/main.js\"\]

# **4. package.json**

Place this file at apps/pricing-service/package.json.

> apps/pricing-service/package.json
>
> {
>
> \"name\": \"pricing-service\",
>
> \"version\": \"1.0.0\",
>
> \"private\": true,
>
> \"scripts\": {
>
> \"build\": \"nest build pricing-service\",
>
> \"start:dev\": \"nest start pricing-service \--watch\",
>
> \"start:prod\": \"node dist/apps/pricing-service/src/main.js\",
>
> \"test\": \"jest \--config jest.config.js\"
>
> },
>
> \"dependencies\": {
>
> \"@nestjs/axios\": \"\^3.0.0\",
>
> \"@nestjs/common\": \"\^10.0.0\",
>
> \"@nestjs/config\": \"\^3.0.0\",
>
> \"@nestjs/core\": \"\^10.0.0\",
>
> \"@nestjs/platform-express\": \"\^10.0.0\",
>
> \"@nestjs/schedule\": \"\^4.0.0\",
>
> \"@nestjs/typeorm\": \"\^10.0.0\",
>
> \"class-transformer\": \"\^0.5.0\",
>
> \"class-validator\": \"\^0.14.0\",
>
> \"ioredis\": \"\^5.0.0\",
>
> \"pg\": \"\^8.0.0\",
>
> \"reflect-metadata\": \"\^0.1.0\",
>
> \"rxjs\": \"\^7.0.0\",
>
> \"typeorm\": \"\^0.3.0\"
>
> },
>
> \"devDependencies\": {
>
> \"@types/node\": \"\^20.0.0\",
>
> \"typescript\": \"\^5.0.0\"
>
> }
>
> }
>
> *Important: ioredis is the Redis client library. \@nestjs/schedule
> provides the \@Cron decorator used by the daily rate refresh job and
> the hourly FX rate refresh job. Both are pricing-service-specific
> dependencies.*

# **5. Health Check Endpoint**

The health endpoint is registered in app.module.ts at the root level. It
must respond with HTTP 200 and the body below within 10 seconds of
container start.

> apps/pricing-service/src/health/health.controller.ts
>
> import { Controller, Get } from \'@nestjs/common\';
>
> \@Controller()
>
> export class HealthController {
>
> \@Get(\'health\')
>
> health(): { status: string } {
>
> return { status: \'ok\' };
>
> }
>
> }

Verify after every deployment:

> curl -f http://localhost:\$PORT/health
>
> \# Expected: {\"status\":\"ok\"}

# **6. Environment Variables**

All variables below are required unless marked optional. Set them in the
Supabase dashboard under pricing-service before deploying. Variables are
listed alphabetically as required by the Documentation Authoring
Playbook.

  ---------------------------------------------------------------------------------------------
  **Variable**                 **Description**              **Example Value**
  ---------------------------- ---------------------------- -----------------------------------
  DATABASE_URL                 Shared PostgreSQL connection postgres://user:pass@host:5432/db
                               string. pricing-service uses 
                               its own tables (ps\_\*       
                               prefix) within the shared    
                               Supabase instance.           

  FX_API_FALLBACK_URL          Base URL of the              https://api.frankfurter.app
                               Frankfurter.app fallback FX  
                               API. Used when the primary   
                               fawazahmed0 instance is      
                               unreachable. Public API ---  
                               no authentication required.  

  FX_API_URL                   Base URL of the self-hosted  http://fx-api:8080
                               fawazahmed0/exchange-api     
                               container. Shared with       
                               earnings-service and         
                               payout-service. Must be the  
                               same URL used by those       
                               services.                    

  FX_CACHE_TTL_SECONDS         Redis TTL for each cached    3600
                               exchange rate pair. Default  
                               3600 (1 hour). After TTL     
                               expires the next request     
                               triggers a fresh fetch from  
                               the FX API.                  

  JWT_SECRET                   Shared JWT secret. Used to   supersecret
                               validate inbound JWTs on all 
                               protected endpoints. Must    
                               match the value used by      
                               auth-service and all other   
                               services.                    

  PORT                         HTTP port exposed by the     3016
                               container. Must match the    
                               Supabase health check port   
                               configuration.               

  RATE_CACHE_TTL_SECONDS       Redis TTL for cached         86400
                               platform rate averages.      
                               Default 86400 (24 hours).    
                               After expiry the next        
                               request triggers a           
                               PostgreSQL query and         
                               re-populates the cache.      

  RATE_DATA_WINDOW_DAYS        Number of days of            90
                               transaction history to use   
                               when computing platform rate 
                               averages. Default 90. A      
                               wider window smooths         
                               outliers but is slower to    
                               reflect market changes.      

  RATE_STALE_THRESHOLD_HOURS   Number of hours after which  24
                               a PlatformRateAverage record 
                               is considered stale and      
                               returned with is_stale: true 
                               in the API response. Default 
                               24.                          

  REDIS_URL                    Redis connection string.     redis://host:6379
                               Used for both the rate cache 
                               and the FX rate cache. Same  
                               Redis instance as other      
                               services in the monorepo.    

  TRANSACTION_SERVICE_URL      Internal base URL of         http://transaction-service:3011
                               transaction-service. Called  
                               by the daily rate refresh    
                               scheduled job to fetch       
                               aggregated payout data for   
                               rate average computation.    
  ---------------------------------------------------------------------------------------------

> *Warning: Never commit DATABASE_URL, JWT_SECRET, or REDIS_URL to the
> repository. Set these exclusively in the Supabase environment
> dashboard.*

# **7. Local Development**

## **7.1 Install Dependencies**

> \# Run from the monorepo root
>
> npm install

## **7.2 Configure Environment**

Create apps/pricing-service/.env. Do not commit this file --- it is
covered by .gitignore.

> apps/pricing-service/.env (local only --- never commit)
>
> DATABASE_URL=postgres://user:pass@localhost:5432/marketeq
>
> FX_API_FALLBACK_URL=https://api.frankfurter.app
>
> FX_API_URL=http://localhost:8080
>
> FX_CACHE_TTL_SECONDS=3600
>
> JWT_SECRET=local_dev_secret
>
> PORT=3016
>
> RATE_CACHE_TTL_SECONDS=86400
>
> RATE_DATA_WINDOW_DAYS=90
>
> RATE_STALE_THRESHOLD_HOURS=24
>
> REDIS_URL=redis://localhost:6379
>
> TRANSACTION_SERVICE_URL=http://localhost:3011
>
> *Important: Redis must be running locally before starting
> pricing-service. The service will throw a connection error on startup
> if Redis is unreachable. Start Redis with: docker run -p 6379:6379
> redis:7-alpine*

## **7.3 Start the Service**

> \# Run from the monorepo root
>
> npm run start:dev \-- \--projects pricing-service

The service starts on PORT 3016 unless overridden. Confirm the following
routes appear in the startup log:

> RouterExplorer {
>
> Mapped { /health, GET }
>
> Mapped { /v1/rates, GET }
>
> Mapped { /v1/rates/price-guide, GET }
>
> Mapped { /v1/budget/calculate, POST }
>
> Mapped { /v1/currency/convert, GET }
>
> Mapped { /v1/currency/rates, GET }
>
> }

The startup log should also show the two scheduled jobs registered:

> SchedulerRegistry: CronJob \"refreshPlatformRates\" registered (daily
> at 02:00 UTC)
>
> SchedulerRegistry: CronJob \"refreshFxRates\" registered (every hour)

## **7.4 Smoke Tests**

> \# 1. Health check
>
> curl http://localhost:3016/health
>
> \# Expected: {\"status\":\"ok\"}
>
> \# 2. Get rates for a known role/region combination (requires DB seed
> data)
>
> curl
> \"http://localhost:3016/v1/rates?role=UX+Designer&location=United+States&experience=mid&schedule=full_time\"
>
> \# Expected: { \"hourlyMedianUsdCents\": \<number\>,
> \"hourlyLowUsdCents\": \<number\>,
>
> \# \"hourlyHighUsdCents\": \<number\>, \"is_stale\": false }
>
> \# Or with no seed data: { \"hourlyMedianUsdCents\": null,
> \"no_data\": true }
>
> \# 3. Currency conversion (USD to EUR)
>
> curl
> \"http://localhost:3016/v1/currency/convert?amount=100&from=USD&to=EUR\"
>
> \# Expected: { \"amount\": 100, \"converted\": \<float\>, \"rate\":
> \<float\>,
>
> \# \"from\": \"USD\", \"to\": \"EUR\" }
>
> \# 4. Get all cached FX rates
>
> curl http://localhost:3016/v1/currency/rates
>
> \# Expected: { \"rates\": { \"EUR\": \<float\>, \"GBP\": \<float\>,
> \... }, \"base\": \"USD\" }

# **8. Local Docker Build**

Validate the production Docker build locally before pushing to Supabase.
Run from the monorepo root.

> \# Build the pricing-service image
>
> docker build \\
>
> -f apps/pricing-service/Dockerfile \\
>
> -t pricing-service:local \\
>
> .
>
> \# Run the container
>
> docker run -p 3016:3016 \\
>
> -e PORT=3016 \\
>
> -e
> DATABASE_URL=\"postgres://user:pass@host.docker.internal:5432/marketeq\"
> \\
>
> -e REDIS_URL=\"redis://host.docker.internal:6379\" \\
>
> -e JWT_SECRET=\"local_dev_secret\" \\
>
> -e FX_API_URL=\"http://host.docker.internal:8080\" \\
>
> -e FX_API_FALLBACK_URL=\"https://api.frankfurter.app\" \\
>
> -e FX_CACHE_TTL_SECONDS=\"3600\" \\
>
> -e RATE_CACHE_TTL_SECONDS=\"86400\" \\
>
> -e RATE_DATA_WINDOW_DAYS=\"90\" \\
>
> -e RATE_STALE_THRESHOLD_HOURS=\"24\" \\
>
> -e TRANSACTION_SERVICE_URL=\"http://host.docker.internal:3011\" \\
>
> pricing-service:local
>
> \# Verify
>
> curl http://localhost:3016/health
>
> *Important: Use host.docker.internal to reach services on your local
> machine from within the container (Mac and Windows). On Linux use
> \--network host and replace host.docker.internal with localhost.*

# **9. Supabase Deployment Notes**

## **9.1 Create the Service**

- Navigate to Supabase → your project → Edge Functions / Services → Add
  Service.

- Name the service pricing-service.

- Set the Dockerfile path to apps/pricing-service/Dockerfile.

- Add all environment variables from Section 6.

- Set the health check path to /health, success codes 200--299, timeout
  10s.

- Set the container port to match the PORT environment variable (3016).

## **9.2 Deploy Order**

  --------------------------------------------------------------------------
  **Order**   **Service**           **Reason**
  ----------- --------------------- ----------------------------------------
  1           legal-service         Must be healthy before listings-service.
                                    Synchronous dependency.

  2           pricing-service       Must be healthy before listings-service.
                                    Synchronous dependency for budget
                                    calculator.

  3           listings-service      Depends on both legal-service and
                                    pricing-service.
  --------------------------------------------------------------------------

## **9.3 Health Check Configuration**

  -----------------------------------------------------------------------
  **Setting**            **Value**
  ---------------------- ------------------------------------------------
  Health check path      /health

  Success codes          200--299

  Timeout                10s

  Container port         Must match PORT environment variable (3016). A
                         mismatch causes health check failure and
                         automatic deployment rollback.
  -----------------------------------------------------------------------

## **9.4 Post-Deploy Verification**

- GET /health returns {\"status\":\"ok\"} within 10 seconds of container
  start.

- GET /v1/rates with a known role and region returns a rate object. If
  no seed data exists yet this returns no_data: true which is acceptable
  on first deploy.

- GET /v1/currency/convert with a USD-to-EUR conversion returns a
  converted amount. This confirms the FX API or fallback is reachable.

- Redis connectivity --- confirm the hourly FX rate refresh job runs
  within 60 seconds of startup. The startup log should show: \"FX rates
  refreshed: N currency pairs cached.\"

- transaction-service connectivity --- the daily rate refresh runs at
  02:00 UTC. Confirm it is scheduled by checking the startup log for:
  SchedulerRegistry: CronJob \"refreshPlatformRates\" registered.

# **10. Database Schema Initialisation**

pricing-service uses TypeORM with synchronize: false in production. Run
migrations manually after the first deployment.

> \# Run migrations from the monorepo root after first deployment
>
> npm run typeorm:migrate \-- \--dataSource
> apps/pricing-service/src/data-source.ts
>
> \# Expected tables created:
>
> \# ps_platform_rate_averages
>
> \# ps_currency_rates
>
> *Important: All pricing-service tables are prefixed ps\_ to avoid
> collisions with other services in the shared Supabase database. Never
> enable TypeORM synchronize: true in production.*

# **11. References**

- PS-00 --- Service Overview & Repo Placement

- PS-02 --- Folder Structure & Bootstrapping --- app.module.ts wiring
  and Redis config

- PS-03 --- Data Models & DTOs --- entity definitions used in migrations

- PS-05 --- Integrations & Events --- FX API integration and Redis cache
  strategy

- JL-00 --- Sprint Architecture Overview --- pricing-service in the full
  service map

- JL-02 --- listings-service Docker & Runtime Setup ---
  PRICING_SERVICE_URL environment variable

- Marketeq Core Backend --- Technical Architecture Overview &
  Documentation Standards
