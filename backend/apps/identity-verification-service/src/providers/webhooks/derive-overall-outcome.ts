// Pure combination rule: a biometric (hosted) session's Approved status
// must NEVER, by itself, mark an account verified. The document-check
// result must independently also be satisfied. No side effects, no DB, no
// wiring into any controller/service — this only proves the combination
// logic itself is correct and tested; where its two inputs actually come
// from (which webhook belongs to which of our two stages, persisted
// correlation between a document-check session_id and a biometric
// session_id) is the orchestration/schema dependency this pass reports
// rather than invents. See this directory's other files' headers for the
// same point.

export type StageOutcome = 'approved' | 'declined' | 'pending';

export interface OverallOutcomeInput {
  documentCheck: StageOutcome;
  biometricSession: StageOutcome;
}

export type OverallOutcome = 'verified' | 'declined' | 'pending';

/**
 * Both stages must be independently 'approved' for the overall result to
 * be 'verified'. Either stage 'declined' makes the whole thing 'declined'
 * — a biometric Approved does not override or compensate for a declined
 * document, and vice versa. Anything else (either stage still pending) is
 * 'pending' — never silently treated as verified.
 */
export function deriveOverallOutcome({
  documentCheck,
  biometricSession,
}: OverallOutcomeInput): OverallOutcome {
  if (documentCheck === 'declined' || biometricSession === 'declined') {
    return 'declined';
  }
  if (documentCheck === 'approved' && biometricSession === 'approved') {
    return 'verified';
  }
  return 'pending';
}
