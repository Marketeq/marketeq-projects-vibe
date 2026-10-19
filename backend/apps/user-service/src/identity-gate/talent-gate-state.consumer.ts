import { Controller, Logger } from '@nestjs/common';
import { Ctx, EventPattern, Payload, RmqContext } from '@nestjs/microservices';
import { TalentGateStateService } from './talent-gate-state.service';

// identity-verification-service's `identity.gate_changed` event - the same event, in the same
// format, that keeps the talent search index (G1), listings rosters (G5) and scheduled payouts
// (G9) in step. Owned by that service (its GateChange); services do not import each other's
// src, so the shape below is a deliberate copy.
export const GATE_CHANGED_PATTERN = 'identity.gate_changed';
export const USER_GATE_QUEUE = 'user_service_gate_queue';

interface GateChangedPayload {
  userId: string;
  gateOpen: boolean;
  occurredAt: string;
}

/**
 * Durable consumer (own queue, manual ack): a message is acknowledged only after the state was
 * written; a failed write is requeued. A malformed message can never succeed, so it is
 * acknowledged and dropped rather than redelivered forever. Redeliveries and older decisions are
 * harmless (see TalentGateStateService.apply).
 */
@Controller()
export class TalentGateStateConsumer {
  private readonly logger = new Logger(TalentGateStateConsumer.name);

  constructor(private readonly state: TalentGateStateService) {}

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
        `Could not record a talent gate change (will be redelivered): ${err instanceof Error ? err.message : String(err)}`,
      );
      channel.nack(message, false, true);
    }
  }
}
