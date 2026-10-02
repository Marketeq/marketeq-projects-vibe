import { In, Repository } from 'typeorm';
import { HostedKycSession } from '../../entities/hosted-kyc-session.entity';
import { VerificationAttempt } from '../../entities/verification-attempt.entity';
import { HostedKycSessionStatus } from '../../entities/enums/identity-verification.enums';
import { RETRY_LIMIT } from './account-wide-attempt-count';

// Hosted Free KYC attempt accounting, per RETRY CYCLE.
//
// Why this exists: the shared account-wide counter (account-wide-attempt-count.ts)
// counts every verification_attempts row a profile has ever had, across both the
// legacy document pipelines and Free KYC, and nothing ever resets it. After the
// failed_final cooldown cleared the status back to unstarted, the three old rows
// still counted, so every new start was refused forever. Rows must stay as audit
// history, so the cycle is DERIVED from the history instead of deleting or
// resetting anything — no schema change.
//
// A cycle is a run of hosted-session attempts that ends at the first of:
//   - the decline that reaches RETRY_LIMIT (the profile becomes failed_final; the
//     next cycle begins once the existing cooldown returns it to unstarted), or
//   - an approval (verified closes the active cycle; if the KYC later expires and
//     the user re-verifies, that is a new cycle).
// Only attempts that belong to a hosted session count: legacy document-pipeline
// rows (whose vendor_session_id is not a hosted session) are never counted here.
// Rows are never modified or deleted.

// How long a profile stays failed_final before a fresh retry cycle may begin.
// Matches the 24-hour cooldown the daily sweep applies in
// IdentityVerificationService.clearExpiredFailedFinal (TRVG2 §3); the two must
// stay equal (unifying them is a later cleanup — that service is outside Part 1).
export const FAILED_FINAL_COOLDOWN_MS = 24 * 60 * 60 * 1000;

/**
 * True only when `failedFinalAt` is a valid timestamp that is not in the future
 * and at least FAILED_FINAL_COOLDOWN_MS old (exactly 24 hours counts as elapsed).
 * A missing, non-date, unparsable or future-dated value is never "elapsed" — it
 * fails closed, so a corrupt timestamp can never unlock the account.
 */
export function hasFailedFinalCooldownElapsed(failedFinalAt: unknown, nowMs: number): boolean {
  if (!(failedFinalAt instanceof Date)) return false;
  const at = failedFinalAt.getTime();
  if (!Number.isFinite(at) || !Number.isFinite(nowMs)) return false;
  if (at > nowMs) return false;
  return nowMs - at >= FAILED_FINAL_COOLDOWN_MS;
}

export interface CycleSession {
  id?: string;
  diditSessionId: string;
  status: HostedKycSessionStatus;
  createdAt: Date;
}

/**
 * Pure derivation. `attemptedSessionIds` is the set of hosted session ids that
 * already have a verification_attempts row (one per declined session). Returns
 * the number of attempts in the CURRENT cycle: 0..RETRY_LIMIT-1 (a full cycle
 * closes itself, so the current cycle after a final failure is empty).
 */
export function computeHostedKycCycleAttemptCount(
  sessions: ReadonlyArray<CycleSession>,
  attemptedSessionIds: ReadonlySet<string>,
  limit: number = RETRY_LIMIT,
): number {
  const ordered = [...sessions].sort((a, b) => {
    const byTime = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    if (byTime !== 0) return byTime;
    return (a.id ?? a.diditSessionId).localeCompare(b.id ?? b.diditSessionId);
  });

  let count = 0;
  for (const session of ordered) {
    if (session.status === HostedKycSessionStatus.APPROVED || session.status === HostedKycSessionStatus.KYC_EXPIRED) {
      // Approval closes the cycle (a kyc_expired session was approved first).
      count = 0;
      continue;
    }
    if (session.status === HostedKycSessionStatus.DECLINED && attemptedSessionIds.has(session.diditSessionId)) {
      count += 1;
      if (count >= limit) count = 0; // final failure closes the cycle
    }
    // created / in_progress / in_review / abandoned / expired never count.
  }
  return count;
}

export interface HostedKycCycleRepositories {
  sessionRepository: Pick<Repository<HostedKycSession>, 'find'>;
  attemptRepository: Pick<Repository<VerificationAttempt>, 'find'>;
}

export async function getHostedKycCycleAttemptCount(
  repos: HostedKycCycleRepositories,
  profileId: string,
): Promise<number> {
  const sessions = await repos.sessionRepository.find({
    where: { profileId },
    order: { createdAt: 'ASC' },
  });
  if (sessions.length === 0) return 0;

  const attempts = await repos.attemptRepository.find({
    where: { vendorSessionId: In(sessions.map((s) => s.diditSessionId)) },
  });
  const attempted = new Set(attempts.map((a) => a.vendorSessionId));
  return computeHostedKycCycleAttemptCount(sessions, attempted);
}
