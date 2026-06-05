import { Controller, Post, Body, HttpCode, Headers, ForbiddenException } from '@nestjs/common';
import { InternalSyncService } from './internal-sync.service';
import { SyncScreenshotDto } from './dto/sync-screenshot.dto';


@Controller('internal')
export class InternalSyncController {
  constructor(private readonly syncService: InternalSyncService) {}

  @Post('sync-screenshot')
  @HttpCode(200)
  async syncScreenshot(
    @Headers('x-internal-token') token: string,
    @Body() body: SyncScreenshotDto,
  ) {
    const expected = process.env.INTERNAL_SERVICE_TOKEN;
    if (!expected) throw new ForbiddenException('INTERNAL_SERVICE_TOKEN not configured');
    if (token !== expected) throw new ForbiddenException('Invalid internal token');
    return this.syncService.syncFromTTS(body);
  }
}