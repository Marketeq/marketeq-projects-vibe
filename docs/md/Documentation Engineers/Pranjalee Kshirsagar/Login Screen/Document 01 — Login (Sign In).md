# **Document 01 --- Login (Sign In)**

## **1) Purpose**

Implement **Sign In** for Marketeq Projects with:

- Email + password login

- OAuth login: Google + LinkedIn

- "Remember me" (keep user logged in on the same device)

- Mandatory 2FA enforcement at login:

  - If phoneVerifiedAt is null → return MFA_REQUIRED (no tokens)

- Return sessionId with successful login tokens (required for mode
  switching later)

**Non-goals (covered in later docs):**

- Registration (Document 02)

- Password creation (Document 03)

- 2FA setup/verification flows (Document 06)

- Password reset (Document 04)

## **2) Scope boundaries and decisions (confirmed)**

### **2.1 Primary login identifier**

- System supports **email + phone on the account**, but **primary login
  identifier is email** (for sign-in in this doc).

### **2.2 OAuth account linking rule (confirmed)**

- If user signs up/signs in with OAuth and later tries email/password:

  - **Auto-link accounts by matching email**.

  - If no account exists → user must create account (handled in Document
    02).

### **2.3 2FA requirement (confirmed)**

- Phone-based 2FA is **mandatory for all users**.

- Login must block issuing tokens until phoneVerifiedAt exists.

### **2.4 Remember me semantics (confirmed)**

- "Remember me" = **keep user logged in on the same device** (longer
  refresh TTL).

- No special constraints for shared devices.

## **3) Architecture & repo placement**

### **3.1 Monorepo location (required)**

All code for this service lives under:\
/apps/auth-service/src (no repo-root /src).

### **3.2 Service context**

auth-service is responsible for:

- Unified auth (email/password + OAuth)

- Enforcing one account per email

- Issuing JWTs

## **4) API contract overview (public)**

All endpoints are prefixed with /v1.

### **4.1 Endpoints in this doc**

- POST /v1/auth/login

- POST /v1/auth/oauth/google

- POST /v1/auth/oauth/linkedin

- GET /health (required runtime check)

### **4.2 Standard error shape**

All errors return:

  -----------------------------------------------------------------------
  { \"code\": \"STRING\", \"message\": \"STRING\", \"details\": { } }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

(as per standards).

## **5) Data models (Prisma + Postgres/Supabase)**

> If your repo already has Prisma models for auth, **do not create
> duplicates**.\
> Instead, reconcile these fields into existing tables. This doc
> provides the canonical minimum required for Login.

Create/update: apps/auth-service/prisma/schema.prisma

  -----------------------------------------------------------------------
  datasource db {\
  provider = \"postgresql\"\
  url = env(\"DATABASE_URL\")\
  }\
  \
  generator client {\
  provider = \"prisma-client-js\"\
  }\
  \
  enum AuthProvider {\
  PASSWORD\
  GOOGLE\
  LINKEDIN\
  }\
  \
  enum SessionState {\
  ACTIVE\
  PENDING_MFA\
  REVOKED\
  }\
  \
  model AuthUser {\
  id String \@id \@default(uuid())\
  email String \@unique\
  passwordHash String? // nullable because OAuth-only accounts exist\
  phoneE164 String? \@unique\
  phoneVerifiedAt DateTime?\
  createdAt DateTime \@default(now())\
  updatedAt DateTime \@updatedAt\
  \
  identities AuthIdentity\[\]\
  sessions AuthSession\[\]\
  }\
  \
  model AuthIdentity {\
  id String \@id \@default(uuid())\
  userId String\
  provider AuthProvider\
  providerUserId String\
  providerEmail String // email observed from provider (for
  audit/linking)\
  createdAt DateTime \@default(now())\
  \
  user AuthUser \@relation(fields: \[userId\], references: \[id\])\
  \
  @@unique(\[provider, providerUserId\])\
  @@index(\[providerEmail\])\
  @@index(\[userId\])\
  }\
  \
  model AuthSession {\
  id String \@id \@default(uuid())\
  userId String\
  state SessionState \@default(ACTIVE)\
  refreshTokenHash String? // null if PENDING_MFA (no refresh yet)\
  rememberMe Boolean \@default(false)\
  expiresAt DateTime\
  revokedAt DateTime?\
  createdAt DateTime \@default(now())\
  \
  // Server-derived metadata (not from UI)\
  ipAddress String?\
  userAgent String?\
  \
  user AuthUser \@relation(fields: \[userId\], references: \[id\])\
  \
  @@index(\[userId\])\
  @@index(\[state\])\
  }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

