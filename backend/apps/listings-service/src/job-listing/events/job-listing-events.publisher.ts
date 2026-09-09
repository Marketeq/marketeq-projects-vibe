import { Injectable, Inject } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';

/** The shape notification-service's `notification.send` handler expects. */
export interface ListingNotification {
  recipientId: string;
  event: string;
  title: string;
  body: string;
  link?: string;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class JobListingEventsPublisher {
  constructor(
    @Inject('RABBITMQ_CLIENT')
    private readonly client: ClientProxy,
    @Inject('NOTIFICATIONS_CLIENT')
    private readonly notifications: ClientProxy,
  ) {}

  emit(routingKey: string, payload: Record<string, unknown>): void {
    this.client.emit(routingKey, {
      ...payload,
      emittedAt: new Date().toISOString(),
    });
  }

  /**
   * Sends a user-facing notification.
   *
   * Kept separate from `emit` above, and deliberately additive to it rather
   * than replacing it: the domain events on the listings exchange are consumed
   * by other services and are not addressed to a person. A notification needs a
   * recipient, and goes to a different queue.
   *
   * `category` is fixed to the catalog id the settings screen stores against,
   * so the recipient's Listings preferences actually govern it. Emitting a name
   * outside the catalog would fall through to permissive defaults and ignore
   * their settings.
   */
  notify(notification: ListingNotification): void {
    this.notifications.emit('notification.send', {
      category: 'listings',
      ...notification,
    });
  }
}
