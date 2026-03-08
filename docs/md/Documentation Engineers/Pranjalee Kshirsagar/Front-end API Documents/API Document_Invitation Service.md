## **API Document:Invitation Service**

## **Base URL**

- Local: http://localhost:3006

## **Authentication**

### **How auth is expected to work** 

- Frontend → API Gateway:\
  Send JWT when available:\
  Authorization: Bearer \<token\>

- API Gateway → invitations-service (what the service actually enforces
  in code):\
  The service requires trusted identity headers (validated by
  GatewayAuthGuard).\
  By default, headers are:

  - x-user-id: \<userId\>

  - x-user-email: \<email\>

- *(Header names can be overridden via env vars: GATEWAY_TRUST_HEADER,
  GATEWAY_TRUST_EMAIL_HEADER.)*

- Internal service endpoints (optional / future):

  - x-service-token: \<SERVICE_TOKEN\> *(not enforced in this repo
    snapshot, but can be used by gateway patterns)*

## **Content Type**

- Content-Type: application/json

## **Standard Error Pattern** 

- 401 Unauthorized → Missing gateway auth headers (x-user-id,
  x-user-email)

- 400 Bad Request → Invalid input, invite not pending, invite expired,
  email mismatch

- 404 Not Found → Invalid token or invitation id not found

- 429 Too Many Requests → Rate limiting (when enabled)

# **1. System Overview**

The Invitations Service manages inviting users to join a team. It
supports creating invites (bulk emails), listing/searching invites,
resending/canceling pending invites, and accepting an invite using a
secure token delivered via email. The service persists invitation state
in Postgres and creates a membership record when an invite is accepted.

Scope note (important):\
The UI design includes an "Invite Settings" panel (link access level,
expiration options, password, tracking, embed enablement). Those
settings are not implemented in the current invitations-service backend
and are likely future scope or handled by a different service/module.

# **2. High Level Architecture**

Requests typically go through an API Gateway that validates the JWT and
forwards trusted identity headers to this service. The service stores
invitations in Postgres (TypeORM entity: Invitation) and triggers email
sends via a NotificationsClient. Acceptance writes into team_members via
a SQL insert with conflict handling.

# **3. Workflow Overview**

1.  Create invites: POST /invitations inserts pending invites (one per
    email) and sends an email containing
    APP_BASE_URL/invite/accept?token=\....

2.  Resend/cancel: Admin can resend a pending invite (increments
    resentCount) or cancel it (sets status=canceled and canceledAt).

3.  Accept invite: Invitee calls POST /invitations/accept with the
    token; service validates status+expiry+email match, inserts
    membership into team_members, and marks invite accepted.

# **4. Key Dependencies and Modules**

- GatewayAuthGuard: requires gateway headers and injects req.user = {
  id, email }.

- Invitations module: controller + service + DTO validations
  (class-validator).

- Database (Postgres + TypeORM): invitations table; inserts into
  team_members on accept.

- NotificationsClient: sends invite emails (sendTeamInvite) and includes
  accept URL + optional note.

# **5. Current State and Responsibilities**

- This documentation includes only endpoints implemented in backend
  code.

- Create is idempotent for teamId + invitedEmail when an existing
  pending invite exists (it returns alreadyInvited: true and does not
  send a new invite in that case).

- Accept requires the invite email to match the authenticated user email
  and rejects expired/non-pending tokens.

