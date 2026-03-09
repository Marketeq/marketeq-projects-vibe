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
  Query,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { R2Service } from '../storage/r2.service';
import { ScreenshotsService } from './screenshots.service';
import { EventsService } from '../services/events.service';
import { BearerGuard } from '../common/guards/bearer.guard';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { ConfirmScreenshotDto } from './dto/confirm.dto';
import { ReadPresignDto } from './dto/read.dto';
import { ScreenshotQueryDto } from '../dtos/screenshot-query.dto';
import {
  BatchUpdateScreenshotDto,
  DeleteScreenshotDto,
  UpdateScreenshotMetaDto,
} from '../dtos/update-screenshot.dto';

type PresignBody = {
  userId: string;
  ext?: 'jpg' | 'jpeg' | 'png' | 'webp';
  mimeType?: string;
  tsIso?: string;
};

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

@Controller(['screenshots', 'api/screenshots'])
@UseGuards(BearerGuard)
export class ScreenshotsController {
  constructor(
    private readonly r2: R2Service,
    private readonly svc: ScreenshotsService,
    private readonly events: EventsService,
  ) {}

  // ── Original endpoints ─────────────────────────────────────────────

  @Post('presign')
  async presign(@Body() body: PresignBody) {
    try {
      if (!body?.userId) throw new HttpException({ message: 'userId is required' }, 400);
      const ext = (body.ext ?? 'jpg').toLowerCase() as PresignBody['ext'];
      const mime =
        body.mimeType ?? (ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg');
      const key = keyFor(body.userId, ext, body.tsIso);
      const { url, expiresIn } = await this.r2.presignPut(key, mime);
      return { url, key, expiresIn, mimeType: mime };
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
    if (!dto?.userId || !dto?.key || !dto?.mimeType || !dto?.bytes) {
      throw new HttpException({ message: 'userId, key, mimeType, bytes are required' }, 400);
    }
    return this.svc.confirm(dto);
  }

  @Get()
  async list(
    @Query('userId') userId: string,
    @Query('page') page = '1',
    @Query('limit') limit = '50',
  ) {
    if (!userId) throw new HttpException({ message: 'userId required' }, 400);
    return this.svc.listByUser(userId, Number(page), Number(limit));
  }

  @Get('env-check')
  envCheck() {
    return (this.r2 as any).missingEnv?.() ?? { note: 'update R2Service to latest' };
  }

  @Delete(':id')
  async deleteScreenshot(
    @Param('id') id: string,
    @Req() req: any,
    @Query('userId') userIdFromQuery?: string,
    @Query('scopeId') scopeId?: string,
    @Body() dto: DeleteScreenshotDto = {},
  ) {
    const userId = req?.user?.sub ?? req?.user?.id ?? req?.headers?.['x-user-id'] ?? userIdFromQuery;
    if (!userId) throw new UnauthorizedException('Missing user identity');
    const role = req?.user?.role ?? 'user';
    const result = await this.svc.deleteScreenshot(id, String(userId), role, dto, scopeId);
    this.events.screenshotDeleted(id, String(userId), dto.reason ?? null);
    return result;
  }

  // ── Extended endpoints (JWT-protected) ────────────────────────────

  @Get('cards')
  @UseGuards(JwtAuthGuard)
  async getCards(@Req() req: any, @Query() query: ScreenshotQueryDto) {
    return this.svc.findCards(req.user.sub, query);
  }

  @Get('admin/all')
  @UseGuards(JwtAuthGuard, RolesGuard('admin'))
  async adminListAll(@Query() query: ScreenshotQueryDto) {
    return this.svc.findCards(null, query);
  }

  @Get('group/:groupKey')
  @UseGuards(JwtAuthGuard)
  async getGroup(@Param('groupKey') groupKey: string, @Req() req: any) {
    return this.svc.findGrouped(groupKey, req.user.sub, req.user.role);
  }

  @Get(':id/detail')
  @UseGuards(JwtAuthGuard)
  async getDetail(@Param('id', ParseUUIDPipe) id: string, @Req() req: any) {
    return this.svc.findDetail(id, req.user.sub, req.user.role);
  }

  @Patch(':id/meta')
  @UseGuards(JwtAuthGuard)
  async updateMeta(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: any,
    @Body() dto: UpdateScreenshotMetaDto,
    @Query('scopeId') scopeId?: string,
  ) {
    return this.svc.updateMeta(id, req.user.sub, req.user.role, dto, scopeId);
  }

  @Patch('batch/meta')
  @UseGuards(JwtAuthGuard)
  async batchUpdateMeta(
    @Req() req: any,
    @Body() dto: BatchUpdateScreenshotDto,
    @Query('scopeId') scopeId?: string,
  ) {
    return this.svc.batchUpdateMeta(req.user.sub, req.user.role, dto, scopeId);
  }

  @Patch(':id/blur')
  @UseGuards(JwtAuthGuard)
  async blur(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: any,
    @Query('scopeId') scopeId?: string,
  ) {
    return this.svc.blur(id, req.user.sub, req.user.role, scopeId);
  }
}
