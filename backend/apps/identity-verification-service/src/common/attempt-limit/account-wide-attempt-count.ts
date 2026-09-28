import { DataSource, IsNull, MoreThan, Not, Repository } from 'typeorm';
import { VerificationAttempt } from '../../entities/verification-attempt.entity';
import { PendingVerificationSession } from '../../entities/pending-verification-session.entity';
import { IdentityDocument } from '../../entities/identity-document.entity';
import { AttemptReservation } from '../../entities/attempt-reservation.entity';
import { RetryLimitExceededException } from '../errors/domain-exceptions';

// TRVG2 §2's gate-table note / Answer 3: the 3-attempt ceiling is
// account-wide (profile_id alone), not per-document, and must not be
// bypassable by mixing the two verification pipelines this service runs.
export const RETRY_LIMIT = 3;

// How long a reservation (see reserveAttemptSlot below) counts toward the
// ceiling before it is treated as abandoned.
//
// Source of this number: NOT vendor-documented, NOT a measured SLA — an
// engineering placeholder, stated plainly rather than implied as
// authoritative. What it needs to be longer than is concrete, though:
// DiditStandaloneIdVerificationProvider.FETCH_TIMEOUT_MS and
// DiditHostedBiometricSessionProvider's FETCH_TIMEOUT_MS (both 30s) bound
// how long the vendor call a reservation protects can stay pending before
// this codebase forcibly aborts it into an AmbiguousVendorOutcomeError.
// 2 minutes gives ~4x margin over that 30s bound plus processing/network
// overhead. If either FETCH_TIMEOUT_MS ever changes, this must stay
// comfortably larger, or the reasoning below breaks.
//
// Three distinct states this ceiling has to reason about, not two:
//  1. Reservation (this table): "in flight, outcome not yet known to us."
//     Created before the vendor call, deleted (reserveAttemptSlot's
//     release()) once the outcome IS known — confirmed or a DEFINITE
//     failure (a response was received, or no vendor call was needed at
//     all, e.g. a local validation error). It is NOT deleted on an
//     AmbiguousVendorOutcomeError (no response received at all) — see
//     TwoStageVerificationService.checkDocumentWithVendor's catch block —
//     because we have no evidence the vendor did not process the request;
//     releasing it there would let a lost-response retry spend unlimited
//     additional vendor calls while never counting against the ceiling,
//     which is exactly the "silently bypass attempt limits" failure mode
//     this table exists to prevent.
//  2. In-flight vendor operation: the actual pending HTTP call. Bounded by
//     FETCH_TIMEOUT_MS above — it cannot stay pending past that without
//     either succeeding, receiving an error response, or being aborted.
//     This is what makes "reservation older than RESERVATION_TTL_MS" a
//     trustworthy signal that the operation itself has settled ONE WAY OR
//     ANOTHER (including "we don't know which way," i.e. still
//     AmbiguousVendorOutcomeError) rather than merely still running.
//  3. Finalized attempt: a real, permanent record — VerificationAttempt /
//     PendingVerificationSession (old pipeline) or
//     IdentityDocument.documentCheckedAt (two-stage pipeline). This is
//     what a reservation is superseded BY on success, and what an
//     AmbiguousVendorOutcomeError explicitly does NOT produce — an
//     ambiguous outcome can age out of the count via this TTL, but it
//     never becomes a finalized attempt on its own; only a real,
//     confirmed vendor result (obtained however this gets resolved —
//     manually, or by the user eventually getting a definite result on a
//     later call) does that.
export const RESERVATION_TTL_MS = 2 * 60 * 1000;

export interface AccountWideAttemptRepositories {
  attemptRepository: Repository<VerificationAttempt>;
  pendingSessionRepository: Repository<PendingVerificationSession>;
  documentRepository: Repository<IdentityDocument>;
  reservationRepository: Repository<AttemptReservation>;
}

