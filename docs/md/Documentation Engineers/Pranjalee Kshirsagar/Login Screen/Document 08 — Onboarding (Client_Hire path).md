# **Document 08 --- Onboarding (Client/Hire path)** 

This document implements the **Client (Hire) onboarding flow** (5 steps)
and integrates with **Document 08 mode switching**:

- Client onboarding runs **only once per account**
  (onboardingClientCompletedAt).

- If a user is already onboarded as Client, switching to Client mode
  routes to **HOME** (Document 08).

- Onboarding state is saved per user, **step-by-step**, with support for
  **Back / Skip / Continue**.

- Final step **finalizes onboarding** and sets
  onboardingClientCompletedAt.

> Scope: This sprint is onboarding UX + data capture only.\
> Marketplace, search scope, and account recovery are out of sprint.

## **1) Preconditions**

- User is authenticated, has a valid sessionId and tokens.

- Session mode is CLIENT (Document 08 controls this).

- Security steps completed (Docs 03--07), including phone 2FA.

## **2) Data model (Prisma)**

We need a ClientProfile plus a simple onboarding progress store.

Update apps/auth-service/prisma/schema.prisma:

### **2.1 Add ClientProfile + onboarding progress**

model ClientProfile {

id String \@id \@default(uuid())

userId String \@unique

// Step 1: Describe Your Team

teamName String?

roleTitle String?

industry String?

// Step 2: Goals (multi-select)

goals String\[\] \@default(\[\])

// Step 3: Who are you looking to work with?

desiredRoles String\[\] \@default(\[\]) // job titles / roles

desiredSkills String\[\] \@default(\[\]) // skills tags

// Step 4 / 5: (not fully specified in your pasted text)

// Keep generic containers to avoid inventing new fields while still
supporting 5 steps.

step4Data Json?

step5Data Json?

createdAt DateTime \@default(now())

updatedAt DateTime \@updatedAt

user AuthUser \@relation(fields: \[userId\], references: \[id\])

}

model ClientOnboardingProgress {

id String \@id \@default(uuid())

userId String \@unique

step Int \@default(1) // 1..5

// Track skipped steps for analytics/debugging (optional)

skippedSteps Int\[\] \@default(\[\])

createdAt DateTime \@default(now())

updatedAt DateTime \@updatedAt

user AuthUser \@relation(fields: \[userId\], references: \[id\])

}

Run migration:

cd apps/auth-service

npx prisma migrate dev \--name add_client_onboarding

npx prisma generate

## **3) Step definitions (UI → data)**

### **Step 1 / 5 --- Describe Your Team**

UI components (from your list):

- Team/company name

- Role (job title)

- Industry\
  Buttons: Back / Skip / Continue

Backend fields:

- ClientProfile.teamName

- ClientProfile.roleTitle

- ClientProfile.industry

Validation (CTO decision to remove ambiguity):

- If user clicks **Continue** → all three required

- If user clicks **Skip** → allow all null

### **Step 2 / 5 --- Share Your Goals**

Selectable goal cards:

- Growth & Expansion

- Brand Building & Awareness

- Design & Strategy

- Operational Efficiency & Optimization

- Product & Service Development

- Technology & Innovation

Backend field:

- ClientProfile.goals (string array)

Validation (CTO decision):

- Multi-select (safer + matches "cards" UX)

- Continue requires at least **1** selected (otherwise users land with
  empty intent)

### **Step 3 / 5 --- Who are you looking to work with?**

UI shows job titles + skills with autocomplete/tag chips.

Backend fields:

- ClientProfile.desiredRoles\[\]

- ClientProfile.desiredSkills\[\]

Validation:

- Continue requires at least:

  - 1 desired role **or** 1 desired skill

- Duplicates are removed server-side

- Max limits (CTO defaults):

  - roles max 10

  - skills max 20

### **Step 4 / 5 --- (Design not fully provided)**

We will not invent specific business fields.\
We support Step 4 with a generic JSON payload:

- ClientProfile.step4Data (Json)

Validation:

- None (until you paste the actual Step 4 design)

### **Step 5 / 5 --- (Design not fully provided)**

Same approach:

- ClientProfile.step5Data (Json)

Finalize:

- Set AuthUser.onboardingClientCompletedAt = now()

## **4) API contract**

