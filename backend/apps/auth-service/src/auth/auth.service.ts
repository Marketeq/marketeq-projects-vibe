import {
  BadRequestException,
  GatewayTimeoutException,
  HttpException,
  HttpStatus,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { createCipheriv, createDecipheriv, createHash, randomBytes, randomUUID, scryptSync } from 'crypto';
import { resolve4, resolveMx } from 'dns/promises';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Not, QueryFailedError, Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import axios from 'axios';
import * as otplib from 'otplib';
import * as QRCode from 'qrcode';
import { UAParser } from 'ua-parser-js';
import * as geoip from 'geoip-lite';
import type { StringValue } from 'ms';

import { BrevoService } from '../brevo/brevo.service';

import { User } from '../user/entities/user.entity';
import { Session } from '../session/entities/session.entity';
import { PasswordHistory } from '../password-history/entities/password-history.entity';
import { SessionResponseDto } from './dto/session-response.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { RefreshDto } from './dto/refresh.dto';
import { RegisterEmailDto } from './dto/register-email.dto';
import { CheckUsernameDto } from './dto/check-username.dto';
import { UpdateUsernameDto } from './dto/update-username.dto';
import { SetPasswordDto } from './dto/set-password.dto';
import { GoogleLoginDto } from './dto/google-login.dto';
import { LinkedInLoginDto } from './dto/linkedin-login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import {
  SetSecurityQuestionsDto,
  VerifySecurityQuestionsDto,
} from './dto/security-questions.dto';
import { VerifyRecoveryAuthenticatorDto } from './dto/recovery-authenticator.dto';
import { SecurityQuestionAnswer } from '../security-questions/entities/security-question-answer.entity';
import {
  MAX_SECURITY_ANSWERS,
  REQUIRED_SECURITY_ANSWERS,
  SECURITY_QUESTION_CATALOG,
  SecurityQuestion,
  normalizeSecurityAnswer,
} from '../security-questions/security-questions.catalog';

type JwtPair = { access_token: string; refresh_token: string; csrfToken?: string };
type SyncUserProfilePayload = {
  id: string;
  email: string;
  username?: string;
  provider?: string;
  hasPassword?: boolean;
  firstName?: string;
  lastName?: string;
  avatarUrl?: string;
};

type AuthUserPayload = {
  id: string;
  username: string;
  email: string;
  provider?: string;
  hasPassword?: boolean;
  twoFactorEnabled?: boolean;
  twoFactorMethod?: string | null;
  firstName?: string;
  lastName?: string;
  isNewUser?: boolean;
  accountLinked?: boolean;
  linkedProvider?: string;
};

type LoginResult =
  | (JwtPair & { sessionId: string; csrfToken: string; user: AuthUserPayload })
  | { requiresTwoFactor: true; partialToken: string; twoFactorMethod: string };

type SyncRetryItem = {
  payload: SyncUserProfilePayload;
  attempts: number;
  nextAttemptAt: number;
  lastError?: string;
};

const normalizeKey = (value?: string) =>
  value ? value.replace(/\\n/g, '\n') : value;

const normalizeEmail = (value: string) => value.trim().toLowerCase();

// OIDC `auth_time`: epoch SECONDS of the original authentication. It is generated once at
// login and then carried unchanged in the signed access AND refresh tokens, so it never
// comes from Session.createdAt or JWT `iat` (which changes on every refresh). A value that
// is not a positive integer, or is more than a minute in the future, yields no claim: the
// token is still issued and the claim is simply omitted until the next login.
const AUTH_TIME_FUTURE_SKEW_SECONDS = 60;
const sanitizeAuthTime = (value: unknown): number | null => {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value <= 0) return null;
  const nowSeconds = Math.floor(Date.now() / 1000);
  return value <= nowSeconds + AUTH_TIME_FUTURE_SKEW_SECONDS ? value : null;
};

const parseExpiresIn = (value: string): number | StringValue =>
  /^\d+$/.test(value) ? Number(value) : (value as StringValue);

const INVALID_EMAIL_OR_PASSWORD_MESSAGE = 'Invalid email or password';
const PASSWORD_RESET_RATE_LIMIT_MESSAGE =
  'Too many requests. Please try again later.';
const PASSWORD_HISTORY_LIMIT = 5;

/**
 * geoip-lite returns two-letter subdivision codes; the password-changed email
 * shows full state names ("Brooklyn, New York, United States"). US only —
 * other countries fall back to the raw code.
 */
const US_STATE_NAMES: Record<string, string> = {
  AL: 'Alabama',
  AK: 'Alaska',
  AZ: 'Arizona',
  AR: 'Arkansas',
  CA: 'California',
  CO: 'Colorado',
  CT: 'Connecticut',
  DE: 'Delaware',
  DC: 'District of Columbia',
  FL: 'Florida',
  GA: 'Georgia',
  HI: 'Hawaii',
  ID: 'Idaho',
  IL: 'Illinois',
  IN: 'Indiana',
  IA: 'Iowa',
  KS: 'Kansas',
  KY: 'Kentucky',
  LA: 'Louisiana',
  ME: 'Maine',
  MD: 'Maryland',
  MA: 'Massachusetts',
  MI: 'Michigan',
  MN: 'Minnesota',
  MS: 'Mississippi',
  MO: 'Missouri',
  MT: 'Montana',
  NE: 'Nebraska',
  NV: 'Nevada',
  NH: 'New Hampshire',
  NJ: 'New Jersey',
  NM: 'New Mexico',
  NY: 'New York',
  NC: 'North Carolina',
  ND: 'North Dakota',
  OH: 'Ohio',
  OK: 'Oklahoma',
  OR: 'Oregon',
  PA: 'Pennsylvania',
  PR: 'Puerto Rico',
  RI: 'Rhode Island',
  SC: 'South Carolina',
  SD: 'South Dakota',
  TN: 'Tennessee',
  TX: 'Texas',
  UT: 'Utah',
  VT: 'Vermont',
  VA: 'Virginia',
  WA: 'Washington',
  WV: 'West Virginia',
  WI: 'Wisconsin',
  WY: 'Wyoming',
};

/**
 * The single answer both recovery checks give on every failure.
 *
 * Unknown email, no answers ever set, wrong questions named, wrong answers,
 * no authenticator paired, SMS-backed 2FA, wrong code — all of it comes back
 * as this. Any wording that distinguishes them turns the endpoint into a probe
 * for which accounts exist and how they are protected.
 */
const RECOVERY_VERIFICATION_FAILED_MESSAGE =
  'We could not verify those details. Please check them and try again.';

type RateLimitBucket = {
  count: number;
  resetAt: number;
};

@Injectable()
export class AuthService implements OnModuleInit, OnModuleDestroy {
  // Hard ceiling on the signup-time domain check. Node's resolver retries
  // internally and can stall for many seconds, and this sits in the
  // synchronous registration path.
  private static readonly DNS_LOOKUP_TIMEOUT_MS = 3000;

  private readonly logger = new Logger(AuthService.name);
  private readonly syncRetryQueue = new Map<string, SyncRetryItem>();
  private readonly passwordResetRateLimits = new Map<string, RateLimitBucket>();
  private retryTimer: NodeJS.Timeout | null = null;
  private readonly syncRetryTickMs = 5000;
  private readonly syncRetryBaseDelayMs = 5000;
  private readonly syncRetryMaxDelayMs = 5 * 60 * 1000;
  private readonly syncRetryMaxAttempts = 10;

  private sessionCleanupTimer: NodeJS.Timeout | null = null;

