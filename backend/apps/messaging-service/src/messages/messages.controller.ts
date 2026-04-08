import { Controller, Get, Post, Patch, Delete, Param, Body, Req, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { MessagesService } from './messages.service';

@Controller('v1/messages')
export class MessagesController {
  constructor(private readonly service: MessagesService) {}

  @Get('thread/:threadId')
  getThreadMessages(@Param('threadId') threadId: string) {
    return this.service.getThreadMessages(threadId);
  }

  @Post()
  send(@Body() dto: any, @Req() req: any) {
    return this.service.send({ ...dto, senderId: req.user?.id || dto.senderId });
  }

  @Patch(':id')
  edit(@Param('id') id: string, @Body('content') content: string, @Req() req: any) {
    return this.service.edit(id, content, req.user?.id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  delete(@Param('id') id: string, @Req() req: any) {
    return this.service.delete(id, req.user?.id);
  }

  @Patch(':id/read')
  @HttpCode(HttpStatus.OK)
  markRead(@Param('id') id: string, @Req() req: any) {
    return this.service.markRead(id, req.user?.id);
  }

  @Post(':id/forward')
  forward(@Param('id') id: string, @Body('toUserIds') toUserIds: string[], @Req() req: any) {
    return this.service.forward(id, toUserIds, req.user?.id);
  }

  @Post(':id/pin')
  pin(@Param('id') id: string) {
    return this.service.pin(id);
  }

  @Delete(':id/pin')
  unpin(@Param('id') id: string) {
    return this.service.unpin(id);
  }

  @Post(':id/star')
  star(@Param('id') id: string) {
    return this.service.star(id);
  }

  @Get('search')
  search(@Query('q') q: string, @Req() req: any) {
    return this.service.search(q, req.user?.id);
  }
}