### **5.1 Run migrations**

  -----------------------------------------------------------------------
  cd apps/auth-service\
  npx prisma migrate dev \--name auth_login_baseline\
  npx prisma generate
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

## **6) Local setup (developer with zero experience)**

### **6.1 Create service folder structure**

Inside repo root:

  -----------------------------------------------------------------------
  mkdir -p apps/auth-service/src\
  mkdir -p apps/auth-service/prisma\
  mkdir -p apps/auth-service/src/common\
  mkdir -p apps/auth-service/src/config\
  mkdir -p apps/auth-service/src/prisma\
  mkdir -p apps/auth-service/src/auth/dto\
  mkdir -p apps/auth-service/src/auth/oauth\
  mkdir -p apps/auth-service/src/auth/sessions
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

### **6.2 Create apps/auth-service/package.json**

  -----------------------------------------------------------------------
  {\
  \"name\": \"auth-service\",\
  \"version\": \"1.0.0\",\
  \"private\": true,\
  \"scripts\": {\
  \"start:dev\": \"nest start \--watch\",\
  \"build\": \"nest build\",\
  \"start:prod\": \"node dist/main.js\",\
  \"lint\": \"eslint .\",\
  \"test\": \"jest\",\
  \"prisma:generate\": \"prisma generate\",\
  \"prisma:migrate\": \"prisma migrate dev\"\
  },\
  \"dependencies\": {\
  \"@nestjs/common\": \"\^10.3.0\",\
  \"@nestjs/config\": \"\^3.2.0\",\
  \"@nestjs/core\": \"\^10.3.0\",\
  \"@nestjs/jwt\": \"\^10.2.0\",\
  \"@nestjs/platform-express\": \"\^10.3.0\",\
  \"axios\": \"\^1.6.8\",\
  \"bcryptjs\": \"\^2.4.3\",\
  \"class-transformer\": \"\^0.5.1\",\
  \"class-validator\": \"\^0.14.1\",\
  \"helmet\": \"\^7.1.0\",\
  \"nanoid\": \"\^5.0.6\",\
  \"@prisma/client\": \"\^5.18.0\",\
  \"prisma\": \"\^5.18.0\",\
  \"zod\": \"\^3.23.8\"\
  },\
  \"devDependencies\": {\
  \"@nestjs/cli\": \"\^10.3.0\",\
  \"@nestjs/testing\": \"\^10.3.0\",\
  \"@types/bcryptjs\": \"\^2.4.6\",\
  \"@types/jest\": \"\^29.5.12\",\
  \"@types/node\": \"\^20.12.7\",\
  \"eslint\": \"\^8.57.0\",\
  \"jest\": \"\^29.7.0\",\
  \"ts-jest\": \"\^29.1.2\",\
  \"typescript\": \"\^5.4.5\"\
  }\
  }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

### **6.3 Create .env for auth-service**

  ------------------------------------------------------------------------
  Create: apps/auth-service/.env\
  PORT=3003\
  NODE_ENV=development\
  \
  DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DB\
  \
  JWT_ACCESS_SECRET=replace_me_access_secret\
  JWT_REFRESH_SECRET=replace_me_refresh_secret\
  \
  ACCESS_TOKEN_TTL_SECONDS=900\
  REFRESH_TOKEN_TTL_SECONDS=86400\
  REFRESH_TOKEN_TTL_REMEMBER_SECONDS=2592000\
  \
  \# OAuth\
  GOOGLE_CLIENT_ID=replace_me\
  GOOGLE_CLIENT_SECRET=replace_me\
  GOOGLE_REDIRECT_URI=https://your-frontend.com/auth/callback/google\
  \
  LINKEDIN_CLIENT_ID=replace_me\
  LINKEDIN_CLIENT_SECRET=replace_me\
  LINKEDIN_REDIRECT_URI=https://your-frontend.com/auth/callback/linkedin
  ------------------------------------------------------------------------

  ------------------------------------------------------------------------

## **7) Docker runtime (required)**

Create: apps/auth-service/Dockerfile

  -----------------------------------------------------------------------
  FROM node:20-alpine\
  \
  WORKDIR /usr/src/app\
  \
  COPY package\*.json ./\
  RUN npm ci\
  \
  COPY . .\
  RUN npm run build\
  \
  ENV PORT=3003\
  EXPOSE 3003\
  \
  CMD \[\"node\", \"dist/main.js\"\]
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

## **8) Core plumbing code**

### **8.1 main.ts**

  -----------------------------------------------------------------------
  Create: apps/auth-service/src/main.ts\
  import { ValidationPipe } from \'@nestjs/common\';\
  import { NestFactory } from \'@nestjs/core\';\
  import helmet from \'helmet\';\
  import { AppModule } from \'./app.module\';\
  \
  async function bootstrap() {\
  const app = await NestFactory.create(AppModule);\
  \
  app.use(helmet());\
  app.useGlobalPipes(\
  new ValidationPipe({\
  whitelist: true,\
  forbidNonWhitelisted: true,\
  transform: true\
  }),\
  );\
  \
  // All public routes must be versioned /v1 (enforced by routing
  conventions)\
  await app.listen(process.env.PORT \|\| 3003);\
  }\
  bootstrap();
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

