Here's your **production-ready NestJS + Dockerized auth-service login
setup**, including:

- ✅ Secure cookie handling

- ✅ CORS for cross-origin frontend (e.g. Vercel)

- ✅ Logout handler

- ✅ Docker-safe setup for both local and production use

## **✅ Folder/File Structure (Minimal for Auth)**

****apps/

auth-service/

src/

main.ts

auth.controller.ts

auth.service.ts

Dockerfile

.env



## **✅ 1. main.ts -- Enable CORS**

****// apps/auth-service/src/main.ts

import { NestFactory } from \'@nestjs/core\';

import { AppModule } from \'./app.module\';

async function bootstrap() {

const app = await NestFactory.create(AppModule);

app.enableCors({

origin: process.env.FRONTEND_URL \|\| \'http://localhost:3000\',

credentials: true, // Required for cross-origin cookie auth

});

await app.listen(3001); // or any internal Docker port

}

bootstrap();



## **✅ 2. auth.controller.ts -- Login and Logout with Cookies**

****// apps/auth-service/src/auth.controller.ts

import {

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

const token = await this.authService.login(loginDto);

res.cookie(\'accessToken\', token, {

httpOnly: true,

secure: true, // Only works over HTTPS

sameSite: \'None\', // Required for cross-site cookie

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

## **✅ 3. auth.service.ts -- Sign and Return JWT**

****// apps/auth-service/src/auth.service.ts

import { Injectable, UnauthorizedException } from \'@nestjs/common\';

import { JwtService } from \'@nestjs/jwt\';

import { LoginDto } from \'./dto/login.dto\';

import \* as bcrypt from \'bcrypt\';

import { HttpService } from \'@nestjs/axios\'; // if calling
user-service over HTTP

import { firstValueFrom } from \'rxjs\';

\@Injectable()

export class AuthService {

constructor(

private readonly jwtService: JwtService,

private readonly httpService: HttpService,

) {}

async login(loginDto: LoginDto): Promise\<string\> {

const { email, password } = loginDto;

// 🔁 Replace this URL with your actual internal user-service address

const userRes = await firstValueFrom(

this.httpService.get(\`http://user-service:3002/users/email/\${email}\`),

);

const user = userRes.data;

const valid = await bcrypt.compare(password, user.password);

if (!valid) throw new UnauthorizedException(\'Invalid credentials\');

const token = this.jwtService.sign({ sub: user.id, email: user.email });

return token;

}

}



## **✅ 4. .env (backend)**

****JWT_SECRET=yourSuperSecretKey

FRONTEND_URL=https://marketeq-projects.vercel.app

NODE_ENV=production



## **✅ 5. Frontend fetch (Vercel)**

****await
fetch(\`\${process.env.NEXT_PUBLIC_AUTH_API_URL}/auth/login\`, {

method: \'POST\',

credentials: \'include\',

headers: { \'Content-Type\': \'application/json\' },

body: JSON.stringify({ email, password }),

});



## **✅ 6. Dockerfile (for Render or local Docker)**

****\# apps/auth-service/Dockerfile

FROM node:18-alpine

WORKDIR /app

COPY . .

RUN npm install

RUN npm run build

EXPOSE 3001

CMD \[\"node\", \"dist/main\"\]



## **✅ Summary**

  ---------------------------------------------------------------
  **✅**      **Setup**
  ----------- ---------------------------------------------------
  🎯 Cookies  Set with secure: true, sameSite: \'None\', domain:
              vercel.app

  🔐 JWT      Signed on backend, returned via cookie

  🌐 CORS     Enabled on main.ts with credentials: true

  🧪          Check Set-Cookie in DevTools → Network → login
  Verified?   request
  ---------------------------------------------------------------
