import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { BearerGuard } from '../common/guards/bearer.guard';
import { DisputesService } from './disputes.service';
import { CreateDisputeDto } from './dto/create-dispute.dto';
import { UpdateDisputeDto } from './dto/update-dispute.dto';

@Controller()
@UseGuards(BearerGuard)
export class DisputesController {
  constructor(private readonly svc: DisputesService) {}
 
  @Post('sessions/:sessionId/disputes')
  async create(
    @Param('sessionId') sessionId: string,
    @Req() req: any,
    @Body() dto: CreateDisputeDto,
  ) {
    const userId = req?.user?.sub ?? req?.headers?.['x-user-id'];
    return this.svc.create(sessionId, String(userId), dto);
  }
 
  @Patch('disputes/:id')
  async update(@Param('id') id: string, @Req() req: any, @Body() dto: UpdateDisputeDto) {
    const userId = req?.user?.sub ?? req?.headers?.['x-user-id'];
    return this.svc.update(id, String(userId), dto);
  }
}