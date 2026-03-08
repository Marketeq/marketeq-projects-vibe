# **Document 07 --- Mode Selection + Mode Switching** 

This document implements the **Client vs Talent mode system**:

- A single **AuthUser account** can have **both**:

  - a **Client profile**

  - a **Talent profile**

- The user is always "logged in as" **one active mode at a time**:

  - CLIENT or TALENT

- The UI has:

  - Initial "What brings you here today?" mode selection screen

  - A **Switch to Client / Switch to Talent** link in the **Account
    dropdown**, **above Settings**

- **Onboarding triggers once per mode** (first time the mode is
  entered).\
  If onboarding for that mode is already complete → route to **Home**
  immediately.

This is **in-sprint** and does not invent marketplace logic.

## **1) Final business rules (confirmed)**

### **1.1 One account, two profiles**

- AuthUser is the identity/auth container.

- Profiles are separate:

  - ClientProfile (client mode)

  - TalentProfile (talent mode)

### **1.2 Active context = one mode**

- At any moment, the user is actively "logged in as" either:

  - CLIENT

  - TALENT

- Switching mode updates the **session context** (not the whole
  account).

### **1.3 Onboarding triggers once per mode**

- If user switches into a mode for the first time:

  - redirect to that mode's onboarding flow

- If onboarding already completed for that mode:

  - redirect to Home (Dashboard)

### **1.4 Registration with existing email**

- If a user tries to register with an already-registered email:

  - it will skip onboarding and go home (handled in docs 01--02 with
    EMAIL_ALREADY_REGISTERED and login)

- If user clicks "Login as Client/Talent" (switch mode):

  - triggers onboarding only if not done for that mode

## **2) Data model (Prisma)**

This doc needs two additions:

1.  **Session mode** (active "logged in as" context)

2.  **Per-mode onboarding completion**

Update apps/auth-service/prisma/schema.prisma:

### **2.1 Add enum for mode**

enum AccountMode {

CLIENT

TALENT

}

### **2.2 Add mode on AuthSession**

model AuthSession {

id String \@id \@default(uuid())

userId String

rememberMe Boolean \@default(false)

// NEW

mode AccountMode \@default(CLIENT)

expiresAt DateTime

revokedAt DateTime?

state String \@default(\"ACTIVE\")

createdAt DateTime \@default(now())

updatedAt DateTime \@updatedAt

user AuthUser \@relation(fields: \[userId\], references: \[id\])

@@index(\[userId\])

@@index(\[mode\])

}

### **2.3 Add onboarding completion flags per mode on AuthUser**

model AuthUser {

id String \@id \@default(uuid())

email String \@unique

passwordHash String?

phoneE164 String? \@unique

phoneVerifiedAt DateTime?

termsAcceptedAt DateTime?

privacyAcceptedAt DateTime?

// Document 07 field can remain, but mode-specific is required:

onboardingClientCompletedAt DateTime?

onboardingTalentCompletedAt DateTime?

createdAt DateTime \@default(now())

updatedAt DateTime \@updatedAt

identities AuthIdentity\[\]

sessions AuthSession\[\]

}

Run migration:

cd apps/auth-service

npx prisma migrate dev \--name add_account_modes

npx prisma generate

## **3) API contract**

### **3.1 Get mode state (for UI)**

GET /v1/auth/mode

Returns current session mode + whether onboarding is complete per mode.

Response:

{

\"sessionId\": \"uuid\",

\"mode\": \"CLIENT\",

\"onboarding\": {

\"clientCompleted\": false,

\"talentCompleted\": true

},

\"switchLink\": {

\"label\": \"Switch to Client\",

\"targetMode\": \"CLIENT\"

}

}

### **3.2 Set initial mode selection (from "What brings you here today?")**

POST /v1/auth/mode/select

Request:

