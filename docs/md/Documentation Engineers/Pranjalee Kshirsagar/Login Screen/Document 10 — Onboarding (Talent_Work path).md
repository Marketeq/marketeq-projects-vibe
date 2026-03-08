# **Document 10 --- Onboarding (Talent/Work path)** 

This document implements the **Talent (Work) onboarding flow** (5 steps)
and integrates with **Document 08 mode switching**:

- Talent onboarding runs **only once per account**
  (onboardingTalentCompletedAt).

- If a user is already onboarded as Talent, switching to Talent mode
  routes to **HOME** immediately.

- Supports **Back / Skip / Continue** per step.

- Includes **username availability** + suggestion support (Step 4).

- Final step finalizes onboarding and sets onboardingTalentCompletedAt.

## **1) Preconditions**

- User is authenticated with valid sessionId and tokens.

- Session mode is TALENT (Document 08).

- Security steps completed (Docs 03--07).

## **2) Data model (Prisma)**

We add a TalentProfile + TalentOnboardingProgress.

Update apps/auth-service/prisma/schema.prisma:

model TalentProfile {

id String \@id \@default(uuid())

userId String \@unique

// Step 1: Introduce yourself

firstName String?

lastName String?

avatarUrl String? // store uploaded image URL if implemented; otherwise
null

// Step 2: Location + languages

locationCity String?

languages String\[\] \@default(\[\])

// Step 3: Showcase your talent

recentJobTitle String?

industriesWorkedIn String\[\] \@default(\[\])

topSkills String\[\] \@default(\[\])

isStudent Boolean \@default(false)

// Step 4: Username

username String? \@unique

// Step 5: Preferences

projectPreferences String\[\] \@default(\[\])

availability String? // dropdown value (enum can be added later)

createdAt DateTime \@default(now())

updatedAt DateTime \@updatedAt

user AuthUser \@relation(fields: \[userId\], references: \[id\])

}

model TalentOnboardingProgress {

id String \@id \@default(uuid())

userId String \@unique

step Int \@default(1) // 1..5

skippedSteps Int\[\] \@default(\[\])

createdAt DateTime \@default(now())

updatedAt DateTime \@updatedAt

user AuthUser \@relation(fields: \[userId\], references: \[id\])

}

Run migration:

cd apps/auth-service

npx prisma migrate dev \--name add_talent_onboarding

npx prisma generate

> Note: TalentProfile.username is unique. This enforces the
> "availability check" at DB level too.

## **3) Step definitions (UI → data)**

### **Step 1 / 5 --- Introduce yourself**

UI (from your list):

- Upload photo / change / remove (optional)

- First name

- Last name\
  Buttons: Back / Skip / Continue

Backend fields:

- TalentProfile.firstName, lastName, avatarUrl

Validation:

- Continue requires firstName + lastName (CTO decision: required)

- Skip allows nulls

Photo upload:

- Not implemented in this sprint unless you have the upload service
  already.

- If you do, store avatarUrl. Otherwise leave null.

### **Step 2 / 5 --- Share your location**

UI:

- Location ("Enter your city or town")

- Languages ("Enter your languages")\
  Buttons: Back / Skip / Continue

Backend fields:

- TalentProfile.locationCity

- TalentProfile.languages\[\]

Validation (CTO decision):

- Continue requires locationCity (non-empty)

- Languages optional (0..10 tags)

### **Step 3 / 5 --- Showcase your talent**

UI:

- Most recent job title

- Industries worked in

- Top skills (chips/tags)

- Checkbox: "I'm currently a student"\
  Buttons: Back / Skip / Continue

Backend fields:

- recentJobTitle

- industriesWorkedIn\[\]

- topSkills\[\]

- isStudent

Validation:

- Continue requires at least 1 of:

  - recentJobTitle

  - topSkills (\>=1)

- Skills max 20, industries max 10, dedupe server-side

### **Step 4 / 5 --- Create your username**

UI:

- Username input

