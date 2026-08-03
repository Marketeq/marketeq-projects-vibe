import { Injectable, Logger } from '@nestjs/common';
import { AblyService } from './ably.service';
import { BalanceUpdatedPayload } from './earnings.publisher';

/**
 * US-91–94: the Ably-facing half of a balance mutation. EarningsPublisher
 * (RabbitMQ, inter-service) already fires on every credit/debit/reversal/
 * payout_completed/payout_failed mutation — this publishes the same event
 * to the contractor's own private Ably channel so the frontend can react
 * live instead of polling.
 *
 * Event name is derived from mutationType so the frontend can distinguish
 * "just refresh the balance" (US-91) from the two named edge-trigger
 * events the spec calls out explicitly (US-92 reversal toast, US-93
 * persistent failure banner).
 */
@Injectable()
export class EarningsEventsPublisher {
  private readonly logger = new Logger(EarningsEventsPublisher.name);

  constructor(private readonly ably: AblyService) {}

  async publishRealtimeBalanceUpdate(payload: BalanceUpdatedPayload): Promise<void> {
    const eventName = this.eventNameFor(payload.mutationType);
    try {
      await this.ably.publish(payload.contractorId, eventName, payload);
    } catch (err) {
      this.logger.error(
        `Failed to publish ${eventName} for ${payload.contractorId}: ${(err as Error).message}`,
      );
    }
  }

  private eventNameFor(mutationType: BalanceUpdatedPayload['mutationType']): string {
    switch (mutationType) {
      case 'reversal':
        return 'transaction.reversed';
      case 'payout_failed':
        return 'earnings.payout.failed';
      default:
        return 'balance.updated';
    }
  }
}
