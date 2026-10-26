// identity-verification-service -> notification-service: persistent status alerts
// (PMCM-651). One `notification.status_alert.upsert` message per occurrence on
// notification-service's own durable queue, through the same NOTIFICATIONS_CLIENT as the
// home-country-updated notification. notification-service owns storage, retries, the
// dead-letter queue and per-occurrence idempotency; this class only builds the message.
//
// Each alert's occurrenceKey is stable for the thing it announces, so a webhook replay, a
// reconcile or a broker redelivery of the same occurrence is stored once, and a dismissed
// occurrence is never resurrected:
//   verified              identity-verified:<hostedKycSessionId>
//   submitted_for_review  submitted-for-review:<hostedKycSessionId>
//   home_country_updated  home-country-updated:<hostedKycSessionId>
//   travel_mode           travel-mode:<travelModeActivatedAt ISO>
import { Inject, Injectable, Logger } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { lastValueFrom, timeout } from 'rxjs';
import { NOTIFICATIONS_CLIENT } from './home-country-updated-notification.publisher';
import { STATUS_ALERT_COPY, STATUS_ALERT_LINK, StatusAlertType } from './status-alert-copy';

export const STATUS_ALERT_UPSERT_PATTERN = 'notification.status_alert.upsert';

const PUBLISH_TIMEOUT_MS = 5000;

// Verified replaces Submitted for Review. An approved home-country change ends Travel Mode and
// also ends the review it came from (its own Submitted alert; it does not publish Verified,
// which belongs to the account's initial verification), so it replaces both. Applied by
// notification-service in the same transaction that stores the new occurrence.
const SUPERSEDES: Record<StatusAlertType, StatusAlertType[]> = {
  travel_mode: [],
  submitted_for_review: [],
  verified: ['submitted_for_review'],
  home_country_updated: ['travel_mode', 'submitted_for_review'],
};

export const statusAlertOccurrenceKey = {
  verified: (hostedKycSessionId: string) => `identity-verified:${hostedKycSessionId}`,
  submittedForReview: (hostedKycSessionId: string) => `submitted-for-review:${hostedKycSessionId}`,
  homeCountryUpdated: (hostedKycSessionId: string) => `home-country-updated:${hostedKycSessionId}`,
  travelMode: (activatedAt: Date) => `travel-mode:${activatedAt.toISOString()}`,
};

@Injectable()
export class StatusAlertPublisher {
  private readonly logger = new Logger(StatusAlertPublisher.name);

  constructor(@Inject(NOTIFICATIONS_CLIENT) private readonly client: ClientProxy) {}

  verified(userId: string, hostedKycSessionId: string): Promise<boolean> {
    return this.publish('verified', userId, statusAlertOccurrenceKey.verified(hostedKycSessionId), { hostedKycSessionId });
  }

  submittedForReview(userId: string, hostedKycSessionId: string): Promise<boolean> {
    return this.publish('submitted_for_review', userId, statusAlertOccurrenceKey.submittedForReview(hostedKycSessionId), {
      hostedKycSessionId,
    });
  }

  /** Only for an approved home-country change, never an initial confirmation. */
  homeCountryUpdated(userId: string, hostedKycSessionId: string): Promise<boolean> {
    return this.publish('home_country_updated', userId, statusAlertOccurrenceKey.homeCountryUpdated(hostedKycSessionId), {
      hostedKycSessionId,
    });
  }

  travelMode(userId: string, activatedAt: Date): Promise<boolean> {
    return this.publish('travel_mode', userId, statusAlertOccurrenceKey.travelMode(activatedAt), {
      activatedAt: activatedAt.toISOString(),
    });
  }

  /**
   * Resolves true once the broker accepted the message, false if it did not. Never
   * throws, so an alert problem can never fail or undo the state change it announces.
   * Logs fixed text only: no user id, session id or country.
   */
  private async publish(
    type: StatusAlertType,
    userId: string,
    occurrenceKey: string,
    metadata: Record<string, string>,
  ): Promise<boolean> {
    try {
      await lastValueFrom(
        this.client
          .emit(STATUS_ALERT_UPSERT_PATTERN, {
            recipientId: userId,
            type,
            occurrenceKey,
            title: STATUS_ALERT_COPY[type].title,
            body: STATUS_ALERT_COPY[type].body,
            link: STATUS_ALERT_LINK,
            metadata,
            supersedes: SUPERSEDES[type],
          })
          .pipe(timeout(PUBLISH_TIMEOUT_MS)),
        { defaultValue: undefined },
      );
      return true;
    } catch (err) {
      this.logger.warn(
        `Could not hand a ${type} status alert to notification-service: ${
          err instanceof Error ? err.constructor.name : 'unknown error'
        }`,
      );
      return false;
    }
  }
}
