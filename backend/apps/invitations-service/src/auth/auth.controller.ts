import { Controller, Get } from '@nestjs/common';
import { CurrentUser } from '../decorators/current-user.decorator';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('Auth')
@ApiBearerAuth('access_token')
@Controller('auth')
export class AuthController {
  @ApiOperation({ summary: 'Get current user' })
  @Get('me')
  getProfile(@CurrentUser() user: any) {
    return user;
  }
}
