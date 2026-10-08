import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpException,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { R2Service } from '../storage/r2.service';
import { ScreenshotsService } from './screenshots.service';
import { EventsService } from '../services/events.service';
import { TalentNotificationsService } from '../notifications/talent-notifications.service';
import { BearerGuard } from '../common/guards/bearer.guard';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { ConfirmScreenshotDto } from './dto/confirm.dto';
import { ReadPresignDto } from './dto/read.dto';
import { CreateFlagDto } from './dto/create-flag.dto';
import { ReviewScreenshotDto } from './dto/review-screenshot.dto';
import { ScreenshotQueryDto } from '../dtos/screenshot-query.dto';
import { actorOf } from '../contracts/contract-access.service';
import {
  BatchUpdateScreenshotDto,
  DeleteScreenshotDto,
  BlurScreenshotDto,
  UpdateScreenshotMetaDto,
} from '../dtos/update-screenshot.dto';

import { IsIn, IsISO8601, IsNotEmpty, IsOptional, IsString } from 'class-validator';

class PresignBodyDto {
  @IsNotEmpty()
  @IsString()
  userId!: string;

  @IsOptional()
  @IsIn(['jpg', 'jpeg', 'png', 'webp'])
  ext?: 'jpg' | 'jpeg' | 'png' | 'webp';

  @IsOptional()
  @IsString()
  mimeType?: string;

  @IsOptional()
  @IsISO8601()
  tsIso?: string;
}

