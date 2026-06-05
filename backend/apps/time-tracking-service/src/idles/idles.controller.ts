import { Body, Controller, Param, Post, UseGuards } from '@nestjs/common';
import { BearerGuard } from '../common/guards/bearer.guard';
import { IdlesService } from './idles.service';
import { CreateIdleDto } from './dto/create-idle.dto';
@Controller()
@UseGuards(BearerGuard)
export class IdlesController {
  constructor(private readonly svc: IdlesService) {}
 
  @Post('sessions/:sessionId/idles')
  async create(@Param('sessionId') sessionId: string, @Body() dto: CreateIdleDto) {
    return this.svc.create(sessionId, dto);
  }
}