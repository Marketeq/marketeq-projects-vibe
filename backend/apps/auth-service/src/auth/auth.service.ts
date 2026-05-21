import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
  UnauthorizedException,
} from '@nestjs/common';
import { createCipheriv, createDecipheriv, createHash, randomBytes, randomUUID, scryptSync } from 'crypto';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Not, QueryFailedError, Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import axios from 'axios';
import * as otplib from 'otplib';
import * as QRCode from 'qrcode';
import { UAParser } from 'ua-parser-js';
import type { StringValue } from 'ms';

import { BrevoService } from '../brevo/brevo.service';

import { User } from '../user/entities/user.entity';
import { Session } from '../session/entities/session.entity';
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

type JwtPair = { access_token: string; refresh_token: string };
type SyncUserProfilePayload = {
  id: string;
  email: string;
  username?: string;
  provider?: string;
  hasPassword?: boolean;
  firstName?: string;
  lastName?: string;
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
};

type LoginResult =
  | (JwtPair & { sessionId: string; user: AuthUserPayload })
  | { requiresTwoFactor: true; partialToken: string; twoFactorMethod: string };

type SyncRetryItem = {
  payload: SyncUserProfilePayload;
  attempts: number;
  nextAttemptAt: number;
  lastError?: string;
};

const normalizeKey = (value?: string) =>
  value ? value.replace(/\\n/g, '\n') : value;

const parseExpiresIn = (value: string): number | StringValue =>
  /^\d+$/.test(value) ? Number(value) : (value as StringValue);

