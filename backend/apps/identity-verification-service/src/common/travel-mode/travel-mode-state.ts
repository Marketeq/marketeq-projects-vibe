import { IsNull, Repository } from 'typeorm';
import {
  DeclaredDuration,
  TravelClassification,
} from '../../entities/enums/identity-verification.enums';
import { IdentityVerificationProfile } from '../../entities/identity-verification-profile.entity';
import {
  HomeCountryChangeFields,
  isRelocationUnfinished,
} from '../home-country-change/home-country-change';
import {
  travelModeEndsAt,
  travelReminderOccurrences,
} from './travel-mode-duration';

// What a profile's stored Travel Mode fields mean at a given instant.
//
//   active    a valid activation (activation time and a known duration) and now < endsAt
//   expired   a valid activation and now >= endsAt (whatever the raw active flag says)
//   invalid   the raw active flag is set but there is no valid activation, so there is
//             no trustworthy end
//   pending   classified Temporarily Traveling with no valid activation and the raw
//             flag off: the duration step has not been completed
//   none      anything else
export type TravelModeState = 'none' | 'pending' | 'active' | 'expired' | 'invalid';

export interface TravelModeFields {
  travelClassification?: TravelClassification | null;
  travelModeActive?: boolean | null;
  travelModeActivatedAt?: unknown;
  declaredDuration?: unknown;
  /** Saved check-in duration answers in this Travel Mode cycle (absent counts as 0). */
  travelCheckInCount?: number | null;
}

/** The first check-in of this cycle has been answered (a duration answer was saved). */
export function hasAnsweredFirstCheckIn(fields: TravelModeFields): boolean {
  return typeof fields.travelCheckInCount === 'number' && fields.travelCheckInCount > 0;
}

export interface DerivedTravelMode {
  state: TravelModeState;
  /** The instant Travel Mode ends; null whenever there is no valid activation. */
  endsAt: Date | null;
}

/**
 * Pure: the caller supplies the clock. A clock that is not a finite number
 * cannot prove an activation ended, so a valid activation then reads as active
 * (fail closed).
 */
export function deriveTravelModeState(fields: TravelModeFields, nowMs: number): DerivedTravelMode {
  const endsAt =
    fields.travelModeActivatedAt instanceof Date && fields.declaredDuration
      ? travelModeEndsAt(fields.travelModeActivatedAt, fields.declaredDuration as DeclaredDuration)
      : null;

  if (endsAt) return { state: nowMs >= endsAt.getTime() ? 'expired' : 'active', endsAt };
  if (fields.travelModeActive) return { state: 'invalid', endsAt: null };
  if (fields.travelClassification === TravelClassification.TEMPORARILY_TRAVELING) {
    return { state: 'pending', endsAt: null };
  }
  return { state: 'none', endsAt: null };
}

/**
 * Whether Travel Mode stops a NEW hosted verification session from starting
 * (and makes the summary ask for confirm_location). One rule for both the
 * summary and the real start path: active blocks, pending blocks, expired does
 * not, and invalid blocks only while the classification is Temporarily
 * Traveling.
 */
export function travelModeBlocksNewSession(fields: TravelModeFields, nowMs: number): boolean {
  const { state } = deriveTravelModeState(fields, nowMs);
  return (
    state === 'active' ||
    (fields.travelClassification === TravelClassification.TEMPORARILY_TRAVELING && state !== 'expired')
  );
}

/**
 * Whether Travel Mode keeps the new-location prompt from being offered. Unlike
 * travelModeBlocksNewSession it ignores `pending` (classified Temporarily Traveling
 * with no duration, never activated): the old flow saved that on a button click and
 * left the account stranded, and an account in it must be able to reach the
 * mismatch flow again. Active, and invalid raw-active data for a traveler, still
 * suppress it.
 */
export function travelModeSuppressesLocationPrompt(fields: TravelModeFields, nowMs: number): boolean {
  const { state } = deriveTravelModeState(fields, nowMs);
  return (
    state === 'active' ||
    (fields.travelClassification === TravelClassification.TEMPORARILY_TRAVELING && state === 'invalid')
  );
}

export interface TravelReminderFields
  extends TravelModeFields, HomeCountryChangeFields {
  /**
   * The time up to which check-in occurrences are RESOLVED (not "shown"): written only by a
   * saved duration answer (which restarts the schedule and clears it) or by starting the
   * home-country update flow. Opening, closing, skipping or refreshing never moves it.
   */
  lastTravelReminderSentAt?: unknown;
}

export interface TravelReminderSchedule {
  /** An unresolved check-in is due now. */
  due: boolean;
  /** The time of the earliest unresolved check-in; null when nothing is left. */
  availableAt: Date | null;
}

