Your current AuthController shows that:

- Login and signup return a LoginResponseType directly (likely including
  a JWT token)

- **No cookies are being set in the controller\**

- **No logout route exists yet\**

That explains the issue: you\'re returning the token in JSON, but your
frontend is expecting it in a **cookie**. To match the frontend's logic
(which uses credentials: \'include\' and expects accessToken in a
cookie), you need to:

## **✅ 1. Modify login() to set the accessToken in a cookie**

Update your login() method like this:

import { Response } from \'express\';

import { Res } from \'@nestjs/common\';

\@Post(\'login\')

\@HttpCode(HttpStatus.OK)

async login(

\@Body() loginDto: LoginDto,

\@Res({ passthrough: true }) res: Response,

): Promise\<LoginResponseType\> {

const loginResponse = await this.authService.login(loginDto);

res.cookie(\'accessToken\', loginResponse.accessToken, {

httpOnly: true,

secure: true,

sameSite: \'None\', // Important for cross-origin (Render + Vercel)

domain: process.env.NODE_ENV === \'production\' ?
\'marketeq-projects.vercel.app\' : undefined,

path: \'/\',

});

// Optionally omit token from body if only using cookie for auth

return { message: \'Login successful\' };

}



## **✅ 2. Add a logout() route to clear the cookie**

Add this below your other routes:

import { Res } from \'@nestjs/common\';

import { Response } from \'express\';

\@Post(\'logout\')

\@HttpCode(HttpStatus.OK)

logout(@Res({ passthrough: true }) res: Response) {

res.clearCookie(\'accessToken\', {

httpOnly: true,

secure: true,

sameSite: \'None\',

domain: process.env.NODE_ENV === \'production\' ?
\'marketeq-projects.vercel.app\' : undefined,

path: \'/\',

});

return { message: \'Logged out successfully\' };

}



## **✅ 3. (Optional) Clean Up: Don't send token in the body**

If you\'re **using cookies only** for auth, you can modify the
LoginResponseType and return only public data (e.g., name, role) without
accessToken.

Otherwise, keep the token in both places, but just make sure it's never
stored in localStorage on the frontend --- only read from the cookie.

## **🔒 Summary of What to Add**

Update login():

- Use \@Res({ passthrough: true })

- Set cookie via res.cookie(\...)

Add logout():

- Use res.clearCookie(\...)

Make sure:

- secure: true and sameSite: \'None\'

- domain only set in production
