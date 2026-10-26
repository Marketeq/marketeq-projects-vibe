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
//   travel_mode           travel-mode:<travelModeActivatedAt ISO>   (an activation)
//                         travel-mode-confirmed:<confirmationId>      (an already-active traveler's
//                         Update > Temporarily traveling; the id is chosen by the client once per
//                         click and reused on a retry, so a retry or redelivery stores one alert and
//                         a second click is a new occurrence)
import { Inject, Injectable, Logger } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { lastValueFrom, timeout } from 'rxjs';
import { NOTIFICATIONS_CLIENT } from './home-country-updated-notification.publisher';
import {
  STATUS_ALERT_COPY,
  STATUS_ALERT_LINK,
  StatusAlertType,
} from './status-alert-copy';

export const STATUS_ALERT_UPSERT_PATTERN = 'notification.status_alert.upsert';

const PUBLISH_TIMEOUT_MS = 5000;

// What a new occurrence replaces, applied by notification-service in the same transaction that
// stores it. Verified replaces the Submitted alert of its OWN verification session; an approved
// home-country change ends Travel Mode (account-wide: the account is no longer traveling) and the
// review it came from (its own session's Submitted alert; it does not publish Verified, which
// belongs to the account's initial verification). Scoping by session means a delayed approval can
// never dismiss a newer, unrelated Submitted alert.
type Supersedes = Array<
  StatusAlertType | { type: StatusAlertType; occurrenceKey: string }
>;

export const statusAlertOccurrenceKey = {
  verified: (hostedKycSessionId: string) =>
    `identity-verified:${hostedKycSessionId}`,
  submittedForReview: (hostedKycSessionId: string) =>
    `submitted-for-review:${hostedKycSessionId}`,
  homeCountryUpdated: (hostedKycSessionId: string) =>
    `home-country-updated:${hostedKycSessionId}`,
  travelMode: (activatedAt: Date) => `travel-mode:${activatedAt.toISOString()}`,
  travelModeConfirmed: (confirmationId: string) =>
    `travel-mode-confirmed:${confirmationId}`,
};

const submittedOf = (hostedKycSessionId: string) => ({
  type: 'submitted_for_review' as const,
  occurrenceKey:
    statusAlertOccurrenceKey.submittedForReview(hostedKycSessionId),
});

@Injectable()
export class StatusAlertPublisher {
  private readonly logger = new Logger(StatusAlertPublisher.name);

  constructor(
    @Inject(NOTIFICATIONS_CLIENT) private readonly client: ClientProxy,
  ) {}

  verified(userId: string, hostedKycSessionId: string): Promise<boolean> {
    return this.publish(
      'verified',
      userId,
      statusAlertOccurrenceKey.verified(hostedKycSessionId),
      { hostedKycSessionId },
      [submittedOf(hostedKycSessionId)],
    );
  }

  submittedForReview(
    userId: string,
    hostedKycSessionId: string,
  ): Promise<boolean> {
    return this.publish(
      'submitted_for_review',
      userId,
      statusAlertOccurrenceKey.submittedForReview(hostedKycSessionId),
      {
        hostedKycSessionId,
      },
      [],
    );
  }

  /** Only for an approved home-country change, never an initial confirmation. */
  homeCountryUpdated(
    userId: string,
    hostedKycSessionId: string,
  ): Promise<boolean> {
    return this.publish(
      'home_country_updated',
      userId,
      statusAlertOccurrenceKey.homeCountryUpdated(hostedKycSessionId),
      {
        hostedKycSessionId,
      },
      ['travel_mode', submittedOf(hostedKycSessionId)],
    );
  }

  travelMode(userId: string, activatedAt: Date): Promise<boolean> {
    return this.publish(
      'travel_mode',
      userId,
      statusAlertOccurrenceKey.travelMode(activatedAt),
      {
        activatedAt: activatedAt.toISOString(),
      },
      [],
    );
  }

  // An already-active traveler confirmed Travel Mode again (Update > Temporarily traveling).
  // A new occurrence of the same alert type, so it shows again even if the earlier one was
  // dismissed; nothing is superseded and the period's dates are not touched.
  travelModeConfirmed(userId: string, confirmationId: string): Promise<boolean> {
    return this.publish(
      'travel_mode',
      userId,
      statusAlertOccurrenceKey.travelModeConfirmed(confirmationId),
      { confirmationId },
      [],
    );
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
    supersedes: Supersedes,
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
            supersedes,
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
