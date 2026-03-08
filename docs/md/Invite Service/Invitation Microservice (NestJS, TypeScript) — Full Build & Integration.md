**Invitation Microservice (NestJS, TypeScript) --- Full Build &
Integration**

## **Scope (locked)**

- Create a new microservice named **invitations-service** using
  **NestJS + TypeScript**.

- Place it in the monorepo under **services/invitations-service/**.

- Use the **existing main database**; add **one table** named
  **invitations**.

- **Do not modify** the onboarding flow; leave it as-is. New screens
  (e.g., **My Team**) must call this service.

- All outbound emails/notifications must go through the existing
  **Notification Service** over HTTP; do not send email directly from
  this service.

- Each invite associates a single user (by email) to **one client
  account (team)**.

- Supported roles (for now): **admin, editor, viewer**. Fine-grained
  permissions come later.

- If a **pending** invite already exists for the same **teamId +
  email**, return that existing invite and set a flag indicating
  **alreadyInvited: true**. Provide a Resend action.

- Valid statuses: **pending \| accepted \| canceled \| expired**.

- Default invitation expiry: **7 days**, configurable via environment.

## **Directory Layout**

- Create the directory structure exactly as listed:

  - services/invitations-service/

    - src/

      - app.module.ts

      - main.ts

      - health.controller.ts

      - common/

        - auth.guard.ts

        - roles.ts

        - token.util.ts

        - typing.ts

      - invitations/

        - invitations.module.ts

        - invitations.controller.ts

        - invitations.service.ts

        - invitations.entity.ts

        - invitations.dto.ts

        - notifications.client.ts

    - ormconfig.ts

    - package.json

    - tsconfig.json

    - nest-cli.json

    - README.md

    - migrations/

      - 1710000000000-CreateInvitationsTable.ts

- Create empty files with these names, then implement per instructions
  below.

- Keep file names and relative paths exactly as listed for predictable
  CI/CD and developer onboarding.

## **Environment Variables**

- Create a local .env in services/invitations-service and configure the
  same keys in Render.

- Set a Postgres connection URL in DATABASE_URL to point to the shared
  main DB.

- Set PORT to the port the service will listen on (use 3006 unless there
  is a conflict).

- Set APP_BASE_URL to the web app base (used to generate accept links).

- Set INVITE_TOKEN_SECRET to a 32+ char random secret (used to
  generate/verify tokens if needed).

- Set INVITE_EXP_DAYS to the number of days before an invite expires
  (default 7).

- Set NOTIFICATIONS_URL to the base URL of the Notification Service.

- Set NOTIFICATIONS_API_KEY to the API key that authorizes calls to the
  Notification Service.

- Set GATEWAY_TRUST_HEADER to the request header your API Gateway uses
  for user ID (default x-user-id).

- Set GATEWAY_TRUST_EMAIL_HEADER to the header for the authenticated
  user email (default x-user-email).

- Ensure the API Gateway forwards x-user-id and x-user-email for
  authenticated requests to this service.

- Require authentication for the Accept endpoint; invitees must be
  logged in so the accept flow can verify their email matches the
  invite.

## **Install & Scripts**

- Initialize a NestJS project in services/invitations-service.

- Add build/start scripts:

  - build: compiles the NestJS project

  - start: runs the compiled server

  - start:dev: runs the server with watch mode for local development

- Add TypeORM migration scripts:

  - migration:generate

  - migration:run

  - migration:revert

- Ensure dependencies include Nest core/platform,
  class-validator/transformer, TypeORM, pg, axios/http module, and
  TypeScript tooling.

## **tsconfig.json**

- Configure TypeScript to:

  - Target ES2020

  - Use decorators and emit decorator metadata

  - Output to dist/

  - Include all files under src/\*\*

- Enable incremental builds for faster local rebuilds.

## **nest-cli.json**

- Set the sourceRoot to src.

- Use the default Nest schematics collection.

## **ormconfig.ts**

- Configure TypeORM DataSource to:

  - Read the Postgres URL from DATABASE_URL

  - Register the Invitation entity

  - Load migrations from the migrations folder

  - Set synchronize to false for all environments

  - Enable SSL only if DATABASE_SSL is true (with rejectUnauthorized:
    false)

- Ensure this configuration is used in AppModule via
  TypeOrmModule.forRootAsync.

## **DB Schema (TypeORM migration + entity)**

### **migrations/1710000000000-CreateInvitationsTable.ts**

- Create a migration that:

  - Defines an enum type invitation_status with values: pending,
    accepted, canceled, expired (create only if not exists).

  - Creates a table invitations with columns:

    - id (uuid, primary key, default gen_random_uuid())

    - team_id (uuid, required)

    - invited_email (text, required)

    - role (text; must be one of admin, editor, viewer)

    - status (invitation_status; default pending)

    - token (text; random token for accept flow)

    - expires_at (timestamptz; set to now + INVITE_EXP_DAYS)

    - created_by_user_id (uuid; the inviter)

    - created_at (timestamptz; default now)

    - updated_at (timestamptz; default now)

    - accepted_at (timestamptz; nullable)

    - canceled_at (timestamptz; nullable)

    - resent_count (int; default 0)

  - Add uniqueness: unique(team_id, invited_email, status) to enforce
    one pending invite per email/team.

  - Create helpful indexes on team_id, invited_email, and token.

- After creating the migration file, run the migration command against
  your DB.

### **Run migrations: npm run migration:run**

- Execute the migration on your local/dev DB and on Render during
  deployment (build or post-deploy step) so the invitations table
  exists.

### **src/invitations/invitations.entity.ts**

- Define an Invitation entity matching the invitations table.

- Include the TypeScript types for InvitationStatus and InvitationRole.

- Map all fields, including indexes and timestamps.

- Ensure the enum values match the database enum exactly.

## **Common (auth, roles, token)**

### **src/common/roles.ts**

- Define the TeamRole union: admin, editor, viewer.

- Provide a labels map for display if needed.

### **src/common/typing.ts**

- Define RequestUser with id and email fields.

- Define a GatewayHeaders interface to document the trusted header names
  for user ID and email.

### **src/common/auth.guard.ts**

- Implement a guard that:

  - Reads the trusted headers (x-user-id and x-user-email by default)
    from the request.

  - If missing, throw Unauthorized.

  - If present, attach a user object (id, email) to the request so
    controllers/services can access it.

### **src/common/token.util.ts**

- Provide utilities to:

  - Generate a random invitation token (sufficient entropy, e.g., 24
    random bytes hex-encoded).

  - Compute the expiry date by adding INVITE_EXP_DAYS to the current UTC
    date.

## **DTOs**

### **src/invitations/invitations.dto.ts**

- Create a CreateInvitationsDto with:

  - teamId (uuid, required)

  - role (enum: admin \| editor \| viewer, required)

  - emails (array of unique, valid emails, required, at least one)

  - note (optional string)

- Create simple DTOs for:

  - Resend by id (uuid)

  - Cancel by id (uuid)

  - Accept by token (string, required)

- Create a ListInvitationsQuery DTO supporting:

  - teamId (optional uuid)

  - status (optional enum matching statuses)

  - cursor (optional ISO datetime for pagination)

  - limit (optional number, with a server-side cap)

## **Notifications client**

### **src/invitations/notifications.client.ts**

- Implement a client that calls the Notification Service:

  - Endpoint: NOTIFICATIONS_URL + /notifications/send

  - Method: POST

  - Headers: x-api-key with NOTIFICATIONS_API_KEY

  - Body must include:

    - template: team-invite

    - to: invitee's email

    - vars: senderName, teamName, acceptUrl, expiresInDays, and an
      optional note

- Do not include email transport logic in this service; all email flows
  must go through Notification Service.

## **Service**

### **src/invitations/invitations.service.ts**

- Implement methods with the following behavior:

1.  createInvites(dto, creator, team)

    - For each email in dto.emails:

      - If a pending invite exists for the same teamId + email, include
        it in results with alreadyInvited: true.

      - Otherwise:

        - Generate a token.

        - Create a pending invitation with expiry set from
          INVITE_EXP_DAYS and created_by_user_id from creator.

        - Build an acceptUrl using APP_BASE_URL and the token.

        - Call the Notifications client to send the invite email.

        - Add the new invite to results with alreadyInvited: false.

    - Return the results array. Do not create duplicates for pending
      invites.

2.  list({ teamId, status, limit, cursor })

    - Query invitations ordered by created_at DESC.

    - Apply filters if provided.

    - Apply pagination limit (cap at 100).

    - If cursor provided, return records strictly older than cursor.

    - Return data and nextCursor (ISO string of the last item's
      created_at or null).

3.  resend(id, actor, team)

    - Only allow if status is pending.

    - Reuse the existing token.

    - Recompute acceptUrl and call Notifications client again.

    - Increment resent_count and persist.

    - Return the updated invitation.

4.  cancel(id, actorId)

    - Only allow if status is pending.

    - Set status to canceled, set canceled_at to now, persist.

    - Return the updated invitation.

5.  accept(dto, authUser)

    - Locate the invitation by token.

    - If not found, fail.

    - If not pending, fail.

    - If expired, set status to expired and fail with "expired".

    - Ensure the invitee's email equals the authenticated user's email
      (case-insensitive).

    - Insert a team_members row (team_id, user_id, role) if not already
      present.

    - Set status to accepted, accepted_at to now, persist.

    - Return the updated invitation.

6.  getOne(id)

    - Return the invitation by id or fail if not found.

- Note: Ensure **team_members** table exists (team_id, user_id, role,
  created_at). Inserts must be idempotent (ignore if already there).

## **Controller & Module**

### **src/invitations/invitations.controller.ts**

- Protect all routes with GatewayAuthGuard.

- Implement the following endpoints:

  - POST /invitations

    - Read CreateInvitationsDto from body.

    - Read current user from request (headers).

    - Fetch team name (stub or via Team Service).

    - Call service.createInvites and return entries with id, email,
      status, expiresAt, alreadyInvited.

  - GET /invitations

    - Read query params (teamId, status, limit, cursor).

    - Return list results (data, nextCursor).

  - GET /invitations/:id

    - Return the invitation by id.

  - POST /invitations/:id/resend

    - Return the updated invitation after resend.

  - DELETE /invitations/:id/cancel

    - Return the updated invitation after cancel.

  - POST /invitations/accept

    - Read token from body and accept as the authenticated user.

### **src/invitations/invitations.module.ts**

- Register Invitation entity with TypeORM.

- Register HttpModule for the Notifications client.

- Provide InvitationsService and NotificationsClient.

- Export nothing externally for now (access via controller).

## **App bootstrap & health**

### **src/health.controller.ts**

- Provide a GET /health route that returns a simple ok payload for
  Render health checks.

### **src/app.module.ts**

- Load env with ConfigModule.

- Initialize TypeORM using ormconfig.ts options.

- Import InvitationsModule.

- Register HealthController.

### **src/main.ts**

- Enable CORS with credentials and a permissive origin (or restrict to
  your domains).

- Read PORT from env and listen.

- Log a startup message including the port.

## **API Contract (final)**

### **Create invites --- POST /invitations**

- Headers:

  - x-user-id: uuid of the inviter (from gateway)

  - x-user-email: email of the inviter (from gateway)

- Body fields:

  - teamId: uuid (required)

  - role: one of admin\|editor\|viewer (required)

  - emails: array of valid, unique email strings (required, at least
    one)

  - note: optional string

- Behavior:

  - For each email, return an object including id, email, status
    (pending), expiresAt, and alreadyInvited boolean.

  - Do not create a new row if a pending invite already exists for that
    email/team.

### **List invites --- GET /invitations**

- Query params:

  - teamId: uuid (recommended)

  - status: pending\|accepted\|canceled\|expired (optional)

  - limit: number (optional; server caps at 100)

  - cursor: ISO string (optional; returns records older than this)

- Returns:

  - data: array of invitations

  - nextCursor: ISO string or null

### **Get one --- GET /invitations/:id**

- Returns the invitation if found; otherwise not found.

### **Resend pending --- POST /invitations/:id/resend**

- Only allowed for invitations with status pending.

- Sends a new email via Notification Service using the same token.

- Increments resent_count.

### **Cancel pending --- DELETE /invitations/:id/cancel**

- Only allowed for invitations with status pending.

- Marks the invitation as canceled and sets canceled_at.

### **Accept --- POST /invitations/accept**

- Headers:

  - x-user-id: uuid of the invitee (from gateway)

  - x-user-email: email of the invitee (must match invited_email)

- Body fields:

  - token: invitation token from the email

- Behavior:

  - Verifies token is valid and not expired.

  - Verifies invitee's email equals invited_email.

  - Inserts team_members row if not present.

  - Marks invitation accepted and sets accepted_at.

## **Render Deployment**

- Push services/invitations-service to the monorepo.

- In Render, create a **New Web Service**:

  - Root Directory: services/invitations-service

  - Build Command: install dependencies, build the Nest app, then run
    database migrations

  - Start Command: start the compiled server

  - Health Check Path: /health

  - Environment: add all variables described under Environment Variables

- Confirm deployment logs show:

  - DB connection success

  - Migration ran successfully (or was already applied)

  - Service is listening on the configured port

  - Health check passes

## **"My Team" frontend wiring (Next.js + TypeScript)**

- Define a base env variable (e.g., NEXT_PUBLIC_API_GATEWAY_BASE)
  pointing to your API Gateway.

- Create API helper functions that call:

  - POST /invitations (create invites with teamId, role, emails,
    optional note)

  - GET /invitations (list with filters and cursor)

  - POST /invitations/:id/resend (resend)

  - DELETE /invitations/:id/cancel (cancel)

- Ensure requests include cookies/credentials if your gateway requires
  them.

- In the **Internal Team** card menu:

  - Map **Resend invite** to POST /invitations/:id/resend (only for
    pending)

  - Map **Cancel invite** to DELETE /invitations/:id/cancel (only for
    pending)

  - Keep other actions (Change role, Remove from team, Manage
    permissions, Add to project..., View profile) routed to their
    respective services/endpoints.

- In the **Invite modal**:

  - Validate email chips; allow pasting CSV/space/comma-separated
    emails.

  - Require a role selection (admin\|editor\|viewer).

  - Optional note field.

  - On submit:

    - Call POST /invitations with all emails.

    - For items returned with alreadyInvited: true, show "Already
      invited" with a **Resend** CTA.

    - Show a success toast and link to "Manage Invites".

## **Role Definitions (current)**

- **admin**: can invite/resend/cancel, change roles, remove members;
  full read across the client.

- **editor**: read all, modify project resources where applicable;
  cannot manage team membership.

- **viewer**: read-only access across the client.

- Document these clearly in UI where roles are selected. Treat as
  provisional until the dedicated permissions service lands.

## **Health, Logging, and Idempotency**

- **Health**: implement GET /health returning a simple ok payload used
  by Render health checks.

- **Logging**: ensure startup logs include port and environment; log
  errors for failed Notification Service calls and DB errors.

- **Idempotency**:

  - Invitation creation must be idempotent for pending duplicates:
    return the existing row and set alreadyInvited: true without
    creating a new record.

  - Accept flow must be idempotent for team membership insertions
    (insert-or-ignore).

- **Security**:

  - Require gateway-provided headers for authenticated routes.

  - Enforce invitee email equality on accept.

  - Respect expiry and status transitions.

## **What stays unchanged right now**

- **Onboarding** uses its existing invitation logic and endpoints; do
  not reroute onboarding yet.

- **My Team** and any new flows must call this **invitations-service**
  via the API Gateway.

- When ready, onboarding can be switched to this service with minimal
  risk, since the API is already in place.
