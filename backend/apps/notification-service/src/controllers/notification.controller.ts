import { Controller, Get, Post, Delete, Param, Query, Req, HttpCode, HttpStatus } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { NotificationService, NotificationPayload } from '../services/notification.service';

@Controller('v1/notifications')
export class NotificationController {
  constructor(private readonly service: NotificationService) {}

  @Get()
  getNotifications(
    @Req() req: any,
    @Query('page') page: number,
    @Query('limit') limit: number,
    @Query('category') category: string,
    @Query('unread') unread: string,
  ) {
    return this.service.getPaginatedNotifications(req.user?.id, page, limit, category, unread);
  }

  @Get('unread-count')
  getUnreadCount(@Req() req: any) {
    return this.service.getUnreadCount(req.user?.id).then((unreadCount) => ({ unreadCount }));
  }

  @Post(':id/read')
  @HttpCode(HttpStatus.OK)
  markAsRead(@Req() req: any, @Param('id') id: string) {
    return this.service.markAsRead(req.user?.id, id);
  }

  @Post('read-all')
  @HttpCode(HttpStatus.OK)
  markAllAsRead(@Req() req: any) {
    return this.service.markAllAsRead(req.user?.id);
  }

  @Post(':id/archive')
  @HttpCode(HttpStatus.OK)
  archive(@Req() req: any, @Param('id') id: string) {
    return this.service.archive(req.user?.id, id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  delete(@Req() req: any, @Param('id') id: string) {
    return this.service.delete(req.user?.id, id);
  }

  @Get('preferences')
  getPreferences(@Req() req: any) {
    return this.service.getOrCreatePreferences(req.user?.id);
  }

  @Get('health')
  health() {
    return { status: 'ok', service: 'notification-service' };
  }

  // RabbitMQ event handlers from other services
  @MessagePattern('notification.send')
  handleSend(@Payload() payload: NotificationPayload) {
    return this.service.dispatch(payload);
  }

  @MessagePattern('send_magic_link_email')
  handleMagicLink(@Payload() data: { email: string; userId: string; link: string; type: string }) {
    return this.service.dispatch({
      recipientId: data.userId,
      recipientEmail: data.email,
      category: 'account',
      event: 'auth.magic_link',
      title: 'Verify your phone number',
      body: 'Click the link to complete your security setup.',
      link: data.link,
      delivery: { inApp: false, email: true },
    });
  }
}
