import { Controller, ForbiddenException, Get, Query, Req, UseGuards } from '@nestjs/common';
import { TimelineService } from './timeline.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { TimelineQueryDto } from '../dtos/timeline-query.dto';

@UseGuards(JwtAuthGuard)
@Controller('timeline')
export class TimelineController {
  constructor(private readonly svc: TimelineService) {}

  @Get()
  async get(@Req() req: any, @Query() query: TimelineQueryDto) {
    const callerId: string = req.user.sub;
    const callerRole: string = req.user.role ?? 'user';

    let userId = query.userId;
    if (!userId) {
      userId = callerId;
    } else if (userId !== callerId && callerRole !== 'admin') {
      throw new ForbiddenException('You can only view your own timeline');
    }

    return this.svc.buildTimeline({ userId, projectId: query.projectId, from: query.from, to: query.to });
  }
}