// Counts, for one profile, across BOTH pipelines:
//  - the old hosted-Sessions-API path: settled VerificationAttempt rows
//    plus still-in-flight PendingVerificationSession rows.
//  - the two-stage path: IdentityDocument rows that have actually been run
//    through Didit's standalone document-check (documentCheckedAt IS NOT
//    NULL) — the point past which "an attempt was spent."
//  - either path's in-flight reservation (see reserveAttemptSlot) that is
//    still fresh (reserved within the last RESERVATION_TTL_MS) — this is
//    what closes the concurrent-request race: two callers racing to spend
//    the SAME (n+1)th attempt cannot both see a count under the ceiling,
//    because the first one to acquire the per-profile advisory lock
//    inserts its reservation (and commits) before the second one's count
//    query can run.
// A stale reservation (older than the TTL, meaning whoever created it
// never confirmed or released it — most likely a process crash) is not
// counted, so it cannot permanently strand an account at the ceiling.
export async function getAccountWideAttemptCount(
  repos: AccountWideAttemptRepositories,
  profileId: string,
): Promise<number> {
  const staleCutoff = new Date(Date.now() - RESERVATION_TTL_MS);
  const [oldSettled, oldPending, twoStageChecked, freshReservations] = await Promise.all([
    repos.attemptRepository.count({ where: { profileId } }),
    repos.pendingSessionRepository.count({ where: { profileId } }),
    repos.documentRepository.count({ where: { profileId, documentCheckedAt: Not(IsNull()) } }),
    repos.reservationRepository.count({ where: { profileId, reservedAt: MoreThan(staleCutoff) } }),
  ]);
  return oldSettled + oldPending + twoStageChecked + freshReservations;
}

export interface AttemptReservationHandle {
  /**
   * Must be called exactly once, whether the vendor call that followed the
   * reservation succeeded or failed. On success the reservation is simply
   * superseded by the real persisted attempt (VerificationAttempt /
   * PendingVerificationSession / IdentityDocument.documentCheckedAt) that
   * now counts instead — releasing it back out is a no-op for the ceiling.
   * On failure, releasing it means the outage cost no attempt.
   */
  release(): Promise<void>;
  /** 1-based attempt number this reservation represents, computed from the
   * count taken at reservation time (before this reservation existed). */
  attemptNumber: number;
}

// Atomically checks the account-wide ceiling and inserts a reservation row
// under a per-profile Postgres advisory lock, so two concurrent calls for
// the same profile cannot both read a count under the ceiling and both
// proceed — the second call blocks on the lock until the first one's
// transaction commits (reservation inserted) or rolls back (limit
// exceeded), and only then runs its own count, which by then reflects the
// first call's reservation. This is the piece a plain count-then-act check
// cannot provide on its own.
//
// Does NOT hold the lock or the transaction across any vendor/network
// call — it commits (or rolls back) before returning, exactly like
// submitDocument's own duplicate-detection lock. Callers do the actual
// vendor call afterward, then call the returned handle's release().
export async function reserveAttemptSlot(
  dataSource: DataSource,
  repos: AccountWideAttemptRepositories,
  profileId: string,
): Promise<AttemptReservationHandle> {
  const queryRunner = dataSource.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();
  let reservationId: string;
  let attemptNumber: number;
  try {
    await queryRunner.query('SELECT pg_advisory_xact_lock(hashtext($1))', [profileId]);
    const attemptTotal = await getAccountWideAttemptCount(repos, profileId);
    if (attemptTotal >= RETRY_LIMIT) {
      await queryRunner.rollbackTransaction();
      throw new RetryLimitExceededException();
    }
    attemptNumber = attemptTotal + 1;
    const created = queryRunner.manager.create(AttemptReservation, { profileId });
    const saved = await queryRunner.manager.save(created);
    reservationId = saved.id;
    await queryRunner.commitTransaction();
  } catch (err) {
    if (queryRunner.isTransactionActive) {
      await queryRunner.rollbackTransaction();
    }
    throw err;
  } finally {
    await queryRunner.release();
  }

  return {
    attemptNumber,
    release: async () => {
      try {
        await repos.reservationRepository.delete(reservationId);
      } catch {
        // Best-effort — a leaked row self-heals via RESERVATION_TTL_MS above.
      }
    },
  };
}
