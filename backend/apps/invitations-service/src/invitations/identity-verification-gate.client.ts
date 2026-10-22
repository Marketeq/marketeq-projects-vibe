import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientProxy, RmqRecordBuilder } from '@nestjs/microservices';
import { firstValueFrom, timeout } from 'rxjs';
import { IdentityVerificationUnavailableException } from '../common/invitation-exceptions';

// RabbitMQ request/reply contract owned by identity-verification-service
// (its src/common/gate/account-gate-decision.ts). Services do not import each
// other's src, so these names are a deliberate copy — change them together.
export const IDENTITY_VERIFICATION_CLIENT = 'IDENTITY_VERIFICATION_CLIENT';
export const IDENTITY_VERIFICATION_RPC_QUEUE = 'identity_verification_rpc_queue';
export const ACCOUNT_GATE_CHECK_PATTERN = 'identity_verification.gate_check';

// Short and bounded: the invitee is waiting on an HTTP accept. Sits between
// the 2s used by messaging-service's blocks RPC and the 10s used for category
// matching. The same value is set as the message TTL, so a request sent while
// identity-verification-service is down does not sit in the queue and get
// answered long after the caller has already failed closed.
export const IDENTITY_GATE_TIMEOUT_MS = 3000;

// RABBITMQ_URI first, then RABBITMQ_URL (the only broker variable the frozen
// env templates define). Empty when neither is set - there is no localhost
// fallback for a security gate.
export function resolveBrokerUrl(config: Pick<ConfigService, 'get'>): string {
  return (config.get<string>('RABBITMQ_URI') || config.get<string>('RABBITMQ_URL') || '').trim();
}

export type GateMissingRequirements = 'identity' | 'location' | 'both' | 'none';

export interface AccountGateDecision {
  gateOpen: boolean;
  missingRequirements: GateMissingRequirements;
}

const MISSING_REQUIREMENT_VALUES: readonly string[] = ['identity', 'location', 'both', 'none'];

/**
 * Asks identity-verification-service for the canonical gate decision. This
 * client never computes gate_open itself — the formula lives in one place, in
 * the owning service — and never lets an unanswered or unintelligible reply
 * open the gate: every failure mode throws IdentityVerificationUnavailable.
 */
@Injectable()
export class IdentityVerificationGateClient {
  private readonly logger = new Logger(IdentityVerificationGateClient.name);

  constructor(
    @Inject(IDENTITY_VERIFICATION_CLIENT) private readonly client: ClientProxy,
    private readonly config: ConfigService,
  ) {}

  async checkGate(userId: string): Promise<AccountGateDecision> {
    if (!resolveBrokerUrl(this.config)) {
      this.logger.warn(
        'RABBITMQ_URI/RABBITMQ_URL not set - cannot reach identity-verification-service; refusing the action (gate fails closed).',
      );
      throw new IdentityVerificationUnavailableException();
    }
    let reply: unknown;
    try {
      const record = new RmqRecordBuilder({ userId })
        .setOptions({ expiration: IDENTITY_GATE_TIMEOUT_MS })
        .build();
      reply = await firstValueFrom(
        this.client.send<unknown>(ACCOUNT_GATE_CHECK_PATTERN, record).pipe(timeout(IDENTITY_GATE_TIMEOUT_MS)),
      );
    } catch (err) {
      this.logger.warn(
        `${ACCOUNT_GATE_CHECK_PATTERN} RPC failed for ${userId}: ${describeError(err)} — refusing the action (gate fails closed).`,
      );
      throw new IdentityVerificationUnavailableException();
    }

    const decision = parseDecision(reply);
    if (!decision) {
      this.logger.warn(
        `${ACCOUNT_GATE_CHECK_PATTERN} returned an unusable reply for ${userId} — refusing the action (gate fails closed).`,
      );
      throw new IdentityVerificationUnavailableException();
    }
    return decision;
  }
}

// Accept only a reply that is unmistakably a well-formed, self-consistent gate
// decision; anything else returns null and the caller fails closed. Every
// field is checked, and the gate must agree with itself: an open gate has
// nothing missing, and a closed gate must name what is missing. A reply that
// contradicts itself is not trusted in either direction — it is not read as
// "open", and it is not patched up into a "blocked" answer either.
function parseDecision(reply: unknown): AccountGateDecision | null {
  if (typeof reply !== 'object' || reply === null) return null;
  const r = reply as Record<string, unknown>;

  if (typeof r.gateOpen !== 'boolean') return null;
  if (typeof r.missingRequirements !== 'string' || !MISSING_REQUIREMENT_VALUES.includes(r.missingRequirements)) {
    return null;
  }

  const missing = r.missingRequirements as GateMissingRequirements;
  if (r.gateOpen && missing !== 'none') return null;
  if (!r.gateOpen && missing === 'none') return null;

  // Only the two contract fields are kept; anything else a reply carries is
  // dropped here and never reaches the caller.
  return { gateOpen: r.gateOpen, missingRequirements: missing };
}

// An RMQ rejection is often a serialized payload rather than an Error, so
// `.message` alone can be empty (see messaging-service's blocks.client.ts).
function describeError(err: unknown): string {
  if (err instanceof Error) return err.message || err.name || String(err);
  if (typeof err === 'string') return err;
  try {
    return JSON.stringify(err) ?? String(err);
  } catch {
    return String(err);
  }
}
