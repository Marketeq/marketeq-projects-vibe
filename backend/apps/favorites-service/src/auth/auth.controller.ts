import { Controller, Get } from '@nestjs/common';
import { ApiOperation } from '@nestjs/swagger';
import { User as CurrentUser } from '../decorators/user.decorator';

@Controller('auth')
export class AuthController {
  @ApiOperation({ summary: 'Get current user' })
  @Get('me')
  getProfile(@CurrentUser() user: any) {
    return user;
  }
}
