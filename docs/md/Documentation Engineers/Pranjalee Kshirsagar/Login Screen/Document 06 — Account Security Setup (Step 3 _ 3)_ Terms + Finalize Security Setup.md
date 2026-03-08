# **Document 06 --- Account Security Setup (Step 3 / 3): Terms + Finalize Security Setup** 

You asked to **go with Option A** for Step 3/3.\
So this document implements a **real** Step 3/3 that is **minimal,
non-invented, and safe**:

✅ What it DOES:

- Confirms Terms/Privacy acceptance is recorded (from Document 02)

- Ensures account security prerequisites are complete:

  - passwordHash exists

  - phoneVerifiedAt exists

- Finalizes the security wizard by creating or validating a **default
  active session** (if the client is already in a pending session from
  login/reset)

- Returns **next routing instruction**:

  - New user → Role Selection (onboarding entry)

  - Existing user (already onboarded) → Dashboard (placeholder flag)

🚫 What it DOES NOT do (not in sprint):

- Any "account recovery"

- Any profile fields beyond security scope

- Any marketplace behavior

This doc is consistent with Documents 01--06 and does **not** conflict
with your confirmed business logic.

## **1) Preconditions**

User must have completed:

- **Document 03**: password created (passwordHash exists)

- **Document 06**: phone verified (phoneVerifiedAt set)

Terms/Privacy:

- Already captured in Document 02 (termsAcceptedAt, privacyAcceptedAt)

- Step 3 simply validates they exist

## **2) Database changes**

No new tables required.

We will add one optional field to AuthUser to avoid ambiguity about
whether user already finished onboarding:

### **2.1 Add onboardingCompletedAt (recommended minimal tracking)**

Update apps/auth-service/prisma/schema.prisma:

model AuthUser {

id String \@id \@default(uuid())

email String \@unique

passwordHash String?

phoneE164 String? \@unique

phoneVerifiedAt DateTime?

termsAcceptedAt DateTime?

privacyAcceptedAt DateTime?

// NEW (Document 07)

onboardingCompletedAt DateTime?

createdAt DateTime \@default(now())

updatedAt DateTime \@updatedAt

identities AuthIdentity\[\]

sessions AuthSession\[\]

}

Run migration:

cd apps/auth-service

npx prisma migrate dev \--name add_onboarding_completed_at

npx prisma generate

> If you already track onboarding completion in another service/table,
> remove this field and map to that system. This field is here to keep
> routing unambiguous.

## **3) API contract**

### **Endpoint**

POST /v1/auth/security/finalize

### **Request**

{

\"email\": \"you@email.com\",

\"sessionId\": \"optional-session-id\"

}

- If the user is already in a pending session (from MFA_REQUIRED login
  or password reset), pass it.

- If the frontend already has tokens and sessionId, pass the sessionId
  anyway (idempotent).

### **Success response**

{

\"status\": \"SECURITY_FINALIZED\",

\"sessionId\": \"session-id-if-any\",

\"next\": \"ROLE_SELECTION\"

}

If onboarding already completed:

{

\"status\": \"SECURITY_FINALIZED\",

\"sessionId\": \"session-id-if-any\",

\"next\": \"DASHBOARD\"

}

### **Errors**

- TERMS_REQUIRED

- PASSWORD_REQUIRED

- PHONE_VERIFICATION_REQUIRED

- USER_NOT_FOUND

- INVALID_SESSION

## **4) Files to create/update**

Create:

- apps/auth-service/src/auth/security/finalize/security-finalize.controller.ts

- apps/auth-service/src/auth/security/finalize/security-finalize.service.ts

- apps/auth-service/src/auth/security/finalize/dto/finalize-security.dto.ts

Update:

- apps/auth-service/src/auth/auth.module.ts

## **5) DTO**

Create:
apps/auth-service/src/auth/security/finalize/dto/finalize-security.dto.ts

import { IsEmail, IsOptional, IsString } from \'class-validator\';

export class FinalizeSecurityDto {

\@IsEmail()

email!: string;

\@IsOptional()

\@IsString()

sessionId?: string;

}

## **6) Service logic (final)**

Create:
apps/auth-service/src/auth/security/finalize/security-finalize.service.ts

import { BadRequestException, Injectable } from \'@nestjs/common\';

import { PrismaService } from \'../../../prisma/prisma.service\';

import { err } from \'../../../common/errors\';

\@Injectable()

