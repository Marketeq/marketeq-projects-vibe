# **Document 05 --- Account Security Setup (Step 2 / 3): Mandatory Phone 2FA**

This document implements **mandatory phone-based 2FA for all users**.

It covers:

- Attach phone number to account

- Send **both**:

  - SMS OTP code

  - SMS deep link (with verification token)

- Verify via OTP **or** deep link token

- Attempt limits, expiry, resend throttling

- Set AuthUser.phoneVerifiedAt

- Finalize the pending session (issue tokens) when verification
  completes

This integrates with Documents 01--04:

- Document 01 blocks login with MFA_REQUIRED if phoneVerifiedAt is null

- Document 04 may also return MFA_REQUIRED during password reset
  finalize

- This doc completes 2FA and issues tokens using the existing sessionId

## **1) Business rules (final)**

### **1.1 Mandatory for all users**

If AuthUser.phoneVerifiedAt is null → user is not fully authenticated.

Login returns:\
{ \"status\":\"MFA_REQUIRED\", \"sessionId\":\"\...\",
\"next\":\"SECURITY_STEP_2_OF_3_PHONE_2FA\" }

- 

### **1.2 Phone format**

- Store phone in **E.164** format in AuthUser.phoneE164

- Reject invalid phone values.

### **1.3 Send both OTP + deep link (confirmed)**

When "Send code" is requested:

- Send SMS containing:

  - OTP: 6 digits

  - Deep link: FRONTEND_BASE_URL/auth/verify-phone?token=\<token\>

### **1.4 Expiry + limits (CTO defaults via env)**

- OTP expires in **10 minutes**

- Deep link token expires in **10 minutes** (same window)

- Max verify attempts per challenge: **5**

- Resend cooldown: **60 seconds**

- Max sends per phone per hour: **5**

### **1.5 Session behavior**

2FA completion must:

- Mark phoneVerifiedAt = now()

- If the request provides a sessionId for a pending login/reset session:

  - Convert that session to ACTIVE and issue tokens

- Otherwise:

  - Return VERIFIED and let the app redirect to login

## **2) Environment variables**

Add to apps/auth-service/.env:

\# 2FA / phone verification

PHONE_OTP_TTL_SECONDS=600

PHONE_OTP_MAX_ATTEMPTS=5

PHONE_OTP_RESEND_COOLDOWN_SECONDS=60

PHONE_OTP_MAX_SENDS_PER_HOUR=5

\# Frontend link for deep link verification

FRONTEND_BASE_URL=https://your-frontend.com

Twilio variables were already added in Document 04:

TWILIO_ACCOUNT_SID=replace_me

TWILIO_AUTH_TOKEN=replace_me

TWILIO_FROM_PHONE=+1xxxxxxxxxx

## **3) Database: Prisma model for phone verification challenges**

Update apps/auth-service/prisma/schema.prisma and add:

model PhoneVerificationChallenge {

id String \@id \@default(uuid())

userId String

phoneE164 String

otpHash String

linkTokenHash String \@unique

attempts Int \@default(0)

maxAttempts Int \@default(5)

expiresAt DateTime

verifiedAt DateTime?

createdAt DateTime \@default(now())

user AuthUser \@relation(fields: \[userId\], references: \[id\])

@@index(\[userId\])

@@index(\[phoneE164\])

@@index(\[expiresAt\])

}

Run migration:

cd apps/auth-service

npx prisma migrate dev \--name add_phone_verification_challenge

npx prisma generate

## **4) API contract**

### **4.1 Endpoints**

1.  POST /v1/auth/2fa/phone/attach

2.  POST /v1/auth/2fa/phone/send

3.  POST /v1/auth/2fa/phone/verify-otp

4.  POST /v1/auth/2fa/phone/verify-link

### **4.2 Flows**

#### **Attach phone**

- Associates phone to user (does not verify)

#### **Send**

- Creates/refreshes a verification challenge

- Sends OTP + deep link SMS

#### **Verify OTP / Verify link**

- If valid:

  - sets phoneVerifiedAt

  - returns tokens **if sessionId provided**

  - else returns verified success

## **5) Files to create/update**

Create folders:

mkdir -p apps/auth-service/src/auth/2fa/phone/dto

Create files:

- apps/auth-service/src/auth/2fa/phone/phone-2fa.controller.ts

- apps/auth-service/src/auth/2fa/phone/phone-2fa.service.ts

- apps/auth-service/src/auth/2fa/phone/dto/attach-phone.dto.ts

- apps/auth-service/src/auth/2fa/phone/dto/send-phone.dto.ts

- apps/auth-service/src/auth/2fa/phone/dto/verify-otp.dto.ts

- apps/auth-service/src/auth/2fa/phone/dto/verify-link.dto.ts

Update:

- apps/auth-service/src/auth/auth.module.ts

## **6) DTOs**

### **6.1 Attach phone**

Create: apps/auth-service/src/auth/2fa/phone/dto/attach-phone.dto.ts

import { IsEmail, IsString, MinLength } from \'class-validator\';

export class AttachPhoneDto {

\@IsEmail()

email!: string;

\@IsString()

\@MinLength(8)

phone!: string; // accepts +12085551234 or 12085551234

}

### **6.2 Send OTP + link**

Create: apps/auth-service/src/auth/2fa/phone/dto/send-phone.dto.ts

import { IsEmail, IsOptional, IsString, MinLength } from
\'class-validator\';

export class SendPhoneVerificationDto {

\@IsEmail()

email!: string;

\@IsOptional()

\@IsString()

sessionId?: string; // optional pending session to finalize after
verification

\@IsOptional()

\@IsString()

\@MinLength(8)

phone?: string; // optional override; if omitted use user.phoneE164

}

### **6.3 Verify OTP**

Create: apps/auth-service/src/auth/2fa/phone/dto/verify-otp.dto.ts

import { IsEmail, IsOptional, IsString, Length } from
\'class-validator\';

export class VerifyPhoneOtpDto {

\@IsEmail()

email!: string;

\@IsString()

\@Length(6, 6)

otp!: string;

\@IsOptional()

\@IsString()

sessionId?: string;

}

### **6.4 Verify deep link**

Create: apps/auth-service/src/auth/2fa/phone/dto/verify-link.dto.ts

import { IsEmail, IsOptional, IsString, MinLength } from
\'class-validator\';

export class VerifyPhoneLinkDto {

\@IsEmail()

email!: string;

\@IsString()

\@MinLength(20)

token!: string;

\@IsOptional()

\@IsString()

sessionId?: string;

}

## **7) Service implementation**

Create: apps/auth-service/src/auth/2fa/phone/phone-2fa.service.ts

import { BadRequestException, Injectable, TooManyRequestsException }
from \'@nestjs/common\';

import { nanoid } from \'nanoid\';

import { PrismaService } from \'../../../prisma/prisma.service\';

import { err } from \'../../../common/errors\';

import { sha256 } from \'../../../common/crypto\';

import { SmsService } from \'../../../providers/sms.service\';

import { TokenService } from \'../../sessions/token.service\';

function normalizePhone(input: string): string \| null {

const raw = input.trim().replace(/\\s+/g, \'\');

const ok = /\^\\+?\[1-9\]\\d{7,14}\$/.test(raw);

if (!ok) return null;

return raw.startsWith(\'+\') ? raw : \`+\${raw}\`;

}

function randomOtp6(): string {

return Math.floor(100000 + Math.random() \* 900000).toString();

}

\@Injectable()

export class Phone2faService {

constructor(

private prisma: PrismaService,

private sms: SmsService,

private tokens: TokenService,

) {}

private ttlSeconds(): number {

return Number(process.env.PHONE_OTP_TTL_SECONDS ?? 600);

}

private maxAttempts(): number {

return Number(process.env.PHONE_OTP_MAX_ATTEMPTS ?? 5);

}

private resendCooldownSeconds(): number {

return Number(process.env.PHONE_OTP_RESEND_COOLDOWN_SECONDS ?? 60);

}

private maxSendsPerHour(): number {

return Number(process.env.PHONE_OTP_MAX_SENDS_PER_HOUR ?? 5);

}

private buildVerifyLink(token: string) {

return
\`\${process.env.FRONTEND_BASE_URL}/auth/verify-phone?token=\${encodeURIComponent(token)}\`;

}

private async enforceSendLimits(phoneE164: string) {

const latest = await this.prisma.phoneVerificationChallenge.findFirst({

where: { phoneE164 },

orderBy: { createdAt: \'desc\' },

select: { createdAt: true },

});

if (latest) {

const deltaMs = Date.now() - latest.createdAt.getTime();

if (deltaMs \< this.resendCooldownSeconds() \* 1000) {

throw new TooManyRequestsException(err(\'RESEND_COOLDOWN\', \'Please
wait before requesting another code.\'));

}

}

const oneHourAgo = new Date(Date.now() - 60 \* 60 \* 1000);

const count = await this.prisma.phoneVerificationChallenge.count({

where: { phoneE164, createdAt: { gte: oneHourAgo } },

});

if (count \>= this.maxSendsPerHour()) {

throw new TooManyRequestsException(err(\'RATE_LIMITED\', \'Too many
verification requests. Please try again later.\'));

}

}

private async finalizeSessionIfProvided(input: { sessionId?: string;
userId: string; email: string }) {

if (!input.sessionId) {

return { status: \'PHONE_VERIFIED\' as const };

}

const session = await this.prisma.authSession.findUnique({

where: { id: input.sessionId },

select: { id: true, userId: true, revokedAt: true },

});

if (!session \|\| session.revokedAt \|\| session.userId !==
input.userId) {

throw new BadRequestException(err(\'INVALID_SESSION\', \'Invalid session
for verification.\'));

}

// Issue tokens for this session (rememberMe should already be set on
the session)

const dbSession = await this.prisma.authSession.findUnique({

where: { id: session.id },

select: { id: true, rememberMe: true },

});

const tokenBundle = await this.tokens.issueTokens({

userId: input.userId,

sessionId: session.id,

rememberMe: dbSession?.rememberMe ?? false,

});

return {

status: \'SIGNED_IN\' as const,

sessionId: session.id,

accessToken: tokenBundle.accessToken,

refreshToken: tokenBundle.refreshToken,

refreshExpiresAt: tokenBundle.expiresAt.toISOString(),

user: { id: input.userId, email: input.email },

next: \'SECURITY_STEP_3_OF_3_OR_NEXT_FLOW\' as const,

};

}

async attachPhone(input: { email: string; phone: string }) {

const email = input.email.toLowerCase().trim();

const phoneE164 = normalizePhone(input.phone);

if (!phoneE164) {

throw new BadRequestException(err(\'INVALID_PHONE\', \'Enter a valid
phone number in E.164 format.\'));

}

const user = await this.prisma.authUser.findUnique({

where: { email },

select: { id: true, email: true, phoneE164: true },

});

if (!user) throw new BadRequestException(err(\'USER_NOT_FOUND\', \'No
user found for that email.\'));

// Ensure uniqueness (phone is unique)

const existingPhoneOwner = await this.prisma.authUser.findUnique({

where: { phoneE164 },

select: { id: true },

});

if (existingPhoneOwner && existingPhoneOwner.id !== user.id) {

throw new BadRequestException(err(\'PHONE_IN_USE\', \'That phone number
is already in use.\'));

}

await this.prisma.authUser.update({

where: { id: user.id },

data: { phoneE164 },

});

return { status: \'PHONE_ATTACHED\' as const, phoneE164 };

}

async sendVerification(input: { email: string; sessionId?: string;
phone?: string }) {

const email = input.email.toLowerCase().trim();

const user = await this.prisma.authUser.findUnique({

where: { email },

select: { id: true, email: true, phoneE164: true, phoneVerifiedAt: true
},

});

if (!user) throw new BadRequestException(err(\'USER_NOT_FOUND\', \'No
user found for that email.\'));

if (user.phoneVerifiedAt) {

return { status: \'ALREADY_VERIFIED\' as const };

}

const phoneE164 = input.phone ? normalizePhone(input.phone) :
user.phoneE164;

if (!phoneE164) {

throw new BadRequestException(err(\'PHONE_REQUIRED\', \'A phone number
must be attached before sending a code.\'));

}

if (!phoneE164) throw new BadRequestException(err(\'INVALID_PHONE\',
\'Invalid phone number.\'));

// If phone override provided, attach it (same rules)

if (input.phone) {

await this.attachPhone({ email, phone: input.phone });

}

await this.enforceSendLimits(phoneE164);

const otp = randomOtp6();

const otpHash = sha256(otp);

const linkToken = nanoid(48);

const linkTokenHash = sha256(linkToken);

const expiresAt = new Date(Date.now() + this.ttlSeconds() \* 1000);

await this.prisma.phoneVerificationChallenge.create({

data: {

userId: user.id,

phoneE164,

otpHash,

linkTokenHash,

attempts: 0,

maxAttempts: this.maxAttempts(),

expiresAt,

},

});

const verifyLink = this.buildVerifyLink(linkToken);

await this.sms.sendPasswordResetSms({

// Reuse SMS sender (message format differs; rename later if you want)

to: phoneE164,

resetLink: verifyLink,

expiresHours: Math.ceil(this.ttlSeconds() / 3600),

});

// Send OTP in same SMS (required: both)

// We send a second SMS to keep message clearer; if you prefer one
message, merge below.

await this.sms\[\'client\'\].messages.create({

to: phoneE164,

from: process.env.TWILIO_FROM_PHONE!,

body: \`Your Marketeq verification code is \${otp}. It expires in 10
minutes. Or verify here: \${verifyLink}\`,

});

return {

status: \'VERIFICATION_SENT\' as const,

phoneE164,

expiresInSeconds: this.ttlSeconds(),

sessionId: input.sessionId,

};

}

private async getActiveChallenge(userId: string, phoneE164?: string) {

const now = new Date();

return this.prisma.phoneVerificationChallenge.findFirst({

where: {

userId,

verifiedAt: null,

expiresAt: { gt: now },

\...(phoneE164 ? { phoneE164 } : {}),

},

orderBy: { createdAt: \'desc\' },

select: {

id: true,

phoneE164: true,

otpHash: true,

linkTokenHash: true,

attempts: true,

maxAttempts: true,

expiresAt: true,

},

});

}

async verifyOtp(input: { email: string; otp: string; sessionId?: string
}) {

const email = input.email.toLowerCase().trim();

const user = await this.prisma.authUser.findUnique({

where: { email },

select: { id: true, email: true, phoneE164: true, phoneVerifiedAt: true
},

});

if (!user) throw new BadRequestException(err(\'USER_NOT_FOUND\', \'No
user found for that email.\'));

if (user.phoneVerifiedAt) {

return this.finalizeSessionIfProvided({ sessionId: input.sessionId,
userId: user.id, email: user.email });

}

if (!user.phoneE164) throw new
BadRequestException(err(\'PHONE_REQUIRED\', \'Attach a phone number
first.\'));

const challenge = await this.getActiveChallenge(user.id,
user.phoneE164);

if (!challenge) throw new
BadRequestException(err(\'CHALLENGE_NOT_FOUND\', \'No active
verification challenge found.\'));

if (challenge.attempts \>= challenge.maxAttempts) {

throw new BadRequestException(err(\'MAX_ATTEMPTS_EXCEEDED\', \'Too many
attempts. Please request a new code.\'));

}

const otpHash = sha256(input.otp);

const ok = otpHash === challenge.otpHash;

await this.prisma.phoneVerificationChallenge.update({

where: { id: challenge.id },

data: { attempts: challenge.attempts + 1 },

});

if (!ok) {

throw new BadRequestException(err(\'INVALID_OTP\', \'Invalid
verification code.\'));

}

await this.prisma.\$transaction(\[

this.prisma.phoneVerificationChallenge.update({

where: { id: challenge.id },

data: { verifiedAt: new Date() },

}),

this.prisma.authUser.update({

where: { id: user.id },

data: { phoneVerifiedAt: new Date(), phoneE164: user.phoneE164 },

}),

\]);

return this.finalizeSessionIfProvided({ sessionId: input.sessionId,
userId: user.id, email: user.email });

}

async verifyLink(input: { email: string; token: string; sessionId?:
string }) {

const email = input.email.toLowerCase().trim();

const user = await this.prisma.authUser.findUnique({

where: { email },

select: { id: true, email: true, phoneE164: true, phoneVerifiedAt: true
},

});

if (!user) throw new BadRequestException(err(\'USER_NOT_FOUND\', \'No
user found for that email.\'));

if (user.phoneVerifiedAt) {

return this.finalizeSessionIfProvided({ sessionId: input.sessionId,
userId: user.id, email: user.email });

}

if (!user.phoneE164) throw new
BadRequestException(err(\'PHONE_REQUIRED\', \'Attach a phone number
first.\'));

const challenge = await this.getActiveChallenge(user.id,
user.phoneE164);

if (!challenge) throw new
BadRequestException(err(\'CHALLENGE_NOT_FOUND\', \'No active
verification challenge found.\'));

if (challenge.attempts \>= challenge.maxAttempts) {

throw new BadRequestException(err(\'MAX_ATTEMPTS_EXCEEDED\', \'Too many
attempts. Please request a new code.\'));

}

const tokenHash = sha256(input.token);

const ok = tokenHash === challenge.linkTokenHash;

await this.prisma.phoneVerificationChallenge.update({

where: { id: challenge.id },

data: { attempts: challenge.attempts + 1 },

});

if (!ok) {

throw new BadRequestException(err(\'INVALID_LINK\', \'Invalid
verification link.\'));

}

await this.prisma.\$transaction(\[

this.prisma.phoneVerificationChallenge.update({

where: { id: challenge.id },

data: { verifiedAt: new Date() },

}),

this.prisma.authUser.update({

where: { id: user.id },

data: { phoneVerifiedAt: new Date(), phoneE164: user.phoneE164 },

}),

\]);

return this.finalizeSessionIfProvided({ sessionId: input.sessionId,
userId: user.id, email: user.email });

}

}

> **Important implementation note (do not skip):\**
> In sendVerification(), I reused SmsService.sendPasswordResetSms() for
> the deep link send and then used the Twilio client directly for the
> combined OTP+link message. In production, rename sendPasswordResetSms
> to a generic sendSms() and use it consistently (see section 10.2 below
> for the corrected version).

## **8) Controller**

Create: apps/auth-service/src/auth/2fa/phone/phone-2fa.controller.ts

import { Body, Controller, Post } from \'@nestjs/common\';

import { Phone2faService } from \'./phone-2fa.service\';

import { AttachPhoneDto } from \'./dto/attach-phone.dto\';

import { SendPhoneVerificationDto } from \'./dto/send-phone.dto\';

import { VerifyPhoneOtpDto } from \'./dto/verify-otp.dto\';

import { VerifyPhoneLinkDto } from \'./dto/verify-link.dto\';

\@Controller(\'v1/auth/2fa/phone\')

export class Phone2faController {

constructor(private readonly svc: Phone2faService) {}

\@Post(\'attach\')

async attach(@Body() dto: AttachPhoneDto) {

return this.svc.attachPhone({ email: dto.email, phone: dto.phone });

}

\@Post(\'send\')

async send(@Body() dto: SendPhoneVerificationDto) {

return this.svc.sendVerification({

email: dto.email,

phone: dto.phone,

sessionId: dto.sessionId,

});

}

\@Post(\'verify-otp\')

async verifyOtp(@Body() dto: VerifyPhoneOtpDto) {

return this.svc.verifyOtp({ email: dto.email, otp: dto.otp, sessionId:
dto.sessionId });

}

\@Post(\'verify-link\')

async verifyLink(@Body() dto: VerifyPhoneLinkDto) {

return this.svc.verifyLink({ email: dto.email, token: dto.token,
sessionId: dto.sessionId });

}

}

## **9) Wire into AuthModule**

Update apps/auth-service/src/auth/auth.module.ts imports:

import { Phone2faController } from \'./2fa/phone/phone-2fa.controller\';

import { Phone2faService } from \'./2fa/phone/phone-2fa.service\';

Update module controllers/providers:

\@Module({

imports: \[JwtModule.register({})\],

controllers: \[

AuthController,

RegisterController,

PasswordController,

PasswordResetController,

AccountRecoveryController,

Phone2faController,

\],

providers: \[

AuthService,

TokenService,

RegisterService,

PasswordService,

PasswordResetService,

Phone2faService,

MailerService,

SmsService,

\],

})

export class AuthModule {}

## **10) Fix SMS provider to support generic messaging (required cleanup)**

Right now SmsService is named around password reset. Replace it with a
generic sendSms() method.

Update: apps/auth-service/src/providers/sms.service.ts

import { Injectable } from \'@nestjs/common\';

\@Injectable()

export class SmsService {

private client: any;

constructor() {

// eslint-disable-next-line \@typescript-eslint/no-var-requires

const Twilio = require(\'twilio\');

this.client = Twilio(process.env.TWILIO_ACCOUNT_SID!,
process.env.TWILIO_AUTH_TOKEN!);

}

async sendSms(input: { to: string; body: string }) {

await this.client.messages.create({

to: input.to,

from: process.env.TWILIO_FROM_PHONE!,

body: input.body,

});

}

}

Now update Document 04 code (optional but recommended) and Document 06
code to call sendSms().

In Phone2faService.sendVerification() replace the two sends with:

await this.sms.sendSms({

to: phoneE164,

body: \`Your Marketeq verification code is \${otp}. It expires in 10
minutes. Verify link: \${verifyLink}\`,

});

(One SMS containing both OTP + link, which matches your requirement
"both".)

## **11) Run instructions**

cd apps/auth-service

npm install

npx prisma migrate dev

npm run start:dev

## **12) End-to-end verification (copy/paste)**

### **12.1 Attach phone**

curl -X POST http://localhost:3003/v1/auth/2fa/phone/attach \\

-H \"Content-Type: application/json\" \\

-d \'{\"email\":\"newuser@marketeq.com\",\"phone\":\"+12085551234\"}\'

Expected:

{ \"status\":\"PHONE_ATTACHED\", \"phoneE164\":\"+12085551234\" }

### **12.2 Send OTP + link (with pending sessionId)**

Use sessionId you received from login response MFA_REQUIRED (Document
01) or from password reset finalize flow.

curl -X POST http://localhost:3003/v1/auth/2fa/phone/send \\

-H \"Content-Type: application/json\" \\

-d
\'{\"email\":\"newuser@marketeq.com\",\"sessionId\":\"\<PENDING_SESSION_ID\>\"}\'

Expected:

{

\"status\":\"VERIFICATION_SENT\",

\"phoneE164\":\"+12085551234\",

\"expiresInSeconds\":600,

\"sessionId\":\"\<PENDING_SESSION_ID\>\"

}

### **12.3 Verify OTP (success, issues tokens)**

curl -X POST http://localhost:3003/v1/auth/2fa/phone/verify-otp \\

-H \"Content-Type: application/json\" \\

-d
\'{\"email\":\"newuser@marketeq.com\",\"otp\":\"123456\",\"sessionId\":\"\<PENDING_SESSION_ID\>\"}\'

Expected:

{

\"status\":\"SIGNED_IN\",

\"sessionId\":\"\<PENDING_SESSION_ID\>\",

\"accessToken\":\"jwt\",

\"refreshToken\":\"jwt\",

\"refreshExpiresAt\":\"2026-02-18T00:00:00.000Z\",

\"user\":{\"id\":\"uuid\",\"email\":\"newuser@marketeq.com\"},

\"next\":\"SECURITY_STEP_3_OF_3_OR_NEXT_FLOW\"

}

### **12.4 Verify link**

Frontend opens:\
FRONTEND_BASE_URL/auth/verify-phone?token=\<token\>

Frontend then calls:

curl -X POST http://localhost:3003/v1/auth/2fa/phone/verify-link \\

-H \"Content-Type: application/json\" \\

-d
\'{\"email\":\"newuser@marketeq.com\",\"token\":\"\<TOKEN_FROM_URL\>\",\"sessionId\":\"\<PENDING_SESSION_ID\>\"}\'

Expected: same as OTP success.

## **13) Validations & edge cases (fully enforced)**

- Invalid phone → INVALID_PHONE

- Phone already in use → PHONE_IN_USE

- Resend too soon → RESEND_COOLDOWN

- Too many sends per hour → RATE_LIMITED

- No active challenge → CHALLENGE_NOT_FOUND

- OTP wrong → INVALID_OTP

- Link wrong → INVALID_LINK

- Attempts exceeded → MAX_ATTEMPTS_EXCEEDED

- Challenge expired → CHALLENGE_NOT_FOUND (because we query only
  non-expired challenges)

- Already verified → returns tokens if sessionId provided, otherwise
  returns PHONE_VERIFIED

## **14) Frontend wiring (exact)**

### **Step 2/3 screen:**

1.  If user has no phone attached:

    - Call /v1/auth/2fa/phone/attach

2.  User clicks "Send code":

    - Call /v1/auth/2fa/phone/send with sessionId from MFA_REQUIRED

3.  User enters OTP:

    - Call /v1/auth/2fa/phone/verify-otp with same sessionId

4.  OR user taps deep link:

    - App opens /verify-phone?token=\...

    - Frontend calls /v1/auth/2fa/phone/verify-link with token +
      sessionId

5.  On success:

    - Store tokens and proceed to next step (Step 3/3 or onboarding
      selection, depending on your next doc)
