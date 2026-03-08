# **Document 02 --- Registration (Create Account)**

## **1) Purpose**

Implement Marketeq Projects **Create Account** with:

- **Email signup** (requires Terms acceptance)

- **OAuth signup** (Google/LinkedIn) with **auto-link by email**

- Returns a **registration session context** that routes user to
  **Security Setup Step 1/3** (password creation)

This doc integrates with Document 01:

- Uses same AuthUser, AuthIdentity, AuthSession

- Does **not** issue tokens until mandatory 2FA is satisfied (handled by
  Doc 01/Doc 06)

## **2) Confirmed business rules**

### **2.1 Email signup requires Terms acceptance**

- If Terms not accepted → block request with TERMS_REQUIRED.

### **2.2 Unique identity model (auto-link by email)**

- One account per email:

  - If OAuth comes in with an email that already exists, **link to that
    account** (create identity record).

  - If email signup attempts for existing email → return
    EMAIL_ALREADY_REGISTERED (frontend routes to Sign In).

### **2.3 Password setup required for email signup**

- Email signup creates the account in "password not set" state until
  Document 03 sets password.

### **2.4 2FA mandatory (from earlier decision)**

- Registration does not bypass the requirement.

- Tokens are not issued by this doc.

## **3) Data model updates (Prisma)**

### **3.1 Add Terms acceptance fields (required)**

Update apps/auth-service/prisma/schema.prisma **AuthUser** model to
include:

  -----------------------------------------------------------------------
  model AuthUser {\
  id String \@id \@default(uuid())\
  email String \@unique\
  passwordHash String?\
  phoneE164 String? \@unique\
  phoneVerifiedAt DateTime?\
  \
  // NEW (Document 02)\
  termsAcceptedAt DateTime?\
  privacyAcceptedAt DateTime?\
  \
  createdAt DateTime \@default(now())\
  updatedAt DateTime \@updatedAt\
  \
  identities AuthIdentity\[\]\
  sessions AuthSession\[\]\
  }\
  \
  Run migration:\
  cd apps/auth-service\
  npx prisma migrate dev \--name add_terms_acceptance\
  npx prisma generate
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

## **4) API contract**

### **4.1 Endpoints**

- POST /v1/auth/register/email

- POST /v1/auth/register/oauth/google

- POST /v1/auth/register/oauth/linkedin

### **4.2 Responses**