### **8.2 app.module.ts**

  -----------------------------------------------------------------------
  Create: apps/auth-service/src/app.module.ts\
  import { Module } from \'@nestjs/common\';\
  import { ConfigModule } from \'@nestjs/config\';\
  import { EnvModule } from \'./config/env.module\';\
  import { PrismaModule } from \'./prisma/prisma.module\';\
  import { HealthController } from \'./common/health.controller\';\
  import { AuthModule } from \'./auth/auth.module\';\
  \
  \@Module({\
  imports: \[\
  ConfigModule.forRoot({ isGlobal: true }),\
  EnvModule,\
  PrismaModule,\
  AuthModule,\
  \],\
  controllers: \[HealthController\],\
  })\
  export class AppModule {}
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

### **8.3 Environment validation (zod)**

  -----------------------------------------------------------------------
  Create: apps/auth-service/src/config/env.module.ts\
  import { Module } from \'@nestjs/common\';\
  import { z } from \'zod\';\
  \
  const EnvSchema = z.object({\
  PORT: z.string().optional(),\
  NODE_ENV: z.string().optional(),\
  \
  DATABASE_URL: z.string().min(1),\
  \
  JWT_ACCESS_SECRET: z.string().min(16),\
  JWT_REFRESH_SECRET: z.string().min(16),\
  \
  ACCESS_TOKEN_TTL_SECONDS: z.string().regex(/\^\\d+\$/),\
  REFRESH_TOKEN_TTL_SECONDS: z.string().regex(/\^\\d+\$/),\
  REFRESH_TOKEN_TTL_REMEMBER_SECONDS: z.string().regex(/\^\\d+\$/),\
  \
  GOOGLE_CLIENT_ID: z.string().min(1),\
  GOOGLE_CLIENT_SECRET: z.string().min(1),\
  GOOGLE_REDIRECT_URI: z.string().url(),\
  \
  LINKEDIN_CLIENT_ID: z.string().min(1),\
  LINKEDIN_CLIENT_SECRET: z.string().min(1),\
  LINKEDIN_REDIRECT_URI: z.string().url(),\
  });\
  \
  \@Module({})\
  export class EnvModule {\
  constructor() {\
  const parsed = EnvSchema.safeParse(process.env);\
  if (!parsed.success) {\
  // crash fast in dev/prod if env is invalid\
  // eslint-disable-next-line no-console\
  console.error(parsed.error.flatten());\
  throw new Error(\'Invalid environment variables for auth-service\');\
  }\
  }\
  }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

## **9) Shared utilities**

