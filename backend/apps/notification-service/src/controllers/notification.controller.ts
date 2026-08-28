import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  Param,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { NotificationService, NotificationPayload } from '../services/notification.service';
import { BrevoService } from '../brevo/brevo.service';
import { UpdatePreferencesDto } from '../dtos/update-preferences.dto';
import { Public } from '../guards/jwt-auth.guard';

@Controller('v1/notifications')
export class NotificationController {
  private readonly logger = new Logger(NotificationController.name);

  constructor(
    private readonly service: NotificationService,
    private readonly brevoService: BrevoService,
  ) {}

  @Get()
  getNotifications(
    @Req() req: any,
    @Query('page') page: number,
    @Query('limit') limit: number,
    @Query('category') category: string,
    @Query('unread') unread: string,
  ) {
    return this.service.getPaginatedNotifications(req.user?.sub ?? req.user?.id, page, limit, category, unread);
  }

  @Get('unread-count')
  getUnreadCount(@Req() req: any) {
    return this.service.getUnreadCount(req.user?.sub ?? req.user?.id).then((unreadCount) => ({ unreadCount }));
  }

  @Post(':id/read')
  @HttpCode(HttpStatus.OK)
  markAsRead(@Req() req: any, @Param('id') id: string) {
    return this.service.markAsRead(req.user?.sub ?? req.user?.id, id);
  }

  @Post('read-all')
  @HttpCode(HttpStatus.OK)
  markAllAsRead(@Req() req: any) {
    return this.service.markAllAsRead(req.user?.sub ?? req.user?.id);
  }

  @Post(':id/archive')
  @HttpCode(HttpStatus.OK)
  archive(@Req() req: any, @Param('id') id: string) {
    return this.service.archive(req.user?.sub ?? req.user?.id, id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  delete(@Req() req: any, @Param('id') id: string) {
    return this.service.delete(req.user?.sub ?? req.user?.id, id);
  }

  @Get('preferences')
  getPreferences(@Req() req: any) {
    return this.service.getOrCreatePreferences(req.user?.sub ?? req.user?.id);
  }

  @Patch('preferences')
  updatePreferences(@Req() req: any, @Body() dto: UpdatePreferencesDto) {
    return this.service.updatePreferences(req.user?.sub ?? req.user?.id, dto);
  }

  @Post('preferences/reset')
  @HttpCode(HttpStatus.OK)
  resetPreferences(@Req() req: any) {
    return this.service.resetPreferences(req.user?.sub ?? req.user?.id);
  }

  @Get('preferences/catalog')
  getCatalog() {
    return this.service.getCatalog();
  }

  @Public()
  @Get('health')
  health() {
    return { status: 'ok', service: 'notification-service' };
  }

  // RabbitMQ event handlers from other services
  // Using @EventPattern because publishers use client.emit() (fire-and-forget)
  @EventPattern('notification.send')
  handleSend(@Payload() payload: NotificationPayload) {
    return this.service.dispatch(payload);
  }

  @EventPattern('auth.password_reset_requested')
  async handlePasswordResetRequested(
    @Payload() data: { email: string; firstName?: string; resetUrl: string },
  ) {
    await this.brevoService.sendPasswordResetEmail(data.email, {
      firstName: data.firstName,
      resetUrl: data.resetUrl,
    });
  }

  @EventPattern('send_magic_link_email')
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

  @EventPattern('notification.email.team_invitation')
  handleTeamInvitationEmail(
    @Payload()
    data: {
      to: string;
      teamName: string;
      role: string;
      acceptUrl: string;
      inviterEmail?: string;
      inviterName?: string;
      inviterAvatarUrl?: string;
      note?: string;
    },
  ) {
    return this.service.sendTeamInvitationEmail(data);
  }

  @EventPattern('notification.email.invitation_accepted')
  handleInvitationAcceptedEmail(
    @Payload()
    data: {
      to: string;
      companyName: string;
      companyLogoUrl?: string;
      memberCount?: number;
      inviteeName?: string;
      inviteeEmail: string;
      inviteMoreUrl: string;
      launchUrl: string;
    },
  ) {
    return this.service.sendInvitationAcceptedEmail(data);
  }

  @EventPattern('invitation.created')
  handleInvitationCreated(
    @Payload()
    data: { eventName: string; timestamp: string; data: { invitationId: string; teamId: string; companyId?: string; invitedEmail: string; role: string } },
  ) {
    this.logger.log(`invitation.created received: invitationId=${data.data?.invitationId} invitedEmail=${data.data?.invitedEmail}`);
  }

  @EventPattern('invitation.resent')
  handleInvitationResent(
    @Payload()
    data: { eventName: string; timestamp: string; data: { invitationId: string; teamId: string; companyId?: string; invitedEmail: string } },
  ) {
    this.logger.log(`invitation.resent received: invitationId=${data.data?.invitationId} invitedEmail=${data.data?.invitedEmail}`);
  }
}