/**
 * When the next "Still traveling?" check-in is due (day 3, then day 6 or 7 of the duration,
 * counted from the activation or the latest saved answer). Pure, from the activation, the
 * duration, the resolved-up-to time, the effective state and the caller's clock; the job's
 * reminder cursor is never read.
 *
 * An occurrence is resolved when `lastTravelReminderSentAt >= its time`. Showing it does
 * not resolve it, so it stays due (with its own time) until a duration answer is saved or
 * the home-country update flow is started: a closed, skipped or refreshed check-in is
 * reported again. Anything that is not an active period (expired, inactive, invalid,
 * pending or none), a completed schedule, an unusable resolved-up-to time, or a
 * home-country change that is running or waiting for a decision (it owns the screen and
 * refuses a duration answer) yields due false and no time (fail closed).
 *
 * `loginReminderAt` (optional) adds the caller's login occurrence (authentication + 5
 * minutes, see deriveLoginReminderAt); the earliest unresolved of the two is reported.
 * Omitted, the result is exactly the day schedule.
 */
export function deriveTravelReminderSchedule(
  fields: TravelReminderFields,
  nowMs: number,
  loginReminderAt: Date | null = null,
): TravelReminderSchedule {
  const none: TravelReminderSchedule = { due: false, availableAt: null };
  const { state, endsAt } = deriveTravelModeState(fields, nowMs);
  if (state !== 'active' || !fields.travelModeActive || !endsAt) return none;
  if (isRelocationUnfinished(fields)) return none;

  let resolvedUpToMs = Number.NEGATIVE_INFINITY;
  const resolved = fields.lastTravelReminderSentAt;
  if (resolved !== null && resolved !== undefined) {
    if (!(resolved instanceof Date) || !Number.isFinite(resolved.getTime()))
      return none;
    resolvedUpToMs = resolved.getTime();
  }

  const day = travelReminderOccurrences(
    fields.travelModeActivatedAt as Date,
    endsAt,
    fields.declaredDuration as DeclaredDuration,
  ).find((due) => due.getTime() > resolvedUpToMs);
  // The caller's own login occurrence, already checked to be unresolved for THIS login. It
  // never outlives the period.
  const login =
    loginReminderAt instanceof Date &&
    Number.isFinite(loginReminderAt.getTime()) &&
    loginReminderAt.getTime() < endsAt.getTime() &&
    loginReminderAt.getTime() > resolvedUpToMs
      ? loginReminderAt
      : null;
  const next = day && login ? (login.getTime() < day.getTime() ? login : day) : (day ?? login);
  return next ? { due: next.getTime() <= nowMs, availableAt: next } : none;
}

// Fixed text only: never an identifier or a stored value.
const INVALID_TRAVEL_DATA_WARNING = 'Travel Mode fail-safe: reason=invalid_travel_data';

/**
 * Persists the end of Travel Mode the first time a profile is read after it is
 * over (lazy expiry; a daily backstop is a separate part). It acts only on a
 * profile whose raw flag is still set and whose state is `expired`, or
 * `invalid` (no trustworthy end: a fail-safe). Nothing else is written: the
 * classification, declared duration, activation time and last reminder time
 * all stay.
 *
 * The write is a compare-and-set on the id, the raw flag still being true and
 * the activation time and duration this call observed (null matches null), so
 * it can never overwrite a new activation, a home-country confirmation or
 * another expiry. When it loses, the fresh row is reloaded and returned and
 * nothing is written. When nothing is due there is no update and no reload.
 */
export async function expireTravelModeIfDue(
  repository: Repository<IdentityVerificationProfile>,
  profile: IdentityVerificationProfile,
  nowMs: number,
  logger?: { warn: (message: string) => void },
): Promise<IdentityVerificationProfile> {
  if (!profile.travelModeActive) return profile;
  const { state } = deriveTravelModeState(profile, nowMs);
  if (state !== 'expired' && state !== 'invalid') return profile;

  const activatedAt = profile.travelModeActivatedAt;
  const observedActivation =
    activatedAt instanceof Date && Number.isFinite(activatedAt.getTime()) ? activatedAt : IsNull();
  const result = await repository.update(
    {
      id: profile.id,
      travelModeActive: true,
      travelModeActivatedAt: observedActivation,
      declaredDuration: profile.declaredDuration ?? IsNull(),
    },
    { travelModeActive: false, nextTravelReminderAt: null },
  );

  if (result.affected !== 1) {
    return (await repository.findOne({ where: { id: profile.id } })) ?? profile;
  }
  if (state === 'invalid') logger?.warn(INVALID_TRAVEL_DATA_WARNING);
  profile.travelModeActive = false;
  profile.nextTravelReminderAt = null;
  return profile;
}
