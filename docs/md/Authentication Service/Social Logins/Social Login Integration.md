# **Social Login Integration**

**Service:** auth-service\
**Providers:** Google OAuth 2.0 \| LinkedIn OAuth 2.0\
**Doc Series:** auth-service · Doc 04-A -- Social Login Endpoints &
Flow\
**Scope:** Token receipt, email extraction, account unification, JWT
issuance

# **Doc 00 -- Service Overview & Repo Placement**

## **Purpose**

This document series covers the Social Login feature of the
auth-service. Social login allows users to authenticate via Google or
LinkedIn. The core business rule is email-based account unification: if
a social provider returns an email that already exists in the platform
(regardless of how that account was created), the user is granted access
to that existing account rather than a new account being created.

## **Responsibilities**

- Receive an OAuth token (ID token or access token) from the frontend
  after the user completes the provider\'s consent flow.

- Verify the token with the respective provider (Google or LinkedIn).

- Extract the verified email address from the provider response.

- Check whether a user account with that email already exists in the
  platform.

- If it exists: return a platform JWT for that account (login).

- If it does not exist: create a new account using the email (and
  available profile data), then return a platform JWT (register +
  login).

- Store the social provider identity (provider name + provider user ID)
  linked to the account for future logins without re-querying email.

## **Dependencies**

  -------------------
  **Dependency**
  -------------------
  Google Token
  Verification

  LinkedIn Token
  Verification

  PostgreSQL
  (Supabase)

  JWT (jsonwebtoken)

  user-service
  -------------------

## **Repo Placement**

All social login code lives under apps/auth-service/src/. Do not place
code at the repo root or outside this service folder.

# **Doc 01 -- Docker & Runtime Setup**

## **Dockerfile**

The auth-service uses the standard Marketeq Dockerfile skeleton. No
changes are needed for social login beyond ensuring the social provider
env vars are exposed.

FROM node:20-alpine

WORKDIR /usr/src/app

COPY package\*.json ./

RUN npm ci

COPY . .

RUN npm run build

EXPOSE \$PORT

