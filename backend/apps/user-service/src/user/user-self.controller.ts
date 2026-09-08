import {
  BadRequestException,
  Body,
  Controller,
  Get,
  InternalServerErrorException,
  Logger,
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
import { UpdatePhoneDto } from './dtos/update-phone.dto';
import { UpdateCurrencyDto } from './dtos/update-currency.dto';
import { UpdateActiveRoleDto } from './dtos/update-active-role.dto';
import { R2Service } from '../storage/r2.service';
import { normaliseRasterImage } from '../storage/image-upload.util';

const ALLOWED_AVATAR_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);
const MAX_AVATAR_BYTES = 5 * 1024 * 1024;

/**
 * Inspect the first few bytes of an uploaded buffer against the well-known
 * image format signatures and return the detected mime type, or null if the
 * buffer does not match any supported image format. This is the server-side
 * cross-check of the client-supplied mimetype so a request that claims to
 * be `image/png` but actually contains, say, a PHP payload is rejected.
 */
function detectImageMimeType(buffer: Buffer): string | null {
  if (!buffer || buffer.length < 12) return null;

  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'image/jpeg';
  }
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return 'image/png';
  }
  // GIF: "GIF87a" or "GIF89a"
  if (
    buffer[0] === 0x47 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x38 &&
    (buffer[4] === 0x37 || buffer[4] === 0x39) &&
    buffer[5] === 0x61
  ) {
    return 'image/gif';
  }
  // WEBP: "RIFF" ... "WEBP"
  if (
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    return 'image/webp';
  }
  return null;
}

@ApiTags('User')
@Controller('user')
export class UserSelfController {
  private readonly logger = new Logger(UserSelfController.name);

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
  ): Promise<{ url: string | null }> {
    if (!file) {
      throw new BadRequestException('Avatar file is required');
    }
    // Do not trust `file.mimetype` — it is client-controlled. Re-derive the
    // real format from the file's magic bytes and reject anything that does
    // not match one of the allowed image signatures. The declared mimetype
    // is still used for a fast reject before reading bytes.
    if (!ALLOWED_AVATAR_MIME_TYPES.has(file.mimetype)) {
      throw new BadRequestException(
        'Avatar must be a JPEG, PNG, WEBP, or GIF image',
      );
    }
    const detectedMimeType = detectImageMimeType(file.buffer);
    if (!detectedMimeType || !ALLOWED_AVATAR_MIME_TYPES.has(detectedMimeType)) {
      throw new BadRequestException(
        'Avatar file contents do not match a supported image format',
      );
    }
    // From here on, treat the detected type as authoritative — overwrite the
    // multer-reported mimetype so downstream storage uses what the bytes say.
    file.mimetype = detectedMimeType;

    // Re-encode before storing. Phone photographs carry EXIF, and EXIF
    // routinely carries GPS coordinates — an avatar is public-facing, so
    // storing the file as uploaded publishes wherever the photo was taken.
    // Re-encoding drops EXIF, applies the orientation tag first so portrait
    // photos are not left sideways, enforces the minimum dimension, and caps
    // the maximum so a 4000px phone photo is not served as an avatar.
    // Rejections here are caller errors and surface as 400.
    const normalised = await normaliseRasterImage(file.buffer, detectedMimeType);
    file.buffer = normalised.buffer;
    file.size = normalised.buffer.length;

    // Storage is optional in local/dev environments: if R2 is not fully wired
    // up we log a warning and return a null URL so the caller can proceed
    // without blocking onboarding. Production deployments are expected to
    // configure these env vars, in which case the happy path below runs.
    // Checked via R2Service.isConfigured() (not just the bucket name) so a
    // partially-filled .env degrades gracefully instead of 500ing out of
    // getClient() mid-upload.
    if (!this.r2Service.isConfigured()) {
      this.logger.warn(
        'Skipping avatar upload: Cloudflare R2 is not fully configured',
      );
      return { url: null };
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

  @ApiOperation({ summary: 'Update the current user phone number' })
  @Patch('phone')
  async updatePhone(
    @CurrentUser() user: JwtUser,
    @Body() dto: UpdatePhoneDto,
  ) {
    if (!('phone' in dto)) {
      throw new BadRequestException('phone field is required (string or null)');
    }
    const resolved = await this.userService.getUserByClaims(user);
    const updated = await this.userService.updatePhone(resolved.id, dto.phone ?? null);
    return { id: updated.id, phone: updated.phone ?? null };
  }

  // ES-06: talent's explicit region-currency override, surfaced via the
  // Currency Settings entry point shown when earnings-service falls back
  // to USD (no resolvable preference on this profile).
  @ApiOperation({ summary: 'Update preferred display currency' })
  @Patch('active-role')
  async updateActiveRole(
    @CurrentUser() user: JwtUser,
    @Body() dto: UpdateActiveRoleDto,
  ) {
    const resolved = await this.userService.getUserByClaims(user);
    const updated = await this.userService.updateActiveRole(
      resolved.id,
      dto.activeRole,
    );
    return { id: updated.id, activeRole: updated.activeRole ?? null };
  }

  @Patch('currency')
  async updateCurrency(
    @CurrentUser() user: JwtUser,
    @Body() dto: UpdateCurrencyDto,
  ) {
    const resolved = await this.userService.getUserByClaims(user);
    const updated = await this.userService.updateCurrency(resolved.id, dto.currency);
    return { id: updated.id, preferredCurrency: updated.preferredCurrency ?? null };
  }
}