# **6. Access & Tools**

  **Tool**                   **Purpose**                    **Notes**
  -------------------------- ------------------------------ ---------------------------------------------------------------------------------------------------------------------
  GitHub Repo                Invitations service codebase   [marketeq-projects-nestjs](https://github.com/Marketeq/marketeq-projects-nestjs/tree/main)/apps/invitations-service
  API Gateway                JWT validation + routing       Stores JWT logic; forwards trusted headers to this service
  Postman Collection         Testing endpoints              Save BASE_URL, X_USER_ID, X_USER_EMAIL as env vars
  Database Console           Validate persistence           Confirm rows in invitations and membership insert in team_members
  Logs / Observability       Debug invite lifecycle         Filter for 401 header issues + email send failures
  Local Environment (.env)   Local configuration            PORT, APP_BASE_URL, INVITE_EXP_DAYS, GATEWAY_TRUST_HEADER, GATEWAY_TRUST_EMAIL_HEADER

# **7. Data Model**

## **7.1 Invitation Entity (DB: invitations)**

  -----------------------------------------------------------------------
  {\
  \"id\": \"uuid\",\
  \"teamId\": \"uuid\",\
  \"invitedEmail\": \"text\",\
  \"role\": \"admin\|editor\|viewer\",\
  \"status\": \"pending\|accepted\|canceled\|expired\",\
  \"token\": \"text\",\
  \"expiresAt\": \"timestamptz\",\
  \"createdByUserId\": \"uuid\",\
  \"createdAt\": \"timestamptz\",\
  \"updatedAt\": \"timestamptz\",\
  \"acceptedAt\": \"timestamptz\|null\",\
  \"canceledAt\": \"timestamptz\|null\",\
  \"resentCount\": 0\
  }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

# **8. Endpoints**

## **8.1 Health**

### **8.1.1 GET /health**

**Summary :\**
Basic liveness endpoint. Use this for monitoring and confirming the
service process is reachable. This route is not guarded by
GatewayAuthGuard.

**Response**

  -----------------------------------------------------------------------
  { \"ok\": true }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

**Copy-pastable**

  -----------------------------------------------------------------------
  curl -X GET \"http://localhost:3006/health\"
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

## **8.2 Invitations**

> Base path: /invitations\
> Auth required (service-level): x-user-id and x-user-email headers
> (normally injected by gateway).

### **Common headers for all invitations endpoints**

  -----------------------------------------------------------------------
  x-user-id: \<userId\>\
  x-user-email: \<email\>\
  Content-Type: application/json
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

## **8.2.1 POST /invitations**

**Summary :\**
Creates invitations for one or more emails under a team and sends an
invite email for each new pending invite. If a pending invite already
exists for a given email+team, the service returns it and flags
alreadyInvited: true. The response is a frontend-safe subset (it does
not return tokens).

**Request Body (DTO: CreateInvitationsDto)**

  -----------------------------------------------------------------------
  {\
  \"teamId\": \"11111111-1111-1111-1111-111111111111\",\
  \"role\": \"editor\",\
  \"emails\": \[\"invitee1@example.com\", \"invitee2@example.com\"\],\
  \"note\": \"Welcome to the team!\"\
  }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

**Response Body**

  -----------------------------------------------------------------------
  \[\
  {\
  \"id\": \"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa\",\
  \"email\": \"invitee1@example.com\",\
  \"status\": \"pending\",\
  \"expiresAt\": \"2026-02-18T12:00:00.000Z\",\
  \"alreadyInvited\": false\
  }\
  \]
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

**Copy-pastable**

  -----------------------------------------------------------------------
  await fetch(\`\${BASE_URL}/invitations\`, {\
  method: \"POST\",\
  headers: {\
  \"Content-Type\": \"application/json\",\
  \"x-user-id\": userId,\
  \"x-user-email\": userEmail,\
  \...(jwt ? { Authorization: \`Bearer \${jwt}\` } : {}) // if calling
  via gateway\
  },\
  body: JSON.stringify({\
  teamId: \"11111111-1111-1111-1111-111111111111\",\
  role: \"editor\",\
  emails: \[\"invitee1@example.com\", \"invitee2@example.com\"\],\
  note: \"Welcome to the team!\"\
  })\
  });
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

## **8.2.2 GET /invitations**

**Summary :\**
Lists invitations with optional filtering by teamId and status. Supports
cursor-based pagination using createdAt timestamps. Returns { data,
nextCursor } where nextCursor can be used to load older records.

**Query Params (DTO: ListInvitationsQuery)**

- teamId *(optional uuid)*

- status *(optional: pending\|accepted\|canceled\|expired)*

- cursor *(optional string; ISO datetime; returns records older than
  cursor)*

- limit *(optional number; max 100; default 25)*

**Response Body**

  -----------------------------------------------------------------------
  {\
  \"data\": \[\
  {\
  \"id\": \"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa\",\
  \"teamId\": \"11111111-1111-1111-1111-111111111111\",\
  \"invitedEmail\": \"invitee1@example.com\",\
  \"role\": \"editor\",\
  \"status\": \"pending\",\
  \"token\": \"opaque-token\",\
  \"expiresAt\": \"2026-02-18T12:00:00.000Z\",\
  \"createdByUserId\": \"22222222-2222-2222-2222-222222222222\",\
  \"createdAt\": \"2026-02-11T12:00:00.000Z\",\
  \"updatedAt\": \"2026-02-11T12:00:00.000Z\",\
  \"acceptedAt\": null,\
  \"canceledAt\": null,\
  \"resentCount\": 0\
  }\
  \],\
  \"nextCursor\": \"2026-02-11T12:00:00.000Z\"\
  }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

**Copy-pastable**

  -------------------------------------------------------------------------------
  await
  fetch(\`\${BASE_URL}/invitations?teamId=\${teamId}&status=pending&limit=25\`,
  {\
  method: \"GET\",\
  headers: {\
  \"x-user-id\": userId,\
  \"x-user-email\": userEmail\
  }\
  });
  -------------------------------------------------------------------------------

  -------------------------------------------------------------------------------

## **8.2.3 GET /invitations/:id**

**Summary (2--3 lines):\**
Fetches a single invitation by id. This is used for admin detail views
and debugging. Returns 404 when the invitation does not exist.

**Response Body (Invitation entity)**

  -----------------------------------------------------------------------
  {\
  \"id\": \"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa\",\
  \"teamId\": \"11111111-1111-1111-1111-111111111111\",\
  \"invitedEmail\": \"invitee1@example.com\",\
  \"role\": \"editor\",\
  \"status\": \"pending\",\
  \"token\": \"opaque-token\",\
  \"expiresAt\": \"2026-02-18T12:00:00.000Z\",\
  \"createdByUserId\": \"22222222-2222-2222-2222-222222222222\",\
  \"createdAt\": \"2026-02-11T12:00:00.000Z\",\
  \"updatedAt\": \"2026-02-11T12:00:00.000Z\",\
  \"acceptedAt\": null,\
  \"canceledAt\": null,\
  \"resentCount\": 0\
  }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

**Copy-pastable**

  -----------------------------------------------------------------------
  await fetch(\`\${BASE_URL}/invitations/\${invitationId}\`, {\
  method: \"GET\",\
  headers: {\
  \"x-user-id\": userId,\
  \"x-user-email\": userEmail\
  }\
  });
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

## **8.2.4 POST /invitations/:id/resend**

**Summary :\**
Resends the invitation email for a pending invitation and increments
resentCount. If the invitation is not pending, the service returns 400.
This is used by the "Resend" action in the UI.

**Request Body: none**

**Response Body (updated Invitation)**

  -----------------------------------------------------------------------
  {\
  \"id\": \"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa\",\
  \"teamId\": \"11111111-1111-1111-1111-111111111111\",\
  \"invitedEmail\": \"invitee1@example.com\",\
  \"role\": \"editor\",\
  \"status\": \"pending\",\
  \"token\": \"opaque-token\",\
  \"expiresAt\": \"2026-02-18T12:00:00.000Z\",\
  \"createdByUserId\": \"22222222-2222-2222-2222-222222222222\",\
  \"createdAt\": \"2026-02-11T12:00:00.000Z\",\
  \"updatedAt\": \"2026-02-11T13:00:00.000Z\",\
  \"acceptedAt\": null,\
  \"canceledAt\": null,\
  \"resentCount\": 1\
  }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

**Copy-pastable**

  -----------------------------------------------------------------------
  await fetch(\`\${BASE_URL}/invitations/\${invitationId}/resend\`, {\
  method: \"POST\",\
  headers: {\
  \"x-user-id\": userId,\
  \"x-user-email\": userEmail\
  }\
  });
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

## **8.2.5 DELETE /invitations/:id/cancel**

**Summary :\**
Cancels a pending invitation by setting status=canceled and populating
canceledAt. Only pending invitations can be canceled; otherwise the
service returns 400. This is used by the "Remove/Cancel invite" action
in the UI.

**Request Body: none**

**Response Body (updated Invitation)**

  -----------------------------------------------------------------------
  {\
  \"id\": \"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa\",\
  \"teamId\": \"11111111-1111-1111-1111-111111111111\",\
  \"invitedEmail\": \"invitee1@example.com\",\
  \"role\": \"editor\",\
  \"status\": \"canceled\",\
  \"token\": \"opaque-token\",\
  \"expiresAt\": \"2026-02-18T12:00:00.000Z\",\
  \"createdByUserId\": \"22222222-2222-2222-2222-222222222222\",\
  \"createdAt\": \"2026-02-11T12:00:00.000Z\",\
  \"updatedAt\": \"2026-02-11T13:05:00.000Z\",\
  \"acceptedAt\": null,\
  \"canceledAt\": \"2026-02-11T13:05:00.000Z\",\
  \"resentCount\": 1\
  }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

**Copy-pastable**

  -----------------------------------------------------------------------
  await fetch(\`\${BASE_URL}/invitations/\${invitationId}/cancel\`, {\
  method: \"DELETE\",\
  headers: {\
  \"x-user-id\": userId,\
  \"x-user-email\": userEmail\
  }\
  });
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

## **8.2.6 POST /invitations/accept**

**Summary :\**
Accepts an invitation using the token from the invite URL. The service
validates that the invitation is pending and not expired, and it
enforces that the invitation email matches the authenticated user email.
On success it inserts a membership row into team_members (no duplicate
inserts) and marks the invitation as accepted.

**Request Body (DTO: AcceptInvitationDto)**

  -----------------------------------------------------------------------
  { \"token\": \"opaque-token-from-email\" }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

**Response Body (updated Invitation)**

  -----------------------------------------------------------------------
  {\
  \"id\": \"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa\",\
  \"teamId\": \"11111111-1111-1111-1111-111111111111\",\
  \"invitedEmail\": \"invitee1@example.com\",\
  \"role\": \"editor\",\
  \"status\": \"accepted\",\
  \"token\": \"opaque-token-from-email\",\
  \"expiresAt\": \"2026-02-18T12:00:00.000Z\",\
  \"createdByUserId\": \"22222222-2222-2222-2222-222222222222\",\
  \"createdAt\": \"2026-02-11T12:00:00.000Z\",\
  \"updatedAt\": \"2026-02-11T13:10:00.000Z\",\
  \"acceptedAt\": \"2026-02-11T13:10:00.000Z\",\
  \"canceledAt\": null,\
  \"resentCount\": 1\
  }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

**Copy-pastable**

  -----------------------------------------------------------------------
  await fetch(\`\${BASE_URL}/invitations/accept\`, {\
  method: \"POST\",\
  headers: {\
  \"Content-Type\": \"application/json\",\
  \"x-user-id\": userId,\
  \"x-user-email\": userEmail\
  },\
  body: JSON.stringify({ token: inviteToken })\
  });
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

## **9. Environment Variables** 

- PORT *(default 3006)*

- APP_BASE_URL *(used to construct accept URL:
  /invite/accept?token=\...)*

- INVITE_EXP_DAYS *(default 7)*

- GATEWAY_TRUST_HEADER *(default x-user-id)*

- GATEWAY_TRUST_EMAIL_HEADER *(default x-user-email)*
