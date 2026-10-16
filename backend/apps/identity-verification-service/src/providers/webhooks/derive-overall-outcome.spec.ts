import { deriveOverallOutcome } from './derive-overall-outcome';

describe('deriveOverallOutcome', () => {
  it('is NOT verified when only the biometric session is approved and the document check is still pending', () => {
    expect(
      deriveOverallOutcome({ documentCheck: 'pending', biometricSession: 'approved' }),
    ).toBe('pending');
  });

  it('is NOT verified when only the document check is approved and the biometric session is still pending', () => {
    expect(
      deriveOverallOutcome({ documentCheck: 'approved', biometricSession: 'pending' }),
    ).toBe('pending');
  });

  it('is verified only when both stages are independently approved', () => {
    expect(
      deriveOverallOutcome({ documentCheck: 'approved', biometricSession: 'approved' }),
    ).toBe('verified');
  });

  it('a declined document check declines the whole outcome even if biometrics approved', () => {
    expect(
      deriveOverallOutcome({ documentCheck: 'declined', biometricSession: 'approved' }),
    ).toBe('declined');
  });

  it('a declined biometric session declines the whole outcome even if the document approved', () => {
    expect(
      deriveOverallOutcome({ documentCheck: 'approved', biometricSession: 'declined' }),
    ).toBe('declined');
  });

  it('both pending is pending, not verified', () => {
    expect(
      deriveOverallOutcome({ documentCheck: 'pending', biometricSession: 'pending' }),
    ).toBe('pending');
  });
});
