import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import axios from 'axios';
import type { StringValue } from 'ms';

import { User } from '../user/entities/user.entity';
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

const normalizeKey = (value?: string) =>
  value ? value.replace(/\\n/g, '\n') : value;

const parseExpiresIn = (value: string): number | StringValue =>
  /^\d+$/.test(value) ? Number(value) : (value as StringValue);

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async register(dto: RegisterDto) {
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

    await this.userRepository.save(user);

    try {
      await this.syncUserProfile(user);
    } catch (error) {
      await this.userRepository.delete({ id: user.id });
      throw error;
    }

    const tokens = await this.issueTokens({
      sub: user.id,
      email: user.email,
    });

    return {
      ...tokens,
      user: { id: user.id, username: user.username, email: user.email },
    };
  }

  async registerEmail(dto: RegisterEmailDto) {
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

    await this.userRepository.save(user);

    try {
      await this.syncUserProfile(user);
    } catch (error) {
      await this.userRepository.delete({ id: user.id });
      throw error;
    }

    const tokens = await this.issueTokens({
      sub: user.id,
      email: user.email,
    });

    return {
      ...tokens,
      user: { id: user.id, username: user.username, email: user.email },
    };
  }

  async checkUsername(dto: CheckUsernameDto) {
    const existingUser = await this.userRepository.findOne({
      where: { username: dto.username },
      select: ['id'],
    });

    return { available: !existingUser };
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
      select: ['id', 'email', 'username', 'provider', 'hasPassword'],
    });

    if (!current) {
      throw new UnauthorizedException('Invalid user');
    }

    current.username = dto.username;
    await this.userRepository.save(current);

    await this.syncUserProfile(current);

    return {
      user: {
        id: current.id,
        username: current.username,
        email: current.email,
      },
    };
  }

  async setPassword(user: { id?: string; sub?: string }, dto: SetPasswordDto) {
    const userId = user?.sub ?? user?.id;
    if (!userId) {
      throw new UnauthorizedException('Invalid user');
    }

    const current = await this.userRepository.findOne({
      where: { id: userId },
      select: ['id', 'email', 'username', 'password', 'provider', 'hasPassword'],
    });

    if (!current) {
      throw new UnauthorizedException('Invalid user');
    }

    current.password = await bcrypt.hash(dto.password, 10);
    current.hasPassword = true;
    await this.userRepository.save(current);

    await this.syncUserProfile(current);

    return {
      user: {
        id: current.id,
        username: current.username,
        email: current.email,
      },
    };
  }

  async login(dto: LoginDto): Promise<JwtPair> {
    const user = await this.userRepository.findOne({
      where: { email: dto.email },
      select: ['id', 'email', 'username', 'password', 'provider', 'hasPassword'],
    });

    if (!user) throw new UnauthorizedException('Invalid credentials');

    const isMatch = await bcrypt.compare(dto.password, user.password);
    if (!isMatch) throw new UnauthorizedException('Invalid credentials');

    await this.syncUserProfile(user);

    return this.issueTokens({ sub: user.id, email: user.email });
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.userRepository.findOne({
      where: { email: dto.email },
      select: ['id', 'email'],
    });

    const message =
      'If an account exists for this email, password reset instructions will be sent.';

    if (!user) {
      return { message };
    }

    const resetToken = await this.issuePasswordResetToken(user);
    const resetUrl =
      dto.redirectUrl && resetToken
        ? `${dto.redirectUrl}${dto.redirectUrl.includes('?') ? '&' : '?'}token=${encodeURIComponent(resetToken)}`
        : undefined;

    return {
      message,
      reset_token: resetToken,
      reset_url: resetUrl,
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
      select: ['id', 'email', 'username', 'password', 'provider', 'hasPassword'],
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

  async loginWithGoogle(dto: GoogleLoginDto) {
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

    if (idToken) {
      let tokenInfo: {
        aud?: string;
        email?: string;
        email_verified?: string | boolean;
        sub?: string;
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

      if (!email) {
        try {
          const response = await axios.get(
            'https://www.googleapis.com/oauth2/v3/userinfo',
            {
              headers: { Authorization: `Bearer ${accessToken}` },
            },
          );
          email = response.data?.email;
          emailVerified = response.data?.email_verified;
        } catch {
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
      select: ['id', 'email', 'username', 'provider', 'hasPassword'],
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
      await this.syncUserProfile(user);
    } catch (error) {
      if (createdUser) {
        await this.userRepository.delete({ id: user.id });
      }
      throw error;
    }

    const tokens = await this.issueTokens({
      sub: user.id,
      email: user.email,
    });

    return {
      ...tokens,
      user: { id: user.id, username: user.username, email: user.email },
    };
  }

  async loginWithLinkedIn(dto: LinkedInLoginDto) {
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

    const { email, emailVerified } =
      await this.fetchLinkedInEmail(accessToken);

    if (!email) {
      throw new UnauthorizedException('Invalid LinkedIn token');
    }

    if (emailVerified === false) {
      throw new UnauthorizedException('LinkedIn email not verified');
    }

    const resolvedEmail = email;

    let user = await this.userRepository.findOne({
      where: { email: resolvedEmail },
      select: ['id', 'email', 'username', 'provider', 'hasPassword'],
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
      await this.syncUserProfile(user);
    } catch (error) {
      if (createdUser) {
        await this.userRepository.delete({ id: user.id });
      }
      throw error;
    }

    const tokens = await this.issueTokens({
      sub: user.id,
      email: user.email,
    });

    return {
      ...tokens,
      user: { id: user.id, username: user.username, email: user.email },
    };
  }

  async refresh(dto: RefreshDto): Promise<JwtPair> {
    const refreshSecret = this.getRefreshSecret();
    let payload: { sub: string; email?: string; type?: string };

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

    return this.issueTokens({ sub: payload.sub, email: payload.email });
  }

  async logout(user: { id?: string; sub?: string }) {
    const userId = user?.sub ?? user?.id;
    if (!userId) {
      throw new UnauthorizedException('Invalid user');
    }

    // Stateless JWT logout: client clears tokens.
    return { success: true };
  }

  private async issueTokens(payload: {
    sub: string;
    email: string;
  }): Promise<JwtPair> {
    const access_token = this.jwtService.sign(payload);

    const refreshSecret = this.getRefreshSecret();
    const refreshExpires = parseExpiresIn(
      this.configService.get<string>('AUTH_REFRESH_TOKEN_EXPIRES_IN') ?? '7d',
    );

    const refresh_token = await this.jwtService.signAsync(
      { ...payload, type: 'refresh' },
      {
        secret: refreshSecret,
        algorithm: 'HS256',
        expiresIn: refreshExpires,
      },
    );

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

  private async syncUserProfile(user: User) {
    const baseUrl =
      this.configService.get<string>('USER_SERVICE_URL') ??
      'http://localhost:3000';
    const token = this.configService.get<string>('INTERNAL_SERVICE_TOKEN');

    if (!token) {
      throw new InternalServerErrorException(
        'INTERNAL_SERVICE_TOKEN is required to sync user profiles',
      );
    }

    const url = `${baseUrl.replace(/\/$/, '')}/internal/users`;

    try {
      await axios.post(
        url,
        {
          id: user.id,
          email: user.email,
          username: user.username,
          provider: user.provider ?? 'EMAIL',
          hasPassword: user.hasPassword ?? false,
        },
        {
          headers: {
            'x-internal-token': token,
          },
        },
      );
    } catch (error) {
      this.logger.error(
        `Failed to sync user profile to user-service for user ${user.id}: ${(error as Error)?.message}`,
        (error as Error)?.stack,
      );
      throw new InternalServerErrorException(
        'Failed to sync user profile to user-service',
      );
    }
  }

  private async fetchLinkedInEmail(
    accessToken: string,
  ): Promise<{ email?: string; emailVerified?: boolean }> {
    try {
      const response = await axios.get('https://api.linkedin.com/v2/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      const email = response.data?.email;
      const emailVerifiedRaw = response.data?.email_verified;
      const emailVerified =
        emailVerifiedRaw === true || emailVerifiedRaw === 'true'
          ? true
          : emailVerifiedRaw === false || emailVerifiedRaw === 'false'
            ? false
            : undefined;

      if (email) {
        return { email, emailVerified };
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
