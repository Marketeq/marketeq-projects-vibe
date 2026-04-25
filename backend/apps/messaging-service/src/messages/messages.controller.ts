import { Controller, Get, Post, Patch, Delete, Param, Body, Req, Query, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { MessagesService } from './messages.service';
import { GatewayAuthGuard } from '../guards/gateway-auth.guard';

@UseGuards(GatewayAuthGuard)
@Controller('v1/messages')
export class MessagesController {
  constructor(private readonly service: MessagesService) {}

  @Get('thread/:threadId')
  getThreadMessages(@Param('threadId') threadId: string, @Req() req: any) {
    return this.service.getThreadMessages(threadId, req.user?.id);
  }

  @Post()
  send(@Body() dto: any, @Req() req: any) {
    return this.service.send({ ...dto, senderId: req.user?.id || dto.senderId });
  }

  @Patch(':id')
  edit(@Param('id') id: string, @Body() body: { content?: string; ciphertext?: string }, @Req() req: any) {
    return this.service.edit(id, body.content ?? '', req.user?.id, body.ciphertext);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  delete(@Param('id') id: string, @Req() req: any) {
    return this.service.delete(id, req.user?.id);
  }

  @Patch(':id/restore')
  @HttpCode(HttpStatus.NO_CONTENT)
  restore(@Param('id') id: string, @Req() req: any) {
    return this.service.restore(id, req.user?.id);
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
  pin(@Param('id') id: string, @Req() req: any) {
    return this.service.pin(id, req.user?.id);
  }

  @Delete(':id/pin')
  unpin(@Param('id') id: string, @Req() req: any) {
    return this.service.unpin(id, req.user?.id);
  }

  @Post(':id/star')
  star(@Param('id') id: string, @Req() req: any) {
    return this.service.star(id, req.user?.id);
  }

  @Get('search')
  search(@Query('q') q: string, @Req() req: any) {
    return this.service.search(q, req.user?.id);
  }

  @Post(':id/reactions')
  toggleReaction(
    @Param('id') id: string,
    @Body('emoji') emoji: string,
    @Req() req: any,
  ) {
    return this.service.toggleReaction(id, emoji, req.user?.id);
  }
}
