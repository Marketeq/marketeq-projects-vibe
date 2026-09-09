import { IdentityVerificationEvent } from './identity-verification-event.types';

export interface NotificationEventPublisher {
  publish(event: IdentityVerificationEvent): Promise<void>;
}

export const NOTIFICATION_EVENT_PUBLISHER = Symbol('NOTIFICATION_EVENT_PUBLISHER');