### **9.1 Standard error helper**

  -----------------------------------------------------------------------
  Create: apps/auth-service/src/common/errors.ts\
  export type ApiError = {\
  code: string;\
  message: string;\
  details?: Record\<string, any\>;\
  };\
  \
  export function err(code: string, message: string, details?:
  Record\<string, any\>): ApiError {\
  return { code, message, details };\
  }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

### **9.2 Hash helper (SHA-256 for token hashing)**

  -----------------------------------------------------------------------
  Create: apps/auth-service/src/common/crypto.ts\
  import { createHash } from \'crypto\';\
  \
  export function sha256(input: string): string {\
  return createHash(\'sha256\').update(input).digest(\'hex\');\
  }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

### **9.3 Health endpoint**

  -----------------------------------------------------------------------
  Create: apps/auth-service/src/common/health.controller.ts\
  import { Controller, Get } from \'@nestjs/common\';\
  \
  \@Controller()\
  export class HealthController {\
  \@Get(\'health\')\
  health() {\
  return { status: \'ok\' };\
  }\
  }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

## **10) Prisma module**

  -----------------------------------------------------------------------
  Create: apps/auth-service/src/prisma/prisma.module.ts\
  import { Global, Module } from \'@nestjs/common\';\
  import { PrismaService } from \'./prisma.service\';\
  \
  \@Global()\
  \@Module({\
  providers: \[PrismaService\],\
  exports: \[PrismaService\],\
  })\
  export class PrismaModule {}
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

  -----------------------------------------------------------------------
  Create: apps/auth-service/src/prisma/prisma.service.ts\
  import { Injectable, OnModuleDestroy, OnModuleInit } from
  \'@nestjs/common\';\
  import { PrismaClient } from \'@prisma/client\';\
  \
  \@Injectable()\
  export class PrismaService extends PrismaClient implements
  OnModuleInit, OnModuleDestroy {\
  async onModuleInit() {\
  await this.\$connect();\
  }\
  async onModuleDestroy() {\
  await this.\$disconnect();\
  }\
  }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

## **11) Auth module + DTOs + services**

### **11.1 DTO: Email/password login**

  -----------------------------------------------------------------------
  Create: apps/auth-service/src/auth/dto/login.dto.ts\
  import { IsBoolean, IsEmail, IsOptional, IsString, MinLength } from
  \'class-validator\';\
  \
  export class LoginDto {\
  \@IsEmail()\
  email!: string;\
  \
  \@IsString()\
  \@MinLength(1)\
  password!: string;\
  \
  \@IsOptional()\
  \@IsBoolean()\
  rememberMe?: boolean;\
  }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

### **11.2 DTO: OAuth login (authorization code flow)**

  -----------------------------------------------------------------------
  Create: apps/auth-service/src/auth/dto/oauth-login.dto.ts\
  import { IsString, IsUrl, MinLength } from \'class-validator\';\
  \
  export class OAuthLoginDto {\
  \@IsString()\
  \@MinLength(10)\
  code!: string;\
  \
  \@IsUrl()\
  redirectUri!: string;\
  }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

## **12) JWT issuing strategy (access + refresh)**

  -----------------------------------------------------------------------
  Create: apps/auth-service/src/auth/sessions/token.service.ts\
  import { Injectable } from \'@nestjs/common\';\
  import { JwtService } from \'@nestjs/jwt\';\
  import { sha256 } from \'../../common/crypto\';\
  import { PrismaService } from \'../../prisma/prisma.service\';\
  \
  \@Injectable()\
  export class TokenService {\
  constructor(private jwt: JwtService, private prisma: PrismaService) {}\
  \
  accessTtlSeconds(): number {\
  return Number(process.env.ACCESS_TOKEN_TTL_SECONDS);\
  }\
  \
  refreshTtlSeconds(rememberMe: boolean): number {\
  return rememberMe\
  ? Number(process.env.REFRESH_TOKEN_TTL_REMEMBER_SECONDS)\
  : Number(process.env.REFRESH_TOKEN_TTL_SECONDS);\
  }\
  \
  async issueTokens(params: {\
  userId: string;\
  sessionId: string;\
  rememberMe: boolean;\
  }) {\
  const accessToken = await this.jwt.signAsync(\
  { sub: params.userId, sid: params.sessionId },\
  { secret: process.env.JWT_ACCESS_SECRET, expiresIn:
  this.accessTtlSeconds() },\
  );\
  \
  const refreshToken = await this.jwt.signAsync(\
  { sub: params.userId, sid: params.sessionId, typ: \'refresh\' },\
  { secret: process.env.JWT_REFRESH_SECRET, expiresIn:
  this.refreshTtlSeconds(params.rememberMe) },\
  );\
  \
  const refreshTokenHash = sha256(refreshToken);\
  const expiresAt = new Date(Date.now() +
  this.refreshTtlSeconds(params.rememberMe) \* 1000);\
  \
  await this.prisma.authSession.update({\
  where: { id: params.sessionId },\
  data: { refreshTokenHash, expiresAt, state: \'ACTIVE\', rememberMe:
  params.rememberMe },\
  });\
  \
  return { accessToken, refreshToken, expiresAt };\
  }\
  }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

