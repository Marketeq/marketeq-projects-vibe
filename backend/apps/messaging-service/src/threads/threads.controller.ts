import { Controller, Get, Post, Param, Body, Req, UseGuards } from '@nestjs/common';
import { ThreadsService } from './threads.service';
import { AblyService } from '../ably/ably.service';
import { GatewayAuthGuard } from '../guards/gateway-auth.guard';
import { AddParticipantDto } from './dtos/add-participant.dto';

@UseGuards(GatewayAuthGuard)
@Controller('v1/threads')
export class ThreadsController {
  constructor(
    private readonly threadsService: ThreadsService,
    private readonly ablyService: AblyService,
  ) {}

  @Get()
  getUserThreads(@Req() req: any) {
    return this.threadsService.getUserThreads(req.user?.id);
  }

  @Get('ably-token')
  getAblyToken(@Req() req: any) {
    return this.ablyService.createTokenRequest(req.user?.id);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.threadsService.findOne(id);
  }

  @Post()
  create(@Body() body: { participantIds: string[]; isGroup?: boolean; groupName?: string }) {
    return this.threadsService.create(body.participantIds, body.isGroup, body.groupName);
  }

  @Post(':id/participants')
  addParticipant(
    @Param('id') id: string,
    @Body() dto: AddParticipantDto,
    @Req() req: any,
  ) {
    return this.threadsService.addParticipant(id, req.user?.id, dto.userId, dto.encryptedGroupKey);
  }
}
