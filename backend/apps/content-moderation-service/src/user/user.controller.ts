import { Controller, Get } from '@nestjs/common';

@Controller('user')
export class UserController {
  @Get('/profile')
  getProfile() {
    return { name: 'Ali', email: 'ali@example.com user git' };
  }
}
