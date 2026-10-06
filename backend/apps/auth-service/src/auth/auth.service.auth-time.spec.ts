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
import { BrevoService } from '../brevo/brevo.service';

const mockedAxios = axios as jest.Mocked<typeof axios>;

const LOGIN_AT = Date.parse('2026-10-06T12:00:00.123Z');
const LOGIN_AT_SECONDS = Math.floor(LOGIN_AT / 1000);
const HOURS = 60 * 60 * 1000;

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
  sign: jest.fn().mockReturnValue('mock-access-token'),
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

describe('AuthService — auth_time claim', () => {
  let service: AuthService;
  const accessPayloads = () => mockJwtService.sign.mock.calls.map((c) => c[0] as Record<string, unknown>);
  const lastAccessPayload = () => accessPayloads().at(-1)!;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockUserRepository.findOne.mockResolvedValue(null);
    mockUserRepository.save.mockImplementation(async (user: User) => ({ ...user, id: 'user-1' }));
    mockSessionRepository.save.mockResolvedValue(undefined);
    mockJwtService.sign.mockReturnValue('mock-access-token');
    mockJwtService.signAsync.mockImplementation(async () => `refresh-${Math.random()}`);
    mockedAxios.post.mockResolvedValue({ data: {} });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getRepositoryToken(User), useValue: mockUserRepository },
        { provide: getRepositoryToken(Session), useValue: mockSessionRepository },
        { provide: getRepositoryToken(PasswordHistory), useValue: {} },
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

  // A login that creates a session, whatever the method.
  const loginMethods: Array<[string, () => Promise<unknown>]> = [
    [
      'devLogin',
      async () => {
        mockUserRepository.findOne.mockResolvedValue({ id: 'user-1', email: 'a@example.com', username: 'a' });
        return service.devLogin('a@example.com', 'jest', '127.0.0.1');
      },
    ],
    [
      'loginWithGoogle',
      async () => {
        mockedAxios.get.mockResolvedValue({
          data: { aud: 'test-google-client-id', audience: 'test-google-client-id', email: 'g@example.com', email_verified: 'true', given_name: 'G', family_name: 'U' },
        });
        return service.loginWithGoogle({ access_token: 'fake' } as any, 'jest', '127.0.0.1');
      },
    ],
  ];

  describe.each(loginMethods)('login — %s', (_name, login) => {
    it('signs auth_time (epoch seconds) into the access token', async () => {
      setNow(LOGIN_AT);
      await login();
      const payload = lastAccessPayload();
      expect(payload.sid).toEqual(expect.any(String));
      expect(payload.auth_time).toBe(LOGIN_AT_SECONDS);
      expect(Number.isInteger(payload.auth_time)).toBe(true);
    });

    it("stores the same instant as the session's createdAt, so refresh can reproduce it", async () => {
      setNow(LOGIN_AT);
      await login();
      const session = mockSessionRepository.save.mock.calls[0][0] as Session;
      expect(session.createdAt).toEqual(new Date(LOGIN_AT));
      expect(Math.floor(session.createdAt.getTime() / 1000)).toBe(lastAccessPayload().auth_time);
    });

    it('does not put auth_time in the refresh token or add it to the response', async () => {
      setNow(LOGIN_AT);
      const result = (await login()) as Record<string, unknown>;
      const refreshPayload = mockJwtService.signAsync.mock.calls[0][0] as Record<string, unknown>;
      expect(refreshPayload).not.toHaveProperty('auth_time');
      expect(result).not.toHaveProperty('auth_time');
      expect(result).not.toHaveProperty('authTime');
    });
  });

  describe('refresh', () => {
    const refreshToken = 'old-refresh-token';
    const refreshPayload = { sub: 'user-1', email: 'a@example.com', type: 'refresh', sid: 'sid-1', rememberMe: false };
    const sessionRow = (createdAt: unknown) => ({
      id: 'sid-1',
      userId: 'user-1',
      refreshTokenHash: createHash('sha256').update(refreshToken).digest('hex'),
      createdAt,
    });

    it('preserves the identical auth_time created at login, however much later it runs (not iat)', async () => {
      setNow(LOGIN_AT);
      await loginMethods[0][1]();
      const loginAuthTime = lastAccessPayload().auth_time;
      const storedSession = mockSessionRepository.save.mock.calls[0][0] as Session;

      mockJwtService.verifyAsync.mockResolvedValue(refreshPayload);
      for (const hoursLater of [1, 5, 72]) {
        setNow(LOGIN_AT + hoursLater * HOURS);
        mockSessionRepository.findOne.mockResolvedValue({
          ...sessionRow(storedSession.createdAt),
          refreshTokenHash: createHash('sha256').update(refreshToken).digest('hex'),
        });
        await service.refresh({ refresh_token: refreshToken } as any);
        expect(lastAccessPayload().auth_time).toBe(loginAuthTime);
        expect(lastAccessPayload().auth_time).not.toBe(Math.floor(Date.now() / 1000));
      }
    });

    it('carries the same value through repeated refreshes of the same session', async () => {
      mockJwtService.verifyAsync.mockResolvedValue(refreshPayload);
      const createdAt = new Date(LOGIN_AT);
      for (let i = 0; i < 3; i += 1) {
        mockSessionRepository.findOne.mockResolvedValue(sessionRow(createdAt));
        await service.refresh({ refresh_token: refreshToken } as any);
      }
      expect(accessPayloads().map((p) => p.auth_time)).toEqual([LOGIN_AT_SECONDS, LOGIN_AT_SECONDS, LOGIN_AT_SECONDS]);
    });

    it('keeps the session id and issues tokens exactly as before apart from the claim', async () => {
      mockJwtService.verifyAsync.mockResolvedValue(refreshPayload);
      mockSessionRepository.findOne.mockResolvedValue(sessionRow(new Date(LOGIN_AT)));
      const result = await service.refresh({ refresh_token: refreshToken } as any);
      expect(lastAccessPayload()).toEqual({ sub: 'user-1', email: 'a@example.com', sid: 'sid-1', auth_time: LOGIN_AT_SECONDS });
      expect(result.sessionId).toBe('sid-1');
      expect(result.access_token).toBe('mock-access-token');
    });
  });

  describe('old and missing values never break authentication', () => {
    const refreshToken = 'legacy-refresh-token';
    const hash = createHash('sha256').update(refreshToken).digest('hex');

    it('a refresh token issued before this change (no auth_time anywhere in it) still refreshes', async () => {
      mockJwtService.verifyAsync.mockResolvedValue({ sub: 'user-1', email: 'a@example.com', type: 'refresh', sid: 'sid-1' });
      mockSessionRepository.findOne.mockResolvedValue({ id: 'sid-1', userId: 'user-1', refreshTokenHash: hash, createdAt: new Date(LOGIN_AT) });
      await expect(service.refresh({ refresh_token: refreshToken } as any)).resolves.toMatchObject({ sessionId: 'sid-1' });
      expect(lastAccessPayload().auth_time).toBe(LOGIN_AT_SECONDS);
    });

    it.each([
      ['undefined', undefined],
      ['null', null],
      ['an invalid date', new Date('not a date')],
      ['the epoch', new Date(0)],
      ['a string', '2026-10-06T12:00:00Z'],
    ])('a session whose createdAt is %s still refreshes, with no auth_time claim', async (_label, createdAt) => {
      mockJwtService.verifyAsync.mockResolvedValue({ sub: 'user-1', email: 'a@example.com', type: 'refresh', sid: 'sid-1' });
      mockSessionRepository.findOne.mockResolvedValue({ id: 'sid-1', userId: 'user-1', refreshTokenHash: hash, createdAt });
      const result = await service.refresh({ refresh_token: refreshToken } as any);
      expect(result.access_token).toBe('mock-access-token');
      expect(lastAccessPayload()).not.toHaveProperty('auth_time');
      expect(lastAccessPayload().sid).toBe('sid-1');
    });

    it('a legacy refresh token with no session id still refreshes, with no sid and no auth_time', async () => {
      mockJwtService.verifyAsync.mockResolvedValue({ sub: 'user-1', email: 'a@example.com', type: 'refresh' });
      const result = await service.refresh({ refresh_token: refreshToken } as any);
      expect(result.access_token).toBe('mock-access-token');
      expect(mockSessionRepository.findOne).not.toHaveBeenCalled();
      expect(lastAccessPayload()).toEqual({ sub: 'user-1', email: 'a@example.com' });
    });

    it('a revoked session or a wrong refresh token is still rejected exactly as before', async () => {
      mockJwtService.verifyAsync.mockResolvedValue({ sub: 'user-1', email: 'a@example.com', type: 'refresh', sid: 'sid-1' });
      mockSessionRepository.findOne.mockResolvedValueOnce(null);
      await expect(service.refresh({ refresh_token: refreshToken } as any)).rejects.toThrow('Session has been revoked');
      mockSessionRepository.findOne.mockResolvedValueOnce({ id: 'sid-1', userId: 'user-1', refreshTokenHash: 'something-else', createdAt: new Date(LOGIN_AT) });
      await expect(service.refresh({ refresh_token: refreshToken } as any)).rejects.toThrow('Invalid refresh token');
    });

    it('an access token without auth_time still validates (and one with it is accepted unchanged)', async () => {
      const strategy = new JwtStrategy({ get: () => 'test-public-key' } as unknown as ConfigService);
      const base = { sub: 'user-1', email: 'a@example.com', sid: 'sid-1' };
      const expected = { id: 'user-1', sub: 'user-1', email: 'a@example.com', sid: 'sid-1' };
      await expect(strategy.validate(base)).resolves.toEqual(expected);
      await expect(strategy.validate({ ...base, auth_time: LOGIN_AT_SECONDS })).resolves.toEqual(expected);
    });
  });

  describe('every login method is covered (guards against a future login path forgetting it)', () => {
    const source = readFileSync(join(__dirname, 'auth.service.ts'), 'utf8');
    const sessionLoginBlocks = source.split('const sessionId = randomUUID();').slice(1);

    it('finds the eight session-creating login paths', () => {
      expect(sessionLoginBlocks).toHaveLength(8);
    });

    it.each(sessionLoginBlocks.map((block, index) => [index + 1, block.slice(0, block.indexOf('this.createSession(') + 400)] as const))(
      'login path #%i takes its time once and passes it to both the token and the session',
      (_index, block) => {
        const issue = block.slice(block.indexOf('this.issueTokens('), block.indexOf(');', block.indexOf('this.issueTokens(')));
        const create = block.slice(block.indexOf('this.createSession('), block.indexOf('});', block.indexOf('this.createSession(')));
        expect(block).toContain('const authTime = new Date();');
        expect(issue).toMatch(/\bauthTime\b/);
        expect(create).toContain('createdAt: authTime');
      },
    );

    it('never derives auth_time from iat', () => {
      expect(source).not.toMatch(/auth_time[^\n]*\biat\b/);
      expect(source).not.toMatch(/\biat\b[^\n]*auth_time/);
    });
  });
});
