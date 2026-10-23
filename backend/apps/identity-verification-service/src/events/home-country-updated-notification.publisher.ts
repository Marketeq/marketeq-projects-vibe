// identity-verification-service -> notification-service: tells the account holder that an
// approved home-country change has been applied, the way the repo's other publishers do
// (payout-service, time-tracking-service, invitations-service): `notification.send` on
// notification-service's own durable queue `notification_service_queue`, in the
// NotificationPayload shape its NotificationController -> NotificationService.dispatch()
// consumes. No new exchange, queue or binding, and not a separate notification system:
// retries, backoff and the dead-letter queue are notification-service's own.
//
// Sent only after the home-country change has been promoted and its transaction has
// committed (see FreeKycService.publishIdentityVerified). In-app only: the Figma
// notification (node 13101-47577) is an in-app one, so email and SMS are explicitly off.
import { Inject, Injectable, Logger } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { lastValueFrom, timeout } from 'rxjs';

export const NOTIFICATIONS_CLIENT = 'NOTIFICATIONS_CLIENT';
export const NOTIFICATION_SERVICE_QUEUE = 'notification_service_queue';
export const NOTIFICATION_SEND_PATTERN = 'notification.send';

const PUBLISH_TIMEOUT_MS = 5000;

export const HOME_COUNTRY_UPDATED_NOTIFICATION_EVENT = 'identity.home_country_updated';
// Figma node 13101-47577.
export const HOME_COUNTRY_UPDATED_NOTIFICATION_TITLE = 'Your home country was updated.';
export const HOME_COUNTRY_UPDATED_NOTIFICATION_BODY =
  'You can continue using the platform while away from your home country.';
// The talent dashboard hosts the account's verification and notification entry points.
export const HOME_COUNTRY_UPDATED_NOTIFICATION_LINK = '/talent-dashboard';

/**
 * Stable for one promotion: the id of the hosted_kyc_sessions row whose approval was
 * promoted. A session is promoted at most once (the pending claim is cleared by the
 * promotion), so a redelivered approval, a reconcile or a broker redelivery of this
 * message all carry the same key and notification-service delivers it once.
 */
export function homeCountryUpdatedIdempotencyKey(hostedKycSessionId: string): string {
  return `${HOME_COUNTRY_UPDATED_NOTIFICATION_EVENT}:${hostedKycSessionId}`;
}

export interface HomeCountryUpdatedNotification {
  /** The account holder (the profile's user id). */
  userId: string;
  /** hosted_kyc_sessions.id of the approved home-country-change session. */
  hostedKycSessionId: string;
}

@Injectable()
export class HomeCountryUpdatedNotificationPublisher {
  private readonly logger = new Logger(HomeCountryUpdatedNotificationPublisher.name);

  constructor(@Inject(NOTIFICATIONS_CLIENT) private readonly client: ClientProxy) {}

  /**
   * Resolves true once the broker accepted the message, false if it did not. Never
   * throws, so a notification problem can never fail or undo the approved change.
   * Logs fixed text only: no user id, session id or country.
   */
  async homeCountryUpdated(notification: HomeCountryUpdatedNotification): Promise<boolean> {
    try {
      await lastValueFrom(
        this.client
          .emit(NOTIFICATION_SEND_PATTERN, {
            recipientId: notification.userId,
            // "account" is the catalog alias for the General category.
            category: 'account',
            event: HOME_COUNTRY_UPDATED_NOTIFICATION_EVENT,
            title: HOME_COUNTRY_UPDATED_NOTIFICATION_TITLE,
            body: HOME_COUNTRY_UPDATED_NOTIFICATION_BODY,
            link: HOME_COUNTRY_UPDATED_NOTIFICATION_LINK,
            metadata: { hostedKycSessionId: notification.hostedKycSessionId },
            delivery: { inApp: true, email: false, sms: false },
            origin: 'identity-verification-service',
            idempotencyKey: homeCountryUpdatedIdempotencyKey(notification.hostedKycSessionId),
          })
          .pipe(timeout(PUBLISH_TIMEOUT_MS)),
        { defaultValue: undefined },
      );
      return true;
    } catch (err) {
      this.logger.warn(
        `Could not hand the home-country-updated notification to notification-service: ${
          err instanceof Error ? err.constructor.name : 'unknown error'
        }`,
      );
      return false;
    }
  }
}
