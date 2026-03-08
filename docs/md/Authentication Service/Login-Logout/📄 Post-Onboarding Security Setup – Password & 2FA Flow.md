# **📄 Post-Onboarding Security Setup -- Password & 2FA Flow**

**Objective:\**
After a new user registers with **email only**, show a 3-step modal that
lets them:

1.  Create a secure password

2.  Enter their phone number

3.  Verify their phone using a **magic link sent via SendGrid\**

## **✅ When to Show the Security Modal**

The modal appears **immediately after onboarding/login** if either of
the following is true:

if (!user.hasPassword \|\| !user.twoFactorVerified) {

showSecurityModal();

}

These flags must be returned in the session payload or user object on
login.

## **🔐 Step 1: Create Password**

### **✅ Frontend UI:**

- Fields:

  - password

  - confirmPassword

- Validation Rules:

  - Min 8 characters

  - At least 1 lowercase

  - At least 1 uppercase

  - At least 1 number

  - At least 1 symbol

### **📡 API Call:**

****POST /auth/create-password

**Payload:**

****{

\"password\": \"userChosenPassword\"

}

### **🛠 Backend Logic (auth.controller.ts)**

****\@Post(\'create-password\')

\@UseGuards(AuthGuard(\'jwt\'))

async createPassword(@Req() req, \@Body(\'password\') password: string)
{

const hashed = await bcrypt.hash(password, 10);

await this.userService.update(req.user.id, {

password: hashed,

hasPassword: true,

});

return { message: \'Password created successfully\' };

}



## **📱 Step 2: Enter Phone Number**

### **✅ Frontend UI:**

- Field: phoneNumber

- Prompt: "Enter your phone number and we'll send a magic link."

### **📡 API Call:**

****POST /auth/send-2fa-link

**Payload:**

****{

\"phoneNumber\": \"+15551234567\"

}

### **🛠 Backend Logic (auth.controller.ts)**

****\@Post(\'send-2fa-link\')

\@UseGuards(AuthGuard(\'jwt\'))

async send2FALink(@Req() req, \@Body(\'phoneNumber\') phone: string) {

await this.userService.update(req.user.id, {

twoFactorPhoneNumber: phone,

twoFactorVerified: false,

});

// Notify SendGrid via event

await this.notificationClient.emit(\'send_magic_link_email\', {

email: req.user.email,

userId: req.user.id,

type: \'2fa\',

});

return { message: \'Magic link sent to email\' };

}



## **🔗 Step 3: Verify Phone via Magic Link**

### **✅ Notification Service (notification.service.ts)**

****\@EventPattern(\'send_magic_link_email\')

async send2FAMagicLink(@Payload() data: any) {

const { email, userId, type } = data;

const token = this.jwtService.sign({ sub: userId, type }, { expiresIn:
\'24h\' });

const link =
\`https://marketeq-projects.vercel.app/verify-2fa?token=\${token}\`;

await this.sendgridService.send({

to: email,

subject: \'Verify your phone number for 2FA\',

html: \`

\<p\>Tap the link below to verify your phone number:\</p\>

\<a href=\"\${link}\"\>\${link}\</a\>

\<p\>If you didn't request this, you can safely ignore this email.\</p\>

\`,

});

}



## **🔁 Final Verification API (Triggered by magic link)**

### **📡 API Call:**

****POST /auth/verify-2fa-link

Authorization: Bearer \<token from URL\>

### **🛠 Backend Logic:**

****\@Post(\'verify-2fa-link\')

\@UseGuards(AuthGuard(\'jwt\'))

async verify2FA(@Req() req) {

await this.userService.update(req.user.id, {

twoFactorVerified: true,

});

return { message: \'Phone verification complete\' };

}



## **✅ Summary of Backend Flags**

  ----------------------------------------------------------
  **Field**              **Type**   **Description**
  ---------------------- ---------- ------------------------
  hasPassword            boolean    True if user has set a
                                    password

  twoFactorPhoneNumber   string     Phone number for 2FA

  twoFactorVerified      boolean    True if 2FA phone was
                                    verified
  ----------------------------------------------------------
