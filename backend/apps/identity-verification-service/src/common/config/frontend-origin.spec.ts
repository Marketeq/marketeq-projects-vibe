import { normalizeOrigin, parseFrontendOrigins, resolveCallbackOrigin } from './frontend-origin';

const LIVE = 'https://live-marketeq-projects.vercel.app';
const STAGING = 'https://staging-marketeq-projects.vercel.app';
const DEV = 'https://dev-marketeq-projects.vercel.app';
// The deployed shape (render.yaml): one variable listing every frontend the backend serves.
const LIST = `${LIVE},${STAGING},${DEV},https://marketeq-mvp-live.vercel.app,http://localhost:3000`;

describe('normalizeOrigin', () => {
  it('accepts a bare http(s) origin, ignoring a trailing slash, case and the default port', () => {
    expect(normalizeOrigin(STAGING)).toBe(STAGING);
    expect(normalizeOrigin(`${STAGING}/`)).toBe(STAGING);
    expect(normalizeOrigin('HTTPS://Staging-Marketeq-Projects.Vercel.app')).toBe(STAGING);
    expect(normalizeOrigin('https://staging-marketeq-projects.vercel.app:443')).toBe(STAGING);
    expect(normalizeOrigin('http://localhost:3000')).toBe('http://localhost:3000');
  });

  it.each([
    ['empty', ''],
    ['not a URL', 'staging-marketeq-projects.vercel.app'],
    ['a path', `${STAGING}/talent-dashboard`],
    ['a query', `${STAGING}?next=/x`],
    ['a fragment', `${STAGING}#x`],
    ['credentials', 'https://user:pass@staging-marketeq-projects.vercel.app'],
    ['javascript:', 'javascript:alert(1)'],
    ['a data URL', 'data:text/html,hi'],
    ['ftp', 'ftp://staging-marketeq-projects.vercel.app'],
    ['a list', `${LIVE},${STAGING}`],
  ])('rejects %s', (_label, value) => {
    expect(normalizeOrigin(value)).toBeNull();
  });

  it('rejects non-strings', () => {
    for (const value of [undefined, null, 5, {}, ['https://a.com']]) expect(normalizeOrigin(value)).toBeNull();
  });
});

describe('parseFrontendOrigins', () => {
  it('splits the comma-separated configuration into normalized origins', () => {
    expect(parseFrontendOrigins(LIST)).toEqual([
      LIVE,
      STAGING,
      DEV,
      'https://marketeq-mvp-live.vercel.app',
      'http://localhost:3000',
    ]);
  });

  it('tolerates spaces, trailing slashes, blanks and duplicates, and drops entries that are not origins', () => {
    expect(parseFrontendOrigins(` ${LIVE}/ , ,${STAGING},${STAGING}/, not-a-url, ${DEV}/path `)).toEqual([LIVE, STAGING]);
  });

  it('is empty when unset or blank', () => {
    expect(parseFrontendOrigins(undefined)).toEqual([]);
    expect(parseFrontendOrigins('  ')).toEqual([]);
  });
});

describe('resolveCallbackOrigin', () => {
  it('staging: a staging request on the shared list returns to staging, not to production', () => {
    expect(resolveCallbackOrigin(LIST, STAGING)).toEqual({ ok: true, origin: STAGING });
  });

  it('production: a live request returns to live', () => {
    expect(resolveCallbackOrigin(LIST, LIVE)).toEqual({ ok: true, origin: LIVE });
  });

  it('never picks the first configured origin for a request from another one', () => {
    const result = resolveCallbackOrigin(LIST, DEV);
    expect(result).toEqual({ ok: true, origin: DEV });
    expect(result).not.toEqual({ ok: true, origin: LIVE });
  });

  it('accepts the request origin written with a trailing slash or different case', () => {
    expect(resolveCallbackOrigin(LIST, `${STAGING}/`)).toEqual({ ok: true, origin: STAGING });
    expect(resolveCallbackOrigin(LIST, 'HTTPS://STAGING-MARKETEQ-PROJECTS.VERCEL.APP')).toEqual({ ok: true, origin: STAGING });
  });

  it.each([
    ['an origin that is not configured', 'https://evil.example'],
    ['a look-alike host that merely starts with a configured origin', `${STAGING}.evil.com`],
    ['a look-alike host that merely ends with one', 'https://evil-staging-marketeq-projects.vercel.app'],
    ['the right host on the wrong scheme', 'http://staging-marketeq-projects.vercel.app'],
    ['the right host on another port', 'https://staging-marketeq-projects.vercel.app:8443'],
    ['a configured origin with a path appended', `${STAGING}/talent-dashboard`],
    ['credentials in front of a configured host', 'https://a@staging-marketeq-projects.vercel.app'],
    ['the whole configured list', LIST],
    ['javascript:', 'javascript:alert(1)'],
    ['an empty string', ''],
  ])('rejects %s', (_label, requested) => {
    expect(resolveCallbackOrigin(LIST, requested)).toEqual({ ok: false, reason: 'invalid_origin' });
  });

  it('with several configured origins and no request origin it refuses instead of guessing', () => {
    expect(resolveCallbackOrigin(LIST, undefined)).toEqual({ ok: false, reason: 'origin_required' });
    expect(resolveCallbackOrigin(LIST, null)).toEqual({ ok: false, reason: 'origin_required' });
  });

  it('with exactly one configured origin the request origin may be omitted', () => {
    expect(resolveCallbackOrigin('http://localhost:3000/', undefined)).toEqual({ ok: true, origin: 'http://localhost:3000' });
    expect(resolveCallbackOrigin(`${STAGING}, ${STAGING}/`, undefined)).toEqual({ ok: true, origin: STAGING });
  });

  it('a single configured origin still rejects a different request origin', () => {
    expect(resolveCallbackOrigin(STAGING, LIVE)).toEqual({ ok: false, reason: 'invalid_origin' });
  });

  it('reports a missing or unusable configuration', () => {
    expect(resolveCallbackOrigin(undefined, STAGING)).toEqual({ ok: false, reason: 'not_configured' });
    expect(resolveCallbackOrigin('', undefined)).toEqual({ ok: false, reason: 'not_configured' });
    expect(resolveCallbackOrigin('not-a-url,also/not', STAGING)).toEqual({ ok: false, reason: 'not_configured' });
  });
});
