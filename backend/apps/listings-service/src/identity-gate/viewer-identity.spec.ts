// Who is looking is read from one place only: a verified bearer token. These tests pin the helper
// that every viewer-aware listing route uses (projects, services, teams).
import 'reflect-metadata';
import * as jwt from 'jsonwebtoken';
import { isSameAccount, viewerIdFromRequest } from './viewer.decorator';
import { ProjectsController } from '../projects/projects.controller';
import { ServicesController } from '../services/service.controller';
import { TeamsController } from '../teams/team.controller';

const SECRET = 'test-secret';
const OWNER = '10000000-0000-4000-8000-000000000001';
const signed = (claims: Record<string, unknown>, secret = SECRET, opts: jwt.SignOptions = {}) => jwt.sign(claims, secret, opts);
const bearer = (t: string) => ({ headers: { authorization: `Bearer ${t}` } });

describe('viewerIdFromRequest', () => {
  beforeEach(() => {
    process.env.JWT_SECRET = SECRET;
    delete process.env.AUTH_JWT_PUBLIC_KEY;
  });

  it('a valid bearer token is the viewer (sub, id or userId claim)', () => {
    expect(viewerIdFromRequest(bearer(signed({ sub: OWNER })))).toBe(OWNER);
    expect(viewerIdFromRequest(bearer(signed({ id: OWNER })))).toBe(OWNER);
    expect(viewerIdFromRequest(bearer(signed({ userId: OWNER })))).toBe(OWNER);
  });

  it('the scheme is case-insensitive and extra spacing is tolerated', () => {
    const t = signed({ sub: OWNER });
    expect(viewerIdFromRequest({ headers: { authorization: `bearer ${t}` } })).toBe(OWNER);
    expect(viewerIdFromRequest({ headers: { authorization: `  Bearer   ${t}  ` } })).toBe(OWNER);
  });

  it.each([
    ['no header', { headers: {} }],
    ['no headers at all', {}],
    ['an empty bearer', { headers: { authorization: 'Bearer ' } }],
    ['a non-bearer scheme', { headers: { authorization: `Basic ${Buffer.from(OWNER).toString('base64')}` } }],
    ['a token with no scheme', { headers: { authorization: signed({ sub: OWNER }) } }],
    ['a malformed token', { headers: { authorization: 'Bearer not.a.jwt' } }],
    ['a token signed with another secret', bearer(signed({ sub: OWNER }, 'not-the-secret'))],
    ['an expired token', bearer(signed({ sub: OWNER }, SECRET, { expiresIn: -10 }))],
    ['a token with no subject', bearer(signed({ role: 'admin' }))],
    ['a token whose subject is empty', bearer(signed({ sub: '' }))],
    ['a numeric subject', bearer(signed({ sub: 12345 }))],
    ['an array-valued header', { headers: { authorization: [`Bearer ${signed({ sub: OWNER })}`] } }],
  ])('%s is an anonymous viewer, never an error', (_label, req) => {
    expect(viewerIdFromRequest(req as any)).toBeNull();
  });

  it('claims made anywhere else are ignored: headers other than Authorization, query, body', () => {
    const req: any = {
      headers: { 'x-user-id': OWNER, 'x-viewer-id': OWNER, 'x-user-role': 'admin', 'x-forwarded-user': OWNER },
      query: { viewer: OWNER, userId: OWNER, owner: 'true', includeUnverified: 'true' },
      body: { viewerId: OWNER, includeUnverified: true },
      user: { userId: OWNER, sub: OWNER },
    };
    expect(viewerIdFromRequest(req)).toBeNull();
  });
});

describe('isSameAccount', () => {
  it('matches the same id regardless of case and stray whitespace', () => {
    expect(isSameAccount(OWNER, OWNER)).toBe(true);
    expect(isSameAccount(OWNER.toUpperCase(), OWNER)).toBe(true);
    expect(isSameAccount(` ${OWNER}`, `${OWNER} `)).toBe(true);
  });

  it('never matches a different id, or when either side is missing or empty', () => {
    expect(isSameAccount(OWNER, '10000000-0000-4000-8000-000000000002')).toBe(false);
    expect(isSameAccount(null, OWNER)).toBe(false);
    expect(isSameAccount(OWNER, null)).toBe(false);
    expect(isSameAccount(undefined, undefined)).toBe(false);
    expect(isSameAccount('', '')).toBe(false);
    expect(isSameAccount('   ', '  ')).toBe(false);
  });
});

describe('viewer-dependent routes carry Vary', () => {
  const varyOf = (ctrl: any, method: string) =>
    (Reflect.getMetadata('__headers__', ctrl.prototype[method]) as Array<{ name: string; value: string }> | undefined)
      ?.find((h) => h.name.toLowerCase() === 'vary')?.value ?? '';

  it.each([
    ['ProjectsController.findBySlug', ProjectsController, 'findBySlug'],
    ['ProjectsController.findOne', ProjectsController, 'findOne'],
    ['ServicesController.findBySlug', ServicesController, 'findBySlug'],
    ['ServicesController.findOne', ServicesController, 'findOne'],
    ['TeamsController.findOne', TeamsController, 'findOne'],
  ])('%s varies on Authorization and Cookie', (_n, ctrl, method) => {
    const vary = varyOf(ctrl, method).toLowerCase();
    expect(vary).toContain('authorization');
    expect(vary).toContain('cookie');
  });
});
