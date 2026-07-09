import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ModerationLogService } from './moderation-log.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { AdminGuard } from './guards/admin.guard';

@Controller('api/moderate')
@UseGuards(JwtAuthGuard, AdminGuard)
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