- Availability suggestions

- "More suggestions"\
  Note: Can browse without username, but need it to connect/post.\
  Buttons: Back / Skip / Continue

Backend fields:

- TalentProfile.username

Validation:

- Username rules:

  - 3--24 chars

  - lowercase letters, numbers, underscores

  - must start with a letter

- Continue requires username (CTO decision: required for onboarding
  completion)

- Skip allowed, but will block "connect/post" later (out-of-scope
  enforcement)

Support endpoints:

- POST /username/check

- GET /username/suggestions

### **Step 5 / 5 --- Set your preferences**

UI:

- Project preferences (tags)

- Availability dropdown\
  Buttons: Back / Skip / Continue

Backend fields:

- projectPreferences\[\]

- availability

Validation:

- Continue requires at least 1 preference OR availability (CTO decision:
  allow either)

- Preferences max 20, dedupe server-side

Finalize:

- Set AuthUser.onboardingTalentCompletedAt = now()

## **4) API contract**

### **4.1 Get state**

GET /v1/onboarding/talent/state?sessionId=\...

### **4.2 Save step / skip / back**

POST /v1/onboarding/talent/step

### **4.3 Finalize (optional explicit)**

POST /v1/onboarding/talent/finalize

### **4.4 Username check**

POST /v1/onboarding/talent/username/check

### **4.5 Username suggestions**

GET /v1/onboarding/talent/username/suggestions?base=esha

## **5) Files to create/update**

Create:

- apps/auth-service/src/onboarding/talent/talent-onboarding.controller.ts

- apps/auth-service/src/onboarding/talent/talent-onboarding.service.ts

- apps/auth-service/src/onboarding/talent/dto/talent-onboarding-step.dto.ts

- apps/auth-service/src/onboarding/talent/dto/talent-onboarding-finalize.dto.ts

- apps/auth-service/src/onboarding/talent/dto/username-check.dto.ts

- apps/auth-service/src/onboarding/talent/validators.ts

Update:

- apps/auth-service/src/auth/auth.module.ts

## **6) DTOs**

### **6.1 Step DTO**

Create:
apps/auth-service/src/onboarding/talent/dto/talent-onboarding-step.dto.ts

import { IsIn, IsInt, IsObject, IsOptional, IsString, Min, Max } from
\'class-validator\';

