# **Document 04 --- Password Reset (Magic Link)**

This document implements the **full in-sprint Password Reset flow**
using **magic links** sent via **Email or SMS** (phone). It includes:

- Reset request screen (email or phone)

- Magic link sent confirmation (expires in **24 hours**)

- Account not found (explicit allowed)

- Update password screen (policy enforcement)

- Password updated confirmation choice:

  - **Stay logged in to my devices**

  - **Sign out of all other devices**

- **Account Recovery** is **out of sprint** → only a placeholder
  endpoint stub.

This is fully compatible with Documents 01--03:

- Uses the same Prisma models (AuthUser, AuthSession, AuthIdentity)

- Uses the same password policy validator from Document 03

- Enforces mandatory 2FA when issuing tokens (from Document 01 rule)

## **1) Final business rules**

### **1.1 Accepted identifier input**

User enters **email or phone** on reset request screen.

Backend rules:

- If input contains @ → treat as **email**

- Otherwise treat as **phone**

- If user enters something that looks like both email and phone → **use
  email** as primary (matches your earlier decision)

### **1.2 Enumeration policy (confirmed)**

**Explicit "Account not found" is allowed.\**
So backend **may return** ACCOUNT_NOT_FOUND.

### **1.3 Magic link expiry (confirmed)**

- Reset link expires in **24 hours** (email and phone).

### **1.4 Resend throttling (CTO decision)**

To prevent abuse/cost spikes (since PM hasn't set numbers yet),
implement safe defaults via env:

- Cooldown between sends: **60 seconds**

- Max reset links per identifier per hour: **5**

### **1.5 Password policy (confirmed)**

Same policy as Document 03:

- ≥8 chars, lowercase, uppercase, number, symbol

### **1.6 "Stay logged in" vs "Sign out other devices"**

After password update, user selects one:

- **Stay logged in to my devices** → do not revoke other sessions

- **Sign out of all other devices** → revoke all other active sessions
  for that user (leave the current reset session active)

### **1.7 Mandatory 2FA enforcement**

When we finally issue tokens after reset:

- If phoneVerifiedAt is null → return MFA_REQUIRED (no tokens) and use
  Document 06 flow.

## **2) API contract summary**

### **2.1 Endpoints (this doc)**

1.  POST /v1/auth/password-reset/request

2.  POST /v1/auth/password-reset/update-password

3.  POST /v1/auth/password-reset/finalize

### **2.2 Out-of-scope placeholder (separate sprint)**

- POST /v1/auth/account-recovery/start → returns NOT_IMPLEMENTED

## **3) Environment variables**

Add to apps/auth-service/.env:

- \# Reset link

- PASSWORD_RESET_TTL_SECONDS=86400

- PASSWORD_RESET_RESEND_COOLDOWN_SECONDS=60

- PASSWORD_RESET_MAX_PER_HOUR=5

- 

- FRONTEND_BASE_URL=https://your-frontend.com

- 

- \# Email provider (SMTP via nodemailer)

- SMTP_HOST=smtp.yourprovider.com

- SMTP_PORT=587

- SMTP_USER=replace_me

- SMTP_PASS=replace_me

- SMTP_FROM=no-reply@marketeqprojects.com

- 

- \# SMS provider (Twilio)

- TWILIO_ACCOUNT_SID=replace_me

- TWILIO_AUTH_TOKEN=replace_me

- TWILIO_FROM_PHONE=+1xxxxxxxxxx

Magic link format:

- Email/SMS deep link:\
  FRONTEND_BASE_URL/auth/reset-password?token=\<token\>

## **4) Dependencies (package.json update)**

Update apps/auth-service/package.json dependencies:

- {

- \"dependencies\": {

- \"nodemailer\": \"\^6.9.14\",

- \"twilio\": \"\^5.3.4\"

- },

- \"devDependencies\": {

- \"@types/nodemailer\": \"\^6.4.16\"

- }

