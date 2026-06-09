import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { BearerGuard } from '../common/guards/bearer.guard';
import { ActivityService } from './activity.service';
import { UpsertActivityDto } from './dto/upsert-activity.dto';

@Controller()
@UseGuards(BearerGuard)
export class ActivityController {
  constructor(private readonly svc: ActivityService) {}
 
  @Post('sessions/:sessionId/activity')
  async upsert(@Param('sessionId') sessionId: string, @Body() dto: UpsertActivityDto) {
    return this.svc.upsert(sessionId, dto);
  }
 
  @Get('sessions/:sessionId/activity')
  async list(@Param('sessionId') sessionId: string) {
    return this.svc.findBySession(sessionId);
  }
}