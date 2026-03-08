**[MARKETEQ BACKEND]{.smallcaps}**

**transaction-service**

**Doc 01 --- Docker & Runtime Setup**

  -----------------------------------------------------------------------
  **Field**          **Value**
  ------------------ ----------------------------------------------------
  Service Name       transaction-service

  Doc Number         Doc 01

  Prerequisites      Doc 00 --- Service Overview & Repo Placement

  Runtime            Node.js 20 Alpine

  Framework          NestJS + TypeScript

  Deployment Target  Supabase via GitHub Actions

  Health Check Path  GET /health

  Readiness Check    GET /ready
  Path               

  Default Port       3007
  -----------------------------------------------------------------------

# **1. Purpose**

This document covers everything required to containerize, configure, and
deploy transaction-service as a production-ready NestJS application. It
includes the full Dockerfile, all required environment variables with
descriptions and example values, health check endpoint implementation,
Supabase deployment configuration, and step-by-step local development
startup instructions.

This document assumes the reader has completed Doc 00 and understands
where transaction-service fits in the platform architecture. Do not skip
Doc 00 --- the service dependencies and runtime context defined there
are referenced throughout this document.

+-----------------------------------------------------------------------+
| **Prerequisite**                                                      |
|                                                                       |
| You need Docker, Docker Compose, and Node.js 20 installed locally     |
| before proceeding. You also need access to the Marketeq Supabase      |
| dashboard to configure environment variables before the first         |
| deployment. Request access from the Backend Engineering lead if you   |
| do not have it.                                                       |
+=======================================================================+

# **2. Dockerfile**

The Dockerfile uses a two-stage build. Stage 1 compiles TypeScript using
all dependencies including devDependencies. Stage 2 creates the final
lean production image containing only the compiled output and production
dependencies. This keeps the final image small and free of build
tooling.

File location:

**/apps/transaction-service/Dockerfile**