## **13) OAuth provider handlers**

### **13.1 Google OAuth (code → tokens → userinfo)**

  -----------------------------------------------------------------------
  Create: apps/auth-service/src/auth/oauth/google.oauth.ts\
  import axios from \'axios\';\
  \
  export async function googleExchangeCodeForEmail(input: {\
  code: string;\
  redirectUri: string;\
  }) {\
  const tokenRes = await axios.post(\
  \'https://oauth2.googleapis.com/token\',\
  new URLSearchParams({\
  code: input.code,\
  client_id: process.env.GOOGLE_CLIENT_ID!,\
  client_secret: process.env.GOOGLE_CLIENT_SECRET!,\
  redirect_uri: input.redirectUri,\
  grant_type: \'authorization_code\',\
  }),\
  { headers: { \'Content-Type\': \'application/x-www-form-urlencoded\' }
  },\
  );\
  \
  const accessToken = tokenRes.data.access_token as string;\
  const idToken = tokenRes.data.id_token as string \| undefined;\
  \
  // Prefer userinfo endpoint (reliable email)\
  const userRes = await
  axios.get(\'https://www.googleapis.com/oauth2/v3/userinfo\', {\
  headers: { Authorization: \`Bearer \${accessToken}\` },\
  });\
  \
  const email = userRes.data.email as string;\
  const providerUserId = userRes.data.sub as string;\
  \
  if (!email \|\| !providerUserId) {\
  throw new Error(\'Google OAuth did not return required identity
  fields\');\
  }\
  \
  return { email: email.toLowerCase(), providerUserId, idToken };\
  }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

### **13.2 LinkedIn OAuth (code → token → profile/email)**

  --------------------------------------------------------------------------------------------
  Create: apps/auth-service/src/auth/oauth/linkedin.oauth.ts\
  import axios from \'axios\';\
  \
  export async function linkedinExchangeCodeForEmail(input: {\
  code: string;\
  redirectUri: string;\
  }) {\
  const tokenRes = await axios.post(\
  \'https://www.linkedin.com/oauth/v2/accessToken\',\
  new URLSearchParams({\
  grant_type: \'authorization_code\',\
  code: input.code,\
  redirect_uri: input.redirectUri,\
  client_id: process.env.LINKEDIN_CLIENT_ID!,\
  client_secret: process.env.LINKEDIN_CLIENT_SECRET!,\
  }),\
  { headers: { \'Content-Type\': \'application/x-www-form-urlencoded\' } },\
  );\
  \
  const accessToken = tokenRes.data.access_token as string;\
  if (!accessToken) throw new Error(\'LinkedIn OAuth token exchange failed\');\
  \
  // Get email address\
  const emailRes = await axios.get(\
  \'https://api.linkedin.com/v2/emailAddress?q=members&projection=(elements\*(handle\~))\',\
  { headers: { Authorization: \`Bearer \${accessToken}\` } },\
  );\
  \
  const email = emailRes.data?.elements?.\[0\]?.\[\'handle\~\'\]?.emailAddress as string \|
  undefined;\
  if (!email) throw new Error(\'LinkedIn OAuth did not return email\');\
  \
  // Get LinkedIn user id (provider user id)\
  const meRes = await axios.get(\'https://api.linkedin.com/v2/me\', {\
  headers: { Authorization: \`Bearer \${accessToken}\` },\
  });\
  \
  const providerUserId = meRes.data?.id as string \| undefined;\
  if (!providerUserId) throw new Error(\'LinkedIn OAuth did not return user id\');\
  \
  return { email: email.toLowerCase(), providerUserId };\
  }
  --------------------------------------------------------------------------------------------

  --------------------------------------------------------------------------------------------

## **14) Auth service (core login logic)**

  -----------------------------------------------------------------------
  Create: apps/auth-service/src/auth/auth.service.ts\
  import { BadRequestException, Injectable, UnauthorizedException } from
  \'@nestjs/common\';\
  import bcrypt from \'bcryptjs\';\
  import { PrismaService } from \'../prisma/prisma.service\';\
  import { err } from \'../common/errors\';\
  import { TokenService } from \'./sessions/token.service\';\
  import { googleExchangeCodeForEmail } from \'./oauth/google.oauth\';\
  import { linkedinExchangeCodeForEmail } from
  \'./oauth/linkedin.oauth\';\
  \
  \@Injectable()\
  export class AuthService {\
  constructor(private prisma: PrismaService, private tokens:
  TokenService) {}\
  \
  private async createSession(params: {\
  userId: string;\
  rememberMe: boolean;\
  userAgent?: string;\
  ipAddress?: string;\
  state: \'ACTIVE\' \| \'PENDING_MFA\';\
  }) {\
  const ttl = this.tokens.refreshTtlSeconds(params.rememberMe);\
  const expiresAt = new Date(Date.now() + ttl \* 1000);\
  \
  return this.prisma.authSession.create({\
  data: {\
  userId: params.userId,\
  rememberMe: params.rememberMe,\
  expiresAt,\
  state: params.state,\
  userAgent: params.userAgent,\
  ipAddress: params.ipAddress,\
  },\
  select: { id: true },\
  });\
  }\
  \
  private requiresMfa(user: { phoneVerifiedAt: Date \| null }) {\
  return !user.phoneVerifiedAt;\
  }\
  \
  async loginWithPassword(input: {\
  email: string;\
  password: string;\
  rememberMe: boolean;\
  userAgent?: string;\
  ipAddress?: string;\
  }) {\
  const email = input.email.toLowerCase().trim();\
  \
  const user = await this.prisma.authUser.findUnique({\
  where: { email },\
  select: { id: true, email: true, passwordHash: true, phoneVerifiedAt:
  true },\
  });\
  \
  if (!user \|\| !user.passwordHash) {\
  throw new UnauthorizedException(err(\'INVALID_CREDENTIALS\', \'Invalid
  email or password.\'));\
  }\
  \
  const ok = await bcrypt.compare(input.password, user.passwordHash);\
  if (!ok) {\
  throw new UnauthorizedException(err(\'INVALID_CREDENTIALS\', \'Invalid
  email or password.\'));\
  }\
  \
  // Enforce mandatory 2FA\
  if (this.requiresMfa(user)) {\
  const session = await this.createSession({\
  userId: user.id,\
  rememberMe: input.rememberMe,\
  userAgent: input.userAgent,\
  ipAddress: input.ipAddress,\
  state: \'PENDING_MFA\',\
  });\
  \
  return {\
  status: \'MFA_REQUIRED\' as const,\
  sessionId: session.id,\
  next: \'SECURITY_STEP_2_OF_3_PHONE_2FA\' as const,\
  };\
  }\
  \
  // MFA satisfied -\> issue tokens\
  const session = await this.createSession({\
  userId: user.id,\
  rememberMe: input.rememberMe,\
  userAgent: input.userAgent,\
  ipAddress: input.ipAddress,\
  state: \'ACTIVE\',\
  });\
  \
  const tokenBundle = await this.tokens.issueTokens({\
  userId: user.id,\
  sessionId: session.id,\
  rememberMe: input.rememberMe,\
  });\
  \
  return {\
  status: \'SIGNED_IN\' as const,\
  sessionId: session.id,\
  accessToken: tokenBundle.accessToken,\
  refreshToken: tokenBundle.refreshToken,\
  refreshExpiresAt: tokenBundle.expiresAt.toISOString(),\
  user: { id: user.id, email: user.email },\
  };\
  }\
  \
  async loginWithOAuth(input: {\
  provider: \'GOOGLE\' \| \'LINKEDIN\';\
  code: string;\
  redirectUri: string;\
  rememberMe: boolean;\
  userAgent?: string;\
  ipAddress?: string;\
  }) {\
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
  // Find or create user by email (one account per email)\
  const user = await this.prisma.authUser.upsert({\
  where: { email },\
  update: {},\
  create: { email },\
  select: { id: true, email: true, phoneVerifiedAt: true },\
  });\
  \
  // Ensure identity record exists (provider + providerUserId unique)\
  await this.prisma.authIdentity.upsert({\
  where: {\
  provider_providerUserId: {\
  provider: input.provider,\
  providerUserId,\
  },\
  },\
  update: { providerEmail: email },\
  create: {\
  userId: user.id,\
  provider: input.provider,\
  providerUserId,\
  providerEmail: email,\
  },\
  });\
  \
  // Enforce mandatory 2FA\
  if (this.requiresMfa(user)) {\
  const session = await this.createSession({\
  userId: user.id,\
  rememberMe: input.rememberMe,\
  userAgent: input.userAgent,\
  ipAddress: input.ipAddress,\
  state: \'PENDING_MFA\',\
  });\
  \
  return {\
  status: \'MFA_REQUIRED\' as const,\
  sessionId: session.id,\
  next: \'SECURITY_STEP_2_OF_3_PHONE_2FA\' as const,\
  };\
  }\
  \
  const session = await this.createSession({\
  userId: user.id,\
  rememberMe: input.rememberMe,\
  userAgent: input.userAgent,\
  ipAddress: input.ipAddress,\
  state: \'ACTIVE\',\
  });\
  \
  const tokenBundle = await this.tokens.issueTokens({\
  userId: user.id,\
  sessionId: session.id,\
  rememberMe: input.rememberMe,\
  });\
  \
  return {\
  status: \'SIGNED_IN\' as const,\
  sessionId: session.id,\
  accessToken: tokenBundle.accessToken,\
  refreshToken: tokenBundle.refreshToken,\
  refreshExpiresAt: tokenBundle.expiresAt.toISOString(),\
  user: { id: user.id, email: user.email },\
  };\
  }\
  \
  // This is required for Document 02/03 linkage:\
  // password sign-in should work for OAuth-created accounts only AFTER
  password is set.\
  async setPasswordForUser(input: { userId: string; password: string })
  {\
  const hash = await bcrypt.hash(input.password, 12);\
  await this.prisma.authUser.update({\
  where: { id: input.userId },\
  data: { passwordHash: hash },\
  });\
  }\
  }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

## **15) Auth controller (v1 routes)**

  -----------------------------------------------------------------------
  Create: apps/auth-service/src/auth/auth.controller.ts\
  import { Body, Controller, Post, Req } from \'@nestjs/common\';\
  import { AuthService } from \'./auth.service\';\
  import { LoginDto } from \'./dto/login.dto\';\
  import { OAuthLoginDto } from \'./dto/oauth-login.dto\';\
  \
  \@Controller(\'v1/auth\')\
  export class AuthController {\
  constructor(private readonly auth: AuthService) {}\
  \
  \@Post(\'login\')\
  async login(@Req() req: any, \@Body() dto: LoginDto) {\
  return this.auth.loginWithPassword({\
  email: dto.email,\
  password: dto.password,\
  rememberMe: dto.rememberMe ?? false,\
  userAgent: req.headers\[\'user-agent\'\],\
  ipAddress: req.ip,\
  });\
  }\
  \
  \@Post(\'oauth/google\')\
  async oauthGoogle(@Req() req: any, \@Body() dto: OAuthLoginDto) {\
  return this.auth.loginWithOAuth({\
  provider: \'GOOGLE\',\
  code: dto.code,\
  redirectUri: dto.redirectUri,\
  rememberMe: false, // UI does not show remember-me on OAuth screen;
  keep false for now\
  userAgent: req.headers\[\'user-agent\'\],\
  ipAddress: req.ip,\
  });\
  }\
  \
  \@Post(\'oauth/linkedin\')\
  async oauthLinkedIn(@Req() req: any, \@Body() dto: OAuthLoginDto) {\
  return this.auth.loginWithOAuth({\
  provider: \'LINKEDIN\',\
  code: dto.code,\
  redirectUri: dto.redirectUri,\
  rememberMe: false,\
  userAgent: req.headers\[\'user-agent\'\],\
  ipAddress: req.ip,\
  });\
  }\
  }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

## **16) Auth module wiring**

  -----------------------------------------------------------------------
  Create: apps/auth-service/src/auth/auth.module.ts\
  import { Module } from \'@nestjs/common\';\
  import { JwtModule } from \'@nestjs/jwt\';\
  import { AuthController } from \'./auth.controller\';\
  import { AuthService } from \'./auth.service\';\
  import { TokenService } from \'./sessions/token.service\';\
  \
  \@Module({\
  imports: \[\
  JwtModule.register({}), // secrets are passed per-sign in TokenService\
  \],\
  controllers: \[AuthController\],\
  providers: \[AuthService, TokenService\],\
  })\
  export class AuthModule {}
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

## **17) Install + run (exact steps)**

From repo root:

cd apps/auth-service

npm install

npx prisma generate

npx prisma migrate dev

npm run start:dev

Verify health:

curl http://localhost:3003/health

Expected:

  -----------------------------------------------------------------------
  { \"status\": \"ok\" }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

## **18) Verification: login (email/password)**

### **18.1 Case A --- User has verified phone (normal success)**

  ---------------------------------------------------------------------------------------
  curl -X POST http://localhost:3003/v1/auth/login \\\
  -H \"Content-Type: application/json\" \\\
  -d
  \'{\"email\":\"test@example.com\",\"password\":\"Password1!\",\"rememberMe\":true}\'\
  \
  Expected:\
  {\
  \"status\": \"SIGNED_IN\",\
  \"sessionId\": \"uuid\",\
  \"accessToken\": \"jwt\",\
  \"refreshToken\": \"jwt\",\
  \"refreshExpiresAt\": \"2026-02-18T00:00:00.000Z\",\
  \"user\": { \"id\": \"uuid\", \"email\": \"test@example.com\" }\
  }
  ---------------------------------------------------------------------------------------

  ---------------------------------------------------------------------------------------

### **18.2 Case B --- Phone not verified (mandatory 2FA gating)**

  -----------------------------------------------------------------------
  Expected:\
  {\
  \"status\": \"MFA_REQUIRED\",\
  \"sessionId\": \"uuid\",\
  \"next\": \"SECURITY_STEP_2_OF_3_PHONE_2FA\"\
  }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

**Important:** No access/refresh tokens are issued.

## **19) Verification: OAuth login**

OAuth endpoints require frontend to pass:

- code (authorization code)

- redirectUri (must match what provider issued)

Example:

  -------------------------------------------------------------------------------------------------------------
  curl -X POST http://localhost:3003/v1/auth/oauth/google \\\
  -H \"Content-Type: application/json\" \\\
  -d
  \'{\"code\":\"AUTH_CODE_FROM_GOOGLE\",\"redirectUri\":\"https://your-frontend.com/auth/callback/google\"}\'
  -------------------------------------------------------------------------------------------------------------

  -------------------------------------------------------------------------------------------------------------

Expected:

- If phone not verified → MFA_REQUIRED

- Else → SIGNED_IN with tokens + sessionId

## **20) Security notes (mandatory behaviors)**

- **One account per email:** enforced by AuthUser.email unique and OAuth
  upsert-by-email.

- **Do not leak internals:** errors use {code, message, details?}
  without stack traces.

- **DTO validation required:** class-validator DTO enforcement is a
  platform standard.

- **/v1 route prefix:** required for public endpoints.

## **21) What this doc enables next**

- Document 02/03 can create accounts and set passwords.

- Document 06 can:

  - attach phone

  - verify OTP or deep link

  - mark phoneVerifiedAt

  - then finalize the pending session (issue tokens using sessionId)
