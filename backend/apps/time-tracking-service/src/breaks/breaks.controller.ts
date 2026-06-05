import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { BearerGuard } from '../common/guards/bearer.guard';
import { BreaksService } from './breaks.service';
import { CreateBreakDto } from './dto/create-break.dto';
import { UpdateBreakDto } from './dto/update-break.dto';

@Controller()
@UseGuards(BearerGuard)
export class BreaksController {
  constructor(private readonly svc: BreaksService) {}
 
  @Post('sessions/:sessionId/breaks')
  async create(@Param('sessionId') sessionId: string, @Body() dto: CreateBreakDto) {
    return this.svc.create(sessionId, dto);
  }
 
  @Patch('breaks/:id')
  async update(@Param('id') id: string, @Body() dto: UpdateBreakDto) {
    return this.svc.update(id, dto);
  }
 
  @Get('sessions/:sessionId/breaks')
  async list(@Param('sessionId') sessionId: string) {
    return this.svc.findBySession(sessionId);
  }
}