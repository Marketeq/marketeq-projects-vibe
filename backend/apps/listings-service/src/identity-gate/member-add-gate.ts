import { Injectable } from '@nestjs/common';
import { isUUID } from 'class-validator';
import { IdentityVerificationGateClient } from './identity-verification-gate.client';
import { IdentityVerificationUnavailableException } from './identity-gate.exceptions';

// G7 (Christopher): a person added to a team or project roster by a DIRECT route
// must pass the same verification gate as one who joins by accepting an invitation.
// The gate applies to the RESULTING MEMBERSHIP: the subject is always the person
// being added (never the owner/admin doing it), read from identity-verification-
// service, never from the request.
//
// A request that adds several people is NEVER failed because one is blocked: every
// person is evaluated (ONE batch gate request, never one per member), every eligible
// person is added, and the caller gets one result per input, in input order, with
// distinct codes:
//   added                 the membership was created
//   already_member        was already on the roster (nothing created, not re-gated)
//   blocked_verification  gate closed - NOT added; error VERIFICATION_REQUIRED
//                         (the same code invitation acceptance returns)
//   invalid               not a usable user id - NOT added; error INVALID_MEMBER
//   duplicate             repeated earlier in the same request - NOT added again;
//                         error DUPLICATE_MEMBER
// (`unauthorized` is a whole-request outcome - the existing owner check refuses the
// request before anything is evaluated.)
//
// If the gate cannot be evaluated (broker down, timeout, unusable reply) nothing in
// the request is added and the request fails exactly as an invitation acceptance
// does: 503 IDENTITY_VERIFICATION_UNAVAILABLE - an unanswered gate is a closed gate.
export const VERIFICATION_REQUIRED = 'VERIFICATION_REQUIRED';
export const INVALID_MEMBER = 'INVALID_MEMBER';
export const DUPLICATE_MEMBER = 'DUPLICATE_MEMBER';

export type MemberAddStatus = 'added' | 'already_member' | 'blocked_verification' | 'invalid' | 'duplicate';

export interface MemberAddResult {
  /** Position of the input entry this result answers (inputs and results are 1:1, in order). */
  index: number;
  userId: string | null;
  added: boolean;
  status: MemberAddStatus;
  /** Present for every entry that was not added (and not already a member). */
  error?: string;
  message?: string;
}

export interface MemberAddOutcome {
  /** Per-input results, same length and order as the input. */
  results: MemberAddResult[];
  /** For each input index: may this entry stay on / join the roster? */
  keep: boolean[];
}

@Injectable()
export class MemberAddGate {
  constructor(private readonly gateClient: IdentityVerificationGateClient) {}

  /**
   * @param requested  the user id of each requested roster entry, in order (null/garbage = invalid)
   * @param existing   ids already on the roster (not creating a membership, so not gated)
   * @param exempt     ids that are NOT a new membership by this action - e.g. the creator's own
   *                   membership of the team they are creating (bootstrap)
   */
  async evaluate(requested: unknown[], existing: Iterable<string>, exempt: Iterable<string> = []): Promise<MemberAddOutcome> {
    const have = new Set(Array.from(existing, String));
    const skip = new Set(Array.from(exempt, String));
    const seen = new Set<string>();
    const results: MemberAddResult[] = new Array(requested.length);
    const keep: boolean[] = new Array(requested.length).fill(false);
    const toGate: Array<{ index: number; userId: string }> = [];

    requested.forEach((raw, index) => {
      const id = typeof raw === 'string' && raw.trim() ? raw.trim() : null;
      if (!id) {
        results[index] = {
          index, userId: null, added: false, status: 'invalid', error: INVALID_MEMBER,
          message: 'This entry is not a valid user.',
        };
        return;
      }
      if (seen.has(id)) {
        results[index] = {
          index, userId: id, added: false, status: 'duplicate', error: DUPLICATE_MEMBER,
          message: 'This person appears more than once in the request.',
        };
        return;
      }
      seen.add(id);
      // Someone already on the roster is not a new membership (and may carry an id
      // format that predates user ids), so they are kept without being re-gated.
      if (have.has(id)) {
        results[index] = { index, userId: id, added: false, status: 'already_member' };
        keep[index] = true;
        return;
      }
      if (!isUUID(id)) {
        results[index] = {
          index, userId: null, added: false, status: 'invalid', error: INVALID_MEMBER,
          message: 'This entry is not a valid user.',
        };
        return;
      }
      if (skip.has(id)) {
        results[index] = { index, userId: id, added: true, status: 'added' };
        keep[index] = true;
        return;
      }
      toGate.push({ index, userId: id });
    });

    if (toGate.length > 0) {
      // ONE batch request for everyone who would be a new membership. Any failure
      // (no broker, RPC error, timeout, malformed reply) throws
      // IdentityVerificationUnavailableException before anything is written.
      const decisions = await this.gateClient.checkGateBatch(toGate.map((t) => t.userId));
      for (const { index, userId } of toGate) {
        const open = decisions.get(userId)?.gateOpen === true; // absent from the reply = not open
        if (open) {
          results[index] = { index, userId, added: true, status: 'added' };
          keep[index] = true;
        } else {
          results[index] = {
            index, userId, added: false, status: 'blocked_verification', error: VERIFICATION_REQUIRED,
            message: 'This person has to verify their account before they can be added.',
          };
        }
      }
    }
    return { results, keep };
  }
}

export { IdentityVerificationUnavailableException };
