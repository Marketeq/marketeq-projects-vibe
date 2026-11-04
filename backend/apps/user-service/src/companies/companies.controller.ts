import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  InternalServerErrorException,
  Param,
  Patch,
  Post,
  Req,
  Query,
  ServiceUnavailableException,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { randomUUID } from 'crypto';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CompaniesService } from './companies.service';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { UpdateCompanyMemberDto } from './dto/update-company-member.dto';
import { SearchCompaniesDto } from './dto/list-companies.dto';
import { CurrentUser } from '../decorators/current-user.decorator';
import { JwtUser } from '../auth/types/jwt-user.type';
import { R2Service } from '../storage/r2.service';
import {
  MAX_LOGO_BYTES,
  LOGO_TOO_LARGE_MESSAGE,
  RASTER_IMAGE_MIME_TYPES,
  SVG_MIME_TYPE,
  detectRasterImageMimeType,
  looksLikeSvg,
  sanitizeSvg,
  normaliseRasterImage,
  MAX_LOGO_DIMENSION,
  MIN_LOGO_DIMENSION,
} from '../storage/image-upload.util';
import {
  AuditService,
  AUDIT_ACTIONS,
  AuditContext,
} from '../audit/audit.service';
import { resolveCallerIp } from '../allowed-ips/caller-ip.util';
import type { Request } from 'express';

/** Extensions used for the stored object key, keyed by verified mime type. */
const LOGO_EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  [SVG_MIME_TYPE]: 'svg',
};

@ApiTags('companies')
@Controller('companies')
export class CompaniesController {
  constructor(
    private readonly companies: CompaniesService,
    private readonly r2: R2Service,
    private readonly audit: AuditService,
  ) {}

  /** Same shape allowed-ips uses, so every audit row reads alike. */
  private auditContext(user: JwtUser, req: Request): AuditContext {
    const ua = req.headers['user-agent'];
    return {
      actorUserId: user.sub,
      ipAddress: resolveCallerIp(req),
      userAgent: Array.isArray(ua) ? ua[0] : (ua ?? null),
    };
  }

