import { IdentityVerificationStatus, LocationVerificationStatus } from '../../entities/enums/identity-verification.enums';
import { isRelocationUnfinished } from './home-country-change';

const S = IdentityVerificationStatus;
const verified = (identityVerificationStatus: IdentityVerificationStatus, pendingHomeCountry: string | null) => ({
  identityVerificationStatus,
  locationVerificationStatus: LocationVerificationStatus.VERIFIED,
  verifiedHomeCountry: 'US',
  pendingHomeCountry,
});

describe('isRelocationUnfinished — what silences the location prompts', () => {
  it.each([S.IN_PROGRESS, S.PENDING])('a live or in-review session (%s) silences them, with or without a claim', (status) => {
    expect(isRelocationUnfinished(verified(status, 'CA'))).toBe(true);
    expect(isRelocationUnfinished(verified(status, null))).toBe(true);
  });

  it.each([S.FAILED, S.FAILED_FINAL, S.BLOCKED_DUPLICATE, S.BLOCKED_AGE])(
    'a claim held through %s keeps them quiet (the retry path owns the screen)',
    (status) => {
      expect(isRelocationUnfinished(verified(status, 'CA'))).toBe(true);
    },
  );

  it.each([
    ['abandoned or expired session (unstarted)', S.UNSTARTED],
    ['session never started (verified)', S.VERIFIED],
    ['claim on an expired verification', S.EXPIRED],
  ])('a claim with no live session is recoverable, not unfinished: %s', (_label, status) => {
    expect(isRelocationUnfinished(verified(status, 'CA'))).toBe(false);
  });

  it('no claim and no live session is not unfinished', () => {
    for (const status of [S.UNSTARTED, S.VERIFIED, S.EXPIRED, S.FAILED]) {
      expect(isRelocationUnfinished(verified(status, null))).toBe(false);
    }
  });
});
