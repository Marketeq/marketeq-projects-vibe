**✅ Unified Login Strategy (Code Implementation)**

This document outlines the **complete backend implementation** for a
seamless unified login system that supports:

- Email/password login

- Google & LinkedIn social logins

- Seamless account unification based on email match

- Secure token generation

- Cookie-based session management

- Optional password creation after login (via frontend prompt)

### **🔁 Expected Behavior**

- Users can sign up or log in with **email**, **Google**, or
  **LinkedIn**.

- If a **social login email** matches an existing user's email, the
  login will attach to the same account.

- If a user signs in via social login and has **no password**, they will
  be prompted (via frontend modal) to create one.

- If a user creates a password from settings or after social login, that
  password can be used for future **email/password** login.

### **📁 Folder Structure (NestJS Monorepo)**

****apps/

auth-service/

src/

auth/

auth.controller.ts

auth.service.ts

auth.module.ts

dto/

login.dto.ts

auth-google-login.dto.ts

auth-linkedin-login.dto.ts

enum/

auth-providers.enum.ts

strategies/

jwt.strategy.ts

main.ts

Dockerfile

libs/

notification-service/

sendgrid.service.ts

.env



Understood. Here is the **code-only implementation** using **your exact
instruction step names**, formatted in **plain text** (no markdown):

Step 1: Detect Social Login Email Match and Unify Accounts\
(Inside auth.service.ts)

private async handleSocialLogin(data: any, provider: AUTH_PROVIDERS) {

const existingUser = await this.userService.findByEmail(data.email);

let finalUser;

if (existingUser) {

finalUser = existingUser;

} else {

finalUser = await this.userService.create({

email: data.email,

firstName: data.given_name \|\| data.localizedFirstName,

lastName: data.family_name \|\| data.localizedLastName,

avatarUrl: data.picture,

provider,

emailVerified: true,

isTemporaryUser: false,

});

}

return this.generateToken(finalUser.id, finalUser.email);

}



Step 2: Generate Token on Successful Login\
(Still inside auth.service.ts)

private generateToken(id: string, email: string) {

const accessToken = this.jwtService.sign({ sub: id, email });

return { accessToken };

}



Step 3: Set Cookie After Login\
(Inside auth.controller.ts)

res.cookie(\'accessToken\', accessToken, {

httpOnly: true,

secure: true,

sameSite: \'None\',

domain: process.env.NODE_ENV === \'production\' ?
\'marketeq-projects.vercel.app\' : undefined,

path: \'/\',

});



Step 4: Handle Email + Password Login\
(Inside auth.service.ts)

async login(dto: LoginDto) {

const user = await this.userService.findByEmail(dto.email);

if (!user \|\| !(await bcrypt.compare(dto.password, user.password))) {

throw new UnauthorizedException(\'Invalid credentials\');

}

return this.generateToken(user.id, user.email);

}



Step 5: Login with Google\
(Inside auth.service.ts)

async loginWithGoogle(dto: AuthGoogleLoginDto) {

const profile = await axios.get(process.env.GOOGLE_PROFILE_DATA_URL, {

headers: { Authorization: \`Bearer \${dto.accessToken}\` },

});

return this.handleSocialLogin(profile.data, AUTH_PROVIDERS.GOOGLE);

}



Step 6: Login with LinkedIn\
(Inside auth.service.ts)

async loginWithLinkedin(dto: AuthLinkedinLoginDto) {

const profile = await axios.get(process.env.LINKEDIN_PROFILE_URL, {

headers: { Authorization: \`Bearer \${dto.accessToken}\` },

});

return this.handleSocialLogin(profile.data, AUTH_PROVIDERS.LINKEDIN);

}



Step 7: Cookie-Based Logout\
(Inside auth.controller.ts)

@Get(\'logout\')

async logout(@Res() res: Response) {

res.clearCookie(\'accessToken\');

res.send({ message: \'Logged out successfully\' });

}



Step 8: Password Creation Modal\
(To trigger in frontend logic)

if (!user.hasPassword \|\| !user.twoFactorVerified) {

showSecurityModal();

}



Step 9: Set Password After Social Login\
(Create /auth/set-password route)

@Post(\'set-password\')

\@UseGuards(JwtAuthGuard)

async setPassword(@Req() req, \@Body() dto: SetPasswordDto) {

await this.authService.setPassword(req.user.sub, dto.newPassword);

return { message: \'Password set successfully\' };

}



Step 10: Update User Record with New Password\
(Inside auth.service.ts)

async setPassword(userId: string, password: string) {

const hashed = await bcrypt.hash(password, 10);

await this.userService.update(userId, { password: hashed });

}


