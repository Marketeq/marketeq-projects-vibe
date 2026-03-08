## **✅ Final Fixed auth.controller.ts**

****import {

Controller,

Post,

Body,

Res,

HttpCode,

HttpStatus,

} from \'@nestjs/common\';

import { Response } from \'express\';

import { AuthService } from \'./auth.service\';

import { LoginDto } from \'./dto/login.dto\';

\@Controller(\'auth\')

export class AuthController {

constructor(private readonly authService: AuthService) {}

\@Post(\'login\')

\@HttpCode(HttpStatus.OK)

async login(

\@Body() loginDto: LoginDto,

\@Res({ passthrough: true }) res: Response,

) {

const { accessToken } = await this.authService.login(loginDto);

res.cookie(\'accessToken\', accessToken, {

httpOnly: true,

secure: true, // only works with HTTPS

sameSite: \'None\', // required for cross-origin cookies (Render \<-\>
Vercel)

domain:

process.env.NODE_ENV === \'production\'

? \'marketeq-projects.vercel.app\'

: undefined,

path: \'/\',

});

return { message: \'Login successful\' };

}

\@Post(\'logout\')

\@HttpCode(HttpStatus.OK)

async logout(@Res({ passthrough: true }) res: Response) {

res.clearCookie(\'accessToken\', {

httpOnly: true,

secure: true,

sameSite: \'None\',

domain:

process.env.NODE_ENV === \'production\'

? \'marketeq-projects.vercel.app\'

: undefined,

path: \'/\',

});

return { message: \'Logged out successfully\' };

}

}



### **🔧 Also: Don\'t forget to confirm this is in your main.ts**

****app.enableCors({

origin: \'https://marketeq-projects.vercel.app\',

credentials: true,

});



### **🧪 After Deploying**

Go to your app, try logging in, and check:

1.  Chrome DevTools → Application → Cookies → accessToken shows up

2.  Chrome DevTools → Network → /auth/login → look for Set-Cookie in the
    **Response headers\**
