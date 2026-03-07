import { Controller, Get, Post, Param, Body, Req } from '@nestjs/common';
import { ThreadsService } from './threads.service';
import { AblyService } from '../ably/ably.service';

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

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.threadsService.findOne(id);
  }

  @Post()
  create(@Body() body: { participantIds: string[]; isGroup?: boolean; groupName?: string }) {
    return this.threadsService.create(body.participantIds, body.isGroup, body.groupName);
  }

  @Get('ably-token')
  getAblyToken(@Req() req: any) {
    return this.ablyService.createTokenRequest(req.user?.id);
  }
}
