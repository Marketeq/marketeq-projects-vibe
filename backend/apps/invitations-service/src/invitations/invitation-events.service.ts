import { Inject, Injectable, Logger } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';

/**
 * Envelope + emit wrapper for the doc's four RabbitMQ topics
 * (invitation.created / accepted / resent / revoked), following the
 * pattern in contracts-service/src/services/events.service.ts. Distinct
 * from the existing notification.* emits in InvitationsService, which
 * target the email worker specifically.
 */
@Injectable()
export class InvitationEventsService {
  private readonly logger = new Logger(InvitationEventsService.name);

  constructor(@Inject('RABBITMQ_CLIENT') private readonly client: ClientProxy) {}

  private emit(eventName: string, data: Record<string, any>): void {
    this.client.emit(eventName, {
      eventName,
      timestamp: new Date().toISOString(),
      data,
    });
    this.logger.log(`Emitted: ${eventName}`);
  }

  created(invitationId: string, teamId: string, companyId: string | undefined, invitedEmail: string, role: string): void {
    this.emit('invitation.created', { invitationId, teamId, companyId, invitedEmail, role });
  }

  accepted(invitationId: string | null, teamId: string, companyId: string | undefined, invitedEmail: string, acceptedByUserId: string): void {
    this.emit('invitation.accepted', { invitationId, teamId, companyId, invitedEmail, acceptedByUserId });
  }

  resent(invitationId: string, teamId: string, companyId: string | undefined, invitedEmail: string): void {
    this.emit('invitation.resent', { invitationId, teamId, companyId, invitedEmail });
  }

  revoked(invitationId: string, teamId: string, companyId: string | undefined, invitedEmail: string): void {
    this.emit('invitation.revoked', { invitationId, teamId, companyId, invitedEmail });
  }
}
