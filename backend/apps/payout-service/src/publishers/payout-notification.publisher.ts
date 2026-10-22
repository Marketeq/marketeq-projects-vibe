// apps/payout-service/src/publishers/payout-notification.publisher.ts
// G9: hands a user-facing notification to notification-service the way the repo's other
// publishers do (time-tracking-service, invitations-service): `notification.send` on
// notification-service's own durable queue `notification_service_queue`, in the
// NotificationPayload shape its NotificationController -> NotificationService.dispatch()
// consumes. Not a separate notification system.
import { Inject, Injectable, Logger } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { lastValueFrom, timeout } from 'rxjs';

export const NOTIFICATIONS_CLIENT = 'NOTIFICATIONS_CLIENT';
export const NOTIFICATION_SERVICE_QUEUE = 'notification_service_queue';
export const NOTIFICATION_SEND_PATTERN = 'notification.send';
const PUBLISH_TIMEOUT_MS = 5000;

export const SCHEDULE_PAUSED_EVENT = 'payout.schedule_paused_verification';
export const SCHEDULE_PAUSED_TITLE = 'Scheduled payout paused';
export const SCHEDULE_PAUSED_BODY =
  "Your scheduled payout didn't run because account verification is required. Your balance and payout schedule are unchanged.";
// The existing verification entry point: the talent dashboard hosts "Verify My Account".
export const VERIFICATION_ACTION_LINK = '/talent-dashboard';

/** Stable for one pause (the schedule and the moment it entered the paused state). */
export function schedulePausedIdempotencyKey(scheduleId: string, pausedAt: Date): string {
  return `${SCHEDULE_PAUSED_EVENT}:${scheduleId}:${pausedAt.toISOString()}`;
}

@Injectable()
export class PayoutNotificationPublisher {
  private readonly logger = new Logger(PayoutNotificationPublisher.name);

  constructor(@Inject(NOTIFICATIONS_CLIENT) private readonly client: ClientProxy) {}

  /**
   * Resolves true once the broker accepted the message, false if it did not - never
   * throws, so a notification problem can never affect the payout or the schedule.
   * Deliberately neutral: no gate decision, no missingRequirements.
   */
  async schedulePausedForVerification(schedule: { id: string; contractorId: string }, pausedAt: Date): Promise<boolean> {
    try {
      await lastValueFrom(
        this.client
          .emit(NOTIFICATION_SEND_PATTERN, {
            recipientId: schedule.contractorId,
            // "account" is the catalog alias for the General category.
            category: 'account',
            event: SCHEDULE_PAUSED_EVENT,
            title: SCHEDULE_PAUSED_TITLE,
            body: SCHEDULE_PAUSED_BODY,
            link: VERIFICATION_ACTION_LINK,
            metadata: { scheduleId: schedule.id },
            origin: 'payout-service',
            idempotencyKey: schedulePausedIdempotencyKey(schedule.id, pausedAt),
          })
          .pipe(timeout(PUBLISH_TIMEOUT_MS)),
        { defaultValue: undefined },
      );
      return true;
    } catch (err) {
      this.logger.warn(
        `Could not hand the schedule-paused notification for ${schedule.id} to notification-service (will be retried): ${err instanceof Error ? err.message : String(err)}`,
      );
      return false;
    }
  }
}
