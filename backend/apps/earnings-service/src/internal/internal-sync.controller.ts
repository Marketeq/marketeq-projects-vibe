import { Controller, Post, Body, HttpCode, Headers, ForbiddenException } from '@nestjs/common';
import { InternalSyncService } from './internal-sync.service';


@Controller('internal')
export class InternalSyncController {
  constructor(private readonly syncService: InternalSyncService) {}

  @Post('sync-screenshot')
  @HttpCode(200)
  async syncScreenshot(
    @Headers('x-internal-token') token: string,
    @Body() body: {
      userId: string;
      contractId: string;
      taskId: string | null;
      taskName: string | null;
      day: string;
      screenshotCount: number;
      firstAt: string;
      lastAt: string;
      avgKbd: number;
      avgMouse: number;
    },
  ) {
    const expected = process.env.INTERNAL_SERVICE_TOKEN ?? 'marketeq-internal-dev';
    if (token !== expected) throw new ForbiddenException('Invalid internal token');
    return this.syncService.syncFromTTS(body);
  }
}