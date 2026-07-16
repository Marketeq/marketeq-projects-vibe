// otplib pulls in an ESM-only dependency chain (@otplib/plugin-base32-scure ->
// @scure/base) that ts-jest can't transform. It's only used by the 2FA flows,
// not by OAuth login, so mock it out rather than widening transformIgnorePatterns.
jest.mock('otplib', () => ({
  authenticator: { generateSecret: jest.fn(), generate: jest.fn(), verify: jest.fn() },
}));
jest.mock('axios');

import axios from 'axios';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

import { AuthService } from './auth.service';
import { User } from '../user/entities/user.entity';
import { Session } from '../session/entities/session.entity';
import { PasswordHistory } from '../password-history/entities/password-history.entity';
import { BrevoService } from '../brevo/brevo.service';

const mockedAxios = axios as jest.Mocked<typeof axios>;

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockUserRepository = {
  findOne: jest.fn(),
  create: jest.fn((data: Partial<User>) => data as User),
  save: jest.fn(),
  update: jest.fn(),
};

const mockSessionRepository = {
  save: jest.fn(),
};

const mockPasswordHistoryRepository = {};

const mockJwtService = {
  sign: jest.fn().mockReturnValue('mock-access-token'),
  signAsync: jest.fn().mockResolvedValue('mock-refresh-token'),
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

const mockConfigService = {
  get: jest.fn((key: string) => configValues[key]),
};

const mockBrevoService = {};

describe('AuthService — OAuth account creation & linking', () => {
  let service: AuthService;

  beforeEach(async () => {
    jest.clearAllMocks();

    // findOne is called twice on the "new user" path: once to look up the
    // account by email, once inside generatePlaceholderUsername() to check
    // for a username collision. Default both to "not found" here; override
    // the first call per-test as needed.
    mockUserRepository.findOne.mockResolvedValue(null);
    mockUserRepository.save.mockImplementation(async (user: User) => ({
      ...user,
      id: 'new-user-id',
    }));
    mockSessionRepository.save.mockResolvedValue(undefined);
    mockedAxios.post.mockResolvedValue({ data: {} });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getRepositoryToken(User), useValue: mockUserRepository },
        { provide: getRepositoryToken(Session), useValue: mockSessionRepository },
        { provide: getRepositoryToken(PasswordHistory), useValue: mockPasswordHistoryRepository },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: BrevoService, useValue: mockBrevoService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    // AuthService starts setInterval timers in onModuleInit; nothing in
    // this suite calls it, but clear defensively in case that changes.
    jest.clearAllTimers();
  });

  describe('loginWithGoogle', () => {
    const mockGoogleTokenInfo = (email: string) => {
      mockedAxios.get.mockResolvedValue({
        data: {
          aud: 'test-google-client-id',
          audience: 'test-google-client-id',
          email,
          email_verified: 'true',
          given_name: 'Test',
          family_name: 'User',
        },
      });
    };

    it('creates a new account when no user exists for the email', async () => {
      mockGoogleTokenInfo('newuser@example.com');
      mockUserRepository.findOne.mockResolvedValueOnce(null); // email lookup
      mockUserRepository.findOne.mockResolvedValueOnce(null); // username collision check

      const result = await service.loginWithGoogle({ access_token: 'fake-token' } as any);

      expect(mockUserRepository.save).toHaveBeenCalled();
      expect(mockUserRepository.update).not.toHaveBeenCalled();
      expect(result.user.isNewUser).toBe(true);
      expect(result.user.accountLinked).toBeUndefined();
    });

    it('links an existing account created with a different provider', async () => {
      mockGoogleTokenInfo('existing@example.com');
      mockUserRepository.findOne.mockResolvedValueOnce({
        id: 'existing-user-id',
        email: 'existing@example.com',
        username: 'existing_user',
        provider: 'EMAIL',
        hasPassword: true,
      });

      const result = await service.loginWithGoogle({ access_token: 'fake-token' } as any);

      expect(mockUserRepository.save).not.toHaveBeenCalled();
      expect(mockUserRepository.update).toHaveBeenCalledWith(
        { id: 'existing-user-id' },
        { provider: 'GOOGLE' },
      );
      expect(result.user.isNewUser).toBeFalsy();
      expect(result.user.accountLinked).toBe(true);
      expect(result.user.linkedProvider).toBe('GOOGLE');
    });

    it('does not re-link or duplicate when the user already signed up with Google', async () => {
      mockGoogleTokenInfo('googleuser@example.com');
      mockUserRepository.findOne.mockResolvedValueOnce({
        id: 'google-user-id',
        email: 'googleuser@example.com',
        username: 'google_user',
        provider: 'GOOGLE',
        hasPassword: false,
      });

      const result = await service.loginWithGoogle({ access_token: 'fake-token' } as any);

      expect(mockUserRepository.save).not.toHaveBeenCalled();
      expect(mockUserRepository.update).not.toHaveBeenCalled();
      expect(result.user.isNewUser).toBeFalsy();
      expect(result.user.accountLinked).toBeUndefined();
      expect(result.user.linkedProvider).toBeUndefined();
    });
  });

  describe('loginWithLinkedIn', () => {
    const mockLinkedInProfile = (email: string) => {
      // fetchLinkedInProfile() calls out to LinkedIn's userinfo endpoint via axios.get
      mockedAxios.get.mockResolvedValue({
        data: {
          email,
          email_verified: true,
          given_name: 'Test',
          family_name: 'User',
        },
      });
    };

    it('creates a new account when no user exists for the email', async () => {
      mockLinkedInProfile('newlinkedin@example.com');
      mockUserRepository.findOne.mockResolvedValueOnce(null);
      mockUserRepository.findOne.mockResolvedValueOnce(null);

      const result = await service.loginWithLinkedIn({ access_token: 'fake-token' } as any);

      expect(mockUserRepository.save).toHaveBeenCalled();
      expect(mockUserRepository.update).not.toHaveBeenCalled();
      expect(result.user.isNewUser).toBe(true);
      expect(result.user.accountLinked).toBeUndefined();
    });

    it('links an existing account created with a different provider', async () => {
      mockLinkedInProfile('existing2@example.com');
      mockUserRepository.findOne.mockResolvedValueOnce({
        id: 'existing-user-id-2',
        email: 'existing2@example.com',
        username: 'existing_user_2',
        provider: 'GOOGLE',
        hasPassword: false,
      });

      const result = await service.loginWithLinkedIn({ access_token: 'fake-token' } as any);

      expect(mockUserRepository.update).toHaveBeenCalledWith(
        { id: 'existing-user-id-2' },
        { provider: 'LINKEDIN' },
      );
      expect(result.user.accountLinked).toBe(true);
      expect(result.user.linkedProvider).toBe('LINKEDIN');
    });

    it('does not re-link or duplicate when the user already signed up with LinkedIn', async () => {
      mockLinkedInProfile('linkedinuser@example.com');
      mockUserRepository.findOne.mockResolvedValueOnce({
        id: 'linkedin-user-id',
        email: 'linkedinuser@example.com',
        username: 'linkedin_user',
        provider: 'LINKEDIN',
        hasPassword: false,
      });

      const result = await service.loginWithLinkedIn({ access_token: 'fake-token' } as any);

      expect(mockUserRepository.save).not.toHaveBeenCalled();
      expect(mockUserRepository.update).not.toHaveBeenCalled();
      expect(result.user.accountLinked).toBeUndefined();
      expect(result.user.linkedProvider).toBeUndefined();
    });
  });
});
