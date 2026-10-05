import {
  IdentityVerificationStatus,
  LocationVerificationStatus,
  TravelClassification,
} from '../../entities/enums/identity-verification.enums';
import { FAILED_FINAL_COOLDOWN_MS, hasFailedFinalCooldownElapsed } from '../attempt-limit/hosted-kyc-attempt-cycle';
import { RETRY_LIMIT } from '../attempt-limit/account-wide-attempt-count';
import { HOME_COUNTRY_CONFIRMATION_WINDOW_MS } from '../../services/free-kyc.service';
import { travelModeBlocksNewSession } from '../travel-mode/travel-mode-state';

// Backward-compatible verification summary: additive fields exposed on
// GET /v1/identity-verification/me (the account holder's own view; TRVG2 §6 lets
// the holder see their own status and remaining attempts) and on the internal
// status read. Existing fields are never changed or removed, and nothing here
// carries a Didit session id, vendor reason, document data, coordinates or any
// identifier — only statuses, counts, booleans and one timestamp.
//
// nextAction is a STABLE contract that lets the frontend render a state without
// re-implementing backend rules. Values are only ever added, never renamed or
// removed; a client must treat an unknown value as "no action available".
//
//   complete           identity AND location are verified — nothing to do
//   confirm_location   the user must confirm their home country first: location is not
//                      verified, or the next step is to START a session but the
//                      new-session requirements are not met (no confirmation, confirmation
//                      older than 15 minutes, or travel mode on). Also: identity verified
//                      but location not. The existing "Yes, this is my home country"
//                      dialog confirms location and, when a session is due, starts it.
//   start_identity     first hosted session can be started now
//   continue_identity  an unfinished hosted session exists — resume it (no new checks)
//   await_review       Didit has the session in review — nothing to do yet
//   retry_identity     a previous attempt failed and a new one can be started
//                      (including a final failure whose 24-hour cooldown has elapsed)
//   wait_for_retry     no retry is available yet: three attempts used (retryAvailableAt
//                      says when the cooldown ends) or a block with no self-service path
//   reverify_identity  the verification expired — start a new session to re-verify
export const NEXT_ACTIONS = [
  'confirm_location',
  'start_identity',
  'continue_identity',
  'await_review',
  'retry_identity',
  'wait_for_retry',
  'reverify_identity',
  'complete',
] as const;
export type NextAction = (typeof NEXT_ACTIONS)[number];

export interface VerificationSummary {
  /** identity === verified AND location === verified. Never grace-period aware. */
  fullyVerified: boolean;
  nextAction: NextAction;
  /** Hosted attempts used in the current retry cycle; 3 while a final failure is cooling down. */
  attemptsUsed: number;
  attemptsRemaining: number;
  maxAttempts: number;
  /** A previous attempt failed, attempts remain, and no cooldown is running. */
  canRetry: boolean;
  /** ISO timestamp the cooldown ends; only while waiting out a final failure and the clock is valid. */
  retryAvailableAt: string | null;
  /** An unfinished hosted session exists: created, in progress, or in review. */
  hasActiveSession: boolean;
}

export interface VerificationSummaryInput {
  identityStatus: IdentityVerificationStatus;
  locationStatus: LocationVerificationStatus;
  failedFinalAt: unknown;
  /** Hosted-session attempts in the current retry cycle (see hosted-kyc-attempt-cycle.ts). */
  hostedCycleAttempts: number;
  /** A RESUMABLE session exists (created or in progress): drives continue_identity. */
  hasActiveHostedSession: boolean;
  /**
   * Any unfinished session, including one waiting in review: drives hasActiveSession.
   * Optional; when omitted it equals hasActiveHostedSession.
   */
  hasUnfinishedHostedSession?: boolean;
  // What a NEW session requires (mirrors FreeKycService's start rules).
  verifiedHomeCountry: string | null;
  verifiedHomeCountryConfirmedAt: unknown;
  travelModeActive: boolean;
  travelClassification: TravelClassification | null;
  // Activation time and declared duration decide whether Travel Mode is still
  // in force (see common/travel-mode/travel-mode-state.ts). Absent means null.
  travelModeActivatedAt?: unknown;
  declaredDuration?: unknown;
  nowMs: number;
}

/**
 * Mirrors the rules FreeKycService enforces before creating a NEW session:
 * location verified, a home country on record, no Travel Mode in force (active or
 * pending a duration; an expired one does not count), and a confirmation no older
 * than the 15-minute window. (Resuming needs none of it.)
 * A parity test runs this against the real start path so the two cannot drift.
 */
