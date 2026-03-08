# **Document 03 --- Account Security Setup (Step 1 / 3): Create Password**

## **1) Purpose**

After account creation (Document 02), users land on **Security Step
1/3** to create a password:

- Validate password meets required rules

- Confirm password matches

- Hash and store password on AuthUser.passwordHash

- Ensure a PASSWORD identity exists for future sign-in

- Return progression to Step 2/3 (mandatory phone 2FA)

## **2) Confirmed password rules (exact)**

Password must include:

- At least **8 characters**

- At least **1 lowercase**

- At least **1 uppercase**

- At least **1 number**

- At least **1 symbol**

No other constraints (no history checks, no banned-password lists,
etc.).

## **3) API contract**

### **Endpoint**

POST /v1/auth/security/password/set

### **Request**

  -----------------------------------------------------------------------
  {\
  \"email\": \"you@email.com\",\
  \"password\": \"Abcd#1234\",\
  \"confirmPassword\": \"Abcd#1234\",\
  \"signOutOtherDevices\": false\
  }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

Notes:

- We identify the user by **email** (since Step 1 comes immediately
  after registration, and we are not issuing temporary tokens in this
  sprint).

- signOutOtherDevices exists for future reuse; for new accounts it will
  do nothing, but it is safe and consistent with later flows.

### **Success response**

  -----------------------------------------------------------------------
  {\
  \"status\": \"PASSWORD_SET\",\
  \"user\": { \"id\": \"uuid\", \"email\": \"you@email.com\" },\
  \"next\": \"SECURITY_STEP_2_OF_3_PHONE_2FA\"\
  }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

### **Error examples**

- PASSWORD_MISMATCH

- WEAK_PASSWORD (includes failures\[\])

- USER_NOT_FOUND

## **4) Database expectations (no new tables required)**

This doc assumes the models from Document 01--02 exist:

- AuthUser(email, passwordHash, \...)

- AuthIdentity(provider=PASSWORD \...)

- AuthSession (used only if sign-out is requested)

No schema changes are required for Document 03.

## **5) Files to create/update**

Create:

- apps/auth-service/src/auth/security/password/password.controller.ts

- apps/auth-service/src/auth/security/password/password.service.ts

- apps/auth-service/src/auth/security/password/dto/set-password.dto.ts

- apps/auth-service/src/auth/security/password/password-policy.ts

Update:

- apps/auth-service/src/auth/auth.module.ts (register
  controller/service)

## **6) DTO**

Create:
apps/auth-service/src/auth/security/password/dto/set-password.dto.ts

  -----------------------------------------------------------------------
  import { IsBoolean, IsEmail, IsOptional, IsString, MinLength } from
  \'class-validator\';\
  \
  export class SetPasswordDto {\
  \@IsEmail()\
  email!: string;\
  \
  \@IsString()\
  \@MinLength(1)\
  password!: string;\
  \
  \@IsString()\
  \@MinLength(1)\
  confirmPassword!: string;\
  \
  \@IsOptional()\
  \@IsBoolean()\
  signOutOtherDevices?: boolean;\
  }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

## **7) Password policy validator**

Create: apps/auth-service/src/auth/security/password/password-policy.ts

  -----------------------------------------------------------------------
  export type PasswordFailure =\
  \| \'MIN_LENGTH_8\'\
  \| \'MISSING_LOWERCASE\'\
  \| \'MISSING_UPPERCASE\'\
  \| \'MISSING_NUMBER\'\
  \| \'MISSING_SYMBOL\';\
  \
  export function validatePasswordPolicy(password: string):
  PasswordFailure\[\] {\
  const failures: PasswordFailure\[\] = \[\];\
  \
  if (password.length \< 8) failures.push(\'MIN_LENGTH_8\');\
  if (!/\[a-z\]/.test(password)) failures.push(\'MISSING_LOWERCASE\');\
  if (!/\[A-Z\]/.test(password)) failures.push(\'MISSING_UPPERCASE\');\
  if (!/\[0-9\]/.test(password)) failures.push(\'MISSING_NUMBER\');\
  if (!/\[\^A-Za-z0-9\]/.test(password))
  failures.push(\'MISSING_SYMBOL\');\
  \
  return failures;\
  }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

## **8) Service implementation**

Create: apps/auth-service/src/auth/security/password/password.service.ts

  -----------------------------------------------------------------------
  import { BadRequestException, Injectable } from \'@nestjs/common\';\
  import bcrypt from \'bcryptjs\';\
  import { PrismaService } from \'../../../prisma/prisma.service\';\
  import { err } from \'../../../common/errors\';\
  import { validatePasswordPolicy } from \'./password-policy\';\
  \
  \@Injectable()\
  export class PasswordService {\
  constructor(private prisma: PrismaService) {}\
  \
  async setPassword(input: {\
  email: string;\
  password: string;\
  confirmPassword: string;\
  signOutOtherDevices: boolean;\
  }) {\
  const email = input.email.toLowerCase().trim();\
  \
  if (input.password !== input.confirmPassword) {\
  throw new BadRequestException(err(\'PASSWORD_MISMATCH\', \'Passwords do
  not match.\'));\
  }\
  \
  const failures = validatePasswordPolicy(input.password);\
  if (failures.length \> 0) {\
  throw new BadRequestException(\
  err(\'WEAK_PASSWORD\', \'Password does not meet requirements.\', {
  failures })\
  );\
  }\
  \
  const user = await this.prisma.authUser.findUnique({\
  where: { email },\
  select: { id: true, email: true },\
  });\
  \
  if (!user) {\
  throw new BadRequestException(err(\'USER_NOT_FOUND\', \'No user found
  for that email.\'));\
  }\
  \
  const passwordHash = await bcrypt.hash(input.password, 12);\
  \
  // Ensure PASSWORD identity exists (OAuth users may not have it, but
  Document 02 attempts to create it)\
  const passwordIdentity = await this.prisma.authIdentity.findFirst({\
  where: { userId: user.id, provider: \'PASSWORD\' },\
  select: { id: true },\
  });\
  \
  await this.prisma.\$transaction(async (tx) =\> {\
  await tx.authUser.update({\
  where: { id: user.id },\
  data: { passwordHash },\
  });\
  \
  if (!passwordIdentity) {\
  await tx.authIdentity.create({\
  data: {\
  userId: user.id,\
  provider: \'PASSWORD\',\
  providerUserId: user.id,\
  providerEmail: email,\
  },\
  });\
  }\
  \
  // Optional: sign out all other devices (revoke all sessions)\
  // For a new account this usually does nothing, but this keeps behavior
  consistent across flows.\
  if (input.signOutOtherDevices) {\
  await tx.authSession.updateMany({\
  where: { userId: user.id, revokedAt: null },\
  data: { revokedAt: new Date(), state: \'REVOKED\' },\
  });\
  }\
  });\
  \
  return {\
  status: \'PASSWORD_SET\' as const,\
  user: { id: user.id, email: user.email },\
  next: \'SECURITY_STEP_2_OF_3_PHONE_2FA\' as const,\
  };\
  }\
  }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

## **9) Controller**

Create:
apps/auth-service/src/auth/security/password/password.controller.ts

  -----------------------------------------------------------------------
  import { Body, Controller, Post } from \'@nestjs/common\';\
  import { PasswordService } from \'./password.service\';\
  import { SetPasswordDto } from \'./dto/set-password.dto\';\
  \
  \@Controller(\'v1/auth/security/password\')\
  export class PasswordController {\
  constructor(private readonly passwordService: PasswordService) {}\
  \
  \@Post(\'set\')\
  async set(@Body() dto: SetPasswordDto) {\
  return this.passwordService.setPassword({\
  email: dto.email,\
  password: dto.password,\
  confirmPassword: dto.confirmPassword,\
  signOutOtherDevices: dto.signOutOtherDevices ?? false,\
  });\
  }\
  }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

## **10) Wire into AuthModule**

Update: apps/auth-service/src/auth/auth.module.ts

  -----------------------------------------------------------------------
  Add imports:\
  import { PasswordController } from
  \'./security/password/password.controller\';\
  import { PasswordService } from
  \'./security/password/password.service\';\
  \
  Update module:\
  \@Module({\
  imports: \[JwtModule.register({})\],\
  controllers: \[AuthController, RegisterController,
  PasswordController\],\
  providers: \[AuthService, TokenService, RegisterService,
  PasswordService\],\
  })\
  export class AuthModule {}
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

## **11) Run instructions**

cd apps/auth-service

npm install

npm run start:dev

## **12) Verification tests (copy/paste)**

### **12.1 Set password (success)**

  -----------------------------------------------------------------------
  curl -X POST http://localhost:3003/v1/auth/security/password/set \\\
  -H \"Content-Type: application/json\" \\\
  -d \'{\
  \"email\":\"newuser@marketeq.com\",\
  \"password\":\"Abcd#1234\",\
  \"confirmPassword\":\"Abcd#1234\",\
  \"signOutOtherDevices\": false\
  }\'
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

Expected:

  -----------------------------------------------------------------------
  {\
  \"status\": \"PASSWORD_SET\",\
  \"user\": { \"id\": \"uuid\", \"email\": \"newuser@marketeq.com\" },\
  \"next\": \"SECURITY_STEP_2_OF_3_PHONE_2FA\"\
  }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

### **12.2 Password mismatch**

  -----------------------------------------------------------------------
  curl -X POST http://localhost:3003/v1/auth/security/password/set \\\
  -H \"Content-Type: application/json\" \\\
  -d \'{\
  \"email\":\"newuser@marketeq.com\",\
  \"password\":\"Abcd#1234\",\
  \"confirmPassword\":\"Abcd#12345\"\
  }\'
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

Expected error:

  -----------------------------------------------------------------------
  { \"code\":\"PASSWORD_MISMATCH\", \"message\":\"Passwords do not
  match.\" }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

### **12.3 Weak password**

  -----------------------------------------------------------------------
  curl -X POST http://localhost:3003/v1/auth/security/password/set \\\
  -H \"Content-Type: application/json\" \\\
  -d \'{\
  \"email\":\"newuser@marketeq.com\",\
  \"password\":\"abc\",\
  \"confirmPassword\":\"abc\"\
  }\'
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

Expected error:

  ----------------------------------------------------------------------------------
  {\
  \"code\":\"WEAK_PASSWORD\",\
  \"message\":\"Password does not meet requirements.\",\
  \"details\": { \"failures\":
  \[\"MIN_LENGTH_8\",\"MISSING_UPPERCASE\",\"MISSING_NUMBER\",\"MISSING_SYMBOL\"\]
  }\
  }
  ----------------------------------------------------------------------------------

  ----------------------------------------------------------------------------------

### **12.4 User not found**

  -----------------------------------------------------------------------
  curl -X POST http://localhost:3003/v1/auth/security/password/set \\\
  -H \"Content-Type: application/json\" \\\
  -d \'{\
  \"email\":\"doesnotexist@marketeq.com\",\
  \"password\":\"Abcd#1234\",\
  \"confirmPassword\":\"Abcd#1234\"\
  }\'
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

Expected error:

  -----------------------------------------------------------------------
  { \"code\":\"USER_NOT_FOUND\", \"message\":\"No user found for that
  email.\" }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

## **13) UI wiring notes (exact)**

On "Continue" in Step 1/3 UI:

1.  Call POST /v1/auth/security/password/set

2.  If success → route to Step 2/3 (2FA setup screen)

3.  If WEAK_PASSWORD → highlight rule failures

4.  If PASSWORD_MISMATCH → show mismatch error
