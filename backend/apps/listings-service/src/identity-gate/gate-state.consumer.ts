import { Controller, Logger } from '@nestjs/common';
import { Ctx, EventPattern, Payload, RmqContext } from '@nestjs/microservices';
import { AccountGateStateService } from './account-gate-state.service';

// identity-verification-service's `identity.gate_changed` event (the same
// event, in the same format, that keeps the talent search index in step - G1).
// Owned by that service (its GateChange); services do not import each other's
// src, so the shape below is a deliberate copy.
export const GATE_CHANGED_PATTERN = 'identity.gate_changed';
export const LISTINGS_GATE_QUEUE = 'listings_service_gate_queue';

interface GateChangedPayload {
  userId: string;
  gateOpen: boolean;
  occurredAt: string;
}

/**
 * Durable consumer (own queue, manual ack): a message is acknowledged only after
 * the state was written; a failed write is requeued. A malformed message can
 * never succeed, so it is acknowledged and dropped rather than redelivered
 * forever. Redeliveries and older decisions are harmless (see
 * AccountGateStateService.apply).
 */
@Controller()
export class GateStateConsumer {
  private readonly logger = new Logger(GateStateConsumer.name);

  constructor(private readonly state: AccountGateStateService) {}

  @EventPattern(GATE_CHANGED_PATTERN)
  async onGateChanged(@Payload() payload: GateChangedPayload, @Ctx() context: RmqContext): Promise<void> {
    const channel = context.getChannelRef();
    const message = context.getMessage();

    const occurredAt = new Date(payload?.occurredAt);
    if (
      !payload ||
      typeof payload.userId !== 'string' ||
      typeof payload.gateOpen !== 'boolean' ||
      Number.isNaN(occurredAt.getTime())
    ) {
      this.logger.warn('Dropping a malformed identity.gate_changed message');
      channel.ack(message);
      return;
    }

    try {
      await this.state.apply(payload.userId, payload.gateOpen, occurredAt);
      channel.ack(message);
    } catch (err) {
      this.logger.error(
        `Could not record an account gate change (will be redelivered): ${err instanceof Error ? err.message : String(err)}`,
      );
      channel.nack(message, false, true);
    }
  }
}