function keyFor(userId: string, ext = 'jpg', tsIso?: string) {
  const ts = tsIso ? new Date(tsIso) : new Date();
  if (Number.isNaN(ts.getTime())) throw new Error('Invalid tsIso');
  const yyyy = ts.getUTCFullYear();
  const mm = String(ts.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(ts.getUTCDate()).padStart(2, '0');
  const hh = String(ts.getUTCHours()).padStart(2, '0');
  const mi = String(ts.getUTCMinutes()).padStart(2, '0');
  const ss = String(ts.getUTCSeconds()).padStart(2, '0');
  const safeUser = String(userId).replace(/[^a-zA-Z0-9_-]/g, '');
  const safeIso = `${yyyy}-${mm}-${dd}T${hh}-${mi}-${ss}Z`;
  return `screens/${yyyy}/${mm}/${dd}/${safeUser}/${safeIso}-${randomUUID()}.${ext}`;
}

@Controller('screenshots')
@UseGuards(BearerGuard)
export class ScreenshotsController {
  constructor(
    private readonly r2: R2Service,
    private readonly svc: ScreenshotsService,
    private readonly events: EventsService,
    private readonly talentNotifications: TalentNotificationsService,
  ) {}

  // ── Machine-to-machine endpoints (BearerGuard) ─────────────────────

  @Post('presign')
  async presign(@Body() body: PresignBodyDto) {
    try {
      const ext = (body.ext ?? 'jpg').toLowerCase() as PresignBodyDto['ext'];
      const mime =
        body.mimeType ?? (ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg');
      const key = keyFor(body.userId, ext, body.tsIso);
      const { url, expiresIn, publicUrl } = await this.r2.presignPut(key, mime);
      return { url, key, expiresIn, mimeType: mime, publicUrl };
    } catch (e: any) {
      const message = e?.response?.message ?? e?.message ?? 'presign failed';
      throw new HttpException({ message }, HttpStatus.BAD_REQUEST);
    }
  }

  @Post('presign-read')
  async presignRead(@Body() body: ReadPresignDto) {
    if (!body?.key) throw new HttpException({ message: 'key required' }, 400);
    return this.r2.presignGet(body.key);
  }

  @Post('confirm')
  async confirm(@Body() dto: ConfirmScreenshotDto) {
    if (!dto?.userId || !dto?.key || !dto?.mimeType || dto?.bytes == null) {
      throw new HttpException({ message: 'userId, key, mimeType, bytes are required' }, 400);
    }
    return this.svc.confirm(dto);
  }

  @Get('env-check')
  envCheck() {
    return (this.r2 as any).missingEnv?.() ?? { note: 'update R2Service to latest' };
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async deleteScreenshot(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: any,
    @Body() dto: DeleteScreenshotDto = {},
  ) {
    const result = await this.svc.deleteScreenshot(id, actorOf(req), dto);
    // A delete awaiting the client's approval hasn't happened yet.
    if (result.isDeleted) this.events.screenshotDeleted(id, req.user.sub, dto.reason ?? null);
    return result;
  }

  /** The contract's client (or a platform admin) approves or rejects a pending delete. */
  @Put(':id/delete-request')
  @UseGuards(JwtAuthGuard)
  async reviewDeleteRequest(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: any,
    @Body() dto: ReviewScreenshotDto,
  ) {
    const { isDeleted, screenshot } = await this.svc.reviewDeleteRequest(id, actorOf(req), dto);
    if (isDeleted) this.events.screenshotDeleted(id, req.user.sub, screenshot.deletionReason ?? null);
    const comment = dto.comment?.trim();
    if (comment && screenshot.userId !== req.user.sub) {
      void this.talentNotifications.screenshotCommented(screenshot.userId, comment);
    }
    return { id, isDeleted };
  }

  // ── JWT-protected user/admin endpoints ────────────────────────────

  /**
   * GET /api/screenshots — full list with all filters + sort
   * Replaces the basic BearerGuard listByUser for authenticated users
   */
  @Get()
  @UseGuards(JwtAuthGuard)
  async listScreenshots(@Req() req: any, @Query() query: ScreenshotQueryDto) {
    return this.svc.listScreenshots(query, actorOf(req));
  }

  /** ?view=client returns screenshots on contracts where the caller is the client. */
  @Get('cards')
  @UseGuards(JwtAuthGuard)
  async getCards(@Req() req: any, @Query() query: ScreenshotQueryDto) {
    return this.svc.findCards(actorOf(req), query);
  }

  /** Apps and visited URLs for the Filter → Apps / URLs lists. */
  @Get('facets')
  @UseGuards(JwtAuthGuard)
  async getFacets(@Req() req: any, @Query() query: ScreenshotQueryDto) {
    return this.svc.findFacets(actorOf(req), query.view);
  }

  @Get('admin/all')
  @UseGuards(JwtAuthGuard, RolesGuard('admin'))
  async adminListAll(@Query() query: ScreenshotQueryDto) {
    return this.svc.findCards(null, query);
  }

  /** Flagged screenshots and pending blurs: platform admins see all, clients see their contracts'. */
  @Get('flagged')
  @UseGuards(JwtAuthGuard)
  async getFlagged(@Req() req: any, @Query() query: ScreenshotQueryDto) {
    const actor = actorOf(req);
    return this.svc.getFlaggedScreenshots(
      actor.role === 'admin' ? null : actor,
      query.page ?? 1,
      query.pageSize ?? 50,
    );
  }

  @Get('group/:groupKey')
  @UseGuards(JwtAuthGuard)
  async getGroup(@Param('groupKey') groupKey: string, @Req() req: any) {
    return this.svc.findGrouped(groupKey, actorOf(req));
  }

  @Get(':id/url')
  @UseGuards(JwtAuthGuard)
  async getSignedUrl(@Param('id', ParseUUIDPipe) id: string, @Req() req: any) {
    return this.svc.getSignedUrl(id, actorOf(req));
  }

  @Get(':id/detail')
  @UseGuards(JwtAuthGuard)
  async getDetail(@Param('id', ParseUUIDPipe) id: string, @Req() req: any) {
    return this.svc.findDetail(id, actorOf(req));
  }

  @Post(':id/flag')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async flagScreenshot(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: any,
    @Body() dto: CreateFlagDto,
  ) {
    const screenshot = await this.svc.flagScreenshot(id, actorOf(req), dto);
    this.events.screenshotFlagged(id, screenshot.userId, req.user.sub, dto.reason ?? null);
    return screenshot;
  }

  /** The contract's client (or a platform admin) approves or rejects. */
  @Put(':id/review')
  @UseGuards(JwtAuthGuard)
  async reviewScreenshot(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: any,
    @Body() dto: ReviewScreenshotDto,
  ) {
    const screenshot = await this.svc.reviewScreenshot(id, actorOf(req), dto);
    this.events.screenshotReviewed(id, req.user.sub, dto.status, dto.comment ?? null);
    const comment = dto.comment?.trim();
    if (comment && screenshot.userId !== req.user.sub) {
      void this.talentNotifications.screenshotCommented(screenshot.userId, comment);
    }
    return screenshot;
  }

  @Patch(':id/blur')
  @UseGuards(JwtAuthGuard)
  async blur(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: any,
    @Body() dto: BlurScreenshotDto = {},
  ) {
    const screenshot = await this.svc.blur(id, actorOf(req), dto.reason);
    this.events.screenshotBlurred(id, req.user.sub, screenshot.blurredAt ?? new Date());
    return screenshot;
  }

  /** The contract's client asks the talent to unblur a screenshot. */
  @Post(':id/request-access')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async requestAccess(@Param('id', ParseUUIDPipe) id: string, @Req() req: any) {
    const { screenshot, firstRequest } = await this.svc.requestAccess(id, actorOf(req));
    if (firstRequest) void this.talentNotifications.screenshotAccessRequested(screenshot.userId);
    return screenshot;
  }

  @Patch(':id/unblur')
  @UseGuards(JwtAuthGuard)
  async unblur(@Param('id', ParseUUIDPipe) id: string, @Req() req: any) {
    return this.svc.unblur(id, actorOf(req));
  }

  @Patch('batch/meta')
  @UseGuards(JwtAuthGuard)
  async batchUpdateMeta(@Req() req: any, @Body() dto: BatchUpdateScreenshotDto) {
    const result = await this.svc.batchUpdateMeta(actorOf(req), dto);
    for (const [userId, count] of Object.entries(result.movedOthers)) {
      void this.talentNotifications.screenshotsReassigned(userId, count);
    }
    return { updated: result.updated };
  }

  @Patch(':id/meta')
  @UseGuards(JwtAuthGuard)
  async updateMeta(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: any,
    @Body() dto: UpdateScreenshotMetaDto,
  ) {
    const before = await this.svc.ownerAndPlacement(id);
    const updated = await this.svc.updateMeta(id, actorOf(req), dto);
    const moved =
      before &&
      (before.contractId !== updated.contractId || before.taskId !== updated.taskId);
    if (moved && updated.userId !== req.user.sub) {
      void this.talentNotifications.screenshotsReassigned(updated.userId, 1);
    }
    return updated;
  }
}
