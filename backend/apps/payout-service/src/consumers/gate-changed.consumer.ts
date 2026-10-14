// apps/payout-service/src/consumers/gate-changed.consumer.ts
// G9: identity-verification-service's authoritative `identity.gate_changed` event
// ({userId, gateOpen, occurredAt}), delivered on payout-service's own durable
// queue. A reopened gate resumes the schedules that were paused for verification.
// A closed gate needs nothing here: the scheduler checks the gate immediately before
// every payout and pauses (with its one notification) at that moment.
//
// Durable-consumer pattern shared with listings-service: manual ack after the work
// succeeded, requeue on failure, drop-and-ack a malformed message (it can never
// succeed). Repeats are harmless (resume is idempotent). Before resuming, the
// decision is confirmed with the owning service, so a stale "open" event arriving
// after the gate closed again cannot resume a schedule.
import { Controller, Logger } from '@nestjs/common';
import { Ctx, EventPattern, Payload, RmqContext } from '@nestjs/microservices';
import { PayoutExecutionGate } from '../identity-gate/payout-execution-gate.service';
import { ScheduleVerificationPauseService } from '../schedule/schedule-verification-pause.service';

// Owned by identity-verification-service (its GateChange); a deliberate copy.
export const GATE_CHANGED_PATTERN = 'identity.gate_changed';
export const PAYOUT_GATE_QUEUE = 'payout_service_gate_queue';

interface GateChangedPayload {
  userId: string;
  gateOpen: boolean;
  occurredAt: string;
}

@Controller()
export class GateChangedConsumer {
  private readonly logger = new Logger(GateChangedConsumer.name);

  constructor(
    private readonly pause: ScheduleVerificationPauseService,
    private readonly gate: PayoutExecutionGate,
  ) {}

  @EventPattern(GATE_CHANGED_PATTERN)
  async onGateChanged(@Payload() payload: GateChangedPayload, @Ctx() context: RmqContext): Promise<void> {
    const channel = context.getChannelRef();
    const message = context.getMessage();

    if (
      !payload ||
      typeof payload.userId !== 'string' ||
      typeof payload.gateOpen !== 'boolean' ||
      Number.isNaN(new Date(payload.occurredAt).getTime())
    ) {
      this.logger.warn('Dropping a malformed identity.gate_changed message');
      channel.ack(message);
      return;
    }

    try {
      if (payload.gateOpen) {
        const outcome = await this.gate.evaluate(payload.userId);
        if (outcome.state === 'unavailable') throw new Error('gate could not be confirmed');
        if (outcome.state === 'open') await this.pause.resumeForVerification(payload.userId);
      }
      channel.ack(message);
    } catch (err) {
      this.logger.error(
        `Could not apply an identity.gate_changed event (will be redelivered): ${err instanceof Error ? err.message : String(err)}`,
      );
      channel.nack(message, false, true);
    }
  }
}