### **4.1 Get current onboarding state**

GET /v1/onboarding/client/state?sessionId=\...

Response:

{

\"mode\": \"CLIENT\",

\"step\": 1,

\"completed\": false,

\"profile\": {

\"teamName\": null,

\"roleTitle\": null,

\"industry\": null,

\"goals\": \[\],

\"desiredRoles\": \[\],

\"desiredSkills\": \[\]

}

}

If already completed:

{ \"completed\": true, \"next\": \"HOME\" }

### **4.2 Save a step (Continue)**

POST /v1/onboarding/client/step

Request:

{

\"sessionId\": \"uuid\",

\"step\": 1,

\"action\": \"CONTINUE\",

\"data\": { \... }

}

### **4.3 Skip a step**

Same endpoint with action SKIP.

### **4.4 Back navigation**

Same endpoint with action BACK.

### **4.5 Finalize (optional explicit)**

Also supported through step endpoint when step=5 and action=CONTINUE,
but we include explicit finalize for clarity:\
POST /v1/onboarding/client/finalize

## **5) Files to create/update**

Create:

- apps/auth-service/src/onboarding/client/client-onboarding.controller.ts

- apps/auth-service/src/onboarding/client/client-onboarding.service.ts

- apps/auth-service/src/onboarding/client/dto/client-onboarding-step.dto.ts

- apps/auth-service/src/onboarding/client/dto/client-onboarding-finalize.dto.ts

- apps/auth-service/src/onboarding/client/validators.ts

Update:

- apps/auth-service/src/auth/auth.module.ts (register
  controller/service)

- Reuse SessionGuard from Document 08 for sessionId validation

## **6) DTOs**

### **6.1 Step DTO**

Create:
apps/auth-service/src/onboarding/client/dto/client-onboarding-step.dto.ts

import { IsIn, IsInt, IsObject, IsOptional, IsString, Min, Max } from
\'class-validator\';

export class ClientOnboardingStepDto {

\@IsString()

sessionId!: string;

\@IsInt()

\@Min(1)

\@Max(5)

step!: number;

\@IsIn(\[\'CONTINUE\', \'SKIP\', \'BACK\'\])

action!: \'CONTINUE\' \| \'SKIP\' \| \'BACK\';

\@IsOptional()

\@IsObject()

data?: Record\<string, any\>;

}

### **6.2 Finalize DTO**

Create:
apps/auth-service/src/onboarding/client/dto/client-onboarding-finalize.dto.ts

import { IsString } from \'class-validator\';

export class ClientOnboardingFinalizeDto {

\@IsString()

sessionId!: string;

}

## **7) Validators (server-side)**

Create: apps/auth-service/src/onboarding/client/validators.ts

export const CLIENT_GOALS = \[

\'GROWTH_AND_EXPANSION\',

\'BRAND_BUILDING_AND_AWARENESS\',

\'DESIGN_AND_STRATEGY\',

\'OPERATIONAL_EFFICIENCY_AND_OPTIMIZATION\',

\'PRODUCT_AND_SERVICE_DEVELOPMENT\',

\'TECHNOLOGY_AND_INNOVATION\',

\] as const;

export function dedupeStrings(arr: unknown, max: number): string\[\] {

if (!Array.isArray(arr)) return \[\];

const cleaned = arr

.filter((x) =\> typeof x === \'string\')

.map((x) =\> x.trim())

.filter((x) =\> x.length \> 0);

return Array.from(new Set(cleaned)).slice(0, max);

}

export function validateStep1(data: any) {

const teamName = (data?.teamName ?? \'\').toString().trim();

const roleTitle = (data?.roleTitle ?? \'\').toString().trim();

const industry = (data?.industry ?? \'\').toString().trim();

if (!teamName) return { ok: false, code: \'TEAM_NAME_REQUIRED\',
message: \'Team/company name is required.\' };

if (!roleTitle) return { ok: false, code: \'ROLE_TITLE_REQUIRED\',
message: \'Role/job title is required.\' };

if (!industry) return { ok: false, code: \'INDUSTRY_REQUIRED\', message:
\'Industry is required.\' };

return { ok: true, teamName, roleTitle, industry };

}

export function validateStep2(data: any) {

const goals = dedupeStrings(data?.goals, 10);

const invalid = goals.filter((g) =\> !CLIENT_GOALS.includes(g as any));

if (goals.length === 0) return { ok: false, code: \'GOALS_REQUIRED\',
message: \'Select at least one goal.\' };

if (invalid.length \> 0)

return { ok: false, code: \'INVALID_GOALS\', message: \'One or more
goals are invalid.\', details: { invalid } };

return { ok: true, goals };

}

export function validateStep3(data: any) {

const desiredRoles = dedupeStrings(data?.desiredRoles, 10);

const desiredSkills = dedupeStrings(data?.desiredSkills, 20);

if (desiredRoles.length === 0 && desiredSkills.length === 0) {

return {

ok: false,

code: \'ROLES_OR_SKILLS_REQUIRED\',

message: \'Enter at least one desired role or one desired skill.\',

};

}

return { ok: true, desiredRoles, desiredSkills };

}

## **8) Service implementation**

Create:
apps/auth-service/src/onboarding/client/client-onboarding.service.ts

import { BadRequestException, Injectable } from \'@nestjs/common\';

import { PrismaService } from \'../../prisma/prisma.service\';

import { err } from \'../../common/errors\';

import { validateStep1, validateStep2, validateStep3 } from
\'./validators\';

\@Injectable()

export class ClientOnboardingService {

constructor(private prisma: PrismaService) {}

private async getUserBySession(sessionId: string) {

const session = await this.prisma.authSession.findUnique({

where: { id: sessionId },

select: { id: true, userId: true, mode: true, revokedAt: true,
expiresAt: true, state: true },

});

if (!session \|\| session.revokedAt \|\| session.state !== \'ACTIVE\'
\|\| new Date() \> session.expiresAt) {

throw new BadRequestException(err(\'INVALID_SESSION\', \'Invalid or
expired session.\'));

}

if (session.mode !== \'CLIENT\') {

throw new BadRequestException(err(\'INVALID_MODE\', \'Session is not in
CLIENT mode.\'));

}

const user = await this.prisma.authUser.findUnique({

where: { id: session.userId },

select: {

id: true,

onboardingClientCompletedAt: true,

},

});

if (!user) throw new BadRequestException(err(\'USER_NOT_FOUND\', \'User
not found.\'));

return { user, session };

}

async state(sessionId: string) {

const { user } = await this.getUserBySession(sessionId);

if (user.onboardingClientCompletedAt) {

return { completed: true, next: \'HOME\' as const };

}

const profile = await this.prisma.clientProfile.upsert({

where: { userId: user.id },

create: { userId: user.id },

update: {},

select: {

teamName: true,

roleTitle: true,

industry: true,

goals: true,

desiredRoles: true,

desiredSkills: true,

},

});

const progress = await this.prisma.clientOnboardingProgress.upsert({

where: { userId: user.id },

create: { userId: user.id, step: 1, skippedSteps: \[\] },

update: {},

select: { step: true, skippedSteps: true },

});

return {

mode: \'CLIENT\' as const,

step: progress.step,

completed: false,

skippedSteps: progress.skippedSteps,

profile,

};

}

private async setStep(userId: string, step: number, skippedStep?:
number) {

await this.prisma.clientOnboardingProgress.upsert({

where: { userId },

create: { userId, step, skippedSteps: skippedStep ? \[skippedStep\] :
\[\] },

update: skippedStep

? { step, skippedSteps: { push: skippedStep } }

: { step },

});

}

async step(input: { sessionId: string; step: number; action:
\'CONTINUE\' \| \'SKIP\' \| \'BACK\'; data?: any }) {

const { user } = await this.getUserBySession(input.sessionId);

if (user.onboardingClientCompletedAt) {

return { completed: true, next: \'HOME\' as const };

}

const current = await this.prisma.clientOnboardingProgress.upsert({

where: { userId: user.id },

create: { userId: user.id, step: 1, skippedSteps: \[\] },

update: {},

select: { step: true },

});

// Enforce linear flow: cannot submit a future step

if (input.step \> current.step) {

throw new BadRequestException(err(\'STEP_OUT_OF_ORDER\', \'Complete
previous steps first.\'));

}

// BACK: decrement step (min 1)

if (input.action === \'BACK\') {

const nextStep = Math.max(1, current.step - 1);

await this.setStep(user.id, nextStep);

return { status: \'STEP_MOVED\' as const, step: nextStep, next:
\`STEP\_\${nextStep}\` as const };

}

// SKIP: mark skipped and advance

if (input.action === \'SKIP\') {

const nextStep = Math.min(5, input.step + 1);

await this.setStep(user.id, nextStep, input.step);

return { status: \'STEP_SKIPPED\' as const, step: nextStep, next:
nextStep === 5 ? \'STEP_5\' : \`STEP\_\${nextStep}\` };

}

// CONTINUE: validate + persist based on step number

if (input.step === 1) {

const v = validateStep1(input.data);

if (!v.ok) throw new BadRequestException(err(v.code, v.message));

await this.prisma.clientProfile.upsert({

where: { userId: user.id },

create: { userId: user.id, teamName: v.teamName, roleTitle: v.roleTitle,
industry: v.industry },

update: { teamName: v.teamName, roleTitle: v.roleTitle, industry:
v.industry },

});

} else if (input.step === 2) {

const v = validateStep2(input.data);

if (!v.ok) throw new BadRequestException(err(v.code, v.message,
v.details));

await this.prisma.clientProfile.update({

where: { userId: user.id },

data: { goals: v.goals },

});

} else if (input.step === 3) {

const v = validateStep3(input.data);

if (!v.ok) throw new BadRequestException(err(v.code, v.message));

await this.prisma.clientProfile.update({

where: { userId: user.id },

data: { desiredRoles: v.desiredRoles, desiredSkills: v.desiredSkills },

});

} else if (input.step === 4) {

// Not specified in designs provided → accept JSON as-is

await this.prisma.clientProfile.update({

where: { userId: user.id },

data: { step4Data: input.data ?? {} },

});

} else if (input.step === 5) {

await this.prisma.clientProfile.update({

where: { userId: user.id },

data: { step5Data: input.data ?? {} },

});

// Finalize onboarding on Step 5 continue

await this.prisma.authUser.update({

where: { id: user.id },

data: { onboardingClientCompletedAt: new Date() },

});

return { status: \'ONBOARDING_COMPLETED\' as const, next: \'HOME\' as
const };

}

// Advance step (unless already on 5)

const nextStep = Math.min(5, input.step + 1);

await this.setStep(user.id, nextStep);

return { status: \'STEP_SAVED\' as const, step: nextStep, next: nextStep
=== 5 ? \'STEP_5\' : \`STEP\_\${nextStep}\` };

}

async finalize(sessionId: string) {

const { user } = await this.getUserBySession(sessionId);

if (user.onboardingClientCompletedAt) {

return { status: \'ALREADY_COMPLETED\' as const, next: \'HOME\' as const
};

}

// Only allow finalize if currently at step 5 (CTO safety)

const progress = await this.prisma.clientOnboardingProgress.findUnique({

where: { userId: user.id },

select: { step: true },

});

if (!progress \|\| progress.step \< 5) {

throw new BadRequestException(err(\'NOT_READY_TO_FINALIZE\', \'Complete
all onboarding steps before finalizing.\'));

}

await this.prisma.authUser.update({

where: { id: user.id },

data: { onboardingClientCompletedAt: new Date() },

});

return { status: \'ONBOARDING_COMPLETED\' as const, next: \'HOME\' as
const };

}

}

## **9) Controller**

Create:
apps/auth-service/src/onboarding/client/client-onboarding.controller.ts

import { Body, Controller, Get, Post, Query } from \'@nestjs/common\';

import { ClientOnboardingService } from \'./client-onboarding.service\';

import { ClientOnboardingStepDto } from
\'./dto/client-onboarding-step.dto\';

import { ClientOnboardingFinalizeDto } from
\'./dto/client-onboarding-finalize.dto\';

\@Controller(\'v1/onboarding/client\')

export class ClientOnboardingController {

constructor(private readonly svc: ClientOnboardingService) {}

\@Get(\'state\')

async state(@Query(\'sessionId\') sessionId: string) {

return this.svc.state(sessionId);

}

\@Post(\'step\')

async step(@Body() dto: ClientOnboardingStepDto) {

return this.svc.step({

sessionId: dto.sessionId,

step: dto.step,

action: dto.action,

data: dto.data,

});

}

\@Post(\'finalize\')

async finalize(@Body() dto: ClientOnboardingFinalizeDto) {

return this.svc.finalize(dto.sessionId);

}

}

## **10) Wire into AuthModule**

Update apps/auth-service/src/auth/auth.module.ts

Add imports:

import { ClientOnboardingController } from
\'../onboarding/client/client-onboarding.controller\';

import { ClientOnboardingService } from
\'../onboarding/client/client-onboarding.service\';

Add to controllers/providers:

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

ClientOnboardingController,

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

ClientOnboardingService,

SessionGuard,

MailerService,

SmsService,

\],

})

export class AuthModule {}

## **11) Run instructions**

cd apps/auth-service

npm install

npx prisma migrate dev

npm run start:dev

## **12) API test scripts (copy/paste)**

### **12.1 Get state**

curl
\"http://localhost:3003/v1/onboarding/client/state?sessionId=\<SESSION_ID\>\"

### **12.2 Step 1 Continue (Describe team)**

curl -X POST http://localhost:3003/v1/onboarding/client/step \\

-H \"Content-Type: application/json\" \\

-d \'{

\"sessionId\":\"\<SESSION_ID\>\",

\"step\":1,

\"action\":\"CONTINUE\",

\"data\":{\"teamName\":\"Acme Inc\",\"roleTitle\":\"Head of
Marketing\",\"industry\":\"Technology\"}

}\'

Expected:

{ \"status\":\"STEP_SAVED\", \"step\":2, \"next\":\"STEP_2\" }

### **12.3 Step 2 Continue (Goals)**

curl -X POST http://localhost:3003/v1/onboarding/client/step \\

-H \"Content-Type: application/json\" \\

-d \'{

\"sessionId\":\"\<SESSION_ID\>\",

\"step\":2,

\"action\":\"CONTINUE\",

\"data\":{\"goals\":\[\"GROWTH_AND_EXPANSION\",\"BRAND_BUILDING_AND_AWARENESS\"\]}

}\'

### **12.4 Step 3 Continue (Roles/skills)**

curl -X POST http://localhost:3003/v1/onboarding/client/step \\

-H \"Content-Type: application/json\" \\

-d \'{

\"sessionId\":\"\<SESSION_ID\>\",

\"step\":3,

\"action\":\"CONTINUE\",

\"data\":{\"desiredRoles\":\[\"React
Developer\"\],\"desiredSkills\":\[\"React\",\"Tailwind CSS\"\]}

}\'

### **12.5 Step 4 Skip**

curl -X POST http://localhost:3003/v1/onboarding/client/step \\

-H \"Content-Type: application/json\" \\

-d \'{

\"sessionId\":\"\<SESSION_ID\>\",

\"step\":4,

\"action\":\"SKIP\"

}\'

### **12.6 Step 5 Continue (Finalize)**

curl -X POST http://localhost:3003/v1/onboarding/client/step \\

-H \"Content-Type: application/json\" \\

-d \'{

\"sessionId\":\"\<SESSION_ID\>\",

\"step\":5,

\"action\":\"CONTINUE\",

\"data\":{\"confirmation\":true}

}\'

Expected:

{ \"status\":\"ONBOARDING_COMPLETED\", \"next\":\"HOME\" }

## **13) Edge cases + validations (complete)**

- Mode mismatch (session is TALENT) → INVALID_MODE

- Session invalid/expired → INVALID_SESSION / SESSION_EXPIRED

- Step out of order → STEP_OUT_OF_ORDER

- Step 1 missing required fields → TEAM_NAME_REQUIRED /
  ROLE_TITLE_REQUIRED / INDUSTRY_REQUIRED

- Step 2 goals empty → GOALS_REQUIRED

- Step 2 invalid goal → INVALID_GOALS

- Step 3 roles and skills both empty → ROLES_OR_SKILLS_REQUIRED

- Step 3 duplicates → removed automatically

- Max tags enforced server side (roles 10, skills 20)

- Any call after completion → returns { completed:true, next:\"HOME\" }

## **14) How this integrates with Document 07 (required)**

After onboarding completes, AuthUser.onboardingClientCompletedAt is
set.\
So:

- POST /v1/auth/mode/switch to CLIENT will return:

  - next: HOME

- First time it returns:

  - next: CLIENT_ONBOARDING
