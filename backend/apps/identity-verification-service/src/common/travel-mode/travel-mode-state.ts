import { IsNull, Repository } from 'typeorm';
import {
  DeclaredDuration,
  TravelClassification,
} from '../../entities/enums/identity-verification.enums';
import { IdentityVerificationProfile } from '../../entities/identity-verification-profile.entity';
import { travelModeEndsAt } from './travel-mode-duration';

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
