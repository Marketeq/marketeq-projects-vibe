// otplib pulls in an ESM-only dependency chain that ts-jest can't transform; it is only
// used by the 2FA flows, so mock it out exactly as auth.service.spec.ts does.
jest.mock('otplib', () => ({
  authenticator: { generateSecret: jest.fn(), generate: jest.fn(), verify: jest.fn() },
}));
jest.mock('axios');

import { readFileSync } from 'fs';
import { join } from 'path';
import { createHash } from 'crypto';
import axios from 'axios';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { User } from '../user/entities/user.entity';
import { Session } from '../session/entities/session.entity';
import { PasswordHistory } from '../password-history/entities/password-history.entity';
import { SecurityQuestionAnswer } from '../security-questions/entities/security-question-answer.entity';
import { BrevoService } from '../brevo/brevo.service';

const mockedAxios = axios as jest.Mocked<typeof axios>;

const HOUR_MS = 60 * 60 * 1000;
const T1 = Date.parse('2026-10-06T12:00:00.123Z');
const T1_SECONDS = Math.floor(T1 / 1000);

const mockUserRepository = {
  findOne: jest.fn(),
  create: jest.fn((data: Partial<User>) => data as User),
  save: jest.fn(),
  update: jest.fn(),
};
const mockSessionRepository = {
  save: jest.fn(),
  findOne: jest.fn(),
  delete: jest.fn(),
};
const mockJwtService = {
  sign: jest.fn(),
  signAsync: jest.fn(),
  verifyAsync: jest.fn(),
};
const configValues: Record<string, string> = {
  GOOGLE_CLIENT_ID: 'test-google-client-id',
  LINKEDIN_CLIENT_ID: 'test-linkedin-client-id',
  LINKEDIN_CLIENT_SECRET: 'test-linkedin-client-secret',
  LINKEDIN_REDIRECT_URI: 'http://localhost:3000/sign-in',
  AUTH_REFRESH_SECRET: 'test-refresh-secret',
  USER_SERVICE_URL: 'http://localhost:3002',
  INTERNAL_SERVICE_TOKEN: 'test-internal-token',
  AUTH_REFRESH_TOKEN_EXPIRES_IN: '5h',
  AUTH_REMEMBER_ME_REFRESH_TOKEN_EXPIRES_IN: '14d',
};
const mockConfigService = { get: jest.fn((key: string) => configValues[key]) };

const setNow = (ms: number) =>
  jest.useFakeTimers({
    now: ms,
    // Only the clock is faked: promises, nextTick and timers keep running normally.
    doNotFake: ['nextTick', 'setImmediate', 'setTimeout', 'setInterval', 'clearTimeout', 'clearInterval', 'queueMicrotask'],
  });

type Payload = Record<string, unknown>;

