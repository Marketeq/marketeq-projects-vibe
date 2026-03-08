import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { ManualTimeService } from '../services/manual-time.service';
import { EventsService } from '../services/events.service';
import { CreateManualTimeDto, ReviewManualTimeDto } from '../dtos/create-manual-time.dto';

@Controller('manual-time')
@UseGuards(JwtAuthGuard)
export class ManualTimeController {
  constructor(
    private readonly manualTimeService: ManualTimeService,
    private readonly eventsService: EventsService,
  ) {}

  @Post()
  async create(@Req() req: any, @Body() dto: CreateManualTimeDto) {
    return this.manualTimeService.create(req.user.sub, dto);
  }

  @Get()
  async findAll(@Req() req: any) {
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

  /** Admin: list all pending manual time entries for review */
  @Get('pending')
  @UseGuards(RolesGuard('admin'))
  async getPending() {
    return this.manualTimeService.getPending();
  }

  /** Admin: approve or reject a manual time entry */
  @Put(':id/review')
  @UseGuards(RolesGuard('admin'))
  async review(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: any,
    @Body() dto: ReviewManualTimeDto,
  ) {
    const entry = await this.manualTimeService.review(id, req.user.sub, dto);

    if (dto.status === 'approved') {
      const hours = (entry.endTime.getTime() - entry.startTime.getTime()) / (1000 * 60 * 60);
      this.eventsService.hoursApproved(entry.userId, entry.id, Math.round(hours * 100) / 100);
    }

    return entry;
  }
}