CMD \[\"node\", \"dist/main.js\"\]

## **Health Endpoint**

The service exposes GET /health which must return HTTP 200 for Supabase
health checks.

@Get(\'health\')

health() {

return { status: \'ok\' };

}

## **Environment Variables (Runtime)**

All variables below must be set in the Supabase dashboard for the
auth-service container.

  **Variable**             **Required**     **Description**
  ------------------------ ---------------- -------------------------------------------------
  PORT                     Yes              HTTP port the container listens on
  DATABASE_URL             Yes              Shared Postgres connection string (Supabase)
  JWT_SECRET               Yes              Secret used to sign platform JWTs
  JWT_EXPIRES_IN           Yes              Token expiry, e.g. 7d
  GOOGLE_CLIENT_ID         Yes (Google)     OAuth 2.0 client ID from Google Cloud Console
  GOOGLE_CLIENT_SECRET     Yes (Google)     OAuth 2.0 client secret
  LINKEDIN_CLIENT_ID       Yes (LinkedIn)   OAuth 2.0 app ID from LinkedIn Developer Portal
  LINKEDIN_CLIENT_SECRET   Yes (LinkedIn)   OAuth 2.0 app secret

## **Local Development**

****cd apps/auth-service

npm install

npm run start:dev

Create a .env file in apps/auth-service/ with the variables above.
Never commit .env to version control.

# **Doc 02 -- Folder Structure & Bootstrapping**

## **Canonical Folder Layout**

****apps/auth-service/

├── Dockerfile

├── Supabase.yaml

├── package.json

└── src/

├── app.module.ts

├── main.ts

├── controllers/

│ └── social-auth.controller.ts

├── services/

│ ├── google-auth.service.ts

│ ├── linkedin-auth.service.ts

│ └── social-auth.service.ts

├── dto/

│ ├── google-login.dto.ts

│ └── linkedin-login.dto.ts

├── entities/

│ ├── user.entity.ts

│ └── social-identity.entity.ts

└── config/

└── auth.config.ts

## **Module Wiring (app.module.ts)**

The SocialAuthModule must be imported in AppModule. It declares the
controller and all three services.

@Module({

imports: \[TypeOrmModule.forFeature(\[User, SocialIdentity\])\],

controllers: \[SocialAuthController\],

providers: \[SocialAuthService, GoogleAuthService,
LinkedInAuthService\],

})

export class SocialAuthModule {}



# **Doc 03 -- Data Models & DTOs**

## **Entities**

### **User Entity (Existing -- Extended)**

The existing users table is reused. No migration is needed for the
social login flow beyond ensuring email is a unique, indexed column. The
social_identities table below is new.

// entities/user.entity.ts (relevant fields)

\@Entity(\'users\')

export class User {

\@PrimaryGeneratedColumn(\'uuid\') id: string;

\@Column({ unique: true }) email: string;

\@Column({ nullable: true }) passwordHash: string; // null for
social-only accounts

\@Column({ nullable: true }) firstName: string;

\@Column({ nullable: true }) lastName: string;

\@Column({ nullable: true }) avatarUrl: string;

\@Column({ default: true }) isActive: boolean;

\@CreateDateColumn() createdAt: Date;

\@OneToMany(() =\> SocialIdentity, si =\> si.user) socialIdentities:
SocialIdentity\[\];

}

### **SocialIdentity Entity (New)**

This table links a social provider identity to a platform user. It is
the mechanism that enables account unification --- one user row can have
multiple social identities (e.g., Google + LinkedIn both pointing to the
same user).

// entities/social-identity.entity.ts

\@Entity(\'social_identities\')

export class SocialIdentity {

\@PrimaryGeneratedColumn(\'uuid\') id: string;

\@Column() provider: string; // \'google\' \| \'linkedin\'

\@Column() providerUserId: string; // provider\'s unique user ID

\@Column() email: string; // email at time of link

\@ManyToOne(() =\> User, u =\> u.socialIdentities)

\@JoinColumn({ name: \'user_id\' })

user: User;

\@Column(\'uuid\') userId: string;

\@CreateDateColumn() createdAt: Date;

\@Unique(\[\'provider\', \'providerUserId\'\]) // one row per provider
identity

}

> **Migration:** Create the social_identities table in the auth-service
> schema on Supabase. Column user_id references users(id) with ON DELETE
> CASCADE.

## **DTOs**

### **GoogleLoginDto**

****// dto/google-login.dto.ts

import { IsString, IsNotEmpty } from \'class-validator\';

export class GoogleLoginDto {

\@IsString() \@IsNotEmpty()

idToken: string; // Google ID token sent from frontend post-consent

}

### **LinkedInLoginDto**

****// dto/linkedin-login.dto.ts

import { IsString, IsNotEmpty } from \'class-validator\';

export class LinkedInLoginDto {

\@IsString() \@IsNotEmpty()

code: string; // OAuth authorization code from LinkedIn redirect

\@IsString() \@IsNotEmpty()

redirectUri: string; // Must match the URI registered in LinkedIn app

}

## **Database Migration SQL Reference**

****CREATE TABLE IF NOT EXISTS social_identities (

id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

provider VARCHAR(32) NOT NULL,

provider_user_id VARCHAR(255) NOT NULL,

email VARCHAR(255) NOT NULL,

user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

UNIQUE (provider, provider_user_id)

);

CREATE INDEX idx_social_identities_user_id ON
social_identities(user_id);



# **Doc 04-A -- API Endpoints -- Social Login**

Prerequisites: Docs 01--03 must be implemented and the social_identities
table must exist before these routes are active.

## **Endpoint Summary**

  -----------------------------------------------------------------
  **Method**   **Path**                   **Auth**   **Provider**
  ------------ -------------------------- ---------- --------------
  POST         /v1/auth/social/google     Public     Google

  POST         /v1/auth/social/linkedin   Public     LinkedIn
  -----------------------------------------------------------------

## **POST /v1/auth/social/google**

**Request** --- Content-Type: application/json

{

\"idToken\": \"\<Google ID Token from frontend\>\"

}

**Response -- 200 OK**

****{

\"accessToken\": \"\<platform JWT\>\",

\"user\": {

\"id\": \"uuid\",

\"email\": \"user@example.com\",

\"firstName\": \"Jane\",

\"lastName\": \"Doe\",

\"avatarUrl\": \"https://\...\",

\"isNewUser\": false

}

}

**Error Responses**

  **HTTP Status**   **code**                    **message**
  ----------------- --------------------------- -------------------------------------------
  400               INVALID_TOKEN               Google ID token is missing or malformed.
  401               TOKEN_VERIFICATION_FAILED   Google could not verify the token.
  403               ACCOUNT_DISABLED            The matched account has been deactivated.
  500               INTERNAL_ERROR              Unexpected server error.

## **POST /v1/auth/social/linkedin**

**Request** --- Content-Type: application/json

{

\"code\": \"\<LinkedIn OAuth authorization code\>\",

\"redirectUri\": \"https://app.marketeq.com/auth/linkedin/callback\"

}

**Response -- 200 OK** --- Same shape as Google response above, with
isNewUser indicating whether the account was created in this request.

**Error Responses**

  **HTTP Status**   **code**                **message**
  ----------------- ----------------------- ---------------------------------------------------
  400               INVALID_CODE            Authorization code is missing or malformed.
  400               REDIRECT_URI_MISMATCH   redirectUri does not match the app configuration.
  401               TOKEN_EXCHANGE_FAILED   LinkedIn token exchange failed.
  403               ACCOUNT_DISABLED        The matched account has been deactivated.
  500               INTERNAL_ERROR          Unexpected server error.

# **Doc 05 -- Integrations & Auth Flow**

## **Google -- Token Verification Flow**

The frontend completes the Google OAuth consent and receives a Google ID
token. It sends this token to POST /v1/auth/social/google. The backend
does NOT redirect the user --- all OAuth consent happens client-side.

  ----------------------------------------------------------------------------------------
  **Step**   **Actor**      **Action**
  ---------- -------------- --------------------------------------------------------------
  1          Frontend       User clicks \'Sign in with Google\'. Google OAuth consent
                            completes. Frontend receives idToken.

  2          Frontend →     POST /v1/auth/social/google { idToken }
             auth-service   

  3          auth-service → GET
             Google API     https://oauth2.googleapis.com/tokeninfo?id_token=\<idToken\>

  4          Google API →   Returns { email, sub (Google user ID), name, picture } if
             auth-service   valid.

  5          auth-service   Look up social_identities WHERE provider=\'google\' AND
                            provider_user_id=sub.

  6a         auth-service   Get the linked user. Issue platform JWT. Return 200.
             (found)        

  6b         auth-service   Look up users WHERE email = returned email.
             (not found)    

  7a         auth-service   Link new social identity to existing user. Issue JWT. Return
             (email match)  200 (isNewUser=false).

  7b         auth-service   Create new user with email + profile. Create social identity.
             (no match)     Issue JWT. Return 200 (isNewUser=true).
  ----------------------------------------------------------------------------------------

## **LinkedIn -- Token Exchange Flow**

LinkedIn\'s flow provides an authorization code rather than an ID token.
The backend must exchange this code for an access token, then use the
access token to retrieve the user\'s email from LinkedIn\'s
/v2/emailAddress endpoint.

  ----------------------------------------------------------------------------------------------------------------
  **Step**   **Actor**      **Action**
  ---------- -------------- --------------------------------------------------------------------------------------
  1          Frontend       User clicks \'Sign in with LinkedIn\'. LinkedIn consent completes. Frontend receives
                            authorization code and redirectUri.

  2          Frontend →     POST /v1/auth/social/linkedin { code, redirectUri }
             auth-service   

  3          auth-service → POST https://www.linkedin.com/oauth/v2/accessToken { code, client_id, client_secret,
             LinkedIn API   redirect_uri, grant_type=\'authorization_code\' }

  4          LinkedIn API → Returns { access_token, expires_in }.
             auth-service   

  5          auth-service → GET
             LinkedIn API   https://api.linkedin.com/v2/emailAddress?q=members&projection=(elements\*(handle\~))
                            --- Authorization: Bearer \<access_token\>

  6          LinkedIn API → Returns verified email address.
             auth-service   

  7          auth-service → GET https://api.linkedin.com/v2/me (firstName, lastName, profilePicture)
             LinkedIn API   

  8          auth-service   Same account unification logic as Google steps 5--7b above.
  ----------------------------------------------------------------------------------------------------------------

## **Account Unification Rule**

> **Core business rule:** A user who signs up with email/password using
> jane@example.com and later signs in with Google (which returns
> jane@example.com) will access the same account. A new account is never
> created if the email already exists.

async findOrCreateUser(provider, providerUserId, email, profile) {

// 1. Check by provider identity first (fastest path)

const existing = await this.socialIdentityRepo.findOne({

where: { provider, providerUserId },

relations: \[\'user\'\],

});

if (existing) return { user: existing.user, isNewUser: false };

// 2. Check by email (unification path)

let user = await this.userRepo.findOne({ where: { email } });

let isNewUser = false;

if (!user) {

// 3. Create new user (registration path)

user = this.userRepo.create({ email, \...profile });

await this.userRepo.save(user);

isNewUser = true;

}

// 4. Link social identity to user

const identity = this.socialIdentityRepo.create({

provider, providerUserId, email, userId: user.id,

});

await this.socialIdentityRepo.save(identity);

return { user, isNewUser };

}



# **Doc 06 -- Observability & Health**

## **Health Endpoint**

****GET /health → { status: \'ok\' } (HTTP 200)

Supabase polls this endpoint every 10 seconds. If auth-service is down,
the API gateway will return 503 for all auth routes.

## **Logging Guidelines**

- Log provider name and whether the outcome was login, register, or
  error on every social login attempt.

- Never log the raw idToken, authorization code, or access_token values.
  Log only provider name, providerUserId (opaque), and outcome.

- Log external API call latency for Google and LinkedIn token
  verification to detect provider outages.

## **Key Metrics to Monitor**

  **Metric**                       **Description**                                  **Alert Threshold**
  -------------------------------- ------------------------------------------------ -----------------------
  social_login_success_total       Count of successful social logins by provider    ---
  social_login_failure_total       Count of failures by provider and error code     Rate \> 5% over 5 min
  social_token_verify_latency_ms   Latency of provider token verification calls     p99 \> 2000ms
  new_user_via_social_total        Count of new accounts created via social login   ---

# **Doc 07 -- QA & Test Data**

## **Unit Test Cases**

  ---------------------
  **Test Case**
  ---------------------
  New Google user

  Returning Google user
  (by provider ID)

  Email unification --
  Google

  New LinkedIn user

  Returning LinkedIn
  user

  Email unification --
  LinkedIn

  Invalid Google token

  Invalid LinkedIn code

  Disabled account
  match
  ---------------------

## **REST Client -- Manual Verification**

### **Google Login**

****\### Google Social Login

POST {{BASE_URL}}/v1/auth/social/google

Content-Type: application/json

{

\"idToken\": \"{{GOOGLE_ID_TOKEN}}\"

}

### **LinkedIn Login**

****\### LinkedIn Social Login

POST {{BASE_URL}}/v1/auth/social/linkedin

Content-Type: application/json

{

\"code\": \"{{LINKEDIN_AUTH_CODE}}\",

\"redirectUri\": \"{{LINKEDIN_REDIRECT_URI}}\"

}

## **Verification Checklist**

- GET /health returns { status: \'ok\' } with HTTP 200.

- New Google user: new row in users table; new row in social_identities
  with provider=\'google\'.

- Existing email + Google login: no new row in users; new row in
  social_identities linking to the existing user.

- Same Google user logging in twice: only one row in social_identities
  for that providerUserId.

- New LinkedIn user: token exchange succeeds; email retrieved from
  /v2/emailAddress; user and identity rows created.

- LinkedIn email matches existing user: social identity linked, existing
  user JWT returned.

- JWT returned is valid: decode and verify iss, sub, exp fields match
  auth-service config.
