import { Controller, Post, Param, Body, Headers, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JobsService } from './job.service';

@Controller('internal/jobs')
export class JobsInternalController {
  constructor(
    private readonly jobs: JobsService,
    private readonly config: ConfigService,
  ) {}

  private validateToken(token: string | undefined): void {
    const expected = this.config.get<string>('INTERNAL_SERVICE_TOKEN');
    if (!expected || token !== expected) throw new ForbiddenException('Invalid internal token');
  }

  @Post(':id/cms-sync')
  async syncFromCms(
    @Headers('x-internal-token') token: string | undefined,
    @Param('id') id: string,
    @Body() dto: any,
  ) {
    this.validateToken(token);
    const patch: Record<string, any> = {};
    if (dto.title !== undefined) patch.title = dto.title;
    if (dto.slug !== undefined) patch.slug = dto.slug;
    if (dto.status !== undefined) patch.status = dto.status;
    if (typeof dto.featured === 'boolean') patch.featured = dto.featured;
    if (dto.editorialLabel !== undefined) patch.editorialLabel = dto.editorialLabel;
    if (dto.jobType !== undefined) patch.jobType = dto.jobType;
    if (dto.location !== undefined) patch.location = dto.location;
    return this.jobs.update(id, patch);
  }
}