{ \"sessionId\": \"uuid\", \"mode\": \"CLIENT\" }

Response:

{ \"status\": \"MODE_SET\", \"mode\": \"CLIENT\", \"next\":
\"CLIENT_ONBOARDING\" }

### **3.3 Switch mode (from account dropdown link)**

POST /v1/auth/mode/switch

Request:

{ \"sessionId\": \"uuid\", \"targetMode\": \"TALENT\" }

Response:

{

\"status\": \"MODE_SWITCHED\",

\"mode\": \"TALENT\",

\"next\": \"TALENT_ONBOARDING\"

}

If onboarding already complete:

{

\"status\": \"MODE_SWITCHED\",

\"mode\": \"TALENT\",

\"next\": \"HOME\"

}

> Note: These endpoints assume the user is already authenticated and has
> a valid sessionId and tokens.\
> Session validation is done against the DB record.

## **4) Files to create/update**

Create:

- apps/auth-service/src/auth/mode/mode.controller.ts

- apps/auth-service/src/auth/mode/mode.service.ts

- apps/auth-service/src/auth/mode/dto/select-mode.dto.ts

- apps/auth-service/src/auth/mode/dto/switch-mode.dto.ts

- apps/auth-service/src/auth/mode/mode.guard.ts (simple session
  validation)

Update:

- apps/auth-service/src/auth/auth.module.ts

## **5) DTOs**

### **5.1 Select mode DTO**

Create: apps/auth-service/src/auth/mode/dto/select-mode.dto.ts

import { IsIn, IsString } from \'class-validator\';

export class SelectModeDto {

\@IsString()

sessionId!: string;

\@IsIn(\[\'CLIENT\', \'TALENT\'\])

mode!: \'CLIENT\' \| \'TALENT\';

}

### **5.2 Switch mode DTO**

Create: apps/auth-service/src/auth/mode/dto/switch-mode.dto.ts

import { IsIn, IsString } from \'class-validator\';

export class SwitchModeDto {

\@IsString()

sessionId!: string;

\@IsIn(\[\'CLIENT\', \'TALENT\'\])

targetMode!: \'CLIENT\' \| \'TALENT\';

}

## **6) Session validation helper (guard)**

Create: apps/auth-service/src/auth/mode/mode.guard.ts

import { BadRequestException, CanActivate, ExecutionContext, Injectable
} from \'@nestjs/common\';

import { PrismaService } from \'../../prisma/prisma.service\';

import { err } from \'../../common/errors\';

\@Injectable()

export class SessionGuard implements CanActivate {

constructor(private prisma: PrismaService) {}

async canActivate(context: ExecutionContext): Promise\<boolean\> {

const req = context.switchToHttp().getRequest();

const sessionId = req.body?.sessionId \|\| req.query?.sessionId;

if (!sessionId) throw new BadRequestException(err(\'SESSION_REQUIRED\',
\'sessionId is required.\'));

const session = await this.prisma.authSession.findUnique({

where: { id: sessionId },

select: { id: true, revokedAt: true, expiresAt: true, state: true },

});

if (!session \|\| session.revokedAt \|\| session.state !== \'ACTIVE\') {

throw new BadRequestException(err(\'INVALID_SESSION\', \'Invalid or
revoked session.\'));

}

if (new Date() \> session.expiresAt) {

throw new BadRequestException(err(\'SESSION_EXPIRED\', \'Session
expired.\'));

}

req.sessionId = sessionId;

return true;

}

}

> If you already have JWT auth guards in Document 01, you can replace
> this with JWT-based session lookup.\
> For sprint completeness, this guard ensures we don't invent
> cross-service auth middleware.

## **7) Mode service (core logic)**

Create: apps/auth-service/src/auth/mode/mode.service.ts

import { BadRequestException, Injectable } from \'@nestjs/common\';

import { PrismaService } from \'../../prisma/prisma.service\';

import { err } from \'../../common/errors\';

type Mode = \'CLIENT\' \| \'TALENT\';

\@Injectable()

export class ModeService {

constructor(private prisma: PrismaService) {}

private nextForMode(user: any, mode: Mode): \'CLIENT_ONBOARDING\' \|
\'TALENT_ONBOARDING\' \| \'HOME\' {

const clientDone = !!user.onboardingClientCompletedAt;

const talentDone = !!user.onboardingTalentCompletedAt;

if (mode === \'CLIENT\') return clientDone ? \'HOME\' :
\'CLIENT_ONBOARDING\';

return talentDone ? \'HOME\' : \'TALENT_ONBOARDING\';

}

async getMode(sessionId: string) {

const session = await this.prisma.authSession.findUnique({

where: { id: sessionId },

select: { id: true, userId: true, mode: true },

});

if (!session) throw new BadRequestException(err(\'INVALID_SESSION\',
\'Invalid session.\'));

const user = await this.prisma.authUser.findUnique({

where: { id: session.userId },

select: {

onboardingClientCompletedAt: true,

onboardingTalentCompletedAt: true,

},

});

if (!user) throw new BadRequestException(err(\'USER_NOT_FOUND\', \'User
not found.\'));

const clientCompleted = !!user.onboardingClientCompletedAt;

const talentCompleted = !!user.onboardingTalentCompletedAt;

const switchLink =

session.mode === \'CLIENT\'

? { label: \'Switch to Talent\', targetMode: \'TALENT\' as const }

: { label: \'Switch to Client\', targetMode: \'CLIENT\' as const };

return {

sessionId: session.id,

mode: session.mode,

onboarding: { clientCompleted, talentCompleted },

switchLink,

};

}

async selectMode(input: { sessionId: string; mode: Mode }) {

const session = await this.prisma.authSession.findUnique({

where: { id: input.sessionId },

select: { id: true, userId: true },

});

if (!session) throw new BadRequestException(err(\'INVALID_SESSION\',
\'Invalid session.\'));

const user = await this.prisma.authUser.findUnique({

where: { id: session.userId },

select: {

onboardingClientCompletedAt: true,

onboardingTalentCompletedAt: true,

},

});

if (!user) throw new BadRequestException(err(\'USER_NOT_FOUND\', \'User
not found.\'));

await this.prisma.authSession.update({

where: { id: input.sessionId },

data: { mode: input.mode },

});

return {

status: \'MODE_SET\' as const,

mode: input.mode,

next: this.nextForMode(user, input.mode),

};

}

async switchMode(input: { sessionId: string; targetMode: Mode }) {

const session = await this.prisma.authSession.findUnique({

where: { id: input.sessionId },

select: { id: true, userId: true, mode: true },

});

if (!session) throw new BadRequestException(err(\'INVALID_SESSION\',
\'Invalid session.\'));

if (session.mode === input.targetMode) {

// idempotent

const user = await this.prisma.authUser.findUnique({

where: { id: session.userId },

select: {

onboardingClientCompletedAt: true,

onboardingTalentCompletedAt: true,

},

});

if (!user) throw new BadRequestException(err(\'USER_NOT_FOUND\', \'User
not found.\'));

return {

status: \'MODE_SWITCHED\' as const,

mode: input.targetMode,

next: this.nextForMode(user, input.targetMode),

};

}

const user = await this.prisma.authUser.findUnique({

where: { id: session.userId },

select: {

onboardingClientCompletedAt: true,

onboardingTalentCompletedAt: true,

},

});

if (!user) throw new BadRequestException(err(\'USER_NOT_FOUND\', \'User
not found.\'));

await this.prisma.authSession.update({

where: { id: input.sessionId },

data: { mode: input.targetMode },

});

return {

status: \'MODE_SWITCHED\' as const,

mode: input.targetMode,

next: this.nextForMode(user, input.targetMode),

};

}

}

## **8) Controller**

Create: apps/auth-service/src/auth/mode/mode.controller.ts

import { Body, Controller, Get, Post, Query, UseGuards } from
\'@nestjs/common\';

import { ModeService } from \'./mode.service\';

import { SelectModeDto } from \'./dto/select-mode.dto\';

import { SwitchModeDto } from \'./dto/switch-mode.dto\';

import { SessionGuard } from \'./mode.guard\';

\@Controller(\'v1/auth/mode\')

export class ModeController {

constructor(private readonly svc: ModeService) {}

\@Get()

\@UseGuards(SessionGuard)

async get(@Query(\'sessionId\') sessionId: string) {

return this.svc.getMode(sessionId);

}

\@Post(\'select\')

\@UseGuards(SessionGuard)

async select(@Body() dto: SelectModeDto) {

return this.svc.selectMode({ sessionId: dto.sessionId, mode: dto.mode
});

}

\@Post(\'switch\')

\@UseGuards(SessionGuard)

async switch(@Body() dto: SwitchModeDto) {

return this.svc.switchMode({ sessionId: dto.sessionId, targetMode:
dto.targetMode });

}

}

## **9) Wire into AuthModule**

Update apps/auth-service/src/auth/auth.module.ts

Add imports:

import { ModeController } from \'./mode/mode.controller\';

import { ModeService } from \'./mode/mode.service\';

import { SessionGuard } from \'./mode/mode.guard\';

Add controller + provider:

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

ModeController,

\],

providers: \[

AuthService,

TokenService,

RegisterService,

PasswordService,

PasswordResetService,

Phone2faService,

SecurityFinalizeService,

ModeService,

SessionGuard,

MailerService,

SmsService,

\],

})

export class AuthModule {}

## **10) Run instructions**

cd apps/auth-service

npm install

npx prisma migrate dev

npm run start:dev

## **11) End-to-end verification (copy/paste)**

### **11.1 Get current mode**

curl \"http://localhost:3003/v1/auth/mode?sessionId=\<SESSION_ID\>\"

Expected:

{

\"sessionId\":\"\<SESSION_ID\>\",

\"mode\":\"CLIENT\",

\"onboarding\":{\"clientCompleted\":false,\"talentCompleted\":false},

\"switchLink\":{\"label\":\"Switch to
Talent\",\"targetMode\":\"TALENT\"}

}

### **11.2 Initial selection (Role Selection screen)**

curl -X POST http://localhost:3003/v1/auth/mode/select \\

-H \"Content-Type: application/json\" \\

-d \'{\"sessionId\":\"\<SESSION_ID\>\",\"mode\":\"CLIENT\"}\'

Expected:

{ \"status\":\"MODE_SET\", \"mode\":\"CLIENT\",
\"next\":\"CLIENT_ONBOARDING\" }

### **11.3 Switch from dropdown (above Settings)**

curl -X POST http://localhost:3003/v1/auth/mode/switch \\

-H \"Content-Type: application/json\" \\

-d \'{\"sessionId\":\"\<SESSION_ID\>\",\"targetMode\":\"TALENT\"}\'

Expected (first time):

{ \"status\":\"MODE_SWITCHED\", \"mode\":\"TALENT\",
\"next\":\"TALENT_ONBOARDING\" }

If already onboarded as Talent:

{ \"status\":\"MODE_SWITCHED\", \"mode\":\"TALENT\", \"next\":\"HOME\" }

## **12) Frontend UX mapping (exact)**

### **12.1 "What brings you here today?" screen**

- Two selectable cards:

  - "I want to hire" → CLIENT

  - "I'm looking for work" → TALENT

- On selection:

  - call POST /v1/auth/mode/select

  - if next = CLIENT_ONBOARDING → go to Document 09 (Client onboarding)

  - if next = TALENT_ONBOARDING → go to Document 10 (Talent onboarding)

  - if next = HOME → go to Home

### **12.2 Account dropdown switch link (above Settings)**

- Label depends on current session mode:

  - If current mode = Client → show "Switch to Talent"

  - If current mode = Talent → show "Switch to Client"

- On click:

  - call POST /v1/auth/mode/switch

  - route based on next exactly as above

### **12.3 Rule: onboarding only once per mode**

- After onboarding completion, the onboarding flow must call an endpoint
  (Document 09/10 will define) to set:

  - onboardingClientCompletedAt or onboardingTalentCompletedAt

- After that, any future switches route to Home.
