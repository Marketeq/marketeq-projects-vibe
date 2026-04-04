import { Controller, Get } from '@nestjs/common';
import { CurrentUser } from '../decorators/current-user.decorator';
import { ApiOperation } from '@nestjs/swagger';

@Controller('auth')
export class AuthController {
  @ApiOperation({ summary: 'Get current user' })
  @Get('me')
  getProfile(@CurrentUser() user: any) {
    return user;
  }
}
