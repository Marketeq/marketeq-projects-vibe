**Marketeq Home Page**

Deployment Notes

*Supabase configuration, Docker setup, environment variables, CI/CD
pipeline, and production deployment checklist*

Date: April 5, 2026

Scope: Backend Only

**Table of Contents**

**1. Infrastructure Overview**

The Marketeq Home Page backend is built on a microservices architecture
with separate services for the API gateway and CMS, all connected to
shared managed services.

**1.1 Architecture Diagram**

  -----------------------------------------------------------------------
  Internet\
  ↓\
  Cloudflare (future CDN)\
  ↓\
  API Gateway (NestJS) ←→ PostgreSQL (Supabase)\
  ←→ Redis (Upstash)\
  ←→ RabbitMQ (CloudAMQP)\
  ←→ CMS Service (Payload)\
  \
  CMS Admin Console ←→ CMS Service (Payload) ←→ PostgreSQL (Supabase, cms
  schema)\
  ←→ R2 (Cloudflare)\
  ←→ RabbitMQ (CloudAMQP)

  -----------------------------------------------------------------------

**1.2 Service Architecture**

-   API Gateway: NestJS microservice handling all backend API requests
    and business logic

-   CMS Service: Payload CMS running in headless mode, managing content
    and media

-   Database: Supabase managed PostgreSQL with schema-level isolation
    (public and cms schemas)

-   Cache Layer: Upstash managed Redis for session and data caching

-   Message Broker: CloudAMQP managed RabbitMQ for async job processing

-   Media Storage: Cloudflare R2 for CMS-managed media files

-   Deployment: Both API Gateway and CMS Service deployed as Docker
    containers

**2. Supabase Configuration**

Supabase provides our managed PostgreSQL database with built-in
connection pooling and direct access for migrations.

**2.1 Project Setup**

-   Single Supabase project for the entire Marketeq Home Page platform

-   Connection pooling via PgBouncer: use pooled connection string for
    all application code

-   Direct connection string: reserved for database migrations only

  -----------------------------------------------------------------------
  **Note:** Keep PgBouncer pooled URL separate from direct URL. Using
  direct URL in application code can exhaust connections quickly.

  -----------------------------------------------------------------------

**2.2 Schema Isolation**

Two schemas in the same Supabase project isolate concerns without
creating separate database instances:

-   public schema: Contains all NestJS API entities, managed via TypeORM
    migrations

-   cms schema: Contains all Payload CMS collections, auto-migrated on
    CMS startup

-   No cross-schema foreign keys: relationships are joined at the
    application level to maintain independent deployment cycles

**2.3 Database Migrations**

-   **Payload CMS:** Auto-migrates on service startup. Creates and
    alters tables in the cms schema automatically. No manual
    intervention required.

-   **NestJS/TypeORM:** Requires manual migrations using TypeORM CLI.
    Run from the api-gateway directory.

Run TypeORM migrations:

  -----------------------------------------------------------------------
  \# From api-gateway directory\
  pnpm typeorm migration:run

  -----------------------------------------------------------------------

-   **Homepage Schema:** The homepage uses existing listings and
    categories tables. No new migration needed for homepage deployment.

**2.4 Connection String Format**

Two connection strings with different purposes:

  --------------------------------------------------------------------------------------------------------
  \# Pooled (for application use)\
  postgresql://postgres.\[PROJECT_REF\]:\[PASSWORD\]@aws-0-\[REGION\].pooler.supabase.com:6543/postgres\
  \
  \# Direct (for migrations only)\
  postgresql://postgres:\[PASSWORD\]@db.\[PROJECT_REF\].supabase.co:5432/postgres

  --------------------------------------------------------------------------------------------------------

**3. Docker Configuration**

Both API Gateway and CMS Service are containerized using multi-stage
builds for minimal image size.

**3.1 API Gateway Dockerfile**