  private unmatchableAnswerHash?: Promise<string>;

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Session)
    private readonly sessionRepository: Repository<Session>,
    @InjectRepository(PasswordHistory)
    private readonly passwordHistoryRepository: Repository<PasswordHistory>,
    @InjectRepository(SecurityQuestionAnswer)
    private readonly securityQuestionRepository: Repository<SecurityQuestionAnswer>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly brevoService: BrevoService,
  ) {}

  onModuleInit() {
    this.retryTimer = setInterval(() => {
      void this.processSyncRetryQueue();
    }, this.syncRetryTickMs);

    this.sessionCleanupTimer = setInterval(() => {
      void this.cleanupExpiredSessions();
    }, 60 * 60 * 1000);
  }

  onModuleDestroy() {
    if (this.retryTimer) {
      clearInterval(this.retryTimer);
      this.retryTimer = null;
    }
    if (this.sessionCleanupTimer) {
      clearInterval(this.sessionCleanupTimer);
      this.sessionCleanupTimer = null;
    }
  }

  private serializeUser(
    user: Pick<User, 'id' | 'username' | 'email' | 'provider' | 'hasPassword' | 'twoFactorEnabled'> & { twoFactorMethod?: string | null },
    extra?: Pick<AuthUserPayload, 'firstName' | 'lastName' | 'isNewUser' | 'accountLinked' | 'linkedProvider'>,
  ): AuthUserPayload {
    return {
      id: user.id,
      username: user.username,
      email: user.email,
      provider: user.provider,
      hasPassword: user.hasPassword,
      twoFactorEnabled: user.twoFactorEnabled ?? false,
      twoFactorMethod: user.twoFactorMethod ?? null,
      ...(extra ?? {}),
    };
  }

  async register(dto: RegisterDto, userAgent = '', ipAddress = '') {
    const email = normalizeEmail(dto.email);
    await this.assertValidEmailDomain(email);

    const existingUser = await this.userRepository.findOne({
      where: { email },
    });

    if (existingUser) {
      throw new BadRequestException('User already exists');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const user = this.userRepository.create({
      username: dto.username,
      email,
      password: hashedPassword,
      provider: 'EMAIL',
      hasPassword: true,
    });

    try {
      await this.userRepository.save(user);
    } catch (error) {
      this.throwDuplicateEmailIfNeeded(error);
      throw error;
    }

    try {
      await this.syncUserProfile(user);
    } catch (error) {
      this.logger.warn(
        `register: user profile sync failed for ${user.email}; continuing with auth user. reason=${(error as Error)?.message}`,
      );
    }

    await this.sendPasswordCreatedEmail(user.email, user.username, 'register');

    const sessionId = randomUUID();
    const authTime = Math.floor(Date.now() / 1000);
    const tokens = await this.issueTokens({
      sub: user.id,
      email: user.email,
      sessionId,
      authTime,
    });

    const csrfToken = await this.createSession({ id: sessionId, userId: user.id, refreshToken: tokens.refresh_token, userAgent, ipAddress });

    return {
      ...tokens,
      sessionId,
      csrfToken,
      user: this.serializeUser(user),
    };
  }

  async registerEmail(dto: RegisterEmailDto, userAgent = '', ipAddress = '') {
    const email = normalizeEmail(dto.email);
    await this.assertValidEmailDomain(email);

    const existingUser = await this.userRepository.findOne({
      where: { email },
    });

    if (existingUser) {
      throw new BadRequestException('User already exists');
    }

    const username = await this.generatePlaceholderUsername();
    const plainPassword = this.generateRandomPassword();
    const hashedPassword = await bcrypt.hash(plainPassword, 10);

    const user = this.userRepository.create({
      username,
      email,
      password: hashedPassword,
      provider: 'EMAIL',
      hasPassword: false,
    });

    try {
      await this.userRepository.save(user);
    } catch (error) {
      this.throwDuplicateEmailIfNeeded(error);
      throw error;
    }

    try {
      await this.syncUserProfile(user);
    } catch (error) {
      this.logger.warn(
        `registerEmail: user profile sync failed for ${user.email}; continuing with auth user. reason=${(error as Error)?.message}`,
      );
    }

    const sessionId = randomUUID();
    const authTime = Math.floor(Date.now() / 1000);
    const tokens = await this.issueTokens({
      sub: user.id,
      email: user.email,
      sessionId,
      authTime,
    });

    const csrfToken = await this.createSession({ id: sessionId, userId: user.id, refreshToken: tokens.refresh_token, userAgent, ipAddress });

    return {
      ...tokens,
      sessionId,
      csrfToken,
      user: this.serializeUser(user),
    };
  }

  async checkUsername(dto: CheckUsernameDto) {
    const existingUser = await this.userRepository.findOne({
      where: { username: dto.username },
      select: ['id'],
    });

    return { available: !existingUser };
  }

  // Format validation (@IsEmail) only checks shape, not whether the domain
  // can actually receive mail — catches typos like "gmial.con" or made-up
  // domains at sign-up time instead of a verification email silently
  // going nowhere.
  //
  // Deliberately FAILS OPEN. Only a definitive NXDOMAIN/ENODATA on both the
  // MX and the A record rejects a signup; a resolver timeout, SERVFAIL or
  // network blip lets it through. A fail-closed check would turn one flaky
  // resolver into a total signup outage that blames the user's address —
  // catching a typo is never worth that trade.
  private async assertValidEmailDomain(email: string): Promise<void> {
    const domain = email.split('@')[1];
    if (!domain) {
      throw new BadRequestException('Invalid email address');
    }

    // NXDOMAIN / ENODATA are the only answers that definitively mean "this
    // domain cannot receive mail". Anything else — timeout, SERVFAIL,
    // EAI_AGAIN, refused — is inconclusive and must NOT reject the signup.
    const isDefinitiveMiss = (err: unknown) => {
      const code = (err as NodeJS.ErrnoException | undefined)?.code;
      return code === 'ENOTFOUND' || code === 'ENODATA';
    };

    const lookup = async (
      fn: (host: string) => Promise<unknown[]>,
      kind: string,
    ): Promise<'found' | 'missing' | 'inconclusive'> => {
      let timer: NodeJS.Timeout | undefined;
      try {
        const records = await Promise.race([
          fn(domain),
          new Promise<never>((_, reject) => {
            timer = setTimeout(
              () =>
                reject(
                  Object.assign(new Error(`${kind} lookup timed out`), {
                    code: 'ETIMEOUT',
                  }),
                ),
              AuthService.DNS_LOOKUP_TIMEOUT_MS,
            );
          }),
        ]);
        return Array.isArray(records) && records.length > 0
          ? 'found'
          : 'missing';
      } catch (error) {
        if (isDefinitiveMiss(error)) return 'missing';
        this.logger.warn(
          `${kind} lookup for "${domain}" was inconclusive (${
            (error as NodeJS.ErrnoException)?.code ?? error
          }) — allowing signup rather than blocking on DNS`,
        );
        return 'inconclusive';
      } finally {
        clearTimeout(timer);
      }
    };

    const mx = await lookup(resolveMx, 'MX');
    if (mx !== 'missing') return;

    // A domain with no MX record is NOT necessarily undeliverable: RFC 5321
    // §5.1 falls back to the A/AAAA record (implicit MX), which plenty of
    // small self-hosted domains rely on. Only reject once both are absent.
    const a = await lookup(resolve4, 'A');
    if (a !== 'missing') return;

    throw new BadRequestException("Email domain can't receive mail");
  }

  private throwDuplicateEmailIfNeeded(error: unknown): never | void {
    if (this.isDuplicateEmailError(error)) {
      throw new BadRequestException('User already exists');
    }
  }

  private isDuplicateEmailError(error: unknown): boolean {
    if (!(error instanceof QueryFailedError)) {
      return false;
    }

    const driverError = error.driverError as
      | {
          code?: string;
          constraint?: string;
          detail?: string;
          message?: string;
        }
      | undefined;

    if (driverError?.code !== '23505') {
      return false;
    }

    const constraint = driverError.constraint?.toLowerCase() ?? '';
    const detail = driverError.detail?.toLowerCase() ?? '';
    const message = driverError.message?.toLowerCase() ?? '';

    return (
      constraint.includes('email') ||
      detail.includes('(email)=') ||
      message.includes('(email)=')
    );
  }

  async updateUsername(
    user: { id?: string; sub?: string },
    dto: UpdateUsernameDto,
  ) {
    const userId = user?.sub ?? user?.id;
    if (!userId) {
      throw new UnauthorizedException('Invalid user');
    }

    const existing = await this.userRepository.findOne({
      where: { username: dto.username },
      select: ['id'],
    });

    if (existing && existing.id !== userId) {
      throw new BadRequestException('Username already exists');
    }

    const current = await this.userRepository.findOne({
      where: { id: userId },
      select: ['id', 'email', 'username', 'provider', 'hasPassword', 'twoFactorEnabled'],
    });

    if (!current) {
      throw new UnauthorizedException('Invalid user');
    }

    current.username = dto.username;
    await this.userRepository.save(current);

    await this.syncUserProfile(current);

    return {
      user: this.serializeUser(current),
    };
  }

  async setPassword(user: { id?: string; sub?: string }, dto: SetPasswordDto) {
    const userId = user?.sub ?? user?.id;
    if (!userId) {
      throw new UnauthorizedException('Invalid user');
    }

    const current = await this.userRepository.findOne({
      where: { id: userId },
      select: ['id', 'email', 'username', 'password', 'provider', 'hasPassword', 'twoFactorEnabled'],
    });

    if (!current) {
      throw new UnauthorizedException('Invalid user');
    }

    const hadPassword = current.hasPassword;
    current.password = await bcrypt.hash(dto.password, 10);
    current.hasPassword = true;
    await this.userRepository.save(current);

    try {
      await this.syncUserProfile(current);
    } catch (error) {
      this.logger.warn(
        `setPassword: user profile sync failed for ${current.email}; continuing with auth user. reason=${(error as Error)?.message}`,
      );
    }

    if (!hadPassword) {
      await this.sendPasswordCreatedEmail(current.email, current.username, 'setPassword');
    }

    return {
      user: this.serializeUser(current),
    };
  }

  async login(dto: LoginDto, userAgent = '', ipAddress = ''): Promise<LoginResult> {
    const user = await this.userRepository.findOne({
      where: { email: dto.email },
      select: ['id', 'email', 'username', 'password', 'provider', 'hasPassword', 'twoFactorEnabled', 'twoFactorMethod'],
    });

    if (!user) throw new UnauthorizedException(INVALID_EMAIL_OR_PASSWORD_MESSAGE);

    if (!user.hasPassword || !user.password) {
      throw new UnauthorizedException(INVALID_EMAIL_OR_PASSWORD_MESSAGE);
    }

    const isMatch = await bcrypt.compare(dto.password, user.password);
    if (!isMatch) throw new UnauthorizedException(INVALID_EMAIL_OR_PASSWORD_MESSAGE);

    if (user.twoFactorEnabled) {
      const method = user.twoFactorMethod ?? 'totp';
      const partialToken = await this.issuePartialToken(user, dto.rememberMe ?? false);

      if (method === 'sms') {
        try {
          await this.sendLoginTwoFactorCode(user.id);
        } catch (err) {
          this.logger.error(`Failed to send login SMS OTP for ${user.email}: ${(err as Error)?.message}`);
        }
      }

      return { requiresTwoFactor: true, partialToken, twoFactorMethod: method };
    }

    try {
      await this.syncUserProfile(user);
    } catch (error) {
      this.logger.warn(
        `login: user profile sync failed for ${user.email}; continuing with auth user. reason=${(error as Error)?.message}`,
      );
    }

    const sessionId = randomUUID();
    const authTime = Math.floor(Date.now() / 1000);
    const rememberMe = dto.rememberMe ?? false;
    const tokens = await this.issueTokens({ sub: user.id, email: user.email, sessionId, authTime, rememberMe });

    const csrfToken = await this.createSession({ id: sessionId, userId: user.id, refreshToken: tokens.refresh_token, userAgent, ipAddress, rememberMe });

    return {
      ...tokens,
      sessionId,
      csrfToken,
      user: this.serializeUser(user),
    };
  }

  /**
   * Dev-only login: issue real RS256 tokens for an existing user by email.
   * Disabled in production. Behaves identically to real login (same token format,
   * same gateway verification) so local dev matches cloud behavior exactly.
   */
  async devLogin(email: string, userAgent = '', ipAddress = ''): Promise<JwtPair & { sessionId: string; csrfToken: string; user: AuthUserPayload }> {
    if (process.env.NODE_ENV === 'production' && process.env.ENABLE_DEV_LOGIN !== 'true') {
      throw new UnauthorizedException('Dev login is not available in production');
    }

    let user = await this.userRepository.findOne({
      where: { email },
      select: ['id', 'email', 'username', 'provider', 'hasPassword', 'twoFactorEnabled'],
    });

    // Auto-create auth entry for seed users that only exist in user-service
    if (!user) {
      const username = await this.generatePlaceholderUsername();
      const hashedPassword = await bcrypt.hash(this.generateRandomPassword(), 10);

      user = this.userRepository.create({
        username,
        email,
        password: hashedPassword,
        provider: 'EMAIL',
        hasPassword: false,
      });
      await this.userRepository.save(user);

      // Sync to user-service (will find existing user by email)
      try {
        await this.syncUserProfile(user);
      } catch {
        // User-service may already have this user — that's fine
      }
    }

    const sessionId = randomUUID();
    const authTime = Math.floor(Date.now() / 1000);
    const tokens = await this.issueTokens({ sub: user.id, email: user.email, sessionId, authTime });

    const csrfToken = await this.createSession({ id: sessionId, userId: user.id, refreshToken: tokens.refresh_token, userAgent, ipAddress });

    return {
      ...tokens,
      sessionId,
      csrfToken,
      user: this.serializeUser(user),
    };
  }

  async forgotPassword(dto: ForgotPasswordDto, ipAddress = '') {
    const normalizedEmail = normalizeEmail(dto.email);
    this.enforcePasswordResetRateLimit(
      `forgot-password:ip:${this.normalizeRateLimitIp(ipAddress)}`,
      'AUTH_FORGOT_PASSWORD_IP_LIMIT',
      10,
      'AUTH_FORGOT_PASSWORD_RATE_LIMIT_WINDOW_MS',
      15 * 60 * 1000,
    );
    this.enforcePasswordResetRateLimit(
      `forgot-password:email:${normalizedEmail}`,
      'AUTH_FORGOT_PASSWORD_EMAIL_LIMIT',
      3,
      'AUTH_FORGOT_PASSWORD_RATE_LIMIT_WINDOW_MS',
      15 * 60 * 1000,
    );

    const user = await this.userRepository.findOne({
      where: { email: normalizedEmail },
      select: ['id', 'email', 'username', 'passwordResetVersion'],
    });

    const message =
      'If an account exists for this email, password reset instructions will be sent.';

    if (!user) {
      this.logger.log(
        `forgotPassword: reset requested for unknown email (ip=${this.normalizeRateLimitIp(ipAddress)})`,
      );
      return { accountFound: false };
    }

    this.logger.log(
      `forgotPassword: reset requested for userId=${user.id} (ip=${this.normalizeRateLimitIp(ipAddress)})`,
    );

    user.passwordResetVersion = randomUUID();
    await this.userRepository.save(user);

    const resetToken = await this.issuePasswordResetToken(user);

    const fallbackBase =
      this.configService.get<string>('PASSWORD_RESET_URL') ??
      (this.configService.get<string>('FRONTEND_URL')
        ? `${this.configService.get<string>('FRONTEND_URL')!.replace(/\/$/, '')}/reset-password`
        : undefined);

    const base = this.resolveTrustedPasswordResetBase(dto.redirectUrl, fallbackBase);
    const resetUrl =
      base && resetToken
        ? `${base}${base.includes('?') ? '&' : '?'}token=${encodeURIComponent(resetToken)}`
        : undefined;

    if (resetUrl) {
      // Try to fetch the user's first name from user-service for a friendlier email
      let displayName = user.username;
      try {
        const userServiceUrl =
          this.configService.get<string>('USER_SERVICE_URL') ?? 'http://localhost:3002';
        const internalToken = this.configService.get<string>('INTERNAL_SERVICE_TOKEN');
        const profileRes = await axios.get(
          `${userServiceUrl.replace(/\/$/, '')}/internal/users/${user.id}/summary`,
          {
            headers: internalToken ? { 'x-internal-token': internalToken } : {},
            timeout: 3000,
          },
        );
        const firstName = profileRes?.data?.firstName;
        if (firstName) displayName = firstName;
      } catch {
        // fall back to username
      }

      try {
        await this.brevoService.sendPasswordResetEmail(user.email, {
          firstName: displayName,
          resetUrl,
        });
      } catch (error) {
        this.logger.error(
          `forgotPassword: Brevo password reset email failed for ${user.email}: ${(error as Error)?.message}`,
        );
      }
    }

    const isDev = this.configService.get<string>('NODE_ENV') !== 'production';

    return {
      accountFound: true,
      message,
      ...(isDev && { reset_token: resetToken, reset_url: resetUrl }),
    };
  }

  async resetPassword(dto: ResetPasswordDto, ipAddress = '', userAgent = '') {
    this.enforcePasswordResetRateLimit(
      `reset-password:ip:${this.normalizeRateLimitIp(ipAddress)}`,
      'AUTH_RESET_PASSWORD_IP_LIMIT',
      20,
      'AUTH_RESET_PASSWORD_RATE_LIMIT_WINDOW_MS',
      15 * 60 * 1000,
    );

    let payload: {
      sub?: string;
      email?: string;
      type?: string;
      resetVersion?: string;
    };

    try {
      payload = await this.jwtService.verifyAsync(dto.token, {
        algorithms: ['RS256'],
      });
    } catch {
      this.logger.warn(
        `resetPassword: rejected invalid/expired token (ip=${this.normalizeRateLimitIp(ipAddress)})`,
      );
      throw new UnauthorizedException('Invalid or expired reset token');
    }

    if (!payload?.sub || payload.type !== 'reset' || !payload.resetVersion) {
      this.logger.warn(
        `resetPassword: rejected malformed token payload (ip=${this.normalizeRateLimitIp(ipAddress)})`,
      );
      throw new UnauthorizedException('Invalid or expired reset token');
    }

    const user = await this.userRepository.findOne({
      where: { id: payload.sub },
      select: ['id', 'email', 'username', 'password', 'provider', 'hasPassword', 'twoFactorEnabled', 'passwordResetVersion'],
    });

    if (!user || user.passwordResetVersion !== payload.resetVersion) {
      this.logger.warn(
        `resetPassword: rejected reused/stale token for userId=${payload.sub} (ip=${this.normalizeRateLimitIp(ipAddress)})`,
      );
      throw new UnauthorizedException('Invalid or expired reset token');
    }

    await this.assertPasswordNotReused(user, dto.password);

    const nextResetVersion = randomUUID();
    const hashedPassword = await bcrypt.hash(dto.password, 10);

    await this.userRepository.manager.transaction(async (manager) => {
      const updateResult = await manager.getRepository(User).update(
        { id: user.id, passwordResetVersion: payload.resetVersion },
        {
          password: hashedPassword,
          hasPassword: true,
          passwordResetVersion: nextResetVersion,
        },
      );

      if (!updateResult.affected) {
        throw new UnauthorizedException('Invalid or expired reset token');
      }

      await manager.getRepository(PasswordHistory).save({
        userId: user.id,
        passwordHash: hashedPassword,
      });

      const staleHistory = await manager
        .getRepository(PasswordHistory)
        .find({
          where: { userId: user.id },
          order: { createdAt: 'DESC' },
          skip: PASSWORD_HISTORY_LIMIT,
        });

      if (staleHistory.length) {
        await manager
          .getRepository(PasswordHistory)
          .delete(staleHistory.map((entry) => entry.id));
      }
    });

    user.hasPassword = true;
    user.passwordResetVersion = nextResetVersion;

    await this.syncUserProfile(user);

    this.logger.log(
      `resetPassword: password reset for userId=${user.id} (ip=${this.normalizeRateLimitIp(ipAddress)})`,
    );

    const sessionId = randomUUID();
    const authTime = Math.floor(Date.now() / 1000);
    const tokens = await this.issueTokens({ sub: user.id, email: user.email, sessionId, authTime });
    const csrfToken = await this.createSession({ id: sessionId, userId: user.id, refreshToken: tokens.refresh_token, userAgent, ipAddress });

    await this.notifyPasswordChanged(user, ipAddress, userAgent);

    return {
      success: true,
      ...tokens,
      sessionId,
      csrfToken,
      user: this.serializeUser(user),
    };
  }

  /**
   * Changes the password of a signed-in caller, proving intent with the
   * password they already hold.
   *
   * Distinct from resetPassword, which is reached with an emailed token
   * precisely because the person cannot sign in. Settings > Login & Password
   * used to call nothing at all here and still report "Your password has been
   * updated", so a change the user believed had happened had not.
   *
   * No cookies are set and no session is re-issued: the caller's session is
   * still valid, and replacing it would sign them out of the tab they are
   * standing in.
   */
  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
    ipAddress = '',
    userAgent = '',
  ): Promise<{ success: true }> {
    // Same limiter as reset. This endpoint verifies a secret, so it is a
    // guessing surface even though the caller is already authenticated.
    this.enforcePasswordResetRateLimit(
      `change-password:user:${userId}`,
      'AUTH_CHANGE_PASSWORD_LIMIT',
      10,
      'AUTH_CHANGE_PASSWORD_RATE_LIMIT_WINDOW_MS',
      15 * 60 * 1000,
    );

    const user = await this.userRepository.findOne({
      where: { id: userId },
      select: [
        'id',
        'email',
        'username',
        'password',
        'provider',
        'hasPassword',
        'passwordResetVersion',
      ],
    });
    if (!user) {
      throw new UnauthorizedException('Account not found');
    }

    // An OAuth-only account has no password to verify. Say so plainly rather
    // than reporting a mismatch against something that does not exist.
    if (!user.password || !user.hasPassword) {
      throw new BadRequestException(
        'This account signs in with a social provider and has no password to change.',
      );
    }

    const matches = await bcrypt.compare(currentPassword, user.password);
    if (!matches) {
      this.logger.warn(
        `changePassword: wrong current password for userId=${userId} (ip=${this.normalizeRateLimitIp(ipAddress)})`,
      );
      throw new BadRequestException(
        'That does not match your current password.',
      );
    }

    if (currentPassword === newPassword) {
      throw new BadRequestException(
        'Your new password must be different from your current one.',
      );
    }

    await this.assertPasswordNotReused(user, newPassword);

    const nextResetVersion = randomUUID();
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await this.userRepository.manager.transaction(async (manager) => {
      const updateResult = await manager.getRepository(User).update(
        { id: user.id },
        {
          password: hashedPassword,
          hasPassword: true,
          passwordResetVersion: nextResetVersion,
        },
      );
      if (!updateResult.affected) {
        throw new UnauthorizedException('Account not found');
      }

      await manager.getRepository(PasswordHistory).save({
        userId: user.id,
        passwordHash: hashedPassword,
      });

      const staleHistory = await manager.getRepository(PasswordHistory).find({
        where: { userId: user.id },
        order: { createdAt: 'DESC' },
        skip: PASSWORD_HISTORY_LIMIT,
      });
      if (staleHistory.length) {
        await manager
          .getRepository(PasswordHistory)
          .delete(staleHistory.map((entry) => entry.id));
      }
    });

    this.logger.log(
      `changePassword: password changed for userId=${user.id} (ip=${this.normalizeRateLimitIp(ipAddress)})`,
    );

    // The same notification the reset path sends. A password changed from
    // Settings is no less worth telling the account holder about than one
    // changed through recovery, and this is the only signal they get if the
    // change was not theirs. Swallows its own failures.
    await this.notifyPasswordChanged(user, ipAddress, userAgent);

    return { success: true };
  }

  /**
   * Tells the account holder their password changed, so an unauthorised change
   * is visible to them even though the attacker now holds the credentials.
   *
   * Deliberately never throws: the password is already committed by this point
   * and the caller's session is issued, so a mail failure must not turn a
   * completed reset into an error the user would retry. That does mean a
   * delivery failure is only visible in this log — the same swallow that
   * applies to the reset email itself.
   */
  private async notifyPasswordChanged(
    user: Pick<User, 'id' | 'email' | 'username'>,
    ipAddress: string,
    userAgent: string,
  ): Promise<void> {
    try {
      const frontendUrl = this.configService.get<string>('FRONTEND_URL');

      await this.brevoService.sendPasswordChangedEmail(user.email, {
        firstName: await this.resolveDisplayName(user),
        when: this.formatEventTime(new Date(), ipAddress),
        device: this.describeDevice(userAgent),
        where: this.describeLocation(ipAddress),
        // Whoever did this holds the password now, so the recipient cannot
        // simply sign in and change it — the recovery flow is the way back in.
        changePasswordUrl: frontendUrl
          ? `${frontendUrl.replace(/\/$/, '')}/forgot-password`
          : undefined,
      });
    } catch (error) {
      this.logger.error(
        `notifyPasswordChanged: password-changed email failed for userId=${user.id}: ${(error as Error)?.message}`,
      );
    }
  }

  /**
   * First name from user-service for the greeting, falling back to the
   * username. Mirrors what forgotPassword does for the reset email.
   */
  private async resolveDisplayName(
    user: Pick<User, 'id' | 'username'>,
  ): Promise<string> {
    try {
      const userServiceUrl =
        this.configService.get<string>('USER_SERVICE_URL') ?? 'http://localhost:3002';
      const internalToken = this.configService.get<string>('INTERNAL_SERVICE_TOKEN');
      const profileRes = await axios.get(
        `${userServiceUrl.replace(/\/$/, '')}/internal/users/${user.id}/summary`,
        {
          headers: internalToken ? { 'x-internal-token': internalToken } : {},
          timeout: 3000,
        },
      );
      const firstName = profileRes?.data?.firstName;
      if (firstName) return firstName;
    } catch {
      // fall back to username
    }
    return user.username;
  }

  // ---------------------------------------------------------------------------
  // Security questions
  //
  // Two audiences, deliberately separated. The three methods above the divider
  // are for a signed-in user managing their own answers from Settings; the two
  // below are the unauthenticated recovery checks, which end in a password
  // reset and are therefore treated as an attack surface throughout.
  // ---------------------------------------------------------------------------

  /**
   * The prompts both screens render. Public: the catalogue is the same for
   * everyone and reveals nothing about any account.
   */
  getSecurityQuestionCatalog(): {
    questions: SecurityQuestion[];
    requiredAnswers: number;
    maxAnswers: number;
  } {
    // The limits ship with the catalogue so the form reads them from the same
    // place the validator enforces them, rather than restating 2 and 5 in the
    // two screens that render this.
    return {
      questions: [...SECURITY_QUESTION_CATALOG],
      requiredAnswers: REQUIRED_SECURITY_ANSWERS,
      maxAnswers: MAX_SECURITY_ANSWERS,
    };
  }

  /**
   * Which questions this account has answered — ids only.
   *
   * Never returns the answers or their hashes, and there is no endpoint that
   * does. An answer is write-only by design; Settings shows which questions are
   * set and offers to replace them, it does not show what was said.
   */
  async getSecurityQuestions(
    userId: string,
  ): Promise<{ questionIds: string[]; configured: boolean }> {
    const rows = await this.securityQuestionRepository.find({
      where: { userId },
      order: { createdAt: 'ASC' },
    });

    return {
      questionIds: rows.map((row) => row.questionId),
      configured: rows.length >= REQUIRED_SECURITY_ANSWERS,
    };
  }

  /**
   * Replaces this account's answers wholesale.
   *
   * Replace rather than merge: the form always submits the full set, so a merge
   * would leave an answer to a question the user has since deselected still
   * live and still accepted at recovery time.
   */
  async setSecurityQuestions(
    userId: string,
    dto: SetSecurityQuestionsDto,
  ): Promise<{ questionIds: string[]; configured: boolean }> {
    const questionIds = dto.answers.map((entry) => entry.questionId);

    if (new Set(questionIds).size !== questionIds.length) {
      throw new BadRequestException(
        'Each security question can only be answered once.',
      );
    }

    const prepared = await Promise.all(
      dto.answers.map(async (entry) => {
        const normalized = normalizeSecurityAnswer(entry.answer);

        // @IsNotEmpty passes a string of spaces; normalisation turns it into
        // an empty answer that would then match any other whitespace-only one.
        if (!normalized) {
          throw new BadRequestException('Answers cannot be blank.');
        }

        return {
          userId,
          questionId: entry.questionId,
          answerHash: await bcrypt.hash(normalized, 10),
        };
      }),
    );

    await this.securityQuestionRepository.manager.transaction(
      async (manager) => {
        const repository = manager.getRepository(SecurityQuestionAnswer);
        await repository.delete({ userId });
        await repository.save(prepared);
      },
    );

    this.logger.log(
      `setSecurityQuestions: stored ${prepared.length} answers for userId=${userId}`,
    );

    return { questionIds, configured: true };
  }

  /**
   * Checks answers submitted by someone who is locked out, and on a pass
   * returns a short-lived reset token that resetPassword will accept.
   *
   * The caller states which questions they are answering as well as what the
   * answers are. That is not laziness about showing them their own questions —
   * it is what keeps this from being an account-existence oracle. There is no
   * endpoint that will tell an unauthenticated caller which questions an
   * account set, so the response is identical whether the email is unknown, the
   * account never set any answers, the wrong questions were named, or the
   * answers were simply wrong.
   */
  async verifySecurityQuestionsForRecovery(
    dto: VerifySecurityQuestionsDto,
    ipAddress = '',
  ): Promise<{ resetToken: string }> {
    this.enforceRecoveryRateLimit('security-questions', dto.email, ipAddress);

    const normalizedEmail = normalizeEmail(dto.email);
    const user = await this.userRepository.findOne({
      where: { email: normalizedEmail },
      select: ['id', 'email', 'passwordResetVersion'],
    });

    const submittedIds = dto.answers.map((entry) => entry.questionId);
    const stored = user
      ? await this.securityQuestionRepository.find({
          where: { userId: user.id },
          select: ['id', 'questionId', 'answerHash'],
        })
      : [];

    const storedByQuestion = new Map(
      stored.map((row) => [row.questionId, row.answerHash]),
    );

    // Every branch below still runs a bcrypt comparison, including the ones
    // that are already doomed, so that "no such account" does not return
    // measurably faster than "wrong answer". Timing is blunted rather than
    // equalised — the rate limiter above is the control that actually matters.
    let passed =
      !!user &&
      new Set(submittedIds).size === submittedIds.length &&
      stored.length >= REQUIRED_SECURITY_ANSWERS &&
      submittedIds.length >= REQUIRED_SECURITY_ANSWERS;

    for (const entry of dto.answers) {
      const expected =
        (passed ? storedByQuestion.get(entry.questionId) : undefined) ??
        (await this.getUnmatchableAnswerHash());

      const matched = await bcrypt.compare(
        normalizeSecurityAnswer(entry.answer),
        expected,
      );

      if (!matched) passed = false;
    }

    if (!passed) {
      this.logger.warn(
        `verifySecurityQuestionsForRecovery: rejected (ip=${this.normalizeRateLimitIp(ipAddress)})`,
      );
      throw new UnauthorizedException(RECOVERY_VERIFICATION_FAILED_MESSAGE);
    }

    this.logger.log(
      `verifySecurityQuestionsForRecovery: passed for userId=${user!.id} (ip=${this.normalizeRateLimitIp(ipAddress)})`,
    );

    return { resetToken: await this.issueRecoveryResetToken(user!) };
  }

  /**
   * Checks a TOTP code from someone who is locked out, and on a pass returns
   * the same short-lived reset token the security-question route returns.
   *
   * It has to be its own route. /auth/2fa/verify is the only other place that
   * validates a TOTP code, and it demands a partialToken minted by a *completed*
   * login — which nobody holds in a forgotten-password flow — so it is
   * unreachable from here by construction.
   *
   * It deliberately does NOT issue a session. Proving a TOTP code means proving
   * possession of the second factor; handing back a session for it alone would
   * make an account with 2FA enabled reachable with strictly less than its own
   * sign-in requires (password *and* code), which is an authentication bypass.
   * The code authorises setting a new password, and the new password is the way
   * back in. See docs/ACCOUNT_RECOVERY_NOTES.md §4.4.
   */
  async verifyAuthenticatorForRecovery(
    dto: VerifyRecoveryAuthenticatorDto,
    ipAddress = '',
  ): Promise<{ resetToken: string }> {
    this.enforceRecoveryRateLimit('authenticator', dto.email, ipAddress);

    const normalizedEmail = normalizeEmail(dto.email);
    const user = await this.userRepository.findOne({
      where: { email: normalizedEmail },
      select: [
        'id',
        'email',
        'passwordResetVersion',
        'twoFactorEnabled',
        'twoFactorMethod',
        'twoFactorSecret',
        'twoFactorBackupCodes',
      ],
    });

    // An SMS-backed account has no secret to check a code against without
    // sending one first, and SMS is deprioritised, so it falls through to the
    // same rejection as an account with no authenticator at all — rather than a
    // distinguishable "wrong method" error.
    const checkable =
      !!user &&
      user.twoFactorEnabled &&
      !!user.twoFactorSecret &&
      (user.twoFactorMethod ?? 'totp') !== 'sms';

    const passed = checkable
      ? await this.validateTwoFactorCode(user!, dto.code)
      : await this.burnUnmatchableComparison();

    if (!passed) {
      this.logger.warn(
        `verifyAuthenticatorForRecovery: rejected (ip=${this.normalizeRateLimitIp(ipAddress)})`,
      );
      throw new UnauthorizedException(RECOVERY_VERIFICATION_FAILED_MESSAGE);
    }

    this.logger.log(
      `verifyAuthenticatorForRecovery: passed for userId=${user!.id} (ip=${this.normalizeRateLimitIp(ipAddress)})`,
    );

    return { resetToken: await this.issueRecoveryResetToken(user!) };
  }

  /**
   * Mints the proof that Update Password consumes.
   *
   * Rotating passwordResetVersion first is what makes it single-use: resetPassword
   * requires the version in the token to still match the row, and rotates it
   * again on success. It also invalidates any reset link already sitting in the
   * account's inbox, which is the right outcome — a second recovery attempt
   * should retire the first.
   *
   * Minutes, not the 24 hours an emailed link gets: this token is handed
   * straight to the next screen in an open modal, so its whole life is the time
   * it takes to type a password.
   */
  private async issueRecoveryResetToken(user: {
    id: string;
    email: string;
  }): Promise<string> {
    const resetVersion = randomUUID();
    await this.userRepository.update(
      { id: user.id },
      { passwordResetVersion: resetVersion },
    );

    const expiresIn = parseExpiresIn(
      this.configService.get<string>('AUTH_RECOVERY_RESET_TOKEN_EXPIRES_IN') ??
        '15m',
    );

    return this.jwtService.signAsync(
      {
        sub: user.id,
        email: user.email,
        type: 'reset',
        resetVersion,
      },
      { expiresIn },
    );
  }

  /**
   * Per-account and per-IP ceilings on the two recovery checks.
   *
   * Both are unauthenticated, both end in a password reset, and both compare
   * against a small answer space — six questions, or a six-digit code. Without
   * a ceiling they are a brute-force target, and the code space in particular
   * falls quickly to an unthrottled attacker.
   *
   * Shares the password-reset limiter, which means it shares its limitation:
   * the buckets live in this process, so they are per-instance and reset on
   * deploy. On Render with more than one instance the effective limit is the
   * configured number times the instance count. A shared Redis bucket is the
   * real fix and Redis is already a dependency of this stack.
   */
  private enforceRecoveryRateLimit(
    scope: 'security-questions' | 'authenticator',
    email: string,
    ipAddress: string,
  ): void {
    this.enforcePasswordResetRateLimit(
      `recovery:${scope}:ip:${this.normalizeRateLimitIp(ipAddress)}`,
      'AUTH_RECOVERY_IP_LIMIT',
      10,
      'AUTH_RECOVERY_RATE_LIMIT_WINDOW_MS',
      15 * 60 * 1000,
    );
    this.enforcePasswordResetRateLimit(
      `recovery:${scope}:email:${normalizeEmail(email)}`,
      'AUTH_RECOVERY_ACCOUNT_LIMIT',
      5,
      'AUTH_RECOVERY_RATE_LIMIT_WINDOW_MS',
      15 * 60 * 1000,
    );
  }

  /**
   * A bcrypt hash of random bytes, so nothing a caller can send will ever match
   * it. Compared against when there is no real hash to compare against, so the
   * doomed paths through the two verify methods still pay for a hash.
   *
   * Generated once per process rather than written into the source, where a
   * constant bcrypt string would read as a leaked credential to anyone — and to
   * the secret scanner — looking at this file.
   */
  private getUnmatchableAnswerHash(): Promise<string> {
    if (!this.unmatchableAnswerHash) {
      this.unmatchableAnswerHash = bcrypt.hash(
        randomBytes(32).toString('hex'),
        10,
      );
    }
    return this.unmatchableAnswerHash;
  }

  private async burnUnmatchableComparison(): Promise<false> {
    await bcrypt.compare(
      randomBytes(16).toString('hex'),
      await this.getUnmatchableAnswerHash(),
    );
    return false;
  }

  // ---------------------------------------------------------------------
  // Recovery email
  //
  // Proving ownership matters more here than anywhere else in Settings: an
  // unproven recovery address is either a typo that silently removes the only
  // way back into an account, or a deliberate entry that points recovery at
  // someone else's inbox. So the requested address waits in
  // `pendingRecoveryEmail` and only a confirmed one is written to
  // `recoveryEmail`. Nothing outside this block reads the pending column.
  // ---------------------------------------------------------------------

  /** How long a confirmation link stays good for. */
  private static readonly RECOVERY_EMAIL_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

  private hashRecoveryEmailToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  /**
   * What Settings renders. Returns the proven address and, separately, one
   * still awaiting confirmation — the screen has to be able to say "pending"
   * rather than show an address as though it were live.
   */
  async getRecoveryEmail(userId: string): Promise<{
    recoveryEmail: string | null;
    pendingRecoveryEmail: string | null;
  }> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      select: ['id', 'recoveryEmail', 'pendingRecoveryEmail'],
    });
    if (!user) throw new NotFoundException('User not found');

    return {
      recoveryEmail: user.recoveryEmail ?? null,
      pendingRecoveryEmail: user.pendingRecoveryEmail ?? null,
    };
  }

  /**
   * Records the requested address and emails it a confirmation link.
   *
   * Deliberately does not touch `recoveryEmail`: until the link is followed,
   * an existing proven address keeps working. Replacing it here would let an
   * unconfirmed typo delete a working recovery path.
   */
  async setRecoveryEmail(
    userId: string,
    email: string,
    ipAddress = '',
  ): Promise<{ success: true; pendingRecoveryEmail: string }> {
    this.enforcePasswordResetRateLimit(
      `recovery-email:user:${userId}`,
      'AUTH_RECOVERY_EMAIL_LIMIT',
      5,
      'AUTH_RECOVERY_EMAIL_RATE_LIMIT_WINDOW_MS',
      15 * 60 * 1000,
    );
    this.enforcePasswordResetRateLimit(
      `recovery-email:ip:${this.normalizeRateLimitIp(ipAddress)}`,
      'AUTH_RECOVERY_EMAIL_IP_LIMIT',
      20,
      'AUTH_RECOVERY_EMAIL_RATE_LIMIT_WINDOW_MS',
      15 * 60 * 1000,
    );

    const address = normalizeEmail(email);

    const user = await this.userRepository.findOne({
      where: { id: userId },
      select: ['id', 'email', 'username', 'recoveryEmail'],
    });
    if (!user) throw new NotFoundException('User not found');

    // A recovery address equal to the sign-in address is not a recovery path:
    // whatever locks you out of one locks you out of both.
    if (normalizeEmail(user.email) === address) {
      throw new BadRequestException(
        'Use a different address from your account email, otherwise it cannot help you recover.',
      );
    }

    if (user.recoveryEmail && normalizeEmail(user.recoveryEmail) === address) {
      throw new BadRequestException(
        'That address is already your recovery email.',
      );
    }

    const token = randomBytes(32).toString('hex');

    await this.userRepository.update(userId, {
      pendingRecoveryEmail: address,
      recoveryEmailTokenHash: this.hashRecoveryEmailToken(token),
      recoveryEmailExpiresAt: new Date(
        Date.now() + AuthService.RECOVERY_EMAIL_TOKEN_TTL_MS,
      ),
    });

    await this.dispatchRecoveryEmail(user.id, address, user.username, token);

    return { success: true, pendingRecoveryEmail: address };
  }

  /**
   * Issues a fresh token for the address already waiting. The old token stops
   * working, so a resend cannot leave two live links for one address.
   */
  async resendRecoveryEmail(
    userId: string,
    ipAddress = '',
  ): Promise<{ success: true; pendingRecoveryEmail: string }> {
    this.enforcePasswordResetRateLimit(
      `recovery-email-resend:user:${userId}`,
      'AUTH_RECOVERY_EMAIL_RESEND_LIMIT',
      3,
      'AUTH_RECOVERY_EMAIL_RATE_LIMIT_WINDOW_MS',
      15 * 60 * 1000,
    );

    const user = await this.userRepository.findOne({
      where: { id: userId },
      select: ['id', 'username', 'pendingRecoveryEmail'],
    });
    if (!user) throw new NotFoundException('User not found');
    if (!user.pendingRecoveryEmail) {
      throw new BadRequestException(
        'There is no recovery email awaiting confirmation.',
      );
    }

    const token = randomBytes(32).toString('hex');
    await this.userRepository.update(userId, {
      recoveryEmailTokenHash: this.hashRecoveryEmailToken(token),
      recoveryEmailExpiresAt: new Date(
        Date.now() + AuthService.RECOVERY_EMAIL_TOKEN_TTL_MS,
      ),
    });

    await this.dispatchRecoveryEmail(
      user.id,
      user.pendingRecoveryEmail,
      user.username,
      token,
    );

    return { success: true, pendingRecoveryEmail: user.pendingRecoveryEmail };
  }

  /**
   * Completes the change: promotes the pending address and clears the waiting
   * room. Unauthenticated by design — whoever holds the link is proving they
   * can read that inbox, which is the entire point, and requiring a session
   * would break confirming from a phone.
   */
  async verifyRecoveryEmail(token: string): Promise<{ recoveryEmail: string }> {
    if (!token?.trim()) throw new BadRequestException('Token is required');

    const user = await this.userRepository.findOne({
      where: { recoveryEmailTokenHash: this.hashRecoveryEmailToken(token.trim()) },
      select: [
        'id',
        'pendingRecoveryEmail',
        'recoveryEmailExpiresAt',
      ],
    });
    if (!user || !user.pendingRecoveryEmail) {
      throw new NotFoundException(
        'That confirmation link is not valid. It may already have been used.',
      );
    }

    if (
      user.recoveryEmailExpiresAt &&
      user.recoveryEmailExpiresAt.getTime() < Date.now()
    ) {
      // Cleared on expiry so a stale row cannot be retried indefinitely.
      await this.userRepository.update(user.id, {
        pendingRecoveryEmail: null,
        recoveryEmailTokenHash: null,
        recoveryEmailExpiresAt: null,
      });
      throw new BadRequestException(
        'That confirmation link has expired. Request it again from Settings.',
      );
    }

    const address = user.pendingRecoveryEmail;
    await this.userRepository.update(user.id, {
      recoveryEmail: address,
      pendingRecoveryEmail: null,
      recoveryEmailTokenHash: null,
      recoveryEmailExpiresAt: null,
    });

    this.logger.log(`Recovery email confirmed for userId=${user.id}`);
    return { recoveryEmail: address };
  }

  /**
   * Delivery is best-effort on purpose. The pending row is already committed,
   * so a Brevo outage must not surface as a failed save and leave the caller
   * unsure whether the address was recorded — Resend Link is the recovery.
   */
  private async dispatchRecoveryEmail(
    userId: string,
    address: string,
    username: string | undefined,
    token: string,
  ): Promise<void> {
    const confirmUrl = this.buildRecoveryEmailConfirmUrl(token);

    let displayName = username;
    try {
      const userServiceUrl =
        this.configService.get<string>('USER_SERVICE_URL') ??
        'http://localhost:3002';
      const internalToken = this.configService.get<string>(
        'INTERNAL_SERVICE_TOKEN',
      );
      const profileRes = await axios.get(
        `${userServiceUrl.replace(/\/$/, '')}/internal/users/${userId}/summary`,
        {
          headers: internalToken ? { 'x-internal-token': internalToken } : {},
          timeout: 3000,
        },
      );
      if (profileRes?.data?.firstName) displayName = profileRes.data.firstName;
    } catch {
      // fall back to username, exactly as forgotPassword does
    }

    // Without an API key nothing can be delivered, so the link would be
    // unreachable and the flow untestable locally. Logged only when there is
    // no key AND we are not in production, matching the mock that
    // notification-service already has and the dev-only reset_token that
    // forgotPassword returns.
    if (
      !(process.env.BREVO_API_KEY ?? '').trim() &&
      this.configService.get<string>('NODE_ENV') !== 'production'
    ) {
      this.logger.log(
        `[LOCAL DEV MOCK EMAIL] To: ${address} | Subject: "Set Up Your Account Recovery Email" | Link: ${confirmUrl}`,
      );
      return;
    }

    try {
      await this.brevoService.sendRecoveryEmailVerification(address, {
        firstName: displayName,
        confirmUrl,
      });
      this.logger.log(
        `Recovery email confirmation sent for userId=${userId} to ${address}`,
      );
    } catch (error) {
      this.logger.error(
        `Recovery email confirmation failed for userId=${userId}: ${(error as Error)?.message}`,
      );
    }
  }

  /**
   * Points at the frontend, not at this API. The link is followed by a person
   * in a mail client, and landing them on a raw JSON body is not a result they
   * can read.
   */
  private buildRecoveryEmailConfirmUrl(token: string): string {
    const base = (this.configService.get<string>('FRONTEND_URL') ?? '')
      .split(',')[0]
      .trim()
      .replace(/\/$/, '');
    const path = `/recovery-email/confirm?token=${encodeURIComponent(token)}`;
    return base ? `${base}${path}` : path;
  }

  private async assertPasswordNotReused(
    user: Pick<User, 'id' | 'password'>,
    newPassword: string,
  ): Promise<void> {
    const recentHashes: string[] = [];

    if (user.password) {
      recentHashes.push(user.password);
    }

    const history = await this.passwordHistoryRepository.find({
      where: { userId: user.id },
      order: { createdAt: 'DESC' },
      take: PASSWORD_HISTORY_LIMIT - 1,
      select: ['passwordHash'],
    });
    recentHashes.push(...history.map((entry) => entry.passwordHash));

    for (const hash of recentHashes) {
      if (await bcrypt.compare(newPassword, hash)) {
        throw new BadRequestException(
          `You cannot reuse one of your last ${PASSWORD_HISTORY_LIMIT} passwords.`,
        );
      }
    }
  }

  /**
   * True if the error means the provider was unreachable or too slow to
   * respond (network error, timeout) rather than a genuine 4xx rejection.
   */
  private isProviderUnreachable(error: unknown): boolean {
    return (
      axios.isAxiosError(error) &&
      (!error.response || error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT')
    );
  }

  /**
   * Classifies a failed outbound OAuth provider call (Google/LinkedIn) and
   * throws the appropriate exception: a timeout/no-response distinguishes
   * "provider unreachable" from a genuine 4xx "token/code rejected" case,
   * so the frontend shows a non-technical "try again" message instead of
   * a misleading "invalid token" during a provider outage or timeout.
   * Timeout (504) vs. unreachable (503) is kept distinct at the status-code
   * level for logs/monitoring, but both use the same user-facing message.
   */
  private throwProviderError(error: unknown, provider: 'Google' | 'LinkedIn', invalidMessage: string): never {
    const unavailableMessage = `${provider} sign-in is unavailable right now. Please try again shortly.`;
    if (axios.isAxiosError(error)) {
      if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
        throw new GatewayTimeoutException(unavailableMessage);
      }
      if (!error.response) {
        throw new ServiceUnavailableException(unavailableMessage);
      }
    }
    throw new UnauthorizedException(invalidMessage);
  }

  async loginWithGoogle(dto: GoogleLoginDto, userAgent = '', ipAddress = '') {
    let accessToken = dto.access_token;
    let idToken = dto.id_token ?? dto.credential;

    this.logger.log('google login input', {
      hasAccess: !!dto.access_token,
      hasIdToken: !!dto.id_token || !!dto.credential,
      hasCode: !!dto.code,
    });

    const clientId = this.configService.get<string>('GOOGLE_CLIENT_ID');
    if (!clientId) {
      throw new InternalServerErrorException(
        'GOOGLE_CLIENT_ID is required for Google login',
      );
    }

    if (dto.code) {
      const clientSecret = this.configService.get<string>(
        'GOOGLE_CLIENT_SECRET',
      );
      if (!clientSecret) {
        throw new InternalServerErrorException(
          'GOOGLE_CLIENT_SECRET is required for auth code exchange',
        );
      }

      const redirectUri =
        dto.redirectUrl ??
        this.configService.get<string>('GOOGLE_REDIRECT_URI');
      if (!redirectUri) {
        throw new BadRequestException('redirectUrl is required');
      }

      try {
        const body = new URLSearchParams({
          code: dto.code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri,
          grant_type: 'authorization_code',
        });

        const response = await axios.post(
          'https://oauth2.googleapis.com/token',
          body.toString(),
          {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            timeout: 10000,
          },
        );

        accessToken = response.data?.access_token ?? accessToken;
        idToken = response.data?.id_token ?? idToken;
      } catch (error) {
        this.throwProviderError(error, 'Google', 'Invalid Google auth code');
      }
    }

    if (!accessToken && !idToken) {
      throw new BadRequestException(
        'access_token, id_token, or code is required',
      );
    }

    let email: string | undefined;
    let emailVerified: string | boolean | undefined;
    let aud: string | undefined;
    let firstName: string | undefined;
    let lastName: string | undefined;
    let avatarUrl: string | undefined;

    if (idToken) {
      let tokenInfo: {
        aud?: string;
        email?: string;
        email_verified?: string | boolean;
        sub?: string;
        given_name?: string;
        family_name?: string;
      };

      try {
        const response = await axios.get(
          'https://oauth2.googleapis.com/tokeninfo',
          {
            params: { id_token: idToken },
            timeout: 10000,
          },
        );
        tokenInfo = response.data ?? {};
      } catch (error) {
        this.throwProviderError(error, 'Google', 'Invalid Google token');
      }

      if (!tokenInfo?.email || !tokenInfo?.sub) {
        throw new UnauthorizedException('Invalid Google token');
      }

      if (tokenInfo.aud !== clientId) {
        throw new UnauthorizedException('Invalid Google token');
      }

      if (
        tokenInfo.email_verified !== 'true' &&
        tokenInfo.email_verified !== true
      ) {
        throw new UnauthorizedException('Google email not verified');
      }

      email = tokenInfo.email;
      firstName = tokenInfo.given_name;
      lastName = tokenInfo.family_name;
    } else if (accessToken) {
      let tokenInfo: Record<string, any>;
      try {
        const response = await axios.get(
          'https://oauth2.googleapis.com/tokeninfo',
          {
            params: { access_token: accessToken },
            timeout: 10000,
          },
        );
        tokenInfo = response.data ?? {};
      } catch (error) {
        this.throwProviderError(error, 'Google', 'Invalid Google access token');
      }

      aud = tokenInfo.audience ?? tokenInfo.aud ?? tokenInfo.issued_to;
      email = tokenInfo.email;
      emailVerified = tokenInfo.email_verified;

      if (aud !== clientId) {
        throw new UnauthorizedException('Invalid Google access token');
      }

      // Always call userinfo to get profile data (name, avatar);
      // tokeninfo only returns email/aud, not profile fields.
      try {
        const response = await axios.get(
          'https://www.googleapis.com/oauth2/v3/userinfo',
          {
            headers: { Authorization: `Bearer ${accessToken}` },
            timeout: 10000,
          },
        );
        email = email ?? response.data?.email;
        emailVerified = emailVerified ?? response.data?.email_verified;
        firstName = response.data?.given_name;
        lastName = response.data?.family_name;
        avatarUrl = response.data?.picture;
      } catch (error) {
        if (!email) {
          this.throwProviderError(error, 'Google', 'Invalid Google access token');
        }
      }

      if (!email) {
        throw new UnauthorizedException('Invalid Google access token');
      }

      if (emailVerified !== 'true' && emailVerified !== true) {
        throw new UnauthorizedException('Google email not verified');
      }
    }

    if (!email) {
      throw new UnauthorizedException('Invalid Google token');
    }

    const resolvedEmail = email;

    let user = await this.userRepository.findOne({
      where: { email: resolvedEmail },
      select: ['id', 'email', 'username', 'provider', 'hasPassword', 'twoFactorEnabled'],
    });

    let createdUser = false;
    let accountLinked = false;
    if (!user) {
      const username = await this.generatePlaceholderUsername();
      const hashedPassword = await bcrypt.hash(
        this.generateRandomPassword(),
        10,
      );

      user = this.userRepository.create({
        username,
        email: resolvedEmail,
        password: hashedPassword,
        provider: 'GOOGLE',
        hasPassword: false,
      });

      await this.userRepository.save(user);
      createdUser = true;
    } else if (user.provider !== 'GOOGLE') {
      // Existing account (created via email/password or another provider)
      // is being accessed with Google for the first time — link it rather
      // than creating a duplicate account.
      accountLinked = true;
      user.provider = 'GOOGLE';
      await this.userRepository.update({ id: user.id }, { provider: 'GOOGLE' });
    }

    try {
      await this.syncUserProfile(user, { firstName, lastName, avatarUrl });
    } catch (error) {
      // Profile sync failure should never block OAuth login.
      // For new users the profile will be created during onboarding.
      // For existing users the profile already exists in user-service.
      this.logger.warn(
        `[google] sync failed for ${createdUser ? 'new' : 'existing'} user ${user.id} but proceeding with login: ${(error as Error)?.message}`,
      );
    }

    const sessionId = randomUUID();
    const authTime = Math.floor(Date.now() / 1000);
    const tokens = await this.issueTokens({
      sub: user.id,
      email: user.email,
      sessionId,
      authTime,
    });

    const csrfToken = await this.createSession({ id: sessionId, userId: user.id, refreshToken: tokens.refresh_token, userAgent, ipAddress });

    return {
      ...tokens,
      sessionId,
      csrfToken,
      user: this.serializeUser(user, {
        firstName,
        lastName,
        isNewUser: createdUser,
        ...(accountLinked && { accountLinked: true, linkedProvider: 'GOOGLE' }),
      }),
    };
  }

  async loginWithLinkedIn(dto: LinkedInLoginDto, userAgent = '', ipAddress = '') {
    let accessToken = dto.access_token;

    const clientId = this.configService.get<string>('LINKEDIN_CLIENT_ID');
    if (!clientId) {
      throw new InternalServerErrorException(
        'LINKEDIN_CLIENT_ID is required for LinkedIn login',
      );
    }

    if (dto.code) {
      const clientSecret = this.configService.get<string>(
        'LINKEDIN_CLIENT_SECRET',
      );
      if (!clientSecret) {
        throw new InternalServerErrorException(
          'LINKEDIN_CLIENT_SECRET is required for auth code exchange',
        );
      }

      const redirectUri =
        dto.redirectUrl ??
        this.configService.get<string>('LINKEDIN_REDIRECT_URI');
      if (!redirectUri) {
        throw new BadRequestException('redirectUrl is required');
      }

      try {
        const body = new URLSearchParams({
          grant_type: 'authorization_code',
          code: dto.code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri,
        });

        const response = await axios.post(
          'https://www.linkedin.com/oauth/v2/accessToken',
          body.toString(),
          {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            timeout: 10000,
          },
        );

        accessToken = response.data?.access_token ?? accessToken;
      } catch (error) {
        this.throwProviderError(error, 'LinkedIn', 'Invalid LinkedIn auth code');
      }
    }

    if (!accessToken) {
      throw new BadRequestException('access_token or code is required');
    }

    const { email, emailVerified, firstName, lastName, avatarUrl } =
      await this.fetchLinkedInProfile(accessToken);

    if (!email) {
      throw new UnauthorizedException('Invalid LinkedIn token');
    }

    if (emailVerified === false) {
      throw new UnauthorizedException('LinkedIn email not verified');
    }

    const resolvedEmail = email;

    let user = await this.userRepository.findOne({
      where: { email: resolvedEmail },
      select: ['id', 'email', 'username', 'provider', 'hasPassword', 'twoFactorEnabled'],
    });

    let createdUser = false;
    let accountLinked = false;
    if (!user) {
      const username = await this.generatePlaceholderUsername();
      const hashedPassword = await bcrypt.hash(
        this.generateRandomPassword(),
        10,
      );

      user = this.userRepository.create({
        username,
        email: resolvedEmail,
        password: hashedPassword,
        provider: 'LINKEDIN',
        hasPassword: false,
      });

      await this.userRepository.save(user);
      createdUser = true;
    } else if (user.provider !== 'LINKEDIN') {
      // Existing account (created via email/password or another provider)
      // is being accessed with LinkedIn for the first time — link it rather
      // than creating a duplicate account.
      accountLinked = true;
      user.provider = 'LINKEDIN';
      await this.userRepository.update({ id: user.id }, { provider: 'LINKEDIN' });
    }

    try {
      await this.syncUserProfile(user, { firstName, lastName, avatarUrl });
    } catch (error) {
      // Profile sync failure should never block OAuth login.
      // For new users the profile will be created during onboarding.
      // For existing users the profile already exists in user-service.
      this.logger.warn(
        `[linkedin] sync failed for ${createdUser ? 'new' : 'existing'} user ${user.id} but proceeding with login: ${(error as Error)?.message}`,
      );
    }

    const sessionId = randomUUID();
    const authTime = Math.floor(Date.now() / 1000);
    const tokens = await this.issueTokens({
      sub: user.id,
      email: user.email,
      sessionId,
      authTime,
    });

    const csrfToken = await this.createSession({ id: sessionId, userId: user.id, refreshToken: tokens.refresh_token, userAgent, ipAddress });

    return {
      ...tokens,
      sessionId,
      csrfToken,
      user: this.serializeUser(user, {
        firstName,
        lastName,
        isNewUser: createdUser,
        ...(accountLinked && { accountLinked: true, linkedProvider: 'LINKEDIN' }),
      }),
    };
  }

  async refresh(dto: RefreshDto): Promise<JwtPair & { sessionId?: string }> {
    if (!dto.refresh_token) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const refreshSecret = this.getRefreshSecret();
    let payload: { sub: string; email?: string; type?: string; sid?: string; rememberMe?: boolean; auth_time?: unknown };

    try {
      payload = await this.jwtService.verifyAsync(dto.refresh_token, {
        secret: refreshSecret,
        algorithms: ['HS256'],
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (payload.type !== 'refresh') {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (payload.sid) {
      const session = await this.sessionRepository.findOne({ where: { id: payload.sid, userId: payload.sub } });
      if (!session) {
        throw new UnauthorizedException('Session has been revoked');
      }

      const submittedRefreshTokenHash = createHash('sha256').update(dto.refresh_token).digest('hex');
      if (session.refreshTokenHash !== submittedRefreshTokenHash) {
        await this.sessionRepository.delete({ id: session.id });
        throw new UnauthorizedException('Invalid refresh token');
      }

      const rememberMe = payload.rememberMe ?? false;
      const newTokens = await this.issueTokens({ sub: payload.sub, email: payload.email ?? '', sessionId: payload.sid, rememberMe, authTime: payload.auth_time });

      const csrfToken = randomBytes(32).toString('hex');
      session.refreshTokenHash = createHash('sha256').update(newTokens.refresh_token).digest('hex');
      session.csrfToken = csrfToken;
      session.lastActiveAt = new Date();
      session.expiresAt = new Date(Date.now() + this.refreshTtlMs(rememberMe));
      await this.sessionRepository.save(session);

      return { ...newTokens, sessionId: payload.sid, csrfToken };
    }

    return this.issueTokens({ sub: payload.sub, email: payload.email ?? '', rememberMe: payload.rememberMe ?? false, authTime: payload.auth_time });
  }

  async logout(user: { id?: string; sub?: string }, refreshToken?: string) {
    const userId = user?.sub ?? user?.id;
    if (!userId) {
      throw new UnauthorizedException('Invalid user');
    }

    if (refreshToken) {
      try {
        const refreshSecret = this.getRefreshSecret();
        const payload = await this.jwtService.verifyAsync(refreshToken, {
          secret: refreshSecret,
          algorithms: ['HS256'],
        });
        if (payload.sid) {
          await this.sessionRepository.delete({ id: payload.sid, userId });
        }
      } catch {
        // Token may be expired/invalid — still clear client-side
      }
    }

    return { success: true };
  }

  async getCsrfToken(sessionId: string): Promise<{ csrfToken: string }> {
    const session = await this.sessionRepository.findOne({
      where: { id: sessionId },
      select: ['id', 'csrfToken'],
    });

    if (!session?.csrfToken) {
      // Generate a token for sessions created before CSRF was added
      const csrfToken = randomBytes(32).toString('hex');
      if (session) {
        session.csrfToken = csrfToken;
        await this.sessionRepository.save(session);
      }
      return { csrfToken };
    }

    return { csrfToken: session.csrfToken };
  }

  async getSessions(userId: string, currentSessionId?: string): Promise<SessionResponseDto[]> {
    const sessions = await this.sessionRepository.find({
      where: { userId },
      order: { lastActiveAt: 'DESC' },
    });

    const now = new Date();
    const staleThresholdMs = 3 * 60 * 1000; // 3 minutes without heartbeat = stale

    return sessions
      .filter((s) => s.expiresAt > now)
      .filter((s) => {
        // Always show the current session; hide stale sessions from other devices
        if (s.id === currentSessionId) return true;
        return (now.getTime() - s.lastActiveAt.getTime()) < staleThresholdMs;
      })
      .map((s) => ({
        id: s.id,
        userAgent: s.userAgent,
        browserName: s.browserName ?? null,
        browserVersion: s.browserVersion ?? null,
        osName: s.osName ?? null,
        osVersion: s.osVersion ?? null,
        deviceType: s.deviceType ?? null,
        ipAddress: s.ipAddress,
        createdAt: s.createdAt.toISOString(),
        lastActiveAt: s.lastActiveAt.toISOString(),
        isCurrent: s.id === currentSessionId,
      }));
  }

  async revokeSession(userId: string, sessionId: string): Promise<void> {
    const session = await this.sessionRepository.findOne({ where: { id: sessionId, userId } });
    if (!session) {
      throw new NotFoundException('Session not found');
    }
    await this.sessionRepository.delete({ id: sessionId });
  }

  async heartbeat(userId: string, sessionId: string): Promise<{ valid: boolean }> {
    if (!sessionId) {
      return { valid: true };
    }

    const session = await this.sessionRepository.findOne({
      where: { id: sessionId, userId },
    });

    if (!session || session.expiresAt < new Date()) {
      throw new UnauthorizedException('Session has been revoked or expired');
    }

    session.lastActiveAt = new Date();
    await this.sessionRepository.save(session);
    return { valid: true };
  }

  async revokeAllOtherSessions(userId: string, currentSessionId: string): Promise<{ revoked: number }> {
    const result = await this.sessionRepository.delete({ userId, id: Not(currentSessionId) });
    return { revoked: result.affected ?? 0 };
  }

  /**
   * Whether an authenticator is enrolled, read from the service that owns the
   * column. `GET /user/me` is served by user-service, which has no counterpart
   * to auth-service's `twoFactorEnabled`, so the field arrives undefined on
   * every page load and anything deriving from it reads false.
   */
  async getTwoFactorStatus(
    userId: string,
  ): Promise<{ enabled: boolean; method: string | null }> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      select: ['id', 'twoFactorEnabled', 'twoFactorMethod'],
    });
    if (!user) throw new NotFoundException('User not found');

    return {
      enabled: user.twoFactorEnabled ?? false,
      method: user.twoFactorMethod ?? null,
    };
  }

  async generateTwoFactorSecret(userId: string) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      select: ['id', 'email', 'twoFactorEnabled'],
    });

    if (!user) throw new UnauthorizedException('Invalid user');
    if (user.twoFactorEnabled) {
      throw new BadRequestException('Two-factor authentication is already enabled');
    }

    const secret = otplib.generateSecret();
    const otpauthUrl = otplib.generateURI({ issuer: 'Marketeq', label: user.email, secret });
    const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl);

    const encrypted = this.encryptSecret(secret);
    await this.userRepository.update(userId, { twoFactorSecret: encrypted });

    return { secret, qrCodeDataUrl };
  }

  async enableTwoFactor(userId: string, code: string, method: 'totp' | 'sms' = 'totp') {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      select: ['id', 'email', 'username', 'provider', 'hasPassword', 'twoFactorEnabled', 'twoFactorSecret', 'twoFactorOtpCode', 'twoFactorOtpExpiresAt'],
    });

    if (!user) throw new UnauthorizedException('Invalid user');
    if (user.twoFactorEnabled) {
      throw new BadRequestException('Two-factor authentication is already enabled');
    }

    if (method === 'totp') {
      if (!user.twoFactorSecret) {
        throw new BadRequestException('Generate a 2FA secret first');
      }
      const secret = this.decryptSecret(user.twoFactorSecret);
      const result = otplib.verifySync({ token: code, secret });
      if (!result.valid) {
        throw new BadRequestException('Invalid verification code');
      }
    } else {
      if (!user.twoFactorOtpCode || !user.twoFactorOtpExpiresAt) {
        throw new BadRequestException('Generate an SMS code first');
      }
      if (new Date() > user.twoFactorOtpExpiresAt) {
        throw new BadRequestException('Verification code has expired. Please request a new one.');
      }
      const storedCode = this.decryptSecret(user.twoFactorOtpCode);
      if (storedCode !== code) {
        throw new BadRequestException('Invalid verification code');
      }
    }

    const backupCodes = this.generateBackupCodes();
    const hashedCodes = await Promise.all(
      backupCodes.map((c) => bcrypt.hash(c, 10)),
    );

    await this.userRepository.update(userId, {
      twoFactorEnabled: true,
      twoFactorMethod: method,
      twoFactorBackupCodes: JSON.stringify(hashedCodes),
      twoFactorOtpCode: null as any,
      twoFactorOtpExpiresAt: null as any,
    });

    try {
      await this.syncUserProfile({ ...user, twoFactorEnabled: true });
    } catch (error) {
      this.logger.warn(
        `enableTwoFactor: user profile sync failed for ${user.email}: ${(error as Error)?.message}`,
      );
    }

    return { backupCodes };
  }

  async disableTwoFactor(userId: string, code: string) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      select: ['id', 'email', 'username', 'provider', 'hasPassword', 'twoFactorEnabled', 'twoFactorMethod', 'twoFactorSecret', 'twoFactorBackupCodes', 'twoFactorOtpCode', 'twoFactorOtpExpiresAt'],
    });

    if (!user) throw new UnauthorizedException('Invalid user');
    if (!user.twoFactorEnabled) {
      throw new BadRequestException('Two-factor authentication is not enabled');
    }

    const method = user.twoFactorMethod ?? 'totp';
    let isValid: boolean;

    if (method === 'sms') {
      isValid = await this.validateSmsOtpCode(user as any, code);
    } else {
      isValid = await this.validateTwoFactorCode(user, code);
    }

    if (!isValid) {
      throw new BadRequestException('Invalid verification code');
    }

    await this.userRepository.update(userId, {
      twoFactorEnabled: false,
      twoFactorSecret: null as any,
      twoFactorBackupCodes: null as any,
      twoFactorMethod: null as any,
      twoFactorPhone: null as any,
      twoFactorOtpCode: null as any,
      twoFactorOtpExpiresAt: null as any,
      twoFactorOtpSentAt: null as any,
    });

    try {
      await this.syncUserProfile({ ...user, twoFactorEnabled: false });
    } catch (error) {
      this.logger.warn(
        `disableTwoFactor: user profile sync failed for ${user.email}: ${(error as Error)?.message}`,
      );
    }

    return { success: true };
  }

  async verifyTwoFactorLogin(partialToken: string, code: string, userAgent = '', ipAddress = '') {
    let payload: { sub?: string; email?: string; type?: string; rememberMe?: boolean };

    try {
      payload = await this.jwtService.verifyAsync(partialToken, {
        algorithms: ['RS256'],
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired verification token');
    }

    if (!payload?.sub || payload.type !== '2fa-pending') {
      throw new UnauthorizedException('Invalid or expired verification token');
    }

    const user = await this.userRepository.findOne({
      where: { id: payload.sub },
      select: ['id', 'email', 'username', 'provider', 'hasPassword', 'twoFactorEnabled', 'twoFactorMethod', 'twoFactorSecret', 'twoFactorBackupCodes', 'twoFactorOtpCode', 'twoFactorOtpExpiresAt'],
    });

    if (!user || !user.twoFactorEnabled) {
      throw new UnauthorizedException('Invalid or expired verification token');
    }

    const method = user.twoFactorMethod ?? 'totp';
    let isValid: boolean;

    if (method === 'sms') {
      isValid = await this.validateSmsOtpCode(user as any, code);
    } else {
      isValid = await this.validateTwoFactorCode(user, code);
    }

    if (!isValid) {
      throw new BadRequestException('Invalid verification code');
    }

    await this.syncUserProfile(user);

    const sessionId = randomUUID();
    const authTime = Math.floor(Date.now() / 1000);
    const rememberMe = payload.rememberMe ?? false;
    const tokens = await this.issueTokens({ sub: user.id, email: user.email, sessionId, authTime, rememberMe });

    const csrfToken = await this.createSession({ id: sessionId, userId: user.id, refreshToken: tokens.refresh_token, userAgent, ipAddress, rememberMe });

    return { ...tokens, sessionId, csrfToken, user: this.serializeUser(user) };
  }

  async regenerateBackupCodes(userId: string, code: string) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      select: ['id', 'twoFactorEnabled', 'twoFactorSecret', 'twoFactorBackupCodes'],
    });

    if (!user || !user.twoFactorEnabled) {
      throw new BadRequestException('Two-factor authentication is not enabled');
    }

    const isValid = await this.validateTwoFactorCode(user, code);
    if (!isValid) {
      throw new BadRequestException('Invalid verification code');
    }

    const backupCodes = this.generateBackupCodes();
    const hashedCodes = await Promise.all(
      backupCodes.map((c) => bcrypt.hash(c, 10)),
    );

    await this.userRepository.update(userId, {
      twoFactorBackupCodes: JSON.stringify(hashedCodes),
    });

    return { backupCodes };
  }

  async generateSmsTwoFactor(userId: string, phone: string) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      select: ['id', 'email', 'twoFactorEnabled'],
    });

    if (!user) throw new UnauthorizedException('Invalid user');
    if (user.twoFactorEnabled) {
      throw new BadRequestException('Two-factor authentication is already enabled');
    }

    const code = this.generateOtpCode();
    const encrypted = this.encryptSecret(code);

    await this.userRepository.update(userId, {
      twoFactorPhone: phone,
      twoFactorOtpCode: encrypted,
      twoFactorOtpExpiresAt: new Date(Date.now() + 5 * 60 * 1000),
      twoFactorOtpSentAt: new Date(),
    });

    try {
      await this.brevoService.sendTwoFactorSms(phone, code);
    } catch (err) {
      throw new BadRequestException((err as Error)?.message || 'Failed to send SMS verification code');
    }

    return { codeSent: true };
  }

  async resendTwoFactorCode(userId: string) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      select: ['id', 'twoFactorPhone', 'twoFactorOtpSentAt'],
    });

    if (!user || !user.twoFactorPhone) {
      throw new BadRequestException('No phone number configured for SMS 2FA');
    }

    if (user.twoFactorOtpSentAt && Date.now() - user.twoFactorOtpSentAt.getTime() < 60_000) {
      throw new BadRequestException('Please wait 60 seconds before requesting a new code');
    }

    const code = this.generateOtpCode();
    const encrypted = this.encryptSecret(code);

    await this.userRepository.update(userId, {
      twoFactorOtpCode: encrypted,
      twoFactorOtpExpiresAt: new Date(Date.now() + 5 * 60 * 1000),
      twoFactorOtpSentAt: new Date(),
    });

    try {
      await this.brevoService.sendTwoFactorSms(user.twoFactorPhone, code);
    } catch (err) {
      throw new BadRequestException((err as Error)?.message || 'Failed to send SMS verification code');
    }

    return { codeSent: true };
  }

  async sendLoginTwoFactorCode(userId: string) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      select: ['id', 'twoFactorPhone', 'twoFactorMethod', 'twoFactorOtpSentAt'],
    });

    if (!user || !user.twoFactorPhone) {
      throw new BadRequestException('No phone number configured for SMS 2FA');
    }

    if (user.twoFactorOtpSentAt && Date.now() - user.twoFactorOtpSentAt.getTime() < 60_000) {
      return { codeSent: true };
    }

    const code = this.generateOtpCode();
    const encrypted = this.encryptSecret(code);

    await this.userRepository.update(userId, {
      twoFactorOtpCode: encrypted,
      twoFactorOtpExpiresAt: new Date(Date.now() + 5 * 60 * 1000),
      twoFactorOtpSentAt: new Date(),
    });

    try {
      await this.brevoService.sendTwoFactorSms(user.twoFactorPhone, code);
    } catch (err) {
      throw new BadRequestException((err as Error)?.message || 'Failed to send SMS verification code');
    }

    return { codeSent: true };
  }

  private generateOtpCode(): string {
    const num = Math.floor(100000 + Math.random() * 900000);
    return num.toString();
  }

  private async validateSmsOtpCode(
    user: Pick<User, 'twoFactorOtpCode' | 'twoFactorOtpExpiresAt' | 'twoFactorBackupCodes'> & { id: string },
    code: string,
  ): Promise<boolean> {
    if (user.twoFactorOtpCode && user.twoFactorOtpExpiresAt) {
      if (new Date() > user.twoFactorOtpExpiresAt) {
        return false;
      }
      const storedCode = this.decryptSecret(user.twoFactorOtpCode);
      if (storedCode === code) {
        await this.userRepository.update(user.id, {
          twoFactorOtpCode: null as any,
          twoFactorOtpExpiresAt: null as any,
        });
        return true;
      }
    }

    if (!user.twoFactorBackupCodes) return false;

    const hashedCodes: string[] = JSON.parse(user.twoFactorBackupCodes);
    for (let i = 0; i < hashedCodes.length; i++) {
      if (await bcrypt.compare(code, hashedCodes[i])) {
        hashedCodes.splice(i, 1);
        await this.userRepository.update(user.id, {
          twoFactorBackupCodes: JSON.stringify(hashedCodes),
        });
        return true;
      }
    }

    return false;
  }

  private async validateTwoFactorCode(
    user: Pick<User, 'twoFactorSecret' | 'twoFactorBackupCodes'> & { id: string },
    code: string,
  ): Promise<boolean> {
    if (!user.twoFactorSecret) return false;

    const secret = this.decryptSecret(user.twoFactorSecret);
    const totpResult = otplib.verifySync({ token: code, secret });
    if (totpResult.valid) {
      return true;
    }

    if (!user.twoFactorBackupCodes) return false;

    const hashedCodes: string[] = JSON.parse(user.twoFactorBackupCodes);
    for (let i = 0; i < hashedCodes.length; i++) {
      if (await bcrypt.compare(code, hashedCodes[i])) {
        hashedCodes.splice(i, 1);
        await this.userRepository.update(user.id, {
          twoFactorBackupCodes: JSON.stringify(hashedCodes),
        });
        return true;
      }
    }

    return false;
  }

  async verifyPartialToken(partialToken: string): Promise<string> {
    let payload: { sub?: string; type?: string };
    try {
      payload = await this.jwtService.verifyAsync(partialToken, { algorithms: ['RS256'] });
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
    if (!payload?.sub || payload.type !== '2fa-pending') {
      throw new UnauthorizedException('Invalid or expired token');
    }
    return payload.sub;
  }

  private async issuePartialToken(user: { id: string; email: string }, rememberMe: boolean): Promise<string> {
    return this.jwtService.signAsync(
      { sub: user.id, email: user.email, type: '2fa-pending', rememberMe },
      { expiresIn: '5m' },
    );
  }

  private encryptSecret(secret: string): string {
    const key = this.getTwoFactorEncryptionKey();
    const iv = randomBytes(16);
    const cipher = createCipheriv('aes-256-cbc', key, iv);
    let encrypted = cipher.update(secret, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
  }

  private decryptSecret(encrypted: string): string {
    const key = this.getTwoFactorEncryptionKey();
    const [ivHex, data] = encrypted.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = createDecipheriv('aes-256-cbc', key, iv);
    let decrypted = decipher.update(data, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  private getTwoFactorEncryptionKey(): Buffer {
    const envKey = this.configService.get<string>('TWO_FACTOR_ENCRYPTION_KEY');
    if (!envKey) {
      throw new InternalServerErrorException('TWO_FACTOR_ENCRYPTION_KEY is required');
    }
    return scryptSync(envKey, 'marketeq-2fa-salt', 32);
  }

  private generateBackupCodes(): string[] {
    const codes: string[] = [];
    for (let i = 0; i < 10; i++) {
      const code = randomBytes(4).toString('hex');
      codes.push(`${code.slice(0, 4)}-${code.slice(4)}`);
    }
    return codes;
  }

  private async createSession(params: {
    id: string;
    userId: string;
    refreshToken: string;
    userAgent: string;
    ipAddress: string;
    rememberMe?: boolean;
  }): Promise<string> {
    const hash = createHash('sha256').update(params.refreshToken).digest('hex');
    const expiresAt = new Date(Date.now() + this.refreshTtlMs(params.rememberMe ?? false));
    const csrfToken = randomBytes(32).toString('hex');

    const parser = new UAParser(params.userAgent);
    const browser = parser.getBrowser();
    const os = parser.getOS();
    const device = parser.getDevice();

    const session = new Session();
    session.id = params.id;
    session.userId = params.userId;
    session.refreshTokenHash = hash;
    session.userAgent = params.userAgent;
    session.browserName = browser.name ?? undefined;
    session.browserVersion = browser.major ?? undefined;
    session.osName = os.name ?? undefined;
    session.osVersion = os.version ?? undefined;
    session.deviceType = device.type === 'mobile' ? 'mobile'
      : device.type === 'tablet' ? 'tablet'
      : 'desktop';
    session.ipAddress = params.ipAddress;
    session.csrfToken = csrfToken;
    session.expiresAt = expiresAt;
    await this.sessionRepository.save(session);
    return csrfToken;
  }

  private parseExpiresInMs(value: string): number {
    const match = value.match(/^(\d+)(s|m|h|d)?$/);
    if (!match) return 7 * 24 * 60 * 60 * 1000;
    const num = parseInt(match[1], 10);
    const unit = match[2] ?? 's';
    const multipliers: Record<string, number> = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
    return num * (multipliers[unit] ?? 1000);
  }

  private refreshTtlValue(rememberMe?: boolean): string {
    if (rememberMe) {
      return this.configService.get<string>('AUTH_REMEMBER_ME_REFRESH_TOKEN_EXPIRES_IN') ?? '14d';
    }
    return this.configService.get<string>('AUTH_REFRESH_TOKEN_EXPIRES_IN') ?? '5h';
  }

  private refreshTtlMs(rememberMe: boolean): number {
    return this.parseExpiresInMs(this.refreshTtlValue(rememberMe));
  }

  private async cleanupExpiredSessions(): Promise<void> {
    const result = await this.sessionRepository.delete({ expiresAt: LessThan(new Date()) });
    if (result.affected && result.affected > 0) {
      this.logger.log(`[sessions] cleaned up ${result.affected} expired sessions`);
    }
  }

  private async issueTokens(payload: {
    sub: string;
    email: string;
    sessionId?: string;
    rememberMe?: boolean;
    // Login passes a freshly generated value; refresh passes the verified refresh token's
    // own claim. Anything unusable is dropped (see sanitizeAuthTime).
    authTime?: unknown;
  }): Promise<JwtPair> {
    const authTime = sanitizeAuthTime(payload.authTime);
    const accessPayload: Record<string, any> = { sub: payload.sub, email: payload.email };
    if (payload.sessionId) {
      accessPayload.sid = payload.sessionId;
    }
    if (authTime !== null) {
      accessPayload.auth_time = authTime;
    }
    const access_token = this.jwtService.sign(accessPayload);

    const refreshSecret = this.getRefreshSecret();
    const rememberMe = payload.rememberMe ?? false;
    const refreshExpires = parseExpiresIn(this.refreshTtlValue(rememberMe));

    const refreshPayload: Record<string, any> = {
      sub: payload.sub,
      email: payload.email,
      type: 'refresh',
      rememberMe,
    };
    if (payload.sessionId) {
      refreshPayload.sid = payload.sessionId;
    }
    if (authTime !== null) {
      refreshPayload.auth_time = authTime;
    }

    const refresh_token = await this.jwtService.signAsync(refreshPayload, {
      secret: refreshSecret,
      algorithm: 'HS256',
      expiresIn: refreshExpires,
    });

    return { access_token, refresh_token };
  }

  private async issuePasswordResetToken(user: {
    id: string;
    email: string;
    passwordResetVersion?: string | null;
  }): Promise<string> {
    const resetExpires = parseExpiresIn(
      this.configService.get<string>('AUTH_RESET_TOKEN_EXPIRES_IN') ?? '24h',
    );

    return this.jwtService.signAsync(
      {
        sub: user.id,
        email: user.email,
        type: 'reset',
        resetVersion: user.passwordResetVersion,
      },
      { expiresIn: resetExpires },
    );
  }

  private resolveTrustedPasswordResetBase(
    requestedBase?: string,
    fallbackBase?: string,
  ): string | undefined {
    if (!requestedBase) {
      return fallbackBase;
    }

    const trustedOrigins = [
      ...(this.configService.get<string>('FRONTEND_URL') ?? '')
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean),
      fallbackBase,
    ]
      .filter((value): value is string => !!value)
      .map((value) => {
        try {
          return new URL(value).origin;
        } catch {
          return undefined;
        }
      })
      .filter((value): value is string => !!value);

    try {
      const requestedUrl = new URL(requestedBase);
      if (trustedOrigins.includes(requestedUrl.origin)) {
        return requestedBase;
      }
    } catch {
      // Fall back to configured URL below.
    }

    return fallbackBase;
  }

  private enforcePasswordResetRateLimit(
    key: string,
    limitEnvKey: string,
    defaultLimit: number,
    windowEnvKey: string,
    defaultWindowMs: number,
  ): void {
    const now = Date.now();
    const limit = this.getPositiveIntegerConfig(limitEnvKey, defaultLimit);
    const windowMs = this.getPositiveIntegerConfig(
      windowEnvKey,
      defaultWindowMs,
    );

    this.cleanupExpiredPasswordResetRateLimits(now);

    const bucket = this.passwordResetRateLimits.get(key);
    if (!bucket || bucket.resetAt <= now) {
      this.passwordResetRateLimits.set(key, {
        count: 1,
        resetAt: now + windowMs,
      });
      return;
    }

    if (bucket.count >= limit) {
      throw new HttpException(
        PASSWORD_RESET_RATE_LIMIT_MESSAGE,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    bucket.count += 1;
  }

  private cleanupExpiredPasswordResetRateLimits(now = Date.now()): void {
    for (const [key, bucket] of this.passwordResetRateLimits.entries()) {
      if (bucket.resetAt <= now) {
        this.passwordResetRateLimits.delete(key);
      }
    }
  }

  /**
   * "Chrome, Mac OS X" for the password-changed notification.
   *
   * Returns undefined rather than a placeholder when the user-agent is absent
   * or unrecognised — the email omits the line entirely in that case. Note the
   * header only reaches this service because api-gateway forwards it; if that
   * passthrough is ever removed this silently goes blank again.
   */
  private describeDevice(userAgent: string): string | undefined {
    if (!userAgent?.trim()) return undefined;

    const parser = new UAParser(userAgent);
    const parts = [parser.getBrowser().name, parser.getOS().name].filter(
      (part): part is string => Boolean(part?.trim()),
    );

    return parts.length ? parts.join(', ') : undefined;
  }

  /**
   * "Brooklyn, New York, United States" from the caller's IP.
   *
   * geoip-lite is a bundled offline database, so this costs no network call
   * and cannot fail slowly. It resolves nothing for private and loopback
   * addresses, which is why this is absent in local development.
   *
   * Region codes are expanded to full names for the US only; elsewhere the
   * raw subdivision code is used, since ISO 3166-2 has no bundled name table
   * here. Country codes go through Intl.DisplayNames.
   */
  private describeLocation(ipAddress: string): string | undefined {
    const ip = ipAddress?.trim();
    if (!ip) return undefined;

    let geo: geoip.Lookup | null = null;
    try {
      geo = geoip.lookup(ip);
    } catch {
      return undefined;
    }
    if (!geo) return undefined;

    let country: string | undefined;
    if (geo.country) {
      try {
        country =
          new Intl.DisplayNames(['en'], { type: 'region' }).of(geo.country) ??
          geo.country;
      } catch {
        country = geo.country;
      }
    }

    const region =
      geo.country === 'US' && geo.region
        ? US_STATE_NAMES[geo.region] ?? geo.region
        : geo.region || undefined;

    const parts = [geo.city || undefined, region, country].filter(
      (part): part is string => Boolean(part?.trim()),
    );

    return parts.length ? parts.join(', ') : undefined;
  }

  /**
   * "June 13th, 2023, 2:51 PM EDT" in the timezone the IP resolves to,
   * falling back to UTC. Shown in the reader's own local time where we can
   * work it out, because the point of the line is for them to recognise
   * whether that was them.
   */
  private formatEventTime(when: Date, ipAddress: string): string {
    let timeZone = 'UTC';
    try {
      const geo = ipAddress?.trim() ? geoip.lookup(ipAddress.trim()) : null;
      if (geo?.timezone) timeZone = geo.timezone;
    } catch {
      // keep UTC
    }

    let parts: Intl.DateTimeFormatPart[];
    try {
      parts = new Intl.DateTimeFormat('en-US', {
        timeZone,
        month: 'long',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
        timeZoneName: 'short',
      }).formatToParts(when);
    } catch {
      return when.toISOString();
    }

    const find = (type: string) =>
      parts.find((part) => part.type === type)?.value ?? '';

    const day = Number(find('day'));
    const suffix =
      day % 10 === 1 && day !== 11
        ? 'st'
        : day % 10 === 2 && day !== 12
          ? 'nd'
          : day % 10 === 3 && day !== 13
            ? 'rd'
            : 'th';

    return `${find('month')} ${day}${suffix}, ${find('year')}, ${find('hour')}:${find('minute')} ${find('dayPeriod')} ${find('timeZoneName')}`;
  }

  private normalizeRateLimitIp(ipAddress: string): string {
    return ipAddress.trim() || 'unknown';
  }

  private getPositiveIntegerConfig(key: string, fallback: number): number {
    const raw = this.configService.get<string>(key);
    const parsed = raw ? Number.parseInt(raw, 10) : NaN;
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
  }

  private getRefreshSecret(): string {
    const secret = this.configService.get<string>('AUTH_REFRESH_SECRET');
    if (!secret) {
      throw new Error('AUTH_REFRESH_SECRET is required for refresh tokens');
    }
    return secret;
  }

  private async syncUserProfile(
    user: User,
    extra?: { firstName?: string; lastName?: string; avatarUrl?: string },
  ) {
    const payload: SyncUserProfilePayload = {
      id: user.id,
      email: user.email,
      username: user.username,
      provider: user.provider ?? 'EMAIL',
      hasPassword: user.hasPassword ?? false,
      ...(extra?.firstName && { firstName: extra.firstName }),
      ...(extra?.lastName && { lastName: extra.lastName }),
      // Google and LinkedIn both return a profile photo on userinfo. It was
      // being fetched and discarded, so OAuth users arrived at onboarding with
      // no avatar even though we already had one.
      ...(extra?.avatarUrl && { avatarUrl: extra.avatarUrl }),
    };

    try {
      await this.postUserProfileSync(payload);
    } catch (error) {
      this.enqueueSyncRetry(payload, (error as Error)?.message);
      this.logger.error(
        `Failed to sync user profile to user-service for user ${user.id}: ${(error as Error)?.message}`,
        (error as Error)?.stack,
      );
      throw new InternalServerErrorException(
        'Failed to sync user profile to user-service',
      );
    }
  }

  private getUserSyncEndpoint(): { url: string; token: string } {
    const baseUrl =
      this.configService.get<string>('USER_SERVICE_URL') ??
      'http://localhost:3002';
    const token = this.configService.get<string>('INTERNAL_SERVICE_TOKEN');

    if (!token) {
      throw new InternalServerErrorException(
        'INTERNAL_SERVICE_TOKEN is required to sync user profiles',
      );
    }

    return {
      url: `${baseUrl.replace(/\/$/, '')}/internal/users`,
      token,
    };
  }

  private async postUserProfileSync(payload: SyncUserProfilePayload) {
    const { url, token } = this.getUserSyncEndpoint();
    try {
      await axios.post(url, payload, {
        headers: {
          'x-internal-token': token,
        },
      });
    } catch (error) {
      // user-service may return 409 when profile already exists; treat this as idempotent success.
      if (axios.isAxiosError(error) && error.response?.status === 409) {
        this.logger.warn(
          `[sync] user profile already exists in user-service; treating as success for user=${payload.id} email=${payload.email}`,
        );
        return;
      }
      throw error;
    }
  }

  private getRetryKey(payload: SyncUserProfilePayload): string {
    return payload.id || payload.email;
  }

  private enqueueSyncRetry(payload: SyncUserProfilePayload, errorMessage?: string) {
    const key = this.getRetryKey(payload);
    const existing = this.syncRetryQueue.get(key);
    const attempts = (existing?.attempts ?? 0) + 1;

    if (attempts > this.syncRetryMaxAttempts) {
      this.syncRetryQueue.delete(key);
      this.logger.error(
        `[sync.retry] dropping user profile sync after ${this.syncRetryMaxAttempts} attempts for user=${payload.id} email=${payload.email}`,
      );
      return;
    }

    const delayMs = Math.min(
      this.syncRetryBaseDelayMs * 2 ** (attempts - 1),
      this.syncRetryMaxDelayMs,
    );

    this.syncRetryQueue.set(key, {
      payload,
      attempts,
      nextAttemptAt: Date.now() + delayMs,
      lastError: errorMessage,
    });

    this.logger.warn(
      `[sync.retry] queued user profile sync retry attempt=${attempts} delayMs=${delayMs} user=${payload.id} email=${payload.email}`,
    );
  }

  private async processSyncRetryQueue() {
    if (!this.syncRetryQueue.size) {
      return;
    }

    const now = Date.now();
    const dueEntries = [...this.syncRetryQueue.entries()].filter(
      ([, item]) => item.nextAttemptAt <= now,
    );

    for (const [key, item] of dueEntries) {
      try {
        await this.postUserProfileSync(item.payload);
        this.syncRetryQueue.delete(key);
        this.logger.log(
          `[sync.retry] replay succeeded for user=${item.payload.id} email=${item.payload.email} after attempts=${item.attempts}`,
        );
      } catch (error) {
        this.enqueueSyncRetry(item.payload, (error as Error)?.message);
      }
    }
  }

  private async fetchLinkedInProfile(
    accessToken: string,
  ): Promise<{
    email?: string;
    emailVerified?: boolean;
    firstName?: string;
    lastName?: string;
    avatarUrl?: string;
  }> {
    let firstStepUnreachable = false;

    try {
      const response = await axios.get('https://api.linkedin.com/v2/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` },
        timeout: 10000,
      });

      const email = response.data?.email;
      const firstName = response.data?.given_name;
      const lastName = response.data?.family_name;
      // LinkedIn returns the profile photo on userinfo as `picture`, same as
      // Google. It was being dropped, leaving OAuth users with no avatar.
      const avatarUrl = response.data?.picture;
      const emailVerifiedRaw = response.data?.email_verified;
      const emailVerified =
        emailVerifiedRaw === true || emailVerifiedRaw === 'true'
          ? true
          : emailVerifiedRaw === false || emailVerifiedRaw === 'false'
            ? false
            : undefined;

      if (email) {
        return { email, emailVerified, firstName, lastName, avatarUrl };
      }
    } catch (error) {
      firstStepUnreachable = this.isProviderUnreachable(error);
      // fallback below
    }

    try {
      const response = await axios.get(
        'https://api.linkedin.com/v2/emailAddress',
        {
          headers: { Authorization: `Bearer ${accessToken}` },
          params: {
            q: 'members',
            projection: '(elements*(handle~))',
          },
          timeout: 10000,
        },
      );

      const email =
        response.data?.elements?.[0]?.['handle~']?.emailAddress ?? undefined;
      return { email };
    } catch (error) {
      if (firstStepUnreachable || this.isProviderUnreachable(error)) {
        this.throwProviderError(error, 'LinkedIn', 'Invalid LinkedIn token');
      }
      return {};
    }
  }

  private async generatePlaceholderUsername(): Promise<string> {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const candidate = `user_${randomBytes(4).toString('hex')}`;
      const existing = await this.userRepository.findOne({
        where: { username: candidate },
      });
      if (!existing) {
        return candidate;
      }
    }

    return `user_${randomBytes(10).toString('hex')}`;
  }

  private normalizeUsername(value: string): string {
    const trimmed = value.trim().toLowerCase();
    const normalized = trimmed.replace(/[^a-z0-9._]/g, '');
    return normalized.length ? normalized : 'user';
  }

  private generateRandomPassword(): string {
    return randomBytes(16).toString('hex');
  }

  private async sendPasswordCreatedEmail(
    email: string,
    firstName: string | undefined,
    context: string,
  ): Promise<void> {
    const frontendUrl = this.configService.get<string>('FRONTEND_URL')?.replace(/\/$/, '');
    const signInUrl =
      this.configService.get<string>('PASSWORD_CREATED_LOGIN_URL') ??
      (frontendUrl ? `${frontendUrl}/login` : undefined);

    try {
      await this.brevoService.sendPasswordCreatedEmail(email, {
        firstName,
        signInUrl,
      });
    } catch (error) {
      this.logger.error(
        `${context}: Brevo password created email failed for ${email}: ${(error as Error)?.message}`,
      );
    }
  }
}