  @ApiOperation({ summary: 'Create a company; caller becomes owner + admin' })
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @CurrentUser() user: JwtUser,
    @Body() dto: CreateCompanyDto,
    @Req() req: Request,
  ) {
    const company = await this.companies.create(dto, user.sub);
    // Recorded after the write, never before: an audit row for something that
    // did not happen is worse than no row. record() swallows its own errors,
    // so auditing can never fail the request it is describing.
    await this.audit.record(
      AUDIT_ACTIONS.COMPANY_CREATED,
      user.sub,
      this.auditContext(user, req),
      { companyId: company?.id, name: dto?.name },
    );
    return { success: true, data: company, message: 'Company created successfully' };
  }

  @ApiOperation({ summary: 'List companies the caller belongs to' })
  @Get()
  @HttpCode(HttpStatus.OK)
  async findMine(@CurrentUser() user: JwtUser) {
    const data = await this.companies.findAllForUser(user.sub);
    return { success: true, data, message: 'Companies retrieved successfully' };
  }

  @ApiOperation({ summary: "Search the caller's own companies by name" })
  @Get('search')
  @HttpCode(HttpStatus.OK)
  async search(@CurrentUser() user: JwtUser, @Query() dto: SearchCompaniesDto) {
    // Scoped to the caller: see CompaniesService.search for why (R3-06).
    const data = await this.companies.search(dto.q, user.sub);
    return { success: true, data, message: 'Companies retrieved successfully' };
  }

  /**
   * Upload a company logo and return its public URL.
   *
   * Deliberately not scoped to a company id: the register step collects the
   * logo before the company exists, so there is nothing to attach it to yet.
   * The caller passes the returned URL to POST /companies (or PATCH
   * /companies/:id) exactly as if they had typed it.
   *
   * This exists instead of reusing POST /user/me/avatar, which the company
   * pickers previously called. That endpoint's last step sets the caller's
   * own `avatar_url`, so picking a company logo overwrote the uploader's
   * profile photo.
   */
  @ApiOperation({ summary: 'Upload a company logo; returns its public URL' })
  @Post('logo')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      // One byte past the ceiling: multer still bounds what is buffered,
      // but anything just over arrives here so the rejection can carry the
      // design's wording rather than multer's generic "File too large".
      limits: { fileSize: MAX_LOGO_BYTES + 1 },
    }),
  )
  async uploadLogo(
    @CurrentUser() user: JwtUser,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (!file?.buffer?.length) {
      throw new BadRequestException('Logo file is required');
    }

    // R3-04: the limit and the message both come from the design.
    if (file.buffer.length > MAX_LOGO_BYTES) {
      throw new BadRequestException(LOGO_TOO_LARGE_MESSAGE);
    }

    // `file.mimetype` is client-supplied, so it only ever gates which
    // verification path runs. The bytes themselves decide the stored type.
    let body = file.buffer;
    let mimeType: string;

    if (looksLikeSvg(file.buffer)) {
      const cleaned = sanitizeSvg(file.buffer);
      if (!cleaned) {
        throw new BadRequestException(
          'That SVG contained no drawable content once scripts were removed',
        );
      }
      body = cleaned;
      mimeType = SVG_MIME_TYPE;
    } else {
      const detected = detectRasterImageMimeType(file.buffer);
      if (!detected || !RASTER_IMAGE_MIME_TYPES.has(detected)) {
        throw new BadRequestException(
          'Logo must be an SVG, PNG, JPEG, WEBP, or GIF image',
        );
      }
      mimeType = detected;

      // Re-encode before storing, exactly as the avatar path does. A logo is
      // uploaded from the same phones and cameras as any other image, and
      // EXIF routinely carries GPS — a company logo is public-facing, so
      // storing the bytes as uploaded publishes wherever the file was made.
      // This path was the last one still doing that.
      //
      // No minimum dimension: unlike a square avatar, a logo is often a wide
      // wordmark, so a floor here would reject uploads that work today.
      const normalised = await normaliseRasterImage(
        body,
        mimeType,
        MAX_LOGO_DIMENSION,
        MIN_LOGO_DIMENSION,
      );
      body = normalised.buffer;
    }

    // A missing bucket is a deployment gap, not a user error. The company
    // pickers used to swallow a null URL here and save the company with no
    // logo at all, so this reports loudly enough for the UI to surface it.
    if (!this.r2.isConfigured()) {
      throw new ServiceUnavailableException(
        'Logo storage is not configured. Set the Cloudflare R2 environment variables.',
      );
    }

    const key = `company-logos/${user.sub}/${randomUUID()}.${LOGO_EXTENSIONS[mimeType]}`;
    const { url } = await this.r2.uploadPublicBuffer(key, body, mimeType);
    // R2Service.getPublicUrl falls back to the bare object key when no public
    // base URL is set, so a truthiness check is not enough. A relative key
    // would sail through here and then fail CreateCompanyDto's @IsUrl(), or
    // worse, be stored as a logo that resolves nowhere.
    if (!url || !/^https?:\/\//i.test(url)) {
      throw new InternalServerErrorException(
        'Logo was uploaded but no public URL is configured',
      );
    }

    return { success: true, data: { url }, message: 'Logo uploaded successfully' };
  }

  @ApiOperation({ summary: 'Get a single company' })
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async findOne(@CurrentUser() user: JwtUser, @Param('id') id: string) {
    await this.companies.assertIsMember(id, user.sub);
    const data = await this.companies.findOne(id);
    return { success: true, data, message: 'Company retrieved successfully' };
  }

  @ApiOperation({ summary: 'Update company name / logo (admin only)' })
  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  async update(
    @CurrentUser() user: JwtUser,
    @Param('id') id: string,
    @Body() dto: UpdateCompanyDto,
    @Req() req: Request,
  ) {
    await this.companies.assertIsAdmin(id, user.sub);
    const data = await this.companies.update(id, dto);
    // Field names only, never the values — the trail says what was touched,
    // it is not a second copy of the record.
    await this.audit.record(
      AUDIT_ACTIONS.COMPANY_UPDATED,
      user.sub,
      this.auditContext(user, req),
      { companyId: id, fields: Object.keys(dto ?? {}) },
    );
    return { success: true, data, message: 'Company updated successfully' };
  }

  @ApiOperation({ summary: 'Get active company members (doc endpoint #6)' })
  @Get(':id/members')
  @HttpCode(HttpStatus.OK)
  async getMembers(@CurrentUser() user: JwtUser, @Param('id') id: string) {
    await this.companies.assertIsMember(id, user.sub);
    const members = await this.companies.getMembers(id);
    return {
      company_id: id,
      members,
    };
  }

  @ApiOperation({ summary: "Update a member's role/permissions (admin only)" })
  @Patch(':id/members/:userId')
  @HttpCode(HttpStatus.OK)
  async updateMember(
    @CurrentUser() user: JwtUser,
    @Param('id') id: string,
    @Param('userId') userId: string,
    @Body() dto: UpdateCompanyMemberDto,
  ) {
    await this.companies.assertIsAdmin(id, user.sub);
    const data = await this.companies.updateMember(id, userId, dto);
    return { success: true, data, message: 'Company member updated successfully' };
  }

  @ApiOperation({ summary: 'Remove a member (admin only)' })
  @Delete(':id/members/:userId')
  @HttpCode(HttpStatus.OK)
  async removeMember(
    @CurrentUser() user: JwtUser,
    @Param('id') id: string,
    @Param('userId') userId: string,
  ) {
    await this.companies.assertIsAdmin(id, user.sub);
    const result = await this.companies.removeMember(id, userId);
    return { success: true, message: result.message };
  }
}
