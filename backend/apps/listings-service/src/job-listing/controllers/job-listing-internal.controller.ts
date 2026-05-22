import { Controller, Post, Param, Body, Headers, ForbiddenException, HttpCode, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JobListingCmsSyncService } from '../services/job-listing-cms-sync.service';

@Controller('internal/job-listings')
export class JobListingInternalController {
  constructor(
    private readonly cmsSyncService: JobListingCmsSyncService,
    private readonly config: ConfigService,
  ) {}

  private validateToken(token: string | undefined): void {
    const expected = this.config.get<string>('INTERNAL_SERVICE_TOKEN');
    if (!expected || token !== expected) throw new ForbiddenException('Invalid internal token');
  }

  @Post(':id/cms-sync')
  @HttpCode(HttpStatus.OK)
  async syncFromCms(
    @Headers('x-internal-token') token: string | undefined,
    @Param('id') id: string,
    @Body() body: Record<string, any>,
  ) {
    this.validateToken(token);
    await this.cmsSyncService.syncFromCms(id, body);
    return { ok: true };
  }
}
