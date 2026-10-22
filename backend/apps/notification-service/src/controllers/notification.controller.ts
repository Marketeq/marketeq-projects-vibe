import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { Ctx, EventPattern, Payload, RmqContext } from '@nestjs/microservices';
import { NotificationDeliveryService } from '../delivery/notification-delivery.service';
import { NotificationDeliveryMonitor } from '../delivery/notification-delivery-monitor';
import {
  NotificationService,
  NotificationPayload,
  WithdrawalNotificationPayload,
} from '../services/notification.service';
import { BrevoService } from '../brevo/brevo.service';
import { UpdatePreferencesDto } from '../dtos/update-preferences.dto';
import { Public } from '../guards/jwt-auth.guard';
import { PersistentStatusAlertPayload, PersistentStatusAlertService } from '../services/persistent-status-alert.service';

@Controller('v1/notifications')
export class NotificationController {
  private readonly logger = new Logger(NotificationController.name);

  constructor(
    private readonly service: NotificationService,
    private readonly brevoService: BrevoService,
    private readonly delivery: NotificationDeliveryService,
    private readonly deliveryMonitor: NotificationDeliveryMonitor,
    private readonly statusAlerts: PersistentStatusAlertService,
  ) {}

  @Get('status-alerts')
  getStatusAlerts(@Req() req: any) {
    return this.statusAlerts.listActive(req.user?.sub ?? req.user?.id);
  }

  @Post('status-alerts/:id/dismiss')
  @HttpCode(HttpStatus.OK)
  dismissStatusAlert(@Req() req: any, @Param('id', new ParseUUIDPipe()) id: string) {
    return this.statusAlerts.dismiss(req.user?.sub ?? req.user?.id, id);
  }

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

  // Both routes go through presentPreferences so an address awaiting
  // confirmation reads back the way it was typed. Without that on the PATCH
  // response too, saving a new address would immediately render the old one and
  // look like the save had failed.
  @Get('preferences')
  async getPreferences(@Req() req: any) {
    return this.service.presentPreferences(
      await this.service.getOrCreatePreferences(req.user?.sub ?? req.user?.id),
    );
  }

  @Patch('preferences')
  async updatePreferences(@Req() req: any, @Body() dto: UpdatePreferencesDto) {
    return this.service.presentPreferences(
      await this.service.updatePreferences(req.user?.sub ?? req.user?.id, dto),
    );
  }

  @Post('preferences/reset')
  @HttpCode(HttpStatus.OK)
  resetPreferences(@Req() req: any) {
    return this.service.resetPreferences(req.user?.sub ?? req.user?.id);
  }

  /**
   * Confirms a notification email change.
   *
   * A GET so the link in the email works by being clicked, and public — the
   * token is the proof, and requiring a session would break confirming from a
   * phone that is not signed in. Deliberately not tied to the requesting
   * session for the same reason.
   *
   * Returns JSON. The link currently lands on this response rather than a
   * page; giving it a proper landing screen needs a design, and none exists.
   */
  @Public()
  @Get('preferences/email/verify')
  verifyEmail(@Query('token') token: string) {
    return this.service.verifyPendingEmail(token);
  }

  @Get('preferences/catalog')
  getCatalog() {
    return this.service.getCatalog();
  }

  @Public()
  @Get('health')
  async health() {
    return { status: 'ok', service: 'notification-service', notificationDelivery: await this.deliveryMonitor.snapshot() };
  }

  // RabbitMQ event handlers from other services
  // Using @EventPattern because publishers use client.emit() (fire-and-forget)
  // Manual acknowledgment (see NotificationDeliveryService): acked after dispatch succeeds,
  // retried through the delay queues on failure, dead-lettered when it keeps failing.
  @EventPattern('notification.send')
  handleSend(@Payload() payload: NotificationPayload, @Ctx() context: RmqContext) {
    return this.delivery.handle(payload, context);
  }

  @EventPattern('notification.status_alert.upsert')
  handleStatusAlert(@Payload() payload: PersistentStatusAlertPayload, @Ctx() context: RmqContext) {
    return this.delivery.handleStatusAlert(payload, context);
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

  @EventPattern('notification.email.project_shared')
  handleSharedProjectEmail(
    @Payload()
    data: {
      to: string;
      sharerName?: string;
      projectTitle?: string;
      projectUrl: string;
      note?: string;
    },
  ) {
    return this.service.sendSharedProjectEmail(data);
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

  // PMCM-806: withdrawal submitted / completed / failed / cancelled, from payout-service.
  @EventPattern('notification.payout.withdrawal')
  handleWithdrawalNotification(@Payload() data: WithdrawalNotificationPayload) {
    return this.service.sendWithdrawalNotification(data);
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
