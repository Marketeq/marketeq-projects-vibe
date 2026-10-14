import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { lastValueFrom, timeout } from 'rxjs';

// G1 marketplace discovery gate: identity-verification-service owns gate_open,
// and tells the talent search index when an account's value may have changed.
// The contract is owned by algolia-service (its GateChangedPayload and the
// `identity.gate_changed` event pattern) - services do not import each
// other's src, so the names below are a deliberate copy; change them together.
export const GATE_CHANGE_PUBLISHER = 'GATE_CHANGE_PUBLISHER';
export const ALGOLIA_GATE_CLIENT = 'ALGOLIA_GATE_CLIENT';
export const ALGOLIA_SERVICE_QUEUE = 'algolia_service_queue';
export const GATE_CHANGED_PATTERN = 'identity.gate_changed';
const PUBLISH_TIMEOUT_MS = 5000;

/**
 * Deliberately narrow, like the RPC gate decision: the account and whether its
 * gate is open. Never a verification status, reason, document or vendor
 * detail - the search index is not allowed to learn why a talent is hidden.
 */
export interface GateChange {
  userId: string;
  gateOpen: boolean;
  /** When the state that produced this decision came into being (ISO-8601). */
  occurredAt: string;
}

export interface GateChangePublisher {
  /** Resolves when the broker accepted the event; rejects if it did not. */
  publish(change: GateChange): Promise<void>;
}

@Injectable()
export class RmqGateChangePublisher implements GateChangePublisher {
  constructor(@Inject(ALGOLIA_GATE_CLIENT) private readonly client: ClientProxy) {}

  async publish(change: GateChange): Promise<void> {
    await lastValueFrom(
      this.client.emit(GATE_CHANGED_PATTERN, change).pipe(timeout(PUBLISH_TIMEOUT_MS)),
      { defaultValue: undefined },
    );
  }
}