export class SecurityFinalizeService {

constructor(private prisma: PrismaService) {}

async finalize(input: { email: string; sessionId?: string }) {

const email = input.email.toLowerCase().trim();

const user = await this.prisma.authUser.findUnique({

where: { email },

select: {

id: true,

email: true,

passwordHash: true,

phoneVerifiedAt: true,

termsAcceptedAt: true,

privacyAcceptedAt: true,

onboardingCompletedAt: true,

},

});

if (!user) throw new BadRequestException(err(\'USER_NOT_FOUND\', \'No
user found for that email.\'));

// Step 3/3: confirm terms are recorded (should be set at registration,
but we validate)

if (!user.termsAcceptedAt \|\| !user.privacyAcceptedAt) {

throw new BadRequestException(

err(\'TERMS_REQUIRED\', \'You must accept the Terms of Use and Privacy
Policy to continue.\')

);

}

// Confirm password exists (Step 1/3 completed)

if (!user.passwordHash) {

throw new BadRequestException(err(\'PASSWORD_REQUIRED\', \'You must
create a password to continue.\'));

}

// Confirm phone is verified (Step 2/3 completed)

if (!user.phoneVerifiedAt) {

throw new BadRequestException(err(\'PHONE_VERIFICATION_REQUIRED\',
\'Phone verification is required.\'));

}

// Validate provided session belongs to user (if any)

let sessionId: string \| undefined = undefined;

if (input.sessionId) {

const session = await this.prisma.authSession.findUnique({

where: { id: input.sessionId },

select: { id: true, userId: true, revokedAt: true, state: true },

});

if (!session \|\| session.revokedAt \|\| session.userId !== user.id) {

throw new BadRequestException(err(\'INVALID_SESSION\', \'Invalid session
for this user.\'));

}

sessionId = session.id;

}

// Decide next routing

const next = user.onboardingCompletedAt ? \'DASHBOARD\' :
\'ROLE_SELECTION\';

return {

status: \'SECURITY_FINALIZED\' as const,

sessionId,

next,

};

}

}

## **7) Controller**

Create:
apps/auth-service/src/auth/security/finalize/security-finalize.controller.ts

import { Body, Controller, Post } from \'@nestjs/common\';

import { SecurityFinalizeService } from \'./security-finalize.service\';

import { FinalizeSecurityDto } from \'./dto/finalize-security.dto\';

\@Controller(\'v1/auth/security\')

export class SecurityFinalizeController {

constructor(private readonly svc: SecurityFinalizeService) {}

\@Post(\'finalize\')

async finalize(@Body() dto: FinalizeSecurityDto) {

return this.svc.finalize({

email: dto.email,

sessionId: dto.sessionId,

});

}

}

## **8) Wire into AuthModule**

Update apps/auth-service/src/auth/auth.module.ts

Add imports:

import { SecurityFinalizeController } from
\'./security/finalize/security-finalize.controller\';

import { SecurityFinalizeService } from
\'./security/finalize/security-finalize.service\';

Add to module:

\@Module({

imports: \[JwtModule.register({})\],

controllers: \[

AuthController,

RegisterController,

PasswordController,

PasswordResetController,

AccountRecoveryController,

Phone2faController,

SecurityFinalizeController,

\],

providers: \[

AuthService,

TokenService,

RegisterService,

PasswordService,

PasswordResetService,

Phone2faService,

SecurityFinalizeService,

MailerService,

SmsService,

\],

})

export class AuthModule {}

## **9) Verification tests (copy/paste)**

### **9.1 Finalize (success → role selection)**

curl -X POST http://localhost:3003/v1/auth/security/finalize \\

-H \"Content-Type: application/json\" \\

-d
\'{\"email\":\"newuser@marketeq.com\",\"sessionId\":\"\<SESSION_ID_OPTIONAL\>\"}\'

Expected:

{

\"status\": \"SECURITY_FINALIZED\",

\"sessionId\": \"\<SESSION_ID_OPTIONAL\>\",

\"next\": \"ROLE_SELECTION\"

}

### **9.2 Finalize (already onboarded → dashboard)**

Manually set onboardingCompletedAt for test:

\# Use Prisma Studio or direct SQL, then call finalize again.

Expected:

{

\"status\": \"SECURITY_FINALIZED\",

\"next\": \"DASHBOARD\"

}

### **9.3 Missing terms**

Expected error:

{ \"code\":\"TERMS_REQUIRED\", \"message\":\"You must accept the Terms
of Use and Privacy Policy to continue.\" }

### **9.4 Missing phone verification**

Expected error:

{ \"code\":\"PHONE_VERIFICATION_REQUIRED\", \"message\":\"Phone
verification is required.\" }

## **10) Frontend wiring (exact)**

After Step 2/3 (phone verified + tokens issued):

1.  Call POST /v1/auth/security/finalize with email and sessionId

2.  If next = ROLE_SELECTION → route to Document 08 (Role selection /
    onboarding entry)

3.  If next = DASHBOARD → route to home

This makes Step 3/3 a clean "gate + route decision" step without
inventing new UI interactions.