export class TalentOnboardingStepDto {

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
apps/auth-service/src/onboarding/talent/dto/talent-onboarding-finalize.dto.ts

import { IsString } from \'class-validator\';

export class TalentOnboardingFinalizeDto {

\@IsString()

sessionId!: string;

}

### **6.3 Username check DTO**

Create:
apps/auth-service/src/onboarding/talent/dto/username-check.dto.ts

import { IsString, MinLength } from \'class-validator\';

export class UsernameCheckDto {

\@IsString()

\@MinLength(3)

username!: string;

}

## **7) Validators**

Create: apps/auth-service/src/onboarding/talent/validators.ts

export function dedupeStrings(arr: unknown, max: number): string\[\] {

if (!Array.isArray(arr)) return \[\];

const cleaned = arr

.filter((x) =\> typeof x === \'string\')

.map((x) =\> x.trim())

.filter((x) =\> x.length \> 0);

return Array.from(new Set(cleaned)).slice(0, max);

}

export function validateUsername(usernameRaw: any) {

const username = (usernameRaw ?? \'\').toString().trim().toLowerCase();

if (username.length \< 3) return { ok: false, code:
\'USERNAME_TOO_SHORT\', message: \'Username must be at least 3
characters.\' };

if (username.length \> 24) return { ok: false, code:
\'USERNAME_TOO_LONG\', message: \'Username must be at most 24
characters.\' };

if (!/\^\[a-z\]\[a-z0-9\_\]\*\$/.test(username)) {

return {

ok: false,

code: \'USERNAME_INVALID\',

message: \'Username must start with a letter and contain only lowercase
letters, numbers, and underscores.\',

};

}

return { ok: true, username };

}

export function validateStep1(data: any) {

const firstName = (data?.firstName ?? \'\').toString().trim();

const lastName = (data?.lastName ?? \'\').toString().trim();

const avatarUrl = data?.avatarUrl ? data.avatarUrl.toString().trim() :
null;

if (!firstName) return { ok: false, code: \'FIRST_NAME_REQUIRED\',
message: \'First name is required.\' };

if (!lastName) return { ok: false, code: \'LAST_NAME_REQUIRED\',
message: \'Last name is required.\' };

return { ok: true, firstName, lastName, avatarUrl };

}

export function validateStep2(data: any) {

const locationCity = (data?.locationCity ?? \'\').toString().trim();

const languages = dedupeStrings(data?.languages, 10);

if (!locationCity) return { ok: false, code: \'LOCATION_REQUIRED\',
message: \'Location is required.\' };

return { ok: true, locationCity, languages };

}

export function validateStep3(data: any) {

const recentJobTitle = (data?.recentJobTitle ?? \'\').toString().trim();

const industriesWorkedIn = dedupeStrings(data?.industriesWorkedIn, 10);

const topSkills = dedupeStrings(data?.topSkills, 20);

const isStudent = !!data?.isStudent;

if (!recentJobTitle && topSkills.length === 0) {

return {

ok: false,

code: \'JOB_OR_SKILL_REQUIRED\',

message: \'Enter a recent job title or at least one top skill.\',

};

}

return { ok: true, recentJobTitle: recentJobTitle \|\| null,
industriesWorkedIn, topSkills, isStudent };

}

export function validateStep5(data: any) {

const projectPreferences = dedupeStrings(data?.projectPreferences, 20);

const availability = data?.availability ?
data.availability.toString().trim() : null;

if (projectPreferences.length === 0 && !availability) {

return { ok: false, code: \'PREFS_OR_AVAIL_REQUIRED\', message: \'Select
at least one preference or availability.\' };

}

return { ok: true, projectPreferences, availability };

}

## **8) Service implementation**

Create:
apps/auth-service/src/onboarding/talent/talent-onboarding.service.ts

import { BadRequestException, Injectable } from \'@nestjs/common\';

import { PrismaService } from \'../../prisma/prisma.service\';

import { err } from \'../../common/errors\';

import { dedupeStrings, validateStep1, validateStep2, validateStep3,
validateStep5, validateUsername } from \'./validators\';

type Mode = \'TALENT\';

\@Injectable()

export class TalentOnboardingService {

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

if (session.mode !== \'TALENT\') {

throw new BadRequestException(err(\'INVALID_MODE\', \'Session is not in
TALENT mode.\'));

}

const user = await this.prisma.authUser.findUnique({

where: { id: session.userId },

select: {

id: true,

onboardingTalentCompletedAt: true,

},

});

if (!user) throw new BadRequestException(err(\'USER_NOT_FOUND\', \'User
not found.\'));

return { user, session };

}

async state(sessionId: string) {

const { user } = await this.getUserBySession(sessionId);

if (user.onboardingTalentCompletedAt) {

return { completed: true, next: \'HOME\' as const };

}

const profile = await this.prisma.talentProfile.upsert({

where: { userId: user.id },

create: { userId: user.id },

update: {},

select: {

firstName: true,

lastName: true,

avatarUrl: true,

locationCity: true,

languages: true,

recentJobTitle: true,

industriesWorkedIn: true,

topSkills: true,

isStudent: true,

username: true,

projectPreferences: true,

availability: true,

},

});

const progress = await this.prisma.talentOnboardingProgress.upsert({

where: { userId: user.id },

create: { userId: user.id, step: 1, skippedSteps: \[\] },

update: {},

select: { step: true, skippedSteps: true },

});

return {

mode: \'TALENT\' as const,

step: progress.step,

completed: false,

skippedSteps: progress.skippedSteps,

profile,

};

}

private async setStep(userId: string, step: number, skippedStep?:
number) {

await this.prisma.talentOnboardingProgress.upsert({

where: { userId },

create: { userId, step, skippedSteps: skippedStep ? \[skippedStep\] :
\[\] },

update: skippedStep ? { step, skippedSteps: { push: skippedStep } } : {
step },

});

}

async checkUsername(username: string) {

const v = validateUsername(username);

if (!v.ok) throw new BadRequestException(err(v.code, v.message));

const existing = await this.prisma.talentProfile.findUnique({

where: { username: v.username },

select: { userId: true },

});

return { username: v.username, available: !existing };

}

async usernameSuggestions(base: string) {

const cleaned = (base ??
\'\').toString().trim().toLowerCase().replace(/\[\^a-z0-9\_\]/g, \'\');

const root = cleaned.length \>= 2 ? cleaned : \'user\';

// generate deterministic suggestions

const candidates = \[

root,

\`\${root}\_design\`,

\`\${root}\_dev\`,

\`\${root}\_\${Math.floor(100 + Math.random() \* 900)}\`,

\`\${root}\_\${Math.floor(1000 + Math.random() \* 9000)}\`,

\`\${root}\_\_\${Math.floor(10 + Math.random() \* 90)}\`,

\].slice(0, 6);

// check availability

const found = await this.prisma.talentProfile.findMany({

where: { username: { in: candidates } },

select: { username: true },

});

const taken = new Set(found.map((x) =\> x.username));

return {

base: root,

suggestions: candidates.map((u) =\> ({ username: u, available:
!taken.has(u) })),

};

}

async step(input: { sessionId: string; step: number; action:
\'CONTINUE\' \| \'SKIP\' \| \'BACK\'; data?: any }) {

const { user } = await this.getUserBySession(input.sessionId);

if (user.onboardingTalentCompletedAt) {

return { completed: true, next: \'HOME\' as const };

}

const current = await this.prisma.talentOnboardingProgress.upsert({

where: { userId: user.id },

create: { userId: user.id, step: 1, skippedSteps: \[\] },

update: {},

select: { step: true },

});

if (input.step \> current.step) {

throw new BadRequestException(err(\'STEP_OUT_OF_ORDER\', \'Complete
previous steps first.\'));

}

if (input.action === \'BACK\') {

const nextStep = Math.max(1, current.step - 1);

await this.setStep(user.id, nextStep);

return { status: \'STEP_MOVED\' as const, step: nextStep, next:
\`STEP\_\${nextStep}\` as const };

}

if (input.action === \'SKIP\') {

const nextStep = Math.min(5, input.step + 1);

await this.setStep(user.id, nextStep, input.step);

return { status: \'STEP_SKIPPED\' as const, step: nextStep, next:
nextStep === 5 ? \'STEP_5\' : \`STEP\_\${nextStep}\` };

}

// CONTINUE per step

if (input.step === 1) {

const v = validateStep1(input.data);

if (!v.ok) throw new BadRequestException(err(v.code, v.message));

await this.prisma.talentProfile.upsert({

where: { userId: user.id },

create: { userId: user.id, firstName: v.firstName, lastName: v.lastName,
avatarUrl: v.avatarUrl },

update: { firstName: v.firstName, lastName: v.lastName, avatarUrl:
v.avatarUrl },

});

} else if (input.step === 2) {

const v = validateStep2(input.data);

if (!v.ok) throw new BadRequestException(err(v.code, v.message));

await this.prisma.talentProfile.update({

where: { userId: user.id },

data: { locationCity: v.locationCity, languages: v.languages },

});

} else if (input.step === 3) {

const v = validateStep3(input.data);

if (!v.ok) throw new BadRequestException(err(v.code, v.message));

await this.prisma.talentProfile.update({

where: { userId: user.id },

data: {

recentJobTitle: v.recentJobTitle,

industriesWorkedIn: v.industriesWorkedIn,

topSkills: v.topSkills,

isStudent: v.isStudent,

},

});

} else if (input.step === 4) {

const v = validateUsername(input.data?.username);

if (!v.ok) throw new BadRequestException(err(v.code, v.message));

const existing = await this.prisma.talentProfile.findUnique({

where: { username: v.username },

select: { userId: true },

});

if (existing && existing.userId !== user.id) {

throw new BadRequestException(err(\'USERNAME_TAKEN\', \'That username is
already taken.\'));

}

await this.prisma.talentProfile.update({

where: { userId: user.id },

data: { username: v.username },

});

} else if (input.step === 5) {

const v = validateStep5(input.data);

if (!v.ok) throw new BadRequestException(err(v.code, v.message));

await this.prisma.talentProfile.update({

where: { userId: user.id },

data: { projectPreferences: v.projectPreferences, availability:
v.availability },

});

await this.prisma.authUser.update({

where: { id: user.id },

data: { onboardingTalentCompletedAt: new Date() },

});

return { status: \'ONBOARDING_COMPLETED\' as const, next: \'HOME\' as
const };

}

const nextStep = Math.min(5, input.step + 1);

await this.setStep(user.id, nextStep);

return { status: \'STEP_SAVED\' as const, step: nextStep, next: nextStep
=== 5 ? \'STEP_5\' : \`STEP\_\${nextStep}\` };

}

async finalize(sessionId: string) {

const { user } = await this.getUserBySession(sessionId);

if (user.onboardingTalentCompletedAt) {

return { status: \'ALREADY_COMPLETED\' as const, next: \'HOME\' as const
};

}

const progress = await this.prisma.talentOnboardingProgress.findUnique({

where: { userId: user.id },

select: { step: true },

});

if (!progress \|\| progress.step \< 5) {

throw new BadRequestException(err(\'NOT_READY_TO_FINALIZE\', \'Complete
all onboarding steps before finalizing.\'));

}

await this.prisma.authUser.update({

where: { id: user.id },

data: { onboardingTalentCompletedAt: new Date() },

});

return { status: \'ONBOARDING_COMPLETED\' as const, next: \'HOME\' as
const };

}

}

## **9) Controller**

Create:
apps/auth-service/src/onboarding/talent/talent-onboarding.controller.ts

import { Body, Controller, Get, Post, Query } from \'@nestjs/common\';

import { TalentOnboardingService } from \'./talent-onboarding.service\';

import { TalentOnboardingStepDto } from
\'./dto/talent-onboarding-step.dto\';

import { TalentOnboardingFinalizeDto } from
\'./dto/talent-onboarding-finalize.dto\';

import { UsernameCheckDto } from \'./dto/username-check.dto\';

\@Controller(\'v1/onboarding/talent\')

export class TalentOnboardingController {

constructor(private readonly svc: TalentOnboardingService) {}

\@Get(\'state\')

async state(@Query(\'sessionId\') sessionId: string) {

return this.svc.state(sessionId);

}

\@Post(\'step\')

async step(@Body() dto: TalentOnboardingStepDto) {

return this.svc.step({

sessionId: dto.sessionId,

step: dto.step,

action: dto.action,

data: dto.data,

});

}

\@Post(\'finalize\')

async finalize(@Body() dto: TalentOnboardingFinalizeDto) {

return this.svc.finalize(dto.sessionId);

}

\@Post(\'username/check\')

async checkUsername(@Body() dto: UsernameCheckDto) {

return this.svc.checkUsername(dto.username);

}

\@Get(\'username/suggestions\')

async suggestions(@Query(\'base\') base: string) {

return this.svc.usernameSuggestions(base ?? \'\');

}

}

## **10) Wire into AuthModule**

Update apps/auth-service/src/auth/auth.module.ts

Add imports:

import { TalentOnboardingController } from
\'../onboarding/talent/talent-onboarding.controller\';

import { TalentOnboardingService } from
\'../onboarding/talent/talent-onboarding.service\';

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

ModeController,

ClientOnboardingController,

TalentOnboardingController,

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

TalentOnboardingService,

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

## **12) API tests (copy/paste)**

### **12.1 Get state**

curl
\"http://localhost:3003/v1/onboarding/talent/state?sessionId=\<SESSION_ID\>\"

### **12.2 Step 1 continue**

curl -X POST http://localhost:3003/v1/onboarding/talent/step \\

-H \"Content-Type: application/json\" \\

-d \'{

\"sessionId\":\"\<SESSION_ID\>\",

\"step\":1,

\"action\":\"CONTINUE\",

\"data\":{\"firstName\":\"Esha\",\"lastName\":\"Patel\",\"avatarUrl\":null}

}\'

### **12.3 Step 2 continue**

curl -X POST http://localhost:3003/v1/onboarding/talent/step \\

-H \"Content-Type: application/json\" \\

-d \'{

\"sessionId\":\"\<SESSION_ID\>\",

\"step\":2,

\"action\":\"CONTINUE\",

\"data\":{\"locationCity\":\"Boise,
ID\",\"languages\":\[\"English\",\"Hindi\"\]}

}\'

### **12.4 Step 3 continue**

curl -X POST http://localhost:3003/v1/onboarding/talent/step \\

-H \"Content-Type: application/json\" \\

-d \'{

\"sessionId\":\"\<SESSION_ID\>\",

\"step\":3,

\"action\":\"CONTINUE\",

\"data\":{

\"recentJobTitle\":\"Software Developer\",

\"industriesWorkedIn\":\[\"Banking\"\],

\"topSkills\":\[\"React.js\",\"Tailwind CSS\",\"React Native\"\],

\"isStudent\":false

}

}\'

### **12.5 Username check + suggestions**

curl -X POST http://localhost:3003/v1/onboarding/talent/username/check
\\

-H \"Content-Type: application/json\" \\

-d \'{\"username\":\"esha_design\"}\'

curl
\"http://localhost:3003/v1/onboarding/talent/username/suggestions?base=esha\"

### **12.6 Step 4 continue (set username)**

curl -X POST http://localhost:3003/v1/onboarding/talent/step \\

-H \"Content-Type: application/json\" \\

-d \'{

\"sessionId\":\"\<SESSION_ID\>\",

\"step\":4,

\"action\":\"CONTINUE\",

\"data\":{\"username\":\"esha_design\"}

}\'

### **12.7 Step 5 continue (finalize)**

curl -X POST http://localhost:3003/v1/onboarding/talent/step \\

-H \"Content-Type: application/json\" \\

-d \'{

\"sessionId\":\"\<SESSION_ID\>\",

\"step\":5,

\"action\":\"CONTINUE\",

\"data\":{

\"projectPreferences\":\[\"Data Analysis\",\"Cloud Software\"\],

\"availability\":\"FULL_TIME\"

}

}\'

Expected:

{ \"status\":\"ONBOARDING_COMPLETED\", \"next\":\"HOME\" }

## **13) Edge cases + validations (complete)**

- Mode mismatch → INVALID_MODE

- Session invalid/expired → INVALID_SESSION

- Step out of order → STEP_OUT_OF_ORDER

- Step 1 missing first/last name → FIRST_NAME_REQUIRED /
  LAST_NAME_REQUIRED

- Step 2 missing location → LOCATION_REQUIRED

- Step 3 missing both job title and skills → JOB_OR_SKILL_REQUIRED

- Step 4 invalid username format → USERNAME_INVALID

- Step 4 username taken → USERNAME_TAKEN

- Step 5 missing both preferences and availability →
  PREFS_OR_AVAIL_REQUIRED

- Duplicates in tags are removed; max caps enforced

## **14) Integration with Document 07**

After completion:

- AuthUser.onboardingTalentCompletedAt is set

So:

- POST /v1/auth/mode/switch to TALENT returns:

  - next: HOME (no onboarding)

First time it returns:

- next: TALENT_ONBOARDING