describe('AuthService — auth_time claim', () => {
  let service: AuthService;

  const accessPayloads = (): Payload[] => mockJwtService.sign.mock.calls.map((c) => c[0] as Payload);
  const refreshPayloads = (): Payload[] => mockJwtService.signAsync.mock.calls.map((c) => c[0] as Payload);
  const lastAccess = () => accessPayloads().at(-1)!;
  const lastRefresh = () => refreshPayloads().at(-1)!;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockUserRepository.findOne.mockResolvedValue(null);
    mockUserRepository.save.mockImplementation(async (user: User) => ({ ...user, id: 'user-1' }));
    mockSessionRepository.save.mockResolvedValue(undefined);
    mockSessionRepository.delete.mockResolvedValue(undefined);
    mockJwtService.sign.mockReturnValue('mock-access-token');
    mockJwtService.signAsync.mockImplementation(async () => `refresh-${Math.random()}`);
    mockedAxios.post.mockResolvedValue({ data: {} });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getRepositoryToken(User), useValue: mockUserRepository },
        { provide: getRepositoryToken(Session), useValue: mockSessionRepository },
        { provide: getRepositoryToken(PasswordHistory), useValue: {} },
        // Constructor index [3], added by the account-recovery work that landed
        // alongside this suite. Nothing here touches security questions, so an
        // empty stub is enough — it exists only so Nest can construct
        // AuthService.
        { provide: getRepositoryToken(SecurityQuestionAnswer), useValue: {} },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: BrevoService, useValue: {} },
      ],
    }).compile();
    service = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllTimers();
  });

  // ── helpers ────────────────────────────────────────────────────────────────

  const devLogin = async () => {
    mockUserRepository.findOne.mockResolvedValue({ id: 'user-1', email: 'a@example.com', username: 'a' });
    return service.devLogin('a@example.com', 'jest', '127.0.0.1');
  };
  const googleLogin = async () => {
    mockedAxios.get.mockResolvedValue({
      data: { aud: 'test-google-client-id', audience: 'test-google-client-id', email: 'g@example.com', email_verified: 'true', given_name: 'G', family_name: 'U' },
    });
    return service.loginWithGoogle({ access_token: 'fake' } as any, 'jest', '127.0.0.1');
  };
  const loginMethods: Array<[string, () => Promise<unknown>]> = [
    ['devLogin', devLogin],
    ['loginWithGoogle', googleLogin],
  ];

  /** Feeds a signed refresh-token payload to refresh(), as the verified JWT, against its session. */
  const refreshWith = async (verified: Payload, sessionOverrides: Record<string, unknown> = {}) => {
    const token = `refresh-token-${Math.random()}`;
    mockJwtService.verifyAsync.mockResolvedValue(verified);
    mockSessionRepository.findOne.mockResolvedValue({
      id: verified.sid,
      userId: verified.sub,
      refreshTokenHash: createHash('sha256').update(token).digest('hex'),
      ...sessionOverrides,
    });
    return service.refresh({ refresh_token: token } as any);
  };

  const legacyRefreshPayload = (extra: Payload = {}): Payload => ({
    sub: 'user-1',
    email: 'a@example.com',
    type: 'refresh',
    rememberMe: false,
    sid: 'sid-1',
    ...extra,
  });

  // ── login ──────────────────────────────────────────────────────────────────

  describe.each(loginMethods)('login — %s', (_name, login) => {
    it('generates one auth_time (epoch seconds) and signs it into the access token', async () => {
      setNow(T1);
      await login();
      expect(lastAccess().sid).toEqual(expect.any(String));
      expect(lastAccess().auth_time).toBe(T1_SECONDS);
      expect(Number.isInteger(lastAccess().auth_time)).toBe(true);
    });

    it('signs the same value into the refresh token', async () => {
      setNow(T1);
      await login();
      expect(lastRefresh().auth_time).toBe(T1_SECONDS);
      expect(lastRefresh().auth_time).toBe(lastAccess().auth_time);
      expect(lastRefresh()).toMatchObject({ type: 'refresh', sid: lastAccess().sid });
    });

    it('leaves Session.createdAt to the database (nothing assigns it)', async () => {
      setNow(T1);
      await login();
      const session = mockSessionRepository.save.mock.calls[0][0] as Session;
      expect(session.createdAt).toBeUndefined();
      expect(Object.keys(session)).not.toContain('createdAt');
    });

    it('does not add auth_time to the response body', async () => {
      setNow(T1);
      const result = (await login()) as Payload;
      expect(result).not.toHaveProperty('auth_time');
      expect(result).not.toHaveProperty('authTime');
    });
  });

  // ── refresh ────────────────────────────────────────────────────────────────

  describe('refresh', () => {
    it('takes auth_time from the verified refresh token, never Session.createdAt or iat', async () => {
      setNow(T1 + 5 * HOUR_MS);
      const token = 'refresh-token-x';
      const session: Record<string, unknown> = {
        id: 'sid-1',
        userId: 'user-1',
        refreshTokenHash: createHash('sha256').update(token).digest('hex'),
      };
      // Reading createdAt at all fails the test: refresh must not look at it.
      Object.defineProperty(session, 'createdAt', {
        get: () => {
          throw new Error('Session.createdAt must not be read');
        },
        enumerable: true,
      });
      mockSessionRepository.findOne.mockResolvedValue(session);
      // iat is deliberately unrelated to auth_time (as it is after a refresh).
      mockJwtService.verifyAsync.mockResolvedValue(
        legacyRefreshPayload({ auth_time: T1_SECONDS, iat: T1_SECONDS + 4 * 3600 }),
      );
      await service.refresh({ refresh_token: token } as any);
      expect(lastAccess().auth_time).toBe(T1_SECONDS);
      expect(lastRefresh().auth_time).toBe(T1_SECONDS);
    });

    it('preserves the value in BOTH rotated tokens, with every other claim as before', async () => {
      setNow(T1 + HOUR_MS);
      const result = await refreshWith(legacyRefreshPayload({ auth_time: T1_SECONDS }));
      expect(lastAccess()).toEqual({ sub: 'user-1', email: 'a@example.com', sid: 'sid-1', auth_time: T1_SECONDS });
      expect(lastRefresh()).toEqual({ sub: 'user-1', email: 'a@example.com', type: 'refresh', rememberMe: false, sid: 'sid-1', auth_time: T1_SECONDS });
      expect(result.sessionId).toBe('sid-1');
      expect(result.access_token).toBe('mock-access-token');
    });

    it('stays identical across repeated rotations, however much later each one happens', async () => {
      setNow(T1);
      await devLogin();
      let current = lastRefresh();
      const loginValue = lastAccess().auth_time;
      expect(loginValue).toBe(T1_SECONDS);

      for (const hoursLater of [1, 5, 29, 72, 200]) {
        setNow(T1 + hoursLater * HOUR_MS);
        await refreshWith(current);
        expect(lastAccess().auth_time).toBe(loginValue);
        expect(lastRefresh().auth_time).toBe(loginValue);
        expect(lastAccess().auth_time).not.toBe(Math.floor(Date.now() / 1000));
        current = lastRefresh(); // the next refresh presents the token this one just issued
      }
    });

    it('keeps working for a session id-less legacy refresh token that carries the claim', async () => {
      setNow(T1 + HOUR_MS);
      const verified = legacyRefreshPayload({ auth_time: T1_SECONDS });
      delete verified.sid;
      mockJwtService.verifyAsync.mockResolvedValue(verified);
      const result = await service.refresh({ refresh_token: 'x' } as any);
      expect(result.access_token).toBe('mock-access-token');
      expect(mockSessionRepository.findOne).not.toHaveBeenCalled();
      expect(lastAccess()).toEqual({ sub: 'user-1', email: 'a@example.com', auth_time: T1_SECONDS });
    });

    it('still rejects a revoked session or a wrong refresh token exactly as before', async () => {
      mockJwtService.verifyAsync.mockResolvedValue(legacyRefreshPayload({ auth_time: T1_SECONDS }));
      mockSessionRepository.findOne.mockResolvedValueOnce(null);
      await expect(service.refresh({ refresh_token: 'x' } as any)).rejects.toThrow('Session has been revoked');
      mockSessionRepository.findOne.mockResolvedValueOnce({ id: 'sid-1', userId: 'user-1', refreshTokenHash: 'something-else' });
      await expect(service.refresh({ refresh_token: 'x' } as any)).rejects.toThrow('Invalid refresh token');
    });
  });

  // ── legacy tokens ──────────────────────────────────────────────────────────

  describe('legacy refresh tokens (issued before auth_time existed)', () => {
    it('refresh successfully and omit the claim from both rotated tokens until the next login', async () => {
      setNow(T1);
      // A real, valid createdAt is present: it must NOT be used to invent the claim.
      const result = await refreshWith(legacyRefreshPayload(), { createdAt: new Date(T1 - HOUR_MS) });
      expect(result.access_token).toBe('mock-access-token');
      expect(lastAccess()).not.toHaveProperty('auth_time');
      expect(lastRefresh()).not.toHaveProperty('auth_time');
      expect(lastAccess().sid).toBe('sid-1');
    });

    it('stay claim-free through repeated rotations and then gain it only from a new login', async () => {
      setNow(T1);
      let current: Payload = legacyRefreshPayload();
      for (const hoursLater of [0, 2, 6]) {
        setNow(T1 + hoursLater * HOUR_MS);
        await refreshWith(current);
        expect(lastAccess()).not.toHaveProperty('auth_time');
        current = lastRefresh();
        expect(current).not.toHaveProperty('auth_time');
      }
      setNow(T1 + 8 * HOUR_MS);
      await devLogin();
      expect(lastAccess().auth_time).toBe(Math.floor((T1 + 8 * HOUR_MS) / 1000));
      expect(lastRefresh().auth_time).toBe(lastAccess().auth_time);
    });

    it('a legacy token with no session id still refreshes, with no sid and no claim', async () => {
      mockJwtService.verifyAsync.mockResolvedValue({ sub: 'user-1', email: 'a@example.com', type: 'refresh' });
      const result = await service.refresh({ refresh_token: 'x' } as any);
      expect(result.access_token).toBe('mock-access-token');
      expect(lastAccess()).toEqual({ sub: 'user-1', email: 'a@example.com' });
    });

    it('an access token without auth_time still validates, and one with it is accepted unchanged', async () => {
      const strategy = new JwtStrategy({ get: () => 'test-public-key' } as unknown as ConfigService);
      const base = { sub: 'user-1', email: 'a@example.com', sid: 'sid-1' };
      const expected = { id: 'user-1', sub: 'user-1', email: 'a@example.com', sid: 'sid-1' };
      await expect(strategy.validate(base)).resolves.toEqual(expected);
      await expect(strategy.validate({ ...base, auth_time: T1_SECONDS })).resolves.toEqual(expected);
    });
  });

  // ── malformed / future values ──────────────────────────────────────────────

  describe('malformed or future auth_time in a refresh token is omitted, never trusted', () => {
    const nowSeconds = T1_SECONDS;
    const bad: Array<[string, unknown]> = [
      ['a numeric string', String(T1_SECONDS - 100)],
      ['a fractional number', T1_SECONDS - 100.5],
      ['zero', 0],
      ['a negative number', -5],
      ['NaN', Number.NaN],
      ['Infinity', Number.POSITIVE_INFINITY],
      ['null', null],
      ['a boolean', true],
      ['an object', { a: 1 }],
      ['an array', [T1_SECONDS]],
      ['milliseconds instead of seconds', T1],
      ['61 seconds in the future', nowSeconds + 61],
      ['a day in the future', nowSeconds + 24 * 3600],
    ];

    it.each(bad)('%s: refresh succeeds and neither rotated token carries the claim', async (_label, value) => {
      setNow(T1);
      const result = await refreshWith(legacyRefreshPayload({ auth_time: value }));
      expect(result.access_token).toBe('mock-access-token');
      expect(lastAccess()).not.toHaveProperty('auth_time');
      expect(lastRefresh()).not.toHaveProperty('auth_time');
      expect(lastAccess().sid).toBe('sid-1');
    });

    it.each([
      ['now', nowSeconds],
      ['30 seconds ahead (clock skew between instances)', nowSeconds + 30],
      ['exactly the 60 second tolerance', nowSeconds + 60],
      ['one second after the epoch', 1],
      ['a year ago', nowSeconds - 365 * 24 * 3600],
    ])('a valid value (%s) is preserved', async (_label, value) => {
      setNow(T1);
      await refreshWith(legacyRefreshPayload({ auth_time: value }));
      expect(lastAccess().auth_time).toBe(value);
      expect(lastRefresh().auth_time).toBe(value);
    });
  });

  // ── logout / login ─────────────────────────────────────────────────────────

  describe('logout and login', () => {
    it('a new login after logout gets a newer auth_time, and refreshing it never goes back to the old one', async () => {
      setNow(T1);
      await devLogin();
      const first = lastAccess().auth_time as number;
      const firstRefresh = lastRefresh();
      const firstSid = lastAccess().sid;

      setNow(T1 + HOUR_MS);
      await refreshWith(firstRefresh);
      expect(lastAccess().auth_time).toBe(first);

      // Logout removes that session.
      mockJwtService.verifyAsync.mockResolvedValue(legacyRefreshPayload({ sid: firstSid, auth_time: first }));
      await service.logout({ sub: 'user-1' }, 'whatever');
      expect(mockSessionRepository.delete).toHaveBeenCalledWith({ id: firstSid, userId: 'user-1' });

      // The next login is a new authentication.
      setNow(T1 + 2 * HOUR_MS);
      await devLogin();
      const second = lastAccess().auth_time as number;
      expect(second).toBe(Math.floor((T1 + 2 * HOUR_MS) / 1000));
      expect(second).toBeGreaterThan(first);
      expect(lastAccess().sid).not.toBe(firstSid);

      setNow(T1 + 3 * HOUR_MS);
      await refreshWith(lastRefresh());
      expect(lastAccess().auth_time).toBe(second);
    });

    it('two logins at different times are independent of each other', async () => {
      setNow(T1);
      await devLogin();
      const a = lastRefresh();
      setNow(T1 + HOUR_MS);
      await devLogin();
      const b = lastRefresh();
      setNow(T1 + 2 * HOUR_MS);
      await refreshWith(a);
      expect(lastAccess().auth_time).toBe(T1_SECONDS);
      await refreshWith(b);
      expect(lastAccess().auth_time).toBe(Math.floor((T1 + HOUR_MS) / 1000));
    });
  });

  // ── structure ──────────────────────────────────────────────────────────────

  describe('every login method and the database behavior (guards against regressions)', () => {
    const source = readFileSync(join(__dirname, 'auth.service.ts'), 'utf8');
    const loginBlocks = source.split('const sessionId = randomUUID();').slice(1);

    it('finds the eight session-creating login paths', () => {
      expect(loginBlocks).toHaveLength(8);
    });

    it.each(loginBlocks.map((block, index) => [index + 1, block.slice(0, block.indexOf('this.createSession(') + 400)] as const))(
      'login path #%i generates one auth_time and passes it to the tokens only',
      (_index, block) => {
        const issue = block.slice(block.indexOf('this.issueTokens('), block.indexOf(');', block.indexOf('this.issueTokens(')));
        const create = block.slice(block.indexOf('this.createSession('), block.indexOf('});', block.indexOf('this.createSession(')));
        expect(block).toContain('const authTime = Math.floor(Date.now() / 1000);');
        expect(issue).toMatch(/\bauthTime\b/);
        expect(create).not.toMatch(/authTime|createdAt/);
      },
    );

    it('Session.createdAt keeps its original database-managed behavior', () => {
      expect(source).not.toMatch(/session\.createdAt\s*=/);
      expect(source).not.toMatch(/createdAt\?:\s*Date/);
    });

    it('never derives auth_time from Session.createdAt or iat', () => {
      expect(source).not.toMatch(/authTime:\s*session\./);
      expect(source).not.toMatch(/auth_time[^\n]*\b(iat|createdAt)\b/);
      expect(source).not.toMatch(/\b(iat|createdAt)\b[^\n]*auth_time/);
      expect(source).toContain('authTime: payload.auth_time');
    });
  });
});
