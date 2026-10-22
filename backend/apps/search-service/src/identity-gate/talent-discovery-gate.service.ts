import { Injectable, Logger } from '@nestjs/common';
import { IdentityVerificationGateClient } from './identity-verification-gate.client';

/** Result of asking which accounts may appear in marketplace discovery. */
export interface DiscoveryGateEvaluation {
  /** Accounts identity affirmatively reported gate_open for. */
  visible: Set<string>;
  /** True when identity could not give a usable answer; `visible` is then empty. */
  failed: boolean;
}

/**
 * G1 - a talent account appears in marketplace search and browse results only
 * while gate_open(account) holds (verified, or inside the 30-day grace window).
 * This is a gate on a RESULT SET, so a closed gate is not an error and the
 * viewer is never refused: the account is silently left out.
 *
 * Fail-safe by construction: an account is visible only if identity
 * affirmatively reported it open. Closed, missing profile, absent from the
 * reply, or part of a batch identity could not answer (RPC error, timeout, no
 * broker, malformed reply) all mean "not visible". Never throws; the worst
 * case is an empty result.
 *
 * One batch request per call (chunked at 100 accounts), never one per talent.
 * No decision is cached here - every response is gated at the moment it is
 * built, so a lapsed grace window or a revoked verification takes effect on the
 * next request.
 */
@Injectable()
export class TalentDiscoveryGateService {
  private readonly logger = new Logger(TalentDiscoveryGateService.name);

  constructor(private readonly gate: IdentityVerificationGateClient) {}

  async evaluate(ids: Iterable<string | null | undefined>): Promise<DiscoveryGateEvaluation> {
    const unique = Array.from(
      new Set(Array.from(ids).filter((id): id is string => typeof id === 'string' && id.length > 0)),
    );
    if (unique.length === 0) return { visible: new Set(), failed: false };

    try {
      const decisions = await this.gate.checkGateBatch(unique);
      const visible = new Set<string>();
      for (const [userId, decision] of decisions) {
        if (decision.gateOpen === true) visible.add(userId);
      }
      return { visible, failed: false };
    } catch (err) {
      this.logger.warn(
        `Discovery gate could not be evaluated for ${unique.length} account(s); hiding them: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
      return { visible: new Set(), failed: true };
    }
  }

  async visibleUserIds(ids: Iterable<string | null | undefined>): Promise<Set<string>> {
    return (await this.evaluate(ids)).visible;
  }

  /**
   * Walks an ordered source in pages until `wanted` visible rows are found or
   * the source is exhausted - there is no scan ceiling, so a long run of hidden
   * accounts ahead of visible ones can never make a result short or a total
   * wrong. `wanted: Infinity` returns every visible row. Rows are gated in
   * batches before the caller hydrates or returns anything, so a hidden
   * account's data is never read into a response. If the gate fails, nothing
   * is returned.
   *
   * `fetchChunk` should select only what the gate needs (the account id) plus
   * enough to identify the row; load full rows afterwards for the visible ones.
   */
  async collectVisible<T>(opts: {
    fetchChunk: (offset: number, size: number) => Promise<T[]>
    userIdOf: (row: T) => string | null | undefined
    wanted: number
    chunkSize: number
  }): Promise<T[]> {
    const out: T[] = []
    let offset = 0
    while (out.length < opts.wanted) {
      const chunk = await opts.fetchChunk(offset, opts.chunkSize)
      if (chunk.length === 0) break

      const { visible, failed } = await this.evaluate(chunk.map(opts.userIdOf))
      if (failed) return []
      for (const row of chunk) {
        const id = opts.userIdOf(row)
        if (typeof id === 'string' && visible.has(id)) {
          out.push(row)
          if (out.length >= opts.wanted) break
        }
      }
      if (chunk.length < opts.chunkSize) break
      offset += chunk.length
    }
    return out
  }
}
