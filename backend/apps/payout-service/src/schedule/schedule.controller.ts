// apps/payout-service/src/schedule/schedule.controller.ts
// PS-03 + PS-18: Schedule configuration and split management
import {
  Controller, Get, Put, Patch, Body,
  UseGuards, Request, HttpCode,
} from '@nestjs/common';
import { ScheduleService }    from './schedule.service';
import { SplitService }       from './split.service';
import { JwtAuthGuard }       from '../guards/jwt-auth.guard';
import { UpdateScheduleDto }  from './dto/update-schedule.dto';
import { UpdateSplitDto }     from './dto/update-split.dto';

@Controller('v1/payouts/schedule')
@UseGuards(JwtAuthGuard)
export class ScheduleController {
  constructor(
    private readonly scheduleService: ScheduleService,
    private readonly splitService: SplitService,
  ) {}

  @Get()
  @HttpCode(200)
  async getSchedule(@Request() req: any) {
    return this.scheduleService.getSchedule(req.user.userId);
  }

  @Put()
  @HttpCode(200)
  async updateSchedule(@Request() req: any, @Body() dto: UpdateScheduleDto) {
    return this.scheduleService.updateSchedule(req.user.userId, dto);
  }

  // PS-18 §5/§6: Enable/disable split, update percentages, change secondary method
  @Patch('split')
  @HttpCode(200)
  async updateSplit(@Request() req: any, @Body() dto: UpdateSplitDto) {
    return this.splitService.updateSplit(req.user.userId, dto);
  }
}