@Injectable()
export class AuthService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AuthService.name);
  private readonly syncRetryQueue = new Map<string, SyncRetryItem>();
  private retryTimer: NodeJS.Timeout | null = null;
  private readonly syncRetryTickMs = 5000;
  private readonly syncRetryBaseDelayMs = 5000;
  private readonly syncRetryMaxDelayMs = 5 * 60 * 1000;
  private readonly syncRetryMaxAttempts = 10;

  private sessionCleanupTimer: NodeJS.Timeout | null = null;

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Session)
    private readonly sessionRepository: Repository<Session>,
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
    extra?: Pick<AuthUserPayload, 'firstName' | 'lastName'>,
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
    const existingUser = await this.userRepository.findOne({
      where: { email: dto.email },
    });

    if (existingUser) {
      throw new BadRequestException('User already exists');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const user = this.userRepository.create({
      username: dto.username,
      email: dto.email,
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

    const sessionId = randomUUID();
    const tokens = await this.issueTokens({
      sub: user.id,
      email: user.email,
      sessionId,
    });

    await this.createSession({ id: sessionId, userId: user.id, refreshToken: tokens.refresh_token, userAgent, ipAddress });

    return {
      ...tokens,
      sessionId,
      user: this.serializeUser(user),
    };
  }

  async registerEmail(dto: RegisterEmailDto, userAgent = '', ipAddress = '') {
    const existingUser = await this.userRepository.findOne({
      where: { email: dto.email },
    });

    if (existingUser) {
      throw new BadRequestException('User already exists');
    }

    const username = await this.generatePlaceholderUsername();
    const plainPassword = this.generateRandomPassword();
    const hashedPassword = await bcrypt.hash(plainPassword, 10);

    const user = this.userRepository.create({
      username,
      email: dto.email,
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
    const tokens = await this.issueTokens({
      sub: user.id,
      email: user.email,
      sessionId,
    });

    await this.createSession({ id: sessionId, userId: user.id, refreshToken: tokens.refresh_token, userAgent, ipAddress });

    return {
      ...tokens,
      sessionId,
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

    return {
      user: this.serializeUser(current),
    };
  }

  async login(dto: LoginDto, userAgent = '', ipAddress = ''): Promise<LoginResult> {
    const user = await this.userRepository.findOne({
      where: { email: dto.email },
      select: ['id', 'email', 'username', 'password', 'provider', 'hasPassword', 'twoFactorEnabled', 'twoFactorMethod'],
    });

    if (!user) throw new UnauthorizedException('Invalid credentials');

    if (!user.hasPassword || !user.password) {
      throw new UnauthorizedException('Incorrect email or password');
    }

    const isMatch = await bcrypt.compare(dto.password, user.password);
    if (!isMatch) throw new UnauthorizedException('Invalid credentials');

    if (user.twoFactorEnabled) {
      const method = user.twoFactorMethod ?? 'totp';
      const partialToken = await this.issuePartialToken(user);

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
    const tokens = await this.issueTokens({ sub: user.id, email: user.email, sessionId });

    await this.createSession({ id: sessionId, userId: user.id, refreshToken: tokens.refresh_token, userAgent, ipAddress });

    return {
      ...tokens,
      sessionId,
      user: this.serializeUser(user),
    };
  }

  /**
   * Dev-only login: issue real RS256 tokens for an existing user by email.
   * Disabled in production. Behaves identically to real login (same token format,
   * same gateway verification) so local dev matches cloud behavior exactly.
   */
  async devLogin(email: string, userAgent = '', ipAddress = ''): Promise<JwtPair & { sessionId: string; user: AuthUserPayload }> {
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
    const tokens = await this.issueTokens({ sub: user.id, email: user.email, sessionId });

    await this.createSession({ id: sessionId, userId: user.id, refreshToken: tokens.refresh_token, userAgent, ipAddress });

    return {
      ...tokens,
      sessionId,
      user: this.serializeUser(user),
    };
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.userRepository.findOne({
      where: { email: dto.email },
      select: ['id', 'email', 'username'],
    });

    const message =
      'If an account exists for this email, password reset instructions will be sent.';

    if (!user) {
      return { message };
    }

    const resetToken = await this.issuePasswordResetToken(user);

    const fallbackBase =
      this.configService.get<string>('PASSWORD_RESET_URL') ??
      (this.configService.get<string>('FRONTEND_URL')
        ? `${this.configService.get<string>('FRONTEND_URL')!.replace(/\/$/, '')}/reset-password`
        : undefined);

    const base = dto.redirectUrl ?? fallbackBase;
    const resetUrl =
      base && resetToken
        ? `${base}${base.includes('?') ? '&' : '?'}token=${encodeURIComponent(resetToken)}`
        : undefined;

    if (resetUrl) {
      try {
        await this.brevoService.sendPasswordResetEmail(user.email, {
          firstName: user.username,
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
      message,
      ...(isDev && { reset_token: resetToken, reset_url: resetUrl }),
    };
  }

  async resetPassword(dto: ResetPasswordDto) {
    let payload: { sub?: string; email?: string; type?: string };

    try {
      payload = await this.jwtService.verifyAsync(dto.token, {
        algorithms: ['RS256'],
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired reset token');
    }

    if (!payload?.sub || payload.type !== 'reset') {
      throw new UnauthorizedException('Invalid or expired reset token');
    }

    const user = await this.userRepository.findOne({
      where: { id: payload.sub },
      select: ['id', 'email', 'username', 'password', 'provider', 'hasPassword', 'twoFactorEnabled'],
    });

    if (!user) {
      throw new UnauthorizedException('Invalid or expired reset token');
    }

    user.password = await bcrypt.hash(dto.password, 10);
    user.hasPassword = true;
    await this.userRepository.save(user);

    await this.syncUserProfile(user);

    return { success: true };
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
          },
        );

        accessToken = response.data?.access_token ?? accessToken;
        idToken = response.data?.id_token ?? idToken;
      } catch {
        throw new UnauthorizedException('Invalid Google auth code');
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
          },
        );
        tokenInfo = response.data ?? {};
      } catch {
        throw new UnauthorizedException('Invalid Google token');
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
          },
        );
        tokenInfo = response.data ?? {};
      } catch {
        throw new UnauthorizedException('Invalid Google access token');
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
          },
        );
        email = email ?? response.data?.email;
        emailVerified = emailVerified ?? response.data?.email_verified;
        firstName = response.data?.given_name;
        lastName = response.data?.family_name;
      } catch {
        if (!email) {
          throw new UnauthorizedException('Invalid Google access token');
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
    }

    try {
      await this.syncUserProfile(user, { firstName, lastName });
    } catch (error) {
      if (createdUser) {
        // New user: rollback the auth record so the user can retry cleanly.
        await this.userRepository.delete({ id: user.id });
        throw error;
      }
      // Existing user: profile already exists in user-service — do not
      // block login just because the sync refresh failed.
      this.logger.warn(
        `[google] sync failed for existing user ${user.id} but proceeding with login`,
      );
    }

    const sessionId = randomUUID();
    const tokens = await this.issueTokens({
      sub: user.id,
      email: user.email,
      sessionId,
    });

    await this.createSession({ id: sessionId, userId: user.id, refreshToken: tokens.refresh_token, userAgent, ipAddress });

    return {
      ...tokens,
      sessionId,
      user: this.serializeUser(user, { firstName, lastName }),
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
          },
        );

        accessToken = response.data?.access_token ?? accessToken;
      } catch {
        throw new UnauthorizedException('Invalid LinkedIn auth code');
      }
    }

    if (!accessToken) {
      throw new BadRequestException('access_token or code is required');
    }

    const { email, emailVerified, firstName, lastName } =
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
    }

    try {
      await this.syncUserProfile(user, { firstName, lastName });
    } catch (error) {
      if (createdUser) {
        await this.userRepository.delete({ id: user.id });
        throw error;
      }
      this.logger.warn(
        `[linkedin] sync failed for existing user ${user.id} but proceeding with login`,
      );
    }

    const sessionId = randomUUID();
    const tokens = await this.issueTokens({
      sub: user.id,
      email: user.email,
      sessionId,
    });

    await this.createSession({ id: sessionId, userId: user.id, refreshToken: tokens.refresh_token, userAgent, ipAddress });

    return {
      ...tokens,
      sessionId,
      user: this.serializeUser(user, { firstName, lastName }),
    };
  }

  async refresh(dto: RefreshDto): Promise<JwtPair & { sessionId?: string }> {
    const refreshSecret = this.getRefreshSecret();
    let payload: { sub: string; email?: string; type?: string; sid?: string };

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

      const newTokens = await this.issueTokens({ sub: payload.sub, email: payload.email ?? '', sessionId: payload.sid });

      session.refreshTokenHash = createHash('sha256').update(newTokens.refresh_token).digest('hex');
      session.lastActiveAt = new Date();
      await this.sessionRepository.save(session);

      return { ...newTokens, sessionId: payload.sid };
    }

    return this.issueTokens({ sub: payload.sub, email: payload.email ?? '' });
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
    let payload: { sub?: string; email?: string; type?: string };

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
    const tokens = await this.issueTokens({ sub: user.id, email: user.email, sessionId });

    await this.createSession({ id: sessionId, userId: user.id, refreshToken: tokens.refresh_token, userAgent, ipAddress });

    return { ...tokens, sessionId, user: this.serializeUser(user) };
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

  private async issuePartialToken(user: { id: string; email: string }): Promise<string> {
    return this.jwtService.signAsync(
      { sub: user.id, email: user.email, type: '2fa-pending' },
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
  }): Promise<void> {
    const hash = createHash('sha256').update(params.refreshToken).digest('hex');
    const expiresInStr = this.configService.get<string>('AUTH_REFRESH_TOKEN_EXPIRES_IN') ?? '7d';
    const expiresMs = this.parseExpiresInMs(expiresInStr);
    const expiresAt = new Date(Date.now() + expiresMs);

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
    session.expiresAt = expiresAt;
    await this.sessionRepository.save(session);
  }

  private parseExpiresInMs(value: string): number {
    const match = value.match(/^(\d+)(s|m|h|d)?$/);
    if (!match) return 7 * 24 * 60 * 60 * 1000;
    const num = parseInt(match[1], 10);
    const unit = match[2] ?? 's';
    const multipliers: Record<string, number> = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
    return num * (multipliers[unit] ?? 1000);
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
  }): Promise<JwtPair> {
    const accessPayload: Record<string, any> = { sub: payload.sub, email: payload.email };
    if (payload.sessionId) {
      accessPayload.sid = payload.sessionId;
    }
    const access_token = this.jwtService.sign(accessPayload);

    const refreshSecret = this.getRefreshSecret();
    const refreshExpires = parseExpiresIn(
      this.configService.get<string>('AUTH_REFRESH_TOKEN_EXPIRES_IN') ?? '7d',
    );

    const refreshPayload: Record<string, any> = {
      sub: payload.sub,
      email: payload.email,
      type: 'refresh',
    };
    if (payload.sessionId) {
      refreshPayload.sid = payload.sessionId;
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
  }): Promise<string> {
    const resetExpires = parseExpiresIn(
      this.configService.get<string>('AUTH_RESET_TOKEN_EXPIRES_IN') ?? '15m',
    );

    return this.jwtService.signAsync(
      { sub: user.id, email: user.email, type: 'reset' },
      { expiresIn: resetExpires },
    );
  }

  private getRefreshSecret(): string {
    const secret = this.configService.get<string>('AUTH_REFRESH_SECRET');
    if (!secret) {
      throw new Error('AUTH_REFRESH_SECRET is required for refresh tokens');
    }
    return secret;
  }

  private async syncUserProfile(user: User, extra?: { firstName?: string; lastName?: string }) {
    const payload: SyncUserProfilePayload = {
      id: user.id,
      email: user.email,
      username: user.username,
      provider: user.provider ?? 'EMAIL',
      hasPassword: user.hasPassword ?? false,
      ...(extra?.firstName && { firstName: extra.firstName }),
      ...(extra?.lastName && { lastName: extra.lastName }),
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
  ): Promise<{ email?: string; emailVerified?: boolean; firstName?: string; lastName?: string }> {
    try {
      const response = await axios.get('https://api.linkedin.com/v2/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      const email = response.data?.email;
      const firstName = response.data?.given_name;
      const lastName = response.data?.family_name;
      const emailVerifiedRaw = response.data?.email_verified;
      const emailVerified =
        emailVerifiedRaw === true || emailVerifiedRaw === 'true'
          ? true
          : emailVerifiedRaw === false || emailVerifiedRaw === 'false'
            ? false
            : undefined;

      if (email) {
        return { email, emailVerified, firstName, lastName };
      }
    } catch {
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
        },
      );

      const email =
        response.data?.elements?.[0]?.['handle~']?.emailAddress ?? undefined;
      return { email };
    } catch {
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
    const normalized = trimmed.replace(/[^a-z0-9_]/g, '');
    return normalized.length ? normalized : 'user';
  }

  private generateRandomPassword(): string {
    return randomBytes(16).toString('hex');
  }
}
