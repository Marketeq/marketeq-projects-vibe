**auth.service.ts**\
\
Here's how your auth.service.ts should look, specifically the login()
method. I'll assume you\'re returning a JWT after validating the user.

## **✅ Updated login() in auth.service.ts**

This version:

- Validates user credentials

- Signs a JWT

- Returns { accessToken } (used to set cookie in the controller)

import { Injectable, UnauthorizedException } from \'@nestjs/common\';

import { JwtService } from \'@nestjs/jwt\';

import { LoginDto } from \'./dto/login.dto\';

import { UsersService } from \'../users/users.service\'; // adjust path
as needed

import \* as bcrypt from \'bcrypt\';

\@Injectable()

export class AuthService {

constructor(

private readonly usersService: UsersService,

private readonly jwtService: JwtService,

) {}

async login(loginDto: LoginDto): Promise\<{ accessToken: string }\> {

const user = await this.usersService.findByEmail(loginDto.email);

if (!user) {

throw new UnauthorizedException(\'Invalid credentials\');

}

const isPasswordValid = await bcrypt.compare(

loginDto.password,

user.password,

);

if (!isPasswordValid) {

throw new UnauthorizedException(\'Invalid credentials\');

}

const payload = { sub: user.id, email: user.email };

const accessToken = this.jwtService.sign(payload, {

expiresIn: \'1h\',

});

return { accessToken };

}

}



## **✅ Notes**

- This assumes your UsersService has a method findByEmail(email: string)
  that returns the user object.

- Your JwtModule in auth.module.ts should be configured like this:

JwtModule.register({

secret: process.env.JWT_SECRET,

signOptions: { expiresIn: \'1h\' },

}),



## **✅ Combined With Controller**

Your controller now uses this:

const loginResponse = await this.authService.login(loginDto);

res.cookie(\'accessToken\', loginResponse.accessToken, {

httpOnly: true,

secure: true,

sameSite: \'None\',

domain: process.env.NODE_ENV === \'production\' ?
\'marketeq-projects.vercel.app\' : undefined,

path: \'/\',

});


