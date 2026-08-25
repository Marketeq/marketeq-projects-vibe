import { Controller, Post, Get, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { AppealService } from '../services/appeal.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { AdminGuard } from '../guards/admin.guard';
import { AppealStatus } from '../entities/appeal.entity';
import { Request } from 'express';

@Controller('api/appeals')
export class AppealController {
  constructor(private readonly appealService: AppealService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  async submitAppeal(
    @Body() body: { contentId: string; reason: string },
    @Req() req: Request,
  ) {
    const userId = (req.user as any)?.userId ?? (req.user as any)?.sub ?? 'unknown';
    const appeal = await this.appealService.submitAppeal(body.contentId, userId, body.reason);
    return { status: 'success', message: 'Your appeal has been submitted successfully.', appeal };
  }

  @Get('my')
  @UseGuards(JwtAuthGuard)
  async getMyAppeals(@Req() req: Request) {
    const userId = (req.user as any)?.userId ?? (req.user as any)?.sub ?? 'unknown';
    return this.appealService.getAppealsByUser(userId);
  }

  @Get()
  @UseGuards(JwtAuthGuard, AdminGuard)
  async listAppeals(
    @Query('status') status?: AppealStatus,
    @Query('page') page: number = 1,
    @Query('perPage') perPage: number = 20,
  ) {
    return this.appealService.getAppeals(status, +page, +perPage);
  }

  @Post(':id/review')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async reviewAppeal(
    @Param('id') id: string,
    @Body() body: { decision: 'approve' | 'reject' | 'request_edits'; comments?: string },
    @Req() req: Request,
  ) {
    const moderatorId = (req.user as any)?.userId ?? (req.user as any)?.sub ?? 'unknown';
    const appeal = await this.appealService.reviewAppeal(id, body.decision, moderatorId, body.comments);
    return { status: 'success', appeal };
  }
}
