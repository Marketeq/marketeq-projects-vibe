import { Controller, Get, Query } from '@nestjs/common';
import { ModerationLogService } from './moderation-log.service';

@Controller('api/moderate')
export class ModerationController {
  constructor(private readonly moderationLogService: ModerationLogService) {}

  @Get('logs')
  async getLogs(
    @Query('status') status: string,
    @Query('content_type') contentType: string,
    @Query('page') page: number = 1,
    @Query('per_page') perPage: number = 10,
  ) {
    return await this.moderationLogService.getLogs(
      status,
      contentType,
      page,
      perPage,
    );
  }
}