**File:** apps/api-gateway/Dockerfile

  -----------------------------------------------------------------------
  FROM node:20-alpine AS builder\
  WORKDIR /app\
  COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./\
  COPY apps/api-gateway/package.json apps/api-gateway/\
  COPY shared/ shared/\
  RUN corepack enable && pnpm install \--frozen-lockfile\
  COPY apps/api-gateway/ apps/api-gateway/\
  RUN pnpm \--filter api-gateway build\
  \
  FROM node:20-alpine\
  WORKDIR /app\
  COPY \--from=builder /app/apps/api-gateway/dist ./dist\
  COPY \--from=builder /app/node_modules ./node_modules\
  COPY \--from=builder /app/shared ./shared\
  EXPOSE 3000\
  CMD \[\"node\", \"dist/main.js\"\]

  -----------------------------------------------------------------------

**3.2 CMS Service Dockerfile**

**File:** apps/cms-service/Dockerfile

  -----------------------------------------------------------------------
  FROM node:20-alpine AS builder\
  WORKDIR /app\
  COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./\
  COPY apps/cms-service/package.json apps/cms-service/\
  COPY shared/ shared/\
  RUN corepack enable && pnpm install \--frozen-lockfile\
  COPY apps/cms-service/ apps/cms-service/\
  RUN pnpm \--filter cms-service build\
  \
  FROM node:20-alpine\
  WORKDIR /app\
  COPY \--from=builder /app/apps/cms-service/dist ./dist\
  COPY \--from=builder /app/node_modules ./node_modules\
  COPY \--from=builder /app/shared ./shared\
  EXPOSE 3001\
  CMD \[\"node\", \"dist/main.js\"\]

  -----------------------------------------------------------------------

**3.3 Docker Compose (Local Development)**

**File:** docker-compose.yml

Full docker-compose.yml with all local development services:

-   postgres: PostgreSQL 15 image on port 5432 with data persistence
    volume

-   rabbitmq: RabbitMQ 3 with management UI on ports 5672 (AMQP) and
    15672 (management)

-   redis: Redis 7 on port 6379

-   api-gateway: Builds and runs API Gateway, depends on postgres,
    rabbitmq, redis

-   cms-service: Builds and runs CMS Service, depends on postgres,
    rabbitmq

**3.4 Docker Build and Run Commands**

  -----------------------------------------------------------------------
  \# Build all services\
  docker-compose build\
  \
  \# Start all services in background\
  docker-compose up -d\
  \
  \# View logs for specific service\
  docker-compose logs -f api-gateway\
  docker-compose logs -f cms-service\
  \
  \# Stop all services\
  docker-compose down\
  \
  \# Reset data (deletes all database data - be careful!)\
  docker-compose down -v

  -----------------------------------------------------------------------

**4. Environment Variables --- Complete Reference**

All required and optional environment variables for both services. Set
these in your production secrets manager before deployment.

**4.1 API Gateway Environment Variables**

  -------------------- ---------------------- ---------------------------------
  **Variable**         **Required**           **Description**

  DATABASE_URL         Yes                    PostgreSQL connection string (use
                                              Supabase pooled URL)

  REDIS_URL            Yes                    Upstash Redis connection string

  RABBITMQ_URL         Yes                    CloudAMQP RabbitMQ connection
                                              string

  CMS_SERVICE_URL      Yes                    Internal URL of CMS service
                                              (http://localhost:3001 for dev)

  HOMEPAGE_CACHE_TTL   No                     Homepage cache TTL in seconds
                                              (default: 300)

  PREVIEW_SECRET       Yes                    Shared secret for preview mode
                                              authentication (min 32 chars)

  PORT                 No                     API gateway listen port (default:
                                              3000)

  NODE_ENV             No                     Environment: development or
                                              production (default: development)

  LOG_LEVEL            No                     Minimum log level: verbose,
                                              debug, log, warn, error (default:
                                              log)

  CORS_ORIGINS         No                     Allowed CORS origins,
                                              comma-separated (default: \*)
  -------------------- ---------------------- ---------------------------------

**4.2 CMS Service Environment Variables**

  ---------------------- --------------------- ---------------------------------------------------
  **Variable**           **Required**          **Description**

  DATABASE_URI           Yes                   PostgreSQL connection string (Supabase pooled URL)

  PAYLOAD_DB_SCHEMA      No                    PostgreSQL schema for Payload tables (default: cms)

  PAYLOAD_SECRET         Yes                   Payload CMS encryption secret (minimum 32
                                               characters)

  PAYLOAD_PORT           No                    Payload CMS listen port (default: 3001)

  R2_ACCESS_KEY_ID       Yes                   Cloudflare R2 access key ID

  R2_SECRET_ACCESS_KEY   Yes                   Cloudflare R2 secret access key

  R2_BUCKET              Yes                   R2 bucket name for media storage

  R2_ENDPOINT            Yes                   R2 endpoint URL
                                               (https://\[account-id\].r2.cloudflarestorage.com)

  R2_PUBLIC_URL          Yes                   Public URL prefix for media files (e.g.,
                                               https://cdn.example.com)

  RABBITMQ_URL           Yes                   CloudAMQP RabbitMQ connection string

  NODE_ENV               No                    Environment: development or production (default:
                                               development)
  ---------------------- --------------------- ---------------------------------------------------

  -----------------------------------------------------------------------
  **Note:** All connection strings must use TLS: rediss:// for Redis,
  amqps:// for RabbitMQ, postgresql+ssl for PostgreSQL.

  -----------------------------------------------------------------------

**5. CI/CD Pipeline**

Automated testing, building, and deployment via GitHub Actions. The
pipeline enforces code quality and ensures production readiness.

**5.1 GitHub Actions Workflow**

**File:** .github/workflows/deploy.yml

The deployment workflow executes these steps in order:

1.  Checkout code from marketeq-projects-vibe repository

2.  Install pnpm and all dependencies

3.  Run ESLint and Prettier (code quality checks)

4.  Run Jest unit tests

5.  Run integration tests (with Docker services)

6.  Build Docker images for api-gateway and cms-service

7.  Push images to container registry (GitHub Container Registry or AWS
    ECR)

8.  Deploy to staging (triggered by push to develop branch)

9.  Deploy to production (triggered by push to main branch, requires
    approval)

**5.2 Branch Strategy**

-   **main:** Production deployments. Requires PR approval and passing
    CI checks.

-   **develop:** Staging deployments. Merge feature branches here for
    integration testing.

-   **feature/\*:** Development branches. Create from develop, submit PR
    to develop for review.

-   **hotfix/\*:** Emergency fixes. Branch from main, PR to main for
    immediate production deployment.

**5.3 Production Deployment Steps**

When you merge a PR to main, the automated pipeline executes:

10. Merge PR to main branch

11. CI pipeline runs all tests (linting, unit, integration)

12. Docker images built and tagged with commit SHA

13. Images pushed to container registry

14. CMS service deployed first (database migrations run on startup)

15. Wait for CMS health check endpoint to return success

16. Deploy API gateway

17. Wait for API gateway health check endpoint to return success

18. Smoke test: curl https://api.example.com/api/homepage

19. Monitor error rates and latency for 15 minutes

20. If error rate spikes: automatically rollback by deploying previous
    image tag

**6. Production Deployment Checklist**

Use this checklist before deploying to production. Verify each item is
complete and all services are accessible.

**6.1 Pre-Deployment Verification**

  --------------------- -------------------------------------------------
  **Item**              **Status**

  **All environment     ☐
  variables set in      
  production secrets    
  manager**             

  **Supabase PostgreSQL ☐
  accessible from       
  deployment            
  environment**         

  **Upstash Redis       ☐
  accessible (verify    
  TLS connection        
  works)**              

  **CloudAMQP RabbitMQ  ☐
  accessible (verify    
  AMQPS connection      
  works)**              

  **Cloudflare R2       ☐
  bucket created and    
  accessible**          

  **Container registry  ☐
  contains latest       
  images tagged with    
  commit SHA**          

  **CMS service         ☐
  deployed and health   
  check endpoint        
  returns 200**         

  **API gateway         ☐
  deployed and health   
  check endpoint        
  returns 200**         

  **Homepage created in ☐
  CMS with              
  isDefault=true and    
  status=active**       

  **GET /api/homepage   ☐
  returns 200 with      
  valid JSON payload**  

  **Cache invalidation  ☐
  verified (edit CMS,   
  verify API returns    
  updated content)**    

  **Health check        ☐
  endpoint returns all  
  services status as    
  up**                  

  **Monitoring          ☐
  dashboard configured  
  in datadog or         
  equivalent**          

  **Alerting rules      ☐
  active for error      
  rates and latency**   

  **DNS configured      ☐
  pointing to           
  production API        
  endpoint**            

  **CORS origins set    ☐
  correctly for         
  production domain**   
  --------------------- -------------------------------------------------

**7. Rollback Procedure**

If production deployment causes issues, follow this procedure to quickly
rollback to the last known good state.

21. Identify the issue using logs, error rates, or customer reports

22. Determine which service is affected: API gateway, CMS service, or
    both

23. Find the last known good image tag in your container registry

24. Deploy the previous image tag for the affected service

25. Verify health checks pass for the rolled-back service

26. Verify GET /api/homepage returns expected data

27. Post-mortem: investigate root cause and write incident report

  -----------------------------------------------------------------------
  **Note:** Keep at least the last 5 image tags in your container
  registry. This allows quick rollback without rebuilding from source.

  -----------------------------------------------------------------------

**8. Scaling Considerations**

Architecture notes for scaling each component independently.

**8.1 API Gateway Scaling**

-   Horizontally scalable: deploy multiple instances behind a load
    balancer

-   Each instance connects to shared Redis and RabbitMQ

-   No sticky sessions required: stateless design allows simple
    round-robin load balancing

-   Scale up when CPU or memory utilization exceeds 70%

**8.2 CMS Service Scaling**

-   Single instance recommended: Payload CMS not designed for
    multi-instance deployment

-   Scale vertically if needed: increase instance CPU and memory

-   Database auto-migrations run only on startup: monitor first
    deployment for schema changes

**8.3 RabbitMQ Scaling**

-   Each API gateway instance creates its own consumer group

-   Messages distributed across consumers using competing consumer
    pattern

-   CloudAMQP handles availability and failover automatically

**8.4 Redis Scaling**

-   Upstash Redis auto-scales based on throughput and memory usage

-   No manual scaling needed: upgrade Upstash plan for higher throughput

-   Monitor key memory usage patterns and adjust TTLs if needed

**8.5 PostgreSQL Scaling**

-   Supabase handles connection pooling via PgBouncer

-   Upgrade Supabase plan for additional connections if needed

-   Monitor slow queries and optimize N+1 problems in application code

-   Both API gateway and CMS share the same database: verify isolation
    at schema level

**9. Security Checklist**

Production security requirements for the Home Page deployment.

**9.1 Connection Security**

-   All connections use TLS: rediss:// for Redis, amqps:// for RabbitMQ,
    postgresql+ssl for PostgreSQL

-   Certificate verification enabled for all external connections

-   No plaintext passwords in connection strings: use environment
    variables

**9.2 Secrets Management**

-   Environment variables never committed to Git: use .gitignore for
    .env files

-   PREVIEW_SECRET must be strong: minimum 32 characters,
    cryptographically random

-   PAYLOAD_SECRET must be strong: minimum 32 characters,
    cryptographically random

-   Rotate all secrets quarterly: update in secrets manager and redeploy
    services

**9.3 Access Control**

-   CMS admin panel not publicly accessible in production: restrict via
    firewall or VPN

-   API gateway CORS restricted to production domains: no wildcard
    allowed

-   Database credentials with minimal required permissions: use
    least-privilege principle

-   Container registry images not publicly downloadable

**9.4 Logging and Monitoring**

-   No sensitive data in logs: redact passwords, API keys, and PII

-   Logs retained for minimum 30 days for audit and investigation

-   Set up alerts for suspicious activity: repeated authentication
    failures, large data exports

-   Monitor for unauthorized access attempts and report in incident
    reports
