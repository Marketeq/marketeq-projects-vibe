import { isUnfinishedSessionResumable, SESSION_CONFIRMATION_SKEW_MS } from './unfinished-session-resumability';

describe('isUnfinishedSessionResumable', () => {
  const NOW = Date.UTC(2026, 9, 26, 12, 0, 0);
  const WINDOW = 15 * 60 * 1000;
  const at = (msAgo: number) => new Date(NOW - msAgo);
  const check = (confirmedAt: unknown, sessionCreatedAt: unknown) =>
    isUnfinishedSessionResumable({ confirmedAt, sessionCreatedAt, nowMs: NOW, windowMs: WINDOW });

  it('resumes inside the window, with the session created just after the confirmation', () => {
    expect(check(at(10 * 60_000), at(10 * 60_000 - 2_000))).toBe(true);
  });
  it('treats exactly 15 minutes as still fresh and 15 minutes + 1 ms as stale', () => {
    expect(check(at(WINDOW), at(WINDOW))).toBe(true);
    expect(check(at(WINDOW + 1), at(WINDOW + 1))).toBe(false);
  });
  it('is not resumable once the session predates a newer confirmation by more than the skew', () => {
    expect(check(at(1_000), at(1_000 + SESSION_CONFIRMATION_SKEW_MS + 1))).toBe(false);
    expect(check(at(1_000), at(1_000 + SESSION_CONFIRMATION_SKEW_MS))).toBe(true);
  });
  it('fails closed on a missing or invalid confirmation time', () => {
    for (const bad of [null, undefined, 'x', new Date('nope')]) expect(check(bad, at(0))).toBe(false);
  });
});
