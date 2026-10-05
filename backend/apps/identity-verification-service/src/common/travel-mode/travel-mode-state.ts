import {
  DeclaredDuration,
  TravelClassification,
} from '../../entities/enums/identity-verification.enums';
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
