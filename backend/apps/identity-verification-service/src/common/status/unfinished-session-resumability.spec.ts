import { isUnfinishedSessionResumable } from './unfinished-session-resumability';

describe('isUnfinishedSessionResumable (exact correlation, no clock tolerance)', () => {
  const NOW = Date.UTC(2026, 9, 26, 12, 0, 0);
  const WINDOW = 15 * 60 * 1000;
  const at = (msAgo: number) => new Date(NOW - msAgo);
  const check = (confirmedAt: unknown, sessionConfirmedAt: unknown) =>
    isUnfinishedSessionResumable({ confirmedAt, sessionConfirmedAt, nowMs: NOW, windowMs: WINDOW });

  it('resumes inside the window when the session was started under this very confirmation', () => {
    expect(check(at(10 * 60_000), new Date(NOW - 10 * 60_000))).toBe(true); // equal value, distinct Date objects
  });
  it('treats exactly 15 minutes as fresh and 15 minutes + 1 ms as stale', () => {
    expect(check(at(WINDOW), at(WINDOW))).toBe(true);
    expect(check(at(WINDOW + 1), at(WINDOW + 1))).toBe(false);
  });
  it('a later confirmation supersedes the session even 1 ms later (no tolerance)', () => {
    expect(check(at(1_000), at(1_001))).toBe(false);
    expect(check(at(1_000), at(60_000))).toBe(false);
  });
  it('a recorded confirmation that is unreadable or not a Date fails closed', () => {
    for (const bad of ['x', 123, new Date('nope'), {}]) expect(check(at(1_000), bad)).toBe(false);
  });
  it('a legacy row (no recorded confirmation) is judged by the age alone', () => {
    expect(check(at(10 * 60_000), null)).toBe(true);
    expect(check(at(20 * 60_000), null)).toBe(false);
    expect(check(at(10 * 60_000), undefined)).toBe(true);
  });
  it('fails closed on a missing or invalid profile confirmation time', () => {
    for (const bad of [null, undefined, 'x', new Date('nope')]) expect(check(bad, at(0))).toBe(false);
  });
});
