import {
  BadRequestException,
  Body,
  Controller,
  Get,
  InternalServerErrorException,
  Patch,
  Post,
  Req,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { CurrentUser } from '../decorators/current-user.decorator';
import { UserService } from './user.service';
import { JwtUser } from '../auth/types/jwt-user.type';
import { OnboardingDismissedDto } from './dtos/onboarding-dismissed.dto';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { RefreshTimezoneDto } from './dtos/refresh-timezone.dto';
import { R2Service } from '../storage/r2.service';

const ALLOWED_AVATAR_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);
const MAX_AVATAR_BYTES = 5 * 1024 * 1024;

@ApiTags('User')
@Controller('user')
export class UserSelfController {
  constructor(
    private readonly userService: UserService,
    private readonly r2Service: R2Service,
  ) {}

  @ApiOperation({ summary: 'Get current user' })
  @Get('me')
  getMe(@CurrentUser() user: JwtUser) {
    return this.userService.getUserByClaims(user);
  }

  @ApiOperation({ summary: 'Dismiss onboarding after first login' })
  @Patch('onboarding-dismissed')
  dismissOnboarding(
    @CurrentUser() user: JwtUser,
    @Body() dto: OnboardingDismissedDto,
  ) {
    return this.userService
      .getUserByClaims(user)
      .then((resolved) => this.userService.dismissOnboarding(resolved.id, dto.role));
  }

  @ApiOperation({ summary: 'Refresh user timezone from client timezone or request IP' })
  @Patch('refresh-timezone')
  refreshTimezone(
    @CurrentUser() user: JwtUser,
    @Req() req: Request,
    @Body() dto: RefreshTimezoneDto,
  ) {
    return this.userService.refreshTimezone(user, req, dto.clientTimeZone);
  }

  @ApiOperation({ summary: 'Upload current user avatar to object storage' })
  @Post('me/avatar')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: MAX_AVATAR_BYTES },
    }),
  )
  async uploadAvatar(
    @CurrentUser() user: JwtUser,
    @UploadedFile() file?: Express.Multer.File,
  ): Promise<{ url: string }> {
    if (!file) {
      throw new BadRequestException('Avatar file is required');
    }
    if (!ALLOWED_AVATAR_MIME_TYPES.has(file.mimetype)) {
      throw new BadRequestException(
        'Avatar must be a JPEG, PNG, WEBP, or GIF image',
      );
    }

    const resolved = await this.userService.getUserByClaims(user);
    const { url } = await this.r2Service.uploadAvatar(resolved.id, file);
    if (!url) {
      throw new InternalServerErrorException(
        'Avatar was uploaded but no public URL is configured',
      );
    }

    await this.userService.updateAvatarUrl(resolved.id, url);
    return { url };
  }
}