export function newSessionRequirementsMet(input: VerificationSummaryInput): boolean {
  if (input.locationStatus !== LocationVerificationStatus.VERIFIED) return false;
  if (!input.verifiedHomeCountry) return false;
  const confirmedAt = input.verifiedHomeCountryConfirmedAt;
  if (!(confirmedAt instanceof Date) || !Number.isFinite(confirmedAt.getTime())) return false;
  if (travelModeBlocksNewSession(input, input.nowMs)) return false;
  return input.nowMs - confirmedAt.getTime() <= HOME_COUNTRY_CONFIRMATION_WINDOW_MS;
}

export function buildVerificationSummary(input: VerificationSummaryInput): VerificationSummary {
  const fullyVerified =
    input.identityStatus === IdentityVerificationStatus.VERIFIED &&
    input.locationStatus === LocationVerificationStatus.VERIFIED;

  const isFailedFinal = input.identityStatus === IdentityVerificationStatus.FAILED_FINAL;
  const cooldownElapsed = isFailedFinal && hasFailedFinalCooldownElapsed(input.failedFinalAt, input.nowMs);
  // Read-only projection of the lazy cooldown: once elapsed the account is startable,
  // exactly as the start path will treat it (nothing is written here).
  const coolingDown = isFailedFinal && !cooldownElapsed;

  const attemptsUsed = coolingDown ? RETRY_LIMIT : clampAttempts(input.hostedCycleAttempts);
  const attemptsRemaining = RETRY_LIMIT - attemptsUsed;
  const failedOrRetryable = input.identityStatus === IdentityVerificationStatus.FAILED || cooldownElapsed;

  return {
    fullyVerified,
    nextAction: nextActionFor(input, { fullyVerified, coolingDown, cooldownElapsed }),
    attemptsUsed,
    attemptsRemaining,
    maxAttempts: RETRY_LIMIT,
    canRetry: failedOrRetryable && attemptsRemaining > 0,
    retryAvailableAt: coolingDown ? retryAvailableAt(input.failedFinalAt, input.nowMs) : null,
    hasActiveSession: input.hasUnfinishedHostedSession ?? input.hasActiveHostedSession,
  };
}

function clampAttempts(n: number): number {
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.min(Math.floor(n), RETRY_LIMIT);
}

function nextActionFor(
  input: VerificationSummaryInput,
  state: { fullyVerified: boolean; coolingDown: boolean; cooldownElapsed: boolean },
): NextAction {
  if (state.fullyVerified) return 'complete';
  // Identity is done but location is not: only the location needs confirming.
  if (input.identityStatus === IdentityVerificationStatus.VERIFIED) return 'confirm_location';
  if (state.coolingDown) return 'wait_for_retry';
  switch (input.identityStatus) {
    case IdentityVerificationStatus.BLOCKED_DUPLICATE:
    case IdentityVerificationStatus.BLOCKED_AGE:
      return 'wait_for_retry'; // no self-service path (how to present this is a product decision)
    case IdentityVerificationStatus.PENDING:
      return 'await_review';
    case IdentityVerificationStatus.IN_PROGRESS:
      if (input.hasActiveHostedSession) return 'continue_identity'; // resume needs no new-session checks
      break;
    default:
      break;
  }

  // Everything left needs a NEW session, so the new-session requirements apply first.
  if (!newSessionRequirementsMet(input)) return 'confirm_location';

  switch (input.identityStatus) {
    case IdentityVerificationStatus.EXPIRED:
      return 'reverify_identity';
    case IdentityVerificationStatus.FAILED:
      return 'retry_identity';
    case IdentityVerificationStatus.FAILED_FINAL: // only here when the cooldown has elapsed
      return state.cooldownElapsed ? 'retry_identity' : 'wait_for_retry';
    case IdentityVerificationStatus.UNSTARTED:
    case IdentityVerificationStatus.IN_PROGRESS: // no unfinished session to resume
    default:
      return 'start_identity';
  }
}

// Only a valid, not-in-the-future timestamp yields a date; anything else fails
// closed to null rather than inventing a retry time.
function retryAvailableAt(failedFinalAt: unknown, nowMs: number): string | null {
  if (!(failedFinalAt instanceof Date)) return null;
  const at = failedFinalAt.getTime();
  if (!Number.isFinite(at) || at > nowMs) return null;
  return new Date(at + FAILED_FINAL_COOLDOWN_MS).toISOString();
}
