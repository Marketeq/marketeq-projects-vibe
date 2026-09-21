import { Body, Controller, Get, Patch, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../decorators/current-user.decorator';
import { JwtUser } from '../auth/types/jwt-user.type';
import { PrivacyService } from './privacy.service';
import { UpdatePrivacyDto } from './dtos/update-privacy.dto';

@ApiTags('Privacy')
@Controller('privacy')
export class PrivacyController {
  constructor(private readonly privacyService: PrivacyService) {}

  @ApiOperation({ summary: 'Get current user privacy settings' })
  @Get()
  async getPrivacy(@CurrentUser() user: JwtUser) {
    return this.privacyService.getByUserId(user.sub);
  }

  @ApiOperation({ summary: 'Update privacy settings (partial merge)' })
  @Patch()
  async updatePrivacy(
    @CurrentUser() user: JwtUser,
    @Body() dto: UpdatePrivacyDto,
  ) {
    return this.privacyService.update(user.sub, dto);
  }

  @ApiOperation({ summary: 'Reset privacy settings to defaults' })
  @Post('reset')
  async resetPrivacy(@CurrentUser() user: JwtUser) {
    return this.privacyService.reset(user.sub);
  }
}