**Email registration success**

  -----------------------------------------------------------------------
  {\
  \"status\": \"ACCOUNT_CREATED\",\
  \"user\": { \"id\": \"uuid\", \"email\": \"you@email.com\" },\
  \"next\": \"SECURITY_STEP_1_OF_3_CREATE_PASSWORD\"\
  }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

**If email already exists**

  -----------------------------------------------------------------------
  {\
  \"code\": \"EMAIL_ALREADY_REGISTERED\",\
  \"message\": \"An account already exists for this email. Please sign
  in.\"\
  }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

**OAuth registration success**

- Same as above; identity is created/linked.

- No tokens are issued.

## **5) Files to create/update**

Create:

- apps/auth-service/src/auth/register/register.controller.ts

- apps/auth-service/src/auth/register/register.service.ts

- apps/auth-service/src/auth/register/dto/register-email.dto.ts

- apps/auth-service/src/auth/register/dto/register-oauth.dto.ts

Update:

- apps/auth-service/src/auth/auth.module.ts (add controller + service)

## **6) DTOs**

### **6.1 Email registration DTO**

  -----------------------------------------------------------------------
  Create: apps/auth-service/src/auth/register/dto/register-email.dto.ts\
  import { IsBoolean, IsEmail } from \'class-validator\';\
  \
  export class RegisterEmailDto {\
  \@IsEmail()\
  email!: string;\
  \
  \@IsBoolean()\
  acceptedTerms!: boolean;\
  \
  \@IsBoolean()\
  acceptedPrivacy!: boolean;\
  }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

### **6.2 OAuth registration DTO**

  -----------------------------------------------------------------------
  Create: apps/auth-service/src/auth/register/dto/register-oauth.dto.ts\
  import { IsBoolean, IsString, IsUrl, MinLength } from
  \'class-validator\';\
  \
  export class RegisterOAuthDto {\
  \@IsString()\
  \@MinLength(10)\
  code!: string;\
  \
  \@IsUrl()\
  redirectUri!: string;\
  \
  \@IsBoolean()\
  acceptedTerms!: boolean;\
  \
  \@IsBoolean()\
  acceptedPrivacy!: boolean;\
  }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

## **7) Register service (core logic)**

  -----------------------------------------------------------------------
  Create: apps/auth-service/src/auth/register/register.service.ts\
  import { BadRequestException, Injectable } from \'@nestjs/common\';\
  import { PrismaService } from \'../../prisma/prisma.service\';\
  import { err } from \'../../common/errors\';\
  import { googleExchangeCodeForEmail } from \'../oauth/google.oauth\';\
  import { linkedinExchangeCodeForEmail } from
  \'../oauth/linkedin.oauth\';\
  \
  \@Injectable()\
  export class RegisterService {\
  constructor(private prisma: PrismaService) {}\
  \
  private ensureTerms(input: { acceptedTerms: boolean; acceptedPrivacy:
  boolean }) {\
  if (!input.acceptedTerms \|\| !input.acceptedPrivacy) {\
  throw new BadRequestException(\
  err(\'TERMS_REQUIRED\', \'You must accept the Terms of Use and Privacy
  Policy to create an account.\')\
  );\
  }\
  }\
  \
  async registerWithEmail(input: { email: string; acceptedTerms: boolean;
  acceptedPrivacy: boolean }) {\
  this.ensureTerms(input);\
  \
  const email = input.email.toLowerCase().trim();\
  \
  const existing = await this.prisma.authUser.findUnique({\
  where: { email },\
  select: { id: true },\
  });\
  \
  if (existing) {\
  // explicit & deterministic for UI: route to login\
  throw new BadRequestException(\
  err(\'EMAIL_ALREADY_REGISTERED\', \'An account already exists for this
  email. Please sign in.\')\
  );\
  }\
  \
  const user = await this.prisma.authUser.create({\
  data: {\
  email,\
  termsAcceptedAt: new Date(),\
  privacyAcceptedAt: new Date(),\
  },\
  select: { id: true, email: true },\
  });\
  \
  // Create PASSWORD identity placeholder (providerUserId = user.id)\
  await this.prisma.authIdentity.create({\
  data: {\
  userId: user.id,\
  provider: \'PASSWORD\',\
  providerUserId: user.id,\
  providerEmail: email,\
  },\
  });\
  \
  return {\
  status: \'ACCOUNT_CREATED\' as const,\
  user,\
  next: \'SECURITY_STEP_1_OF_3_CREATE_PASSWORD\' as const,\
  };\
  }\
  \
  async registerWithOAuth(input: {\
  provider: \'GOOGLE\' \| \'LINKEDIN\';\
  code: string;\
  redirectUri: string;\
  acceptedTerms: boolean;\
  acceptedPrivacy: boolean;\
  }) {\
  this.ensureTerms(input);\
  \
  let email: string;\
  let providerUserId: string;\
  \
  if (input.provider === \'GOOGLE\') {\
  const res = await googleExchangeCodeForEmail({ code: input.code,
  redirectUri: input.redirectUri });\
  email = res.email;\
  providerUserId = res.providerUserId;\
  } else {\
  const res = await linkedinExchangeCodeForEmail({ code: input.code,
  redirectUri: input.redirectUri });\
  email = res.email;\
  providerUserId = res.providerUserId;\
  }\
  \
  // Upsert user by email (auto-link rule)\
  const user = await this.prisma.authUser.upsert({\
  where: { email },\
  update: {\
  // Update acceptance timestamps if missing\
  termsAcceptedAt: undefined,\
  privacyAcceptedAt: undefined,\
  },\
  create: {\
  email,\
  termsAcceptedAt: new Date(),\
  privacyAcceptedAt: new Date(),\
  },\
  select: { id: true, email: true, termsAcceptedAt: true,
  privacyAcceptedAt: true },\
  });\
  \
  // If user existed but had not accepted terms before, enforce
  acceptance at this moment:\
  if (!user.termsAcceptedAt \|\| !user.privacyAcceptedAt) {\
  await this.prisma.authUser.update({\
  where: { id: user.id },\
  data: { termsAcceptedAt: new Date(), privacyAcceptedAt: new Date() },\
  });\
  }\
  \
  // Create or update identity mapping for this provider user id\
  await this.prisma.authIdentity.upsert({\
  where: {\
  provider_providerUserId: {\
  provider: input.provider,\
  providerUserId,\
  },\
  },\
  update: { providerEmail: email, userId: user.id },\
  create: {\
  userId: user.id,\
  provider: input.provider,\
  providerUserId,\
  providerEmail: email,\
  },\
  });\
  \
  // Ensure PASSWORD identity exists so future email/password login can
  be enabled once password is set (Doc 03)\
  const passwordIdentity = await this.prisma.authIdentity.findFirst({\
  where: { userId: user.id, provider: \'PASSWORD\' },\
  select: { id: true },\
  });\
  \
  if (!passwordIdentity) {\
  await this.prisma.authIdentity.create({\
  data: {\
  userId: user.id,\
  provider: \'PASSWORD\',\
  providerUserId: user.id,\
  providerEmail: email,\
  },\
  });\
  }\
  \
  return {\
  status: \'ACCOUNT_CREATED\' as const,\
  user: { id: user.id, email: user.email },\
  next: \'SECURITY_STEP_1_OF_3_CREATE_PASSWORD\' as const,\
  };\
  }\
  }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

**Important note:** OAuth registration here does **not** issue tokens.
That remains in Document 01's login flow, which enforces mandatory 2FA.

## **8) Register controller**

  -----------------------------------------------------------------------
  Create: apps/auth-service/src/auth/register/register.controller.ts\
  import { Body, Controller, Post } from \'@nestjs/common\';\
  import { RegisterService } from \'./register.service\';\
  import { RegisterEmailDto } from \'./dto/register-email.dto\';\
  import { RegisterOAuthDto } from \'./dto/register-oauth.dto\';\
  \
  \@Controller(\'v1/auth/register\')\
  export class RegisterController {\
  constructor(private readonly reg: RegisterService) {}\
  \
  \@Post(\'email\')\
  async registerEmail(@Body() dto: RegisterEmailDto) {\
  return this.reg.registerWithEmail({\
  email: dto.email,\
  acceptedTerms: dto.acceptedTerms,\
  acceptedPrivacy: dto.acceptedPrivacy,\
  });\
  }\
  \
  \@Post(\'oauth/google\')\
  async registerGoogle(@Body() dto: RegisterOAuthDto) {\
  return this.reg.registerWithOAuth({\
  provider: \'GOOGLE\',\
  code: dto.code,\
  redirectUri: dto.redirectUri,\
  acceptedTerms: dto.acceptedTerms,\
  acceptedPrivacy: dto.acceptedPrivacy,\
  });\
  }\
  \
  \@Post(\'oauth/linkedin\')\
  async registerLinkedIn(@Body() dto: RegisterOAuthDto) {\
  return this.reg.registerWithOAuth({\
  provider: \'LINKEDIN\',\
  code: dto.code,\
  redirectUri: dto.redirectUri,\
  acceptedTerms: dto.acceptedTerms,\
  acceptedPrivacy: dto.acceptedPrivacy,\
  });\
  }\
  }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

## **9) Wire into AuthModule**

  -----------------------------------------------------------------------
  Update: apps/auth-service/src/auth/auth.module.ts\
  Add imports:\
  import { RegisterController } from \'./register/register.controller\';\
  import { RegisterService } from \'./register/register.service\';\
  \
  Update module:\
  \@Module({\
  imports: \[\
  JwtModule.register({}),\
  \],\
  controllers: \[AuthController, RegisterController\],\
  providers: \[AuthService, TokenService, RegisterService\],\
  })\
  export class AuthModule {}
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

## **10) Run instructions**

cd apps/auth-service

npm install

npx prisma migrate dev

npm run start:dev

## **11) Verification tests (copy/paste)**

### **11.1 Email registration (success)**

  -----------------------------------------------------------------------
  curl -X POST http://localhost:3003/v1/auth/register/email \\\
  -H \"Content-Type: application/json\" \\\
  -d \'{\
  \"email\":\"newuser@marketeq.com\",\
  \"acceptedTerms\":true,\
  \"acceptedPrivacy\":true\
  }\'\
  \
  Expected:\
  {\
  \"status\": \"ACCOUNT_CREATED\",\
  \"user\": { \"id\": \"uuid\", \"email\": \"newuser@marketeq.com\" },\
  \"next\": \"SECURITY_STEP_1_OF_3_CREATE_PASSWORD\"\
  }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

### **11.2 Email registration (terms not accepted)**

  -----------------------------------------------------------------------
  curl -X POST http://localhost:3003/v1/auth/register/email \\\
  -H \"Content-Type: application/json\" \\\
  -d \'{\
  \"email\":\"newuser2@marketeq.com\",\
  \"acceptedTerms\":false,\
  \"acceptedPrivacy\":true\
  }\'\
  \
  Expected error:\
  {\
  \"code\":\"TERMS_REQUIRED\",\
  \"message\":\"You must accept the Terms of Use and Privacy Policy to
  create an account.\"\
  }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

### **11.3 Email registration (already exists)**

  -----------------------------------------------------------------------
  curl -X POST http://localhost:3003/v1/auth/register/email \\\
  -H \"Content-Type: application/json\" \\\
  -d \'{\
  \"email\":\"newuser@marketeq.com\",\
  \"acceptedTerms\":true,\
  \"acceptedPrivacy\":true\
  }\'\
  \
  Expected error:\
  {\
  \"code\":\"EMAIL_ALREADY_REGISTERED\",\
  \"message\":\"An account already exists for this email. Please sign
  in.\"\
  }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

### **11.4 OAuth registration (auto-link by email)**

Call:

  -----------------------------------------------------------------------
  curl -X POST http://localhost:3003/v1/auth/register/oauth/google \\\
  -H \"Content-Type: application/json\" \\\
  -d \'{\
  \"code\":\"AUTH_CODE_FROM_GOOGLE\",\
  \"redirectUri\":\"https://your-frontend.com/auth/callback/google\",\
  \"acceptedTerms\":true,\
  \"acceptedPrivacy\":true\
  }\'
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

Expected:

- If email is new → creates user + identity

- If email exists → links Google identity to existing user (no
  duplicates)

## **12) Frontend behavior mapping**

### **Email sign up screen:**

- Disable "Create my account" until checkbox is checked (UI).

- On submit:

  - Call /v1/auth/register/email

  - If success → go to Step 1/3 (Create Password screen)

  - If EMAIL_ALREADY_REGISTERED → route to Sign In

### **OAuth sign up:**

- Use your provider's authorization code flow.

- Send { code, redirectUri, acceptedTerms, acceptedPrivacy } to backend.

- If success → go to Step 1/3 (Create Password screen)