- }

Install:

- cd apps/auth-service

- npm install

## **5) Database: Prisma model for reset tokens**

Update apps/auth-service/prisma/schema.prisma and add:

- enum ResetChannel {

- EMAIL

- PHONE

- }

- 

- model PasswordResetToken {

- id String \@id \@default(uuid())

- userId String

- channel ResetChannel

- destination String // email or phoneE164 (for display/logging)

- tokenHash String \@unique

- expiresAt DateTime

- usedAt DateTime?

- createdAt DateTime \@default(now())

- 

- user AuthUser \@relation(fields: \[userId\], references: \[id\])

- 

- @@index(\[userId\])

- @@index(\[destination\])

- @@index(\[expiresAt\])

- }

Run migration:

- cd apps/auth-service

- npx prisma migrate dev \--name add_password_reset_tokens

- npx prisma generate

## **6) Files to create/update**

Create folders:

- mkdir -p apps/auth-service/src/auth/password-reset/dto

- mkdir -p apps/auth-service/src/providers

Create files:

- apps/auth-service/src/auth/password-reset/password-reset.controller.ts

- apps/auth-service/src/auth/password-reset/password-reset.service.ts

- apps/auth-service/src/auth/password-reset/dto/request-reset.dto.ts

- apps/auth-service/src/auth/password-reset/dto/update-password.dto.ts

- apps/auth-service/src/auth/password-reset/dto/finalize-reset.dto.ts

- apps/auth-service/src/providers/mailer.service.ts

- apps/auth-service/src/providers/sms.service.ts

Update:

- apps/auth-service/src/auth/auth.module.ts

## **7) Provider services**

### **7.1 Mailer service (SMTP via nodemailer)**

Create: apps/auth-service/src/providers/mailer.service.ts

- import { Injectable } from \'@nestjs/common\';

- import nodemailer from \'nodemailer\';

- 

- \@Injectable()

