import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { actorOf } from '../contracts/contract-access.service';
import { ManualTimeService } from '../services/manual-time.service';
import { EventsService } from '../services/events.service';
import { EarningsSyncService } from '../services/earnings-sync.service';
import { TalentNotificationsService } from '../notifications/talent-notifications.service';
import { CreateManualTimeDto, ReviewManualTimeDto } from '../dtos/create-manual-time.dto';

@Controller('manual-time')
@UseGuards(JwtAuthGuard)
export class ManualTimeController {
  constructor(
    private readonly manualTimeService: ManualTimeService,
    private readonly eventsService: EventsService,
    private readonly earningsSyncService: EarningsSyncService,
    private readonly talentNotifications: TalentNotificationsService,
  ) {}

  @Post()
  async create(@Req() req: any, @Body() dto: CreateManualTimeDto) {
    const entry = await this.manualTimeService.create(req.user.sub, dto);
    const hours = (entry.endTime.getTime() - entry.startTime.getTime()) / (1000 * 60 * 60);
    this.eventsService.manualTimeSubmitted(entry.id, entry.userId, Math.round(hours * 100) / 100);
    return entry;
  }

  /**
   * The caller's own entries, or with ?view=client the entries logged on
   * contracts where the caller is the client (the client's timeline).
   */
  @Get()
  async findAll(@Req() req: any, @Query('view') view?: string) {
    if (view === 'client') return this.manualTimeService.findForClient(req.user.sub);
    return this.manualTimeService.findByUser(req.user.sub);
  }

  @Delete(':id')
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: any,
  ) {
    await this.manualTimeService.delete(id, req.user.sub, req.user.role);
    return { deleted: true };
  }

  /** Pending entries on contracts where the caller is the client (all, for platform admins) */
  @Get('pending')
  async getPending(@Req() req: any) {
    return this.manualTimeService.getPending(actorOf(req));
  }

  /** The contract's client approves or rejects a manual time entry */
  @Put(':id/review')
  async review(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: any,
    @Body() dto: ReviewManualTimeDto,
  ) {
    const entry = await this.manualTimeService.review(id, actorOf(req), dto);

    const hours = (entry.endTime.getTime() - entry.startTime.getTime()) / (1000 * 60 * 60);

    if (dto.status === 'approved') {
      this.eventsService.hoursApproved(entry.userId, entry.id, Math.round(hours * 100) / 100);
      // Sync into earnings — this is the manual-entry equivalent of a
      // confirmed screenshot batch (US-XX: "Manual" entry-type filter on
      // the Earnings tab was previously always empty since nothing ever
      // published a manual-entry-confirmed event).
      this.earningsSyncService.syncManualTime({
        id: entry.id,
        userId: entry.userId,
        contractId: entry.contractId,
        taskId: entry.taskId,
        startTime: entry.startTime,
        endTime: entry.endTime,
      });
    } else if (dto.status === 'rejected') {
      this.eventsService.manualTimeRejected(entry.id, entry.userId, req.user.sub, dto.comment ?? null);
    }
    if (dto.status === 'approved' || dto.status === 'rejected') {
      void this.talentNotifications.manualTimeReviewed(
        entry.userId,
        dto.status,
        Math.round(hours * 100) / 100,
        dto.comment ?? null,
      );
    }

    return entry;
  }
}