+-----------------------------------------------------------------------+
| \# ── Stage 1: Build                                                  |
| ──────────────────────────────────────────────────────                |
|                                                                       |
| FROM node:20-alpine AS builder                                        |
|                                                                       |
| WORKDIR /usr/src/app                                                  |
|                                                                       |
| \# Install all dependencies including devDependencies needed for      |
| TypeScript compile                                                    |
|                                                                       |
| COPY package\*.json ./                                                |
|                                                                       |
| RUN npm ci                                                            |
|                                                                       |
| \# Copy source files and compile TypeScript to /dist                  |
|                                                                       |
| COPY . .                                                              |
|                                                                       |
| RUN npm run build                                                     |
|                                                                       |
| \# ── Stage 2: Production                                             |
| ─────────────────────────────────────────────────                     |
|                                                                       |
| FROM node:20-alpine AS production                                     |
|                                                                       |
| WORKDIR /usr/src/app                                                  |
|                                                                       |
| \# Install production dependencies only --- no TypeScript compiler in |
| final image                                                           |
|                                                                       |
| COPY package\*.json ./                                                |
|                                                                       |
| RUN npm ci \--only=production                                         |
|                                                                       |
| \# Copy compiled output from builder stage                            |
|                                                                       |
| COPY \--from=builder /usr/src/app/dist ./dist                         |
|                                                                       |
| \# PORT is injected at runtime by Supabase --- never hardcode this    |
| value                                                                 |
|                                                                       |
| EXPOSE \$PORT                                                         |
|                                                                       |
| \# Supabase polls this endpoint to determine container health         |
|                                                                       |
| HEALTHCHECK \--interval=30s \--timeout=10s \--start-period=15s        |
| \--retries=3 \\                                                       |
|                                                                       |
| CMD wget -qO- http://localhost:\$PORT/health \|\| exit 1              |
|                                                                       |
| \# Start the compiled application                                     |
|                                                                       |
| CMD \[\"node\", \"dist/main.js\"\]                                    |
+=======================================================================+

## **2.1 Dockerfile Rules**

- Always use node:20-alpine. Do not upgrade the Node major version
  without testing all service dependencies against the new runtime.

- Always use npm ci --- never npm install. npm ci installs exact
  versions from package-lock.json and fails if lock file is out of sync.

- Never hardcode a port number. Always use \$PORT. Supabase injects PORT
  at runtime.

- The HEALTHCHECK instruction tells Docker how to probe the container.
  Supabase also performs its own HTTP health check separately --- both
  must pass.

- devDependencies must never appear in the production stage. The
  \--only=production flag in Stage 2 enforces this.

+-----------------------------------------------------------------------+
| **Critical Rule**                                                     |
|                                                                       |
| Never hardcode the PORT value anywhere in the Dockerfile. Supabase    |
| sets PORT via environment variable at runtime. If the container port  |
| does not match the PORT environment variable, the service will fail   |
| its health check and be immediately rolled back.                      |
+=======================================================================+

# **3. Environment Variables**

All environment variables listed below must be present before the
service starts. The service validates all required variables at startup
and refuses to start if any are missing. See Section 3.3 for the
validation implementation.

For Supabase production deployments, all sensitive values (marked sync:
false) must be set manually in the Supabase dashboard. They must never
appear in Supabase.yaml or be committed to the repository.

## **3.1 Complete Variable Reference**

  -------------------------------------------------------------------------------------------------------------------
  **Variable**        **Required**   **Description**              **Example Value**
  ------------------- -------------- ---------------------------- ---------------------------------------------------
  DATABASE_URL        **YES**        PostgreSQL connection string postgres://user:pass@db.supabase.co:5432/marketeq
                                     for the Supabase shared      
                                     database. Must point to the  
                                     transaction_service schema.  

  PORT                **YES**        HTTP port the service        3007
                                     listens on. Must match the   
                                     EXPOSE value in the          
                                     Dockerfile. Supabase injects 
                                     this at runtime.             

  JWT_SECRET          **YES**        Secret used to verify JWTs   your-jwt-secret-min-32-chars
                                     issued by auth-service. Must 
                                     be identical to the value    
                                     used in auth-service or all  
                                     authenticated requests will  
                                     fail.                        

  RABBITMQ_URL        **YES**        RabbitMQ connection string.  amqp://user:pass@rabbitmq.host:5672
                                     transaction-service consumes 
                                     all financial events         
                                     (payments, refunds,          
                                     earnings, payouts) from this 
                                     queue.                       

  REDIS_URL           **YES**        Redis connection string.     redis://redis.host:6379
                                     Used to cache transaction    
                                     list query results and       
                                     reduce database read load on 
                                     frequently accessed          
                                     endpoints.                   

  ABLY_API_KEY        **YES**        Ably API key for publishing  your-app.key:secret
                                     real-time transaction status 
                                     updates to the frontend when 
                                     a transaction status         
                                     changes.                     

  STRIPE_SECRET_KEY   **YES**        Stripe secret key. Used ONLY sk_live_xxxxxxxxxxxxxxxx
                                     to retrieve hosted invoice   
                                     URLs and PDF links from      
                                     Stripe. This service does    
                                     NOT process any payments via 
                                     Stripe.                      

  NODE_ENV            **YES**        Runtime environment flag.    production
                                     Controls log verbosity and   
                                     whether stack traces are     
                                     exposed in error responses.  

  SUPABASE_SCHEMA     NO             PostgreSQL schema name       transaction_service
                                     scoped to this service.      
                                     Defaults to                  
                                     transaction_service if       
                                     omitted.                     
  -------------------------------------------------------------------------------------------------------------------

+-----------------------------------------------------------------------+
| **Security --- JWT_SECRET**                                           |
|                                                                       |
| The JWT_SECRET in transaction-service must be byte-for-byte identical |
| to the JWT_SECRET in auth-service. If they differ even by a single    |
| character, every authenticated request to transaction-service will    |
| return 401 Unauthorized. Always copy the value directly from          |
| auth-service rather than retyping it.                                 |
+=======================================================================+

## **3.2 Local .env Template**

File location (do not commit):

**/apps/transaction-service/.env**

+-----------------------------------------------------------------------+
| \# transaction-service --- Local Development                          |
|                                                                       |
| \# Fill in all values. Never commit this file. Confirm .env is in     |
| .gitignore.                                                           |
|                                                                       |
| \# ── Database                                                        |
| ────────────────────────────────────────────────────────────          |
|                                                                       |
| DATABASE_URL=postgres://postgres:password@localhost:5432/marketeq     |
|                                                                       |
| SUPABASE_SCHEMA=transaction_service                                   |
|                                                                       |
| \# ── Server                                                          |
| ──────────────────────────────────────────────────────────────        |
|                                                                       |
| PORT=3007                                                             |
|                                                                       |
| NODE_ENV=development                                                  |
|                                                                       |
| \# ── Authentication                                                  |
| ──────────────────────────────────────────────────────                |
|                                                                       |
| \# Must match JWT_SECRET in auth-service exactly                      |
|                                                                       |
| JWT_SECRET=local-dev-jwt-secret-minimum-32-characters-long            |
|                                                                       |
| \# ── Message Queue                                                   |
| ───────────────────────────────────────────────────────               |
|                                                                       |
| RABBITMQ_URL=amqp://guest:guest@localhost:5672                        |
|                                                                       |
| \# ── Cache                                                           |
| ───────────────────────────────────────────────────────────────       |
|                                                                       |
| REDIS_URL=redis://localhost:6379                                      |
|                                                                       |
| \# ── Realtime                                                        |
| ────────────────────────────────────────────────────────────          |
|                                                                       |
| ABLY_API_KEY=your-ably-api-key.here:secret                            |
|                                                                       |
| \# ── Stripe (invoice retrieval only --- no payment processing)       |
| ─────────────                                                         |
|                                                                       |
| \# Use sk_test\_ key for local development and staging                |
|                                                                       |
| STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxxxxxxxxxxxxxx                    |
+=======================================================================+

## **3.3 Startup Validation**

Add the following configuration validator to ensure the service refuses
to start if any required variable is missing or empty. This prevents
silent misconfiguration in production.

File location:

**/apps/transaction-service/src/config/transaction.config.ts**

+-----------------------------------------------------------------------+
| import { plainToInstance } from \'class-transformer\';                |
|                                                                       |
| import { IsString, IsNumber, IsIn, validateSync } from                |
| \'class-validator\';                                                  |
|                                                                       |
| class EnvironmentVariables {                                          |
|                                                                       |
| \@IsString()                                                          |
|                                                                       |
| DATABASE_URL: string;                                                 |
|                                                                       |
| \@IsNumber()                                                          |
|                                                                       |
| PORT: number;                                                         |
|                                                                       |
| \@IsString()                                                          |
|                                                                       |
| JWT_SECRET: string;                                                   |
|                                                                       |
| \@IsString()                                                          |
|                                                                       |
| RABBITMQ_URL: string;                                                 |
|                                                                       |
| \@IsString()                                                          |
|                                                                       |
| REDIS_URL: string;                                                    |
|                                                                       |
| \@IsString()                                                          |
|                                                                       |
| ABLY_API_KEY: string;                                                 |
|                                                                       |
| \@IsString()                                                          |
|                                                                       |
| STRIPE_SECRET_KEY: string;                                            |
|                                                                       |
| \@IsIn(\[\'development\', \'staging\', \'production\'\])              |
|                                                                       |
| NODE_ENV: string;                                                     |
|                                                                       |
| }                                                                     |
|                                                                       |
| export function validate(config: Record\<string, unknown\>) {         |
|                                                                       |
| const validated = plainToInstance(EnvironmentVariables, config, {     |
|                                                                       |
| enableImplicitConversion: true,                                       |
|                                                                       |
| });                                                                   |
|                                                                       |
| const errors = validateSync(validated, { skipMissingProperties: false |
| });                                                                   |
|                                                                       |
| if (errors.length \> 0) {                                             |
|                                                                       |
| throw new Error(                                                      |
|                                                                       |
| \`\[transaction-service\] Startup failed --- missing or invalid env   |
| vars:\\n\` +                                                          |
|                                                                       |
| errors.map(e =\> \` - \${e.property}: \${Object.values(e.constraints  |
| \|\| {}).join(\', \')}\`).join(\'\\n\')                               |
|                                                                       |
| );                                                                    |
|                                                                       |
| }                                                                     |
|                                                                       |
| return validated;                                                     |
|                                                                       |
| }                                                                     |
+=======================================================================+

# **4. Health Check Endpoint**

Supabase requires a health check endpoint to monitor container
availability. transaction-service exposes two health endpoints. Neither
endpoint requires authentication.

  ---------------------------------------------------------------------------------
  **Endpoint**   **Purpose**           **Auth**   **Success**      **Failure**
  -------------- --------------------- ---------- ---------------- ----------------
  GET /health    Basic liveness check. None       200 { status:    503 if process
                 Confirms the process             \'ok\' }         is unresponsive
                 is running.                                       

  GET /ready     Readiness check.      None       200 { status:    503 { status:
                 Confirms all                     \'ok\', checks:  \'error\',
                 dependencies are                 {\...} }         checks: {\...} }
                 reachable before                                  
                 accepting traffic.                                
  ---------------------------------------------------------------------------------

## **4.1 Controller Implementation**

File location:

**/apps/transaction-service/src/controllers/health.controller.ts**

+-----------------------------------------------------------------------+
| import { Controller, Get, ServiceUnavailableException } from          |
| \'@nestjs/common\';                                                   |
|                                                                       |
| import { InjectDataSource } from \'@nestjs/typeorm\';                 |
|                                                                       |
| import { DataSource } from \'typeorm\';                               |
|                                                                       |
| \@Controller()                                                        |
|                                                                       |
| export class HealthController {                                       |
|                                                                       |
| constructor(                                                          |
|                                                                       |
| \@InjectDataSource() private readonly dataSource: DataSource,         |
|                                                                       |
| ) {}                                                                  |
|                                                                       |
| // Basic liveness --- Supabase health check polls this                |
|                                                                       |
| \@Get(\'health\')                                                     |
|                                                                       |
| health() {                                                            |
|                                                                       |
| return {                                                              |
|                                                                       |
| status: \'ok\',                                                       |
|                                                                       |
| service: \'transaction-service\',                                     |
|                                                                       |
| timestamp: new Date().toISOString(),                                  |
|                                                                       |
| };                                                                    |
|                                                                       |
| }                                                                     |
|                                                                       |
| // Readiness --- verifies DB connection before accepting traffic      |
|                                                                       |
| // Full dependency checks (RabbitMQ, Redis) added in Doc 06           |
|                                                                       |
| \@Get(\'ready\')                                                      |
|                                                                       |
| async ready() {                                                       |
|                                                                       |
| const checks: Record\<string, string\> = {};                          |
|                                                                       |
| // Database check                                                     |
|                                                                       |
| try {                                                                 |
|                                                                       |
| await this.dataSource.query(\'SELECT 1\');                            |
|                                                                       |
| checks.database = \'ok\';                                             |
|                                                                       |
| } catch {                                                             |
|                                                                       |
| checks.database = \'error\';                                          |
|                                                                       |
| }                                                                     |
|                                                                       |
| const allOk = Object.values(checks).every(v =\> v === \'ok\');        |
|                                                                       |
| if (!allOk) {                                                         |
|                                                                       |
| throw new ServiceUnavailableException({                               |
|                                                                       |
| status: \'error\',                                                    |
|                                                                       |
| service: \'transaction-service\',                                     |
|                                                                       |
| checks,                                                               |
|                                                                       |
| timestamp: new Date().toISOString(),                                  |
|                                                                       |
| });                                                                   |
|                                                                       |
| }                                                                     |
|                                                                       |
| return {                                                              |
|                                                                       |
| status: \'ok\',                                                       |
|                                                                       |
| service: \'transaction-service\',                                     |
|                                                                       |
| checks,                                                               |
|                                                                       |
| timestamp: new Date().toISOString(),                                  |
|                                                                       |
| };                                                                    |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
+=======================================================================+

+-----------------------------------------------------------------------+
| **Note**                                                              |
|                                                                       |
| The /health endpoint must never be protected by an auth guard.        |
| Supabase calls it without any credentials. Adding a JWT guard to      |
| /health will cause the container to fail its health check and be      |
| marked as unhealthy immediately after deployment.                     |
+=======================================================================+

+-----------------------------------------------------------------------+
| **Doc 06 Reference**                                                  |
|                                                                       |
| The /ready endpoint shown above includes only a database check. Full  |
| dependency checks for RabbitMQ connectivity and Redis connectivity    |
| are added in Doc 06 --- Observability & Health once those modules are |
| wired up in Doc 02 and Doc 05.                                        |
+=======================================================================+

# **5. Supabase Deployment**

transaction-service is deployed independently to Supabase as a
containerized web service. It deploys via GitHub Actions when changes
are merged to main that affect the /apps/transaction-service path.

## **5.1 Supabase.yaml Service Definition**

File location:

**/apps/transaction-service/Supabase.yaml**

+-----------------------------------------------------------------------+
| services:                                                             |
|                                                                       |
| \- name: transaction-service                                          |
|                                                                       |
| type: web                                                             |
|                                                                       |
| runtime: docker                                                       |
|                                                                       |
| dockerfilePath: ./Dockerfile                                          |
|                                                                       |
| \# Supabase polls this path --- must return 200-299 within 10s        |
|                                                                       |
| healthCheckPath: /health                                              |
|                                                                       |
| healthCheckTimeout: 10                                                |
|                                                                       |
| envVars:                                                              |
|                                                                       |
| \# Database --- pulled from linked Supabase database automatically    |
|                                                                       |
| \- key: DATABASE_URL                                                  |
|                                                                       |
| fromDatabase:                                                         |
|                                                                       |
| name: marketeq-db                                                     |
|                                                                       |
| property: connectionString                                            |
|                                                                       |
| \# Non-sensitive values --- safe to store in yaml                     |
|                                                                       |
| \- key: PORT                                                          |
|                                                                       |
| value: 3007                                                           |
|                                                                       |
| \- key: NODE_ENV                                                      |
|                                                                       |
| value: production                                                     |
|                                                                       |
| \- key: SUPABASE_SCHEMA                                               |
|                                                                       |
| value: transaction_service                                            |
|                                                                       |
| \# Sensitive values --- set manually in Supabase dashboard, never in  |
| yaml                                                                  |
|                                                                       |
| \- key: JWT_SECRET                                                    |
|                                                                       |
| sync: false                                                           |
|                                                                       |
| \- key: RABBITMQ_URL                                                  |
|                                                                       |
| sync: false                                                           |
|                                                                       |
| \- key: REDIS_URL                                                     |
|                                                                       |
| sync: false                                                           |
|                                                                       |
| \- key: ABLY_API_KEY                                                  |
|                                                                       |
| sync: false                                                           |
|                                                                       |
| \- key: STRIPE_SECRET_KEY                                             |
|                                                                       |
| sync: false                                                           |
+=======================================================================+

## **5.2 First-Time Supabase Dashboard Setup**

Complete these steps once before the first deployment. Variables marked
sync: false in the yaml must be entered manually here. They are never
stored in the yaml file or the repository.

  ------------------------------------------------------------------------------
  **Step**   **Action**                           **Location in Dashboard**
  ---------- ------------------------------------ ------------------------------
  1          Open transaction-service environment Services \>
             settings                             transaction-service \>
                                                  Environment

  2          Add JWT_SECRET --- must match        Environment Variables \> Add
             auth-service value exactly --- copy, Variable
             do not retype                        

  3          Add RABBITMQ_URL --- get from        Environment Variables \> Add
             RabbitMQ management dashboard        Variable

  4          Add REDIS_URL --- get from Redis     Environment Variables \> Add
             instance settings                    Variable

  5          Add ABLY_API_KEY --- get from Ably   Environment Variables \> Add
             dashboard under Apps \> API Keys     Variable

  6          Add STRIPE_SECRET_KEY --- use live   Environment Variables \> Add
             key for production, test key for     Variable
             staging                              

  7          Confirm health check path is         Services \>
             /health, success codes 200-299,      transaction-service \> Health
             timeout 10s                          Check

  8          Confirm PORT is set to 3007 and      Services \>
             matches Dockerfile EXPOSE value      transaction-service \>
                                                  Settings
  ------------------------------------------------------------------------------

+-----------------------------------------------------------------------+
| **Before Every Deployment**                                           |
|                                                                       |
| Confirm that all eight dashboard setup steps above have been          |
| completed. A missing environment variable will cause the service to   |
| fail startup validation, fail its health check, and be rolled back    |
| immediately.                                                          |
+=======================================================================+

## **5.3 Deployment Flow**

- Developer merges a pull request to the main branch

- GitHub Actions detects changes in /apps/transaction-service and
  triggers the deploy workflow

- Docker image is built from /apps/transaction-service/Dockerfile

- Image is pushed to the container registry

- Supabase pulls the new image and begins a rolling deployment

- Supabase polls GET /health until it returns 200 within the 10-second
  timeout

- If health check passes: deployment completes and traffic shifts to the
  new container

- If health check fails three consecutive times: Supabase automatically
  rolls back to the last healthy image

+-----------------------------------------------------------------------+
| **Automatic Rollback**                                                |
|                                                                       |
| If a bad deployment fails its health check, Supabase rolls back       |
| automatically. No manual intervention is needed in most cases. If the |
| rollback itself fails, escalate to the Backend Engineering lead       |
| immediately.                                                          |
+=======================================================================+

# **6. Local Development Startup**

Follow these steps in order to run transaction-service on your local
machine. Run all commands from inside the service directory unless the
step specifies otherwise.

## **6.1 System Requirements**

  -------------------------------------------------------------------------------
  **Tool**     **Required   **Check          **Install If Missing**
               Version**    Command**        
  ------------ ------------ ---------------- ------------------------------------
  Node.js      20.x         node \--version  https://nodejs.org

  npm          10.x+        npm \--version   Included with Node.js 20

  Docker       24.x+        docker           https://docs.docker.com/get-docker
                            \--version       

  Docker       2.x+         docker compose   Included with Docker Desktop
  Compose                   version          

  NestJS CLI   10.x+        nest \--version  npm install -g \@nestjs/cli
  -------------------------------------------------------------------------------

## **6.2 Startup Steps**

+-------+------------------------------------------------------------------+
| **1** | **Navigate to the service directory**                            |
|       |                                                                  |
|       | cd marketeq-projects-nestjs/apps/transaction-service             |
+=======+==================================================================+

+-------+------------------------------------------------------------------+
| **2** | **Install dependencies**                                         |
|       |                                                                  |
|       | npm ci                                                           |
|       |                                                                  |
|       | Use npm ci --- not npm install. This installs exact versions     |
|       | from                                                             |
|       |                                                                  |
|       | package-lock.json and fails if the lock file is out of sync with |
|       | package.json.                                                    |
+=======+==================================================================+

+-------+------------------------------------------------------------------+
| **3** | **Create your local .env file**                                  |
|       |                                                                  |
|       | cp .env.example .env                                             |
|       |                                                                  |
|       | Edit .env and fill in all required values.                       |
|       |                                                                  |
|       | See Section 3.2 for the complete template.                       |
|       |                                                                  |
|       | Ask a team member for local credentials if you do not have them. |
+=======+==================================================================+

+-------+------------------------------------------------------------------+
| **4** | **Start local infrastructure**                                   |
|       |                                                                  |
|       | From the repo root (not the service directory):                  |
|       |                                                                  |
|       | docker compose up -d postgres rabbitmq redis                     |
|       |                                                                  |
|       | Verify all containers are running:                               |
|       |                                                                  |
|       | docker compose ps                                                |
|       |                                                                  |
|       | All three should show status: running before proceeding.         |
+=======+==================================================================+

+-------+------------------------------------------------------------------+
| **5** | **Start the service with hot reload**                            |
|       |                                                                  |
|       | npm run start:dev                                                |
|       |                                                                  |
|       | The service starts on the PORT value in your .env file.          |
|       |                                                                  |
|       | It will restart automatically when you save changes to any       |
|       | source file.                                                     |
|       |                                                                  |
|       | Watch the terminal for the startup validation output.            |
+=======+==================================================================+

+-------+------------------------------------------------------------------+
| **6** | **Verify the service is healthy**                                |
|       |                                                                  |
|       | curl http://localhost:3007/health                                |
|       |                                                                  |
|       | Expected response:                                               |
|       |                                                                  |
|       | { \"status\": \"ok\", \"service\": \"transaction-service\",      |
|       | \"timestamp\": \"\...\" }                                        |
|       |                                                                  |
|       | Also verify readiness:                                           |
|       |                                                                  |
|       | curl http://localhost:3007/ready                                 |
+=======+==================================================================+

+-----------------------------------------------------------------------+
| **Success Criteria**                                                  |
|                                                                       |
| If both /health and /ready return { \"status\": \"ok\" } the service  |
| is running correctly, connected to the database, and ready for        |
| development work.                                                     |
+=======================================================================+

## **6.3 npm Script Reference**

  ------------------------------------------------------------------------
  **Script**    **Command**           **When to Use**
  ------------- --------------------- ------------------------------------
  Development   npm run start:dev     Day-to-day local development. Starts
                                      with hot reload.

  Production    npm run start:prod    Testing production behavior locally.
  (local)                             No hot reload.

  Build         npm run build         Compiles TypeScript to /dist. Run
                                      before start:prod.

  Lint          npm run lint          Run ESLint. Must pass with zero
                                      errors before any commit.

  Unit Tests    npm run test          Run Jest unit tests.

  Test Watch    npm run test:watch    Run unit tests in watch mode during
                                      active development.

  E2E Tests     npm run test:e2e      Run end-to-end tests. Requires local
                                      infrastructure running.

  Type Check    npm run typecheck     Run tsc \--noEmit to check types
                                      without compiling.
  ------------------------------------------------------------------------

## **6.4 Running the Production Docker Image Locally**

Use this to verify the Docker image behaves correctly before pushing to
Supabase. Run from the service directory:

+-----------------------------------------------------------------------+
| \# Build the image                                                    |
|                                                                       |
| docker build -t transaction-service:local .                           |
|                                                                       |
| \# Run with your .env file                                            |
|                                                                       |
| \# Note: replace localhost with host.docker.internal for Mac/Windows  |
|                                                                       |
| docker run \--env-file .env -p 3007:3007 transaction-service:local    |
|                                                                       |
| \# Verify health check from a separate terminal                       |
|                                                                       |
| curl http://localhost:3007/health                                     |
+=======================================================================+

+-----------------------------------------------------------------------+
| **Docker Networking**                                                 |
|                                                                       |
| When running the Docker container locally, localhost inside the       |
| container refers to the container itself, not your machine. Replace   |
| localhost with host.docker.internal in DATABASE_URL, RABBITMQ_URL,    |
| and REDIS_URL in your .env file when doing local Docker testing.      |
| Revert before running npm run start:dev.                              |
+=======================================================================+

# **7. Common Issues & Resolutions**

  ------------------------------------------------------------------------
  **Symptom**      **Likely Cause**      **Resolution**
  ---------------- --------------------- ---------------------------------
  Port 3007        Another service or    Run: lsof -i :3007 --- kill the
  already in use   previous process is   conflicting process or change
                   using the port        PORT in .env to another value

  Startup failed   One or more required  Read the error message carefully
  --- missing env  variables not set in  --- it names the specific missing
  vars             .env                  variable. Add it to .env.

  Cannot connect   DATABASE_URL          Check docker compose ps ---
  to database      incorrect or          postgres should show healthy.
                   PostgreSQL container  Verify DATABASE_URL format in
                   not running           .env.

  All requests     JWT_SECRET does not   Copy JWT_SECRET value directly
  return 401       match auth-service    from auth-service .env --- do not
  Unauthorized                           retype it.

  RabbitMQ         RabbitMQ not running  Run docker compose up -d
  connection       or RABBITMQ_URL       rabbitmq. Check RABBITMQ_URL in
  refused at       incorrect             .env.
  startup                                

  Redis connection Redis not running or  Run docker compose up -d redis.
  error            REDIS_URL incorrect   Check REDIS_URL in .env.

  /health returns  A startup dependency  Check the response body --- it
  503              check failed          identifies which dependency
                                         failed. Fix that service first.

  npm ci fails     package-lock.json out Run npm install locally to
                   of sync with          regenerate package-lock.json,
                   package.json          commit it, then run npm ci again.
  ------------------------------------------------------------------------

# **8. Next Steps**

With Docker setup and runtime configuration complete, proceed to the
next document in the transaction-service series:

  -----------------------------------------------------------------------------
  **Document**   **Title**             **What It Covers**
  -------------- --------------------- ----------------------------------------
  Doc 02         Folder Structure &    app.module.ts, main.ts, full module
                 Bootstrapping         wiring, and configuration loading for
                                       all transaction-service modules

  Doc 03         Data Models & DTOs    All TypeORM entities, PostgreSQL enums,
                                       constraints, DTOs, and class-validator
                                       rules from the data dictionary

  Doc 04         API Endpoints         All routes, JWT guards, query parameter
                                       specs for filters and pagination,
                                       request and response schemas, error
                                       shapes

  Doc 05         Integrations & Events RabbitMQ consumer setup for all 11
                                       upstream events, Stripe invoice
                                       retrieval, Ably realtime publishing,
                                       Redis cache strategy

  Doc 06         Observability &       Full /health and /ready implementations,
                 Health                structured logging, metrics, alert
                                       thresholds, SLO definitions

  Doc 07         QA & Test Data        Full test case list, seed scripts for
                                       all transaction types and statuses,
                                       Postman collection for all endpoints
  -----------------------------------------------------------------------------
