import { Controller, Get, Query } from '@nestjs/common';
import { TimelineService } from './timeline.service';

@Controller('timeline')
export class TimelineController {
  constructor(private readonly svc: TimelineService) {}

  @Get()
  async get(
    @Query('userId') userId: string,
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('projectId') projectId?: string,
  ) {
    return this.svc.buildTimeline({ userId, projectId, from, to });
  }
}
