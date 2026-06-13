import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { TimeEntriesService } from './time-entries.service';
import { BearerGuard } from '../common/guards/bearer.guard';
import { CreateTimeEntryDto } from './dto/create-time-entry.dto';
import { UpdateTimeEntryDto } from './dto/update-time-entry.dto';
 
@Controller()
@UseGuards(BearerGuard)
export class TimeEntriesController {
  constructor(private readonly svc: TimeEntriesService) {}
 
  /** Doc 13 §7.1 — POST /sessions/:sessionId/entries */
  @Post('sessions/:sessionId/entries')
  async create(@Param('sessionId') sessionId: string, @Body() dto: CreateTimeEntryDto) {
    return this.svc.create(sessionId, dto);
  }
 
  /** Doc 13 §7.2 — PATCH /entries/:id */
  @Patch('entries/:id')
  async update(@Param('id') id: string, @Body() dto: UpdateTimeEntryDto) {
    return this.svc.update(id, dto);
  }
 
  /** List entries for a session */
  @Get('sessions/:sessionId/entries')
  async list(@Param('sessionId') sessionId: string) {
    return this.svc.findBySession(sessionId);
  }
}