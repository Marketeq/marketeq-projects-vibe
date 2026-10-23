import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientProxy, RmqRecordBuilder } from '@nestjs/microservices';
import { firstValueFrom, timeout } from 'rxjs';
import { IdentityVerificationUnavailableException } from './identity-gate.exceptions';

// RabbitMQ request/reply contract owned by identity-verification-service
// (its src/common/gate/account-gate-decision.ts). Services do not import each
// other's src, so these names are a deliberate copy — change them together.
export const IDENTITY_VERIFICATION_CLIENT = 'IDENTITY_VERIFICATION_CLIENT';
export const IDENTITY_VERIFICATION_RPC_QUEUE = 'identity_verification_rpc_queue';
export const ACCOUNT_GATE_CHECK_PATTERN = 'identity_verification.gate_check';
// G5 roster filtering: the same decision for many accounts in one request,
// answered with one entry per account. identity-verification-service accepts at
// most MAX_GATE_CHECK_BATCH accounts per request, so larger sets are chunked.
export const ACCOUNT_GATE_CHECK_BATCH_PATTERN = 'identity_verification.gate_check_batch';
export const MAX_GATE_CHECK_BATCH = 100;

// Short and bounded: the caller is waiting on an HTTP publish request. Sits between
// the 2s used by messaging-service's blocks RPC and the 10s used for category
// matching. The same value is set as the message TTL, so a request sent while
// identity-verification-service is down does not sit in the queue and get
// answered long after the caller has already failed closed.
export const IDENTITY_GATE_TIMEOUT_MS = 3000;

// RABBITMQ_URI first, then RABBITMQ_URL (the only broker variable the frozen
// env templates define). If neither is set, or the broker in use is not the one
// identity-verification-service listens on, the gate request goes unanswered
// and the action fails closed (503) - an unanswered gate is never an open gate.
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

  /**
   * The gate decision for many accounts, in one request per MAX_GATE_CHECK_BATCH
   * accounts (G5). All-or-nothing: if any chunk is unanswered, errors, times
   * out, or returns anything that is not a well-formed, self-consistent set of
   * decisions for exactly the accounts asked about, the whole call throws and
   * the caller must treat every account as not visible. An account the reply
   * does not mention is simply absent from the result - never "open".
   */
  async checkGateBatch(userIds: string[]): Promise<Map<string, AccountGateDecision>> {
    const unique = Array.from(new Set(userIds.filter((id) => typeof id === 'string' && id.trim().length > 0)));
    if (unique.length === 0) return new Map();

    if (!resolveBrokerUrl(this.config)) {
      this.logger.warn(
        'RABBITMQ_URI/RABBITMQ_URL not set - cannot reach identity-verification-service; roster gate fails closed.',
      );
      throw new IdentityVerificationUnavailableException();
    }

    const chunks: string[][] = [];
    for (let i = 0; i < unique.length; i += MAX_GATE_CHECK_BATCH) {
      chunks.push(unique.slice(i, i + MAX_GATE_CHECK_BATCH));
    }

    const results = await Promise.all(chunks.map((chunk) => this.checkChunk(chunk)));
    const merged = new Map<string, AccountGateDecision>();
    for (const part of results) for (const [id, decision] of part) merged.set(id, decision);
    return merged;
  }

  private async checkChunk(chunk: string[]): Promise<Map<string, AccountGateDecision>> {
    let reply: unknown;
    try {
      const record = new RmqRecordBuilder({ userIds: chunk })
        .setOptions({ expiration: IDENTITY_GATE_TIMEOUT_MS })
        .build();
      reply = await firstValueFrom(
        this.client.send<unknown>(ACCOUNT_GATE_CHECK_BATCH_PATTERN, record).pipe(timeout(IDENTITY_GATE_TIMEOUT_MS)),
      );
    } catch (err) {
      this.logger.warn(
        `${ACCOUNT_GATE_CHECK_BATCH_PATTERN} RPC failed for ${chunk.length} accounts: ${describeError(err)} — roster gate fails closed.`,
      );
      throw new IdentityVerificationUnavailableException();
    }

    const decisions = parseBatchReply(reply, chunk);
    if (!decisions) {
      this.logger.warn(
        `${ACCOUNT_GATE_CHECK_BATCH_PATTERN} returned an unusable reply for ${chunk.length} accounts — roster gate fails closed.`,
      );
      throw new IdentityVerificationUnavailableException();
    }
    return decisions;
  }
}

// A batch reply is trusted only if it is { decisions: [...] } and every entry is
// a well-formed, self-consistent decision (same rules as a single reply) for an
// account that was actually asked about, with no account repeated. One bad
// entry discards the whole reply: a partly-readable answer is not an answer.
function parseBatchReply(reply: unknown, requested: string[]): Map<string, AccountGateDecision> | null {
  if (typeof reply !== 'object' || reply === null) return null;
  const decisions = (reply as Record<string, unknown>).decisions;
  if (!Array.isArray(decisions)) return null;

  const asked = new Set(requested);
  const out = new Map<string, AccountGateDecision>();
  for (const entry of decisions) {
    if (typeof entry !== 'object' || entry === null) return null;
    const userId = (entry as Record<string, unknown>).userId;
    if (typeof userId !== 'string' || !asked.has(userId) || out.has(userId)) return null;
    const decision = parseDecision(entry);
    if (!decision) return null;
    out.set(userId, decision);
  }
  return out;
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
    // A broker connect failure serializes as { err, url }, and a hosted broker's
    // URL carries its password: drop the credentials before this reaches a log.
    return (JSON.stringify(err) ?? String(err)).replace(/(amqps?:\/\/)[^@\s"/]+@/gi, '$1');
  } catch {
    return String(err);
  }
}