- export class MailerService {

- private transporter = nodemailer.createTransport({

- host: process.env.SMTP_HOST!,

- port: Number(process.env.SMTP_PORT \|\| 587),

- secure: false,

- auth: {

- user: process.env.SMTP_USER!,

- pass: process.env.SMTP_PASS!,

- },

- });

- 

- async sendPasswordResetEmail(input: { to: string; resetLink: string;
  expiresHours: number }) {

- const from = process.env.SMTP_FROM!;

- const subject = \'Reset your Marketeq password\';

- const text = \[

- \`You requested a password reset.\`,

- \`Reset Password: \${input.resetLink}\`,

- \`This link expires in \${input.expiresHours} hours.\`,

- \`If you did not request this, you can ignore this email.\`,

- \].join(\'\\n\\n\');

- 

- const html = \`

- \<p\>You requested a password reset.\</p\>

- \<p\>\<a href=\"\${input.resetLink}\"\>Reset Password\</a\>\</p\>

- \<p\>This link expires in \${input.expiresHours} hours.\</p\>

- \<p\>If you did not request this, you can ignore this email.\</p\>

- \`;

- 

- await this.transporter.sendMail({

- from,

- to: input.to,

- subject,

- text,

- html,

- });

- }

- }

### **7.2 SMS service (Twilio)**

Create: apps/auth-service/src/providers/sms.service.ts

- import { Injectable } from \'@nestjs/common\';

- 

- \@Injectable()

- export class SmsService {

- private client: any;

- 

- constructor() {

- // eslint-disable-next-line \@typescript-eslint/no-var-requires

- const Twilio = require(\'twilio\');

- this.client = Twilio(process.env.TWILIO_ACCOUNT_SID!,
  process.env.TWILIO_AUTH_TOKEN!);

- }

- 

- async sendPasswordResetSms(input: { to: string; resetLink: string;
  expiresHours: number }) {

- await this.client.messages.create({

- to: input.to,

- from: process.env.TWILIO_FROM_PHONE!,

- body: \`Marketeq password reset: \${input.resetLink} (expires in
  \${input.expiresHours} hours).\`,

- });

- }

- }

## **8) DTOs**

### **8.1 Request reset DTO**

Create:
apps/auth-service/src/auth/password-reset/dto/request-reset.dto.ts

- import { IsString, MinLength } from \'class-validator\';

- 

- export class RequestPasswordResetDto {

- \@IsString()

- \@MinLength(3)

- identifier!: string; // email or phone

- }

### **8.2 Update password DTO**

Create:
apps/auth-service/src/auth/password-reset/dto/update-password.dto.ts

- import { IsString, MinLength } from \'class-validator\';

- 

- export class UpdatePasswordFromResetDto {

- \@IsString()

- \@MinLength(10)

- token!: string;

- 

- \@IsString()

- \@MinLength(1)

- password!: string;

- 

- \@IsString()

- \@MinLength(1)

- confirmPassword!: string;

- }

### **8.3 Finalize DTO (choose session behavior)**

Create:
apps/auth-service/src/auth/password-reset/dto/finalize-reset.dto.ts

- import { IsIn, IsString } from \'class-validator\';

- 

- export class FinalizePasswordResetDto {

- \@IsString()

- resetSessionId!: string;

- 

- \@IsIn(\[\'STAY_LOGGED_IN\', \'SIGN_OUT_OTHER_DEVICES\'\])

- choice!: \'STAY_LOGGED_IN\' \| \'SIGN_OUT_OTHER_DEVICES\';

- }

## **9) Password reset service (full logic)**

Create:
apps/auth-service/src/auth/password-reset/password-reset.service.ts

- import { BadRequestException, Injectable, TooManyRequestsException }
  from \'@nestjs/common\';

- import { nanoid } from \'nanoid\';

- import bcrypt from \'bcryptjs\';

- import { PrismaService } from \'../../prisma/prisma.service\';

- import { err } from \'../../common/errors\';

- import { sha256 } from \'../../common/crypto\';

- import { MailerService } from \'../../providers/mailer.service\';

- import { SmsService } from \'../../providers/sms.service\';

- import { validatePasswordPolicy } from
  \'../security/password/password-policy\';

- import { TokenService } from \'../sessions/token.service\';

- 

- // Minimal phone normalization (reuse/merge with Document 06 phone
  helper if already created)

- function normalizePhone(input: string): string \| null {

- const raw = input.trim().replace(/\\s+/g, \'\');

- const ok = /\^\\+?\[1-9\]\\d{7,14}\$/.test(raw);

- if (!ok) return null;

- return raw.startsWith(\'+\') ? raw : \`+\${raw}\`;

- }

- 

- \@Injectable()

- export class PasswordResetService {

- constructor(

- private prisma: PrismaService,

- private mailer: MailerService,

- private sms: SmsService,

- private tokens: TokenService,

- ) {}

- 

- private ttlSeconds(): number {

- return Number(process.env.PASSWORD_RESET_TTL_SECONDS ?? 86400);

- }

- 

- private resendCooldownSeconds(): number {

- return Number(process.env.PASSWORD_RESET_RESEND_COOLDOWN_SECONDS ??
  60);

- }

- 

- private maxPerHour(): number {

- return Number(process.env.PASSWORD_RESET_MAX_PER_HOUR ?? 5);

- }

- 

- private maskEmail(email: string) {

- const \[name, domain\] = email.split(\'@\');

- const maskedName = name.length \<= 2 ? \`\${name\[0\]}\*\` :
  \`\${name\[0\]}\*\*\*\${name\[name.length - 1\]}\`;

- return \`\${maskedName}@\${domain}\`;

- }

- 

- private maskPhone(phone: string) {

- // +12085551234 -\> +1\*\*\*\*\*\*1234

- const last4 = phone.slice(-4);

- return \`\${phone.slice(0, 2)}\*\*\*\*\*\*\${last4}\`;

- }

- 

- private buildResetLink(token: string) {

- return
  \`\${process.env.FRONTEND_BASE_URL}/auth/reset-password?token=\${encodeURIComponent(token)}\`;

- }

- 

- private parseIdentifier(identifier: string): { channel: \'EMAIL\' \|
  \'PHONE\'; value: string } {

- const trimmed = identifier.trim();

- // Rule: if it contains \'@\', treat as email (also resolves ambiguous
  inputs)

- if (trimmed.includes(\'@\')) {

- return { channel: \'EMAIL\', value: trimmed.toLowerCase() };

- }

- const phone = normalizePhone(trimmed);

- if (!phone) throw new BadRequestException(err(\'INVALID_IDENTIFIER\',
  \'Enter a valid email or phone number.\'));

- return { channel: \'PHONE\', value: phone };

- }

- 

- private async enforceRateLimits(destination: string) {

- // Cooldown based on latest token sent to this destination

- const latest = await this.prisma.passwordResetToken.findFirst({

- where: { destination },

- orderBy: { createdAt: \'desc\' },

- select: { createdAt: true },

- });

- 

- if (latest) {

- const deltaMs = Date.now() - latest.createdAt.getTime();

- if (deltaMs \< this.resendCooldownSeconds() \* 1000) {

- throw new TooManyRequestsException(err(\'RESEND_COOLDOWN\', \'Please
  wait before requesting another link.\'));

- }

- }

- 

- // Max per hour

- const oneHourAgo = new Date(Date.now() - 60 \* 60 \* 1000);

- const count = await this.prisma.passwordResetToken.count({

- where: { destination, createdAt: { gte: oneHourAgo } },

- });

- 

- if (count \>= this.maxPerHour()) {

- throw new TooManyRequestsException(err(\'RATE_LIMITED\', \'Too many
  reset requests. Please try again later.\'));

- }

- }

- 

- async requestReset(input: { identifier: string }) {

- const parsed = this.parseIdentifier(input.identifier);

- 

- let user:

- \| { id: string; email: string; phoneE164: string \| null }

- \| null = null;

- 

- if (parsed.channel === \'EMAIL\') {

- user = await this.prisma.authUser.findUnique({

- where: { email: parsed.value },

- select: { id: true, email: true, phoneE164: true },

- });

- } else {

- user = await this.prisma.authUser.findUnique({

- where: { phoneE164: parsed.value },

- select: { id: true, email: true, phoneE164: true },

- });

- }

- 

- // Explicit enumeration is allowed: show account not found

- if (!user) {

- throw new BadRequestException(

- err(\'ACCOUNT_NOT_FOUND\', \`We couldn\'t find an account associated
  with your \${parsed.channel === \'EMAIL\' ? \'email\' : \'phone
  number\'}.\`, {

- channel: parsed.channel,

- }),

- );

- }

- 

- const destination = parsed.channel === \'EMAIL\' ? user.email :
  user.phoneE164!;

- await this.enforceRateLimits(destination);

- 

- const token = nanoid(64);

- const tokenHash = sha256(token);

- 

- const expiresAt = new Date(Date.now() + this.ttlSeconds() \* 1000);

- 

- await this.prisma.passwordResetToken.create({

- data: {

- userId: user.id,

- channel: parsed.channel,

- destination,

- tokenHash,

- expiresAt,

- },

- });

- 

- const resetLink = this.buildResetLink(token);

- const expiresHours = 24;

- 

- if (parsed.channel === \'EMAIL\') {

- await this.mailer.sendPasswordResetEmail({ to: user.email, resetLink,
  expiresHours });

- return {

- status: \'RESET_LINK_SENT\' as const,

- channel: \'EMAIL\' as const,

- destinationMasked: this.maskEmail(user.email),

- expiresInHours: expiresHours,

- };

- } else {

- await this.sms.sendPasswordResetSms({ to: destination, resetLink,
  expiresHours });

- return {

- status: \'RESET_LINK_SENT\' as const,

- channel: \'PHONE\' as const,

- destinationMasked: this.maskPhone(destination),

- expiresInHours: expiresHours,

- };

- }

- }

- 

- async updatePasswordFromToken(input: { token: string; password:
  string; confirmPassword: string }) {

- if (input.password !== input.confirmPassword) {

- throw new BadRequestException(err(\'PASSWORD_MISMATCH\', \'Passwords
  do not match.\'));

- }

- 

- const failures = validatePasswordPolicy(input.password);

- if (failures.length \> 0) {

- throw new BadRequestException(err(\'WEAK_PASSWORD\', \'Password does
  not meet requirements.\', { failures }));

- }

- 

- const tokenHash = sha256(input.token);

- 

- const reset = await this.prisma.passwordResetToken.findUnique({

- where: { tokenHash },

- select: { id: true, userId: true, expiresAt: true, usedAt: true },

- });

- 

- if (!reset) throw new BadRequestException(err(\'RESET_LINK_INVALID\',
  \'Invalid reset link.\'));

- if (reset.usedAt) throw new
  BadRequestException(err(\'RESET_LINK_USED\', \'This reset link has
  already been used.\'));

- if (new Date() \> reset.expiresAt) throw new
  BadRequestException(err(\'RESET_LINK_EXPIRED\', \'This reset link has
  expired.\'));

- 

- const user = await this.prisma.authUser.findUnique({

- where: { id: reset.userId },

- select: { id: true, email: true, phoneVerifiedAt: true },

- });

- if (!user) throw new BadRequestException(err(\'USER_NOT_FOUND\',
  \'User no longer exists.\'));

- 

- const passwordHash = await bcrypt.hash(input.password, 12);

- 

- // Create a \"reset session\" now; tokens will be issued on finalize
  (after user chooses session behavior)

- const session = await this.prisma.authSession.create({

- data: {

- userId: user.id,

- rememberMe: true, // CTO decision: reset flow keeps current device
  logged in

- expiresAt: new Date(Date.now() + this.tokens.refreshTtlSeconds(true)
  \* 1000),

- state: \'ACTIVE\',

- },

- select: { id: true },

- });

- 

- await this.prisma.\$transaction(\[

- this.prisma.authUser.update({

- where: { id: user.id },

- data: { passwordHash },

- }),

- this.prisma.passwordResetToken.update({

- where: { id: reset.id },

- data: { usedAt: new Date() },

- }),

- \]);

- 

- return {

- status: \'PASSWORD_UPDATED\' as const,

- resetSessionId: session.id,

- next: \'PASSWORD_UPDATED_CONFIRMATION_OPTIONS\' as const,

- };

- }

- 

- async finalize(input: { resetSessionId: string; choice:
  \'STAY_LOGGED_IN\' \| \'SIGN_OUT_OTHER_DEVICES\' }) {

- const session = await this.prisma.authSession.findUnique({

- where: { id: input.resetSessionId },

- select: { id: true, userId: true, revokedAt: true },

- });

- 

- if (!session \|\| session.revokedAt) {

- throw new BadRequestException(err(\'INVALID_SESSION\', \'Invalid or
  revoked reset session.\'));

- }

- 

- const user = await this.prisma.authUser.findUnique({

- where: { id: session.userId },

- select: { id: true, email: true, phoneVerifiedAt: true },

- });

- 

- if (!user) throw new BadRequestException(err(\'USER_NOT_FOUND\',
  \'User no longer exists.\'));

- 

- if (input.choice === \'SIGN_OUT_OTHER_DEVICES\') {

- await this.prisma.authSession.updateMany({

- where: {

- userId: user.id,

- revokedAt: null,

- NOT: { id: session.id },

- },

- data: { revokedAt: new Date(), state: \'REVOKED\' },

- });

- }

- 

- // Enforce mandatory 2FA before issuing tokens

- if (!user.phoneVerifiedAt) {

- return {

- status: \'MFA_REQUIRED\' as const,

- sessionId: session.id,

- next: \'SECURITY_STEP_2_OF_3_PHONE_2FA\' as const,

- };

- }

- 

- const tokenBundle = await this.tokens.issueTokens({

- userId: user.id,

- sessionId: session.id,

- rememberMe: true,

- });

- 

- return {

- status: \'SIGNED_IN\' as const,

- sessionId: session.id,

- accessToken: tokenBundle.accessToken,

- refreshToken: tokenBundle.refreshToken,

- refreshExpiresAt: tokenBundle.expiresAt.toISOString(),

- user: { id: user.id, email: user.email },

- next: \'DASHBOARD\' as const,

- };

- }

- }

## **10) Controller**

Create:
apps/auth-service/src/auth/password-reset/password-reset.controller.ts

- import { Body, Controller, Post } from \'@nestjs/common\';

- import { PasswordResetService } from \'./password-reset.service\';

- import { RequestPasswordResetDto } from \'./dto/request-reset.dto\';

- import { UpdatePasswordFromResetDto } from
  \'./dto/update-password.dto\';

- import { FinalizePasswordResetDto } from \'./dto/finalize-reset.dto\';

- 

- \@Controller(\'v1/auth/password-reset\')

- export class PasswordResetController {

- constructor(private readonly svc: PasswordResetService) {}

- 

- \@Post(\'request\')

- async request(@Body() dto: RequestPasswordResetDto) {

- return this.svc.requestReset({ identifier: dto.identifier });

- }

- 

- \@Post(\'update-password\')

- async updatePassword(@Body() dto: UpdatePasswordFromResetDto) {

- return this.svc.updatePasswordFromToken({

- token: dto.token,

- password: dto.password,

- confirmPassword: dto.confirmPassword,

- });

- }

- 

- \@Post(\'finalize\')

- async finalize(@Body() dto: FinalizePasswordResetDto) {

- return this.svc.finalize({ resetSessionId: dto.resetSessionId, choice:
  dto.choice });

- }

- }

## **11) Account recovery placeholder endpoint**

Create: apps/auth-service/src/auth/account-recovery.controller.ts

- import { Controller, Post } from \'@nestjs/common\';

- import { BadRequestException } from \'@nestjs/common\';

- import { err } from \'../common/errors\';

- 

- \@Controller(\'v1/auth/account-recovery\')

- export class AccountRecoveryController {

- \@Post(\'start\')

- start() {

- // Separate sprint

- throw new BadRequestException(err(\'NOT_IMPLEMENTED\', \'Account
  recovery is not implemented in this sprint.\'));

- }

- }

## **12) Wire into AuthModule**

Update: apps/auth-service/src/auth/auth.module.ts

Add imports:

- import { PasswordResetController } from
  \'./password-reset/password-reset.controller\';

- import { PasswordResetService } from
  \'./password-reset/password-reset.service\';

- import { MailerService } from \'../providers/mailer.service\';

- import { SmsService } from \'../providers/sms.service\';

- import { AccountRecoveryController } from
  \'./account-recovery.controller\';

Update module definition:

- \@Module({

- imports: \[JwtModule.register({})\],

- controllers: \[

- AuthController,

- RegisterController,

- PasswordController,

- PasswordResetController,

- AccountRecoveryController,

- \],

- providers: \[

- AuthService,

- TokenService,

- RegisterService,

- PasswordService,

- PasswordResetService,

- MailerService,

- SmsService,

- \],

- })

- export class AuthModule {}

## **13) Run instructions**

- cd apps/auth-service

- npm install

- npx prisma migrate dev

- npm run start:dev

## **14) End-to-end verification (copy/paste)**

### **14.1 Request reset (email)**

- curl -X POST http://localhost:3003/v1/auth/password-reset/request \\

- -H \"Content-Type: application/json\" \\

- -d \'{\"identifier\":\"newuser@marketeq.com\"}\'

Success:

- {

- \"status\":\"RESET_LINK_SENT\",

- \"channel\":\"EMAIL\",

- \"destinationMasked\":\"n\*\*\*r@marketeq.com\",

- \"expiresInHours\":24

- }

### **14.2 Request reset (account not found)**

- curl -X POST http://localhost:3003/v1/auth/password-reset/request \\

- -H \"Content-Type: application/json\" \\

- -d \'{\"identifier\":\"doesnotexist@marketeq.com\"}\'

Expected:

- {

- \"code\":\"ACCOUNT_NOT_FOUND\",

- \"message\":\"We couldn\'t find an account associated with your
  email.\",

- \"details\": { \"channel\":\"EMAIL\" }

- }

### **14.3 Update password using token**

Simulate clicking link: frontend extracts token query param and calls:

- curl -X POST
  http://localhost:3003/v1/auth/password-reset/update-password \\

- -H \"Content-Type: application/json\" \\

- -d \'{

- \"token\":\"PASTE_TOKEN_FROM_LINK\",

- \"password\":\"Abcd#1234\",

- \"confirmPassword\":\"Abcd#1234\"

- }\'

Success:

- {

- \"status\":\"PASSWORD_UPDATED\",

- \"resetSessionId\":\"uuid\",

- \"next\":\"PASSWORD_UPDATED_CONFIRMATION_OPTIONS\"

- }

### **14.4 Finalize: stay logged in**

- curl -X POST http://localhost:3003/v1/auth/password-reset/finalize \\

- -H \"Content-Type: application/json\" \\

- -d \'{

- \"resetSessionId\":\"uuid\",

- \"choice\":\"STAY_LOGGED_IN\"

- }\'

Success if phone verified:

- {

- \"status\":\"SIGNED_IN\",

- \"sessionId\":\"uuid\",

- \"accessToken\":\"jwt\",

- \"refreshToken\":\"jwt\",

- \"refreshExpiresAt\":\"2026-02-18T00:00:00.000Z\",

- \"user\":{\"id\":\"uuid\",\"email\":\"newuser@marketeq.com\"},

- \"next\":\"DASHBOARD\"

- }

If phone NOT verified:

- {

- \"status\":\"MFA_REQUIRED\",

- \"sessionId\":\"uuid\",

- \"next\":\"SECURITY_STEP_2_OF_3_PHONE_2FA\"

- }

### **14.5 Finalize: sign out other devices**

Same call with:

- { \"resetSessionId\":\"uuid\", \"choice\":\"SIGN_OUT_OTHER_DEVICES\" }

Backend behavior:

- revokes all other sessions for that user

- signs in current reset session

## **15) Frontend UX mapping (exact)**

### **Screen 5A: Reset request**

- Submit identifier → POST /v1/auth/password-reset/request

- If ACCOUNT_NOT_FOUND → show "Account not found" screen (5C)

- If success → show "Magic link sent" screen (5B) using
  destinationMasked + expiresInHours

### **Screen 5B: Magic link sent**

- "Resend link" calls the same request endpoint again

- Backend throttles with cooldown and per-hour max

### **Screen 5E: Update password**

- Extract token from URL

- Submit → POST /v1/auth/password-reset/update-password

- On success → show 5F options screen using resetSessionId

### **Screen 5F: Password updated confirmation**

- Choice + Continue → POST /v1/auth/password-reset/finalize

- If SIGNED_IN → route to dashboard

- If MFA_REQUIRED → route to Document 06 (2FA setup)

### **"Start account recovery"**

- Call POST /v1/auth/account-recovery/start

- Show "Coming soon / contact support" (frontend) since it's out of
  sprint
