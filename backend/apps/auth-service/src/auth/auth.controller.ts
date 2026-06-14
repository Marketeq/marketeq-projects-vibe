import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { SessionValidationGuard } from './guards/session-validation.guard';
import { Request, Response, CookieOptions } from 'express';

import { AuthService } from './auth.service';
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
import { VerifyTwoFactorDto, TwoFactorVerifyLoginDto, GenerateSmsTwoFactorDto, ResendTwoFactorDto } from './dto/two-factor.dto';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';

const extractRequestMeta = (req: Request) => ({
  userAgent: (req.headers['user-agent'] as string) ?? '',
  ipAddress: ((req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim()) ?? req.ip ?? '',
});

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  private parseCookieMaxAge(value: string): number {
    const match = value.match(/^(\d+)(s|m|h|d)?$/);
    if (!match) return 7 * 24 * 60 * 60 * 1000;

    const amount = Number.parseInt(match[1], 10);
    const unit = match[2] ?? 's';
    const multipliers: Record<string, number> = {
      s: 1000,
      m: 60 * 1000,
      h: 60 * 60 * 1000,
      d: 24 * 60 * 60 * 1000,
    };

    return amount * (multipliers[unit] ?? 1000);
  }

  private getSameSite(): CookieOptions['sameSite'] {
    const configured = (
      this.configService.get<string>('AUTH_COOKIE_SAMESITE') ??
      this.configService.get<string>('COOKIE_SAMESITE') ??
      ''
    ).toLowerCase();

    if (configured === 'none') return 'none';
    if (configured === 'strict') return 'strict';
    if (configured === 'lax') return 'lax';

    return process.env.NODE_ENV === 'production' ? 'none' : 'lax';
  }

  private getCookieSecure(): boolean {
    const configured =
      this.configService.get<string>('AUTH_COOKIE_SECURE') ??
      this.configService.get<string>('COOKIE_SECURE');

    if (configured != null) {
      return configured.toLowerCase() === 'true';
    }

    return process.env.NODE_ENV === 'production';
  }

  private getBaseCookieOptions(): CookieOptions {
    const domain =
      this.configService.get<string>('AUTH_COOKIE_DOMAIN') ??
      this.configService.get<string>('COOKIE_DOMAIN') ??
      undefined;

    return {
      httpOnly: true,
      secure: this.getCookieSecure(),
      sameSite: this.getSameSite(),
      path: '/',
      ...(domain ? { domain } : {}),
    };
  }

  private setAuthCookies(
    res: Response,
    result: {
      access_token?: string;
      refresh_token?: string;
      sessionId?: string;
    },
  ) {
    const accessMaxAge = this.parseCookieMaxAge(
      this.configService.get<string>('AUTH_JWT_TOKEN_EXPIRES_IN') ?? '15m',
    );
    const refreshMaxAge = this.parseCookieMaxAge(
      this.configService.get<string>('AUTH_REFRESH_TOKEN_EXPIRES_IN') ?? '7d',
    );
    const baseOptions = this.getBaseCookieOptions();

    if (result.access_token) {
      res.cookie('access_token', result.access_token, {
        ...baseOptions,
        maxAge: accessMaxAge,
      });
    }

    if (result.refresh_token) {
      res.cookie('refresh_token', result.refresh_token, {
        ...baseOptions,
        maxAge: refreshMaxAge,
      });
    }

    if (result.sessionId) {
      res.cookie('session_id', result.sessionId, {
        ...baseOptions,
        maxAge: refreshMaxAge,
      });
    }
  }

  private clearAuthCookies(res: Response) {
    const options = this.getBaseCookieOptions();
    res.clearCookie('access_token', options);
    res.clearCookie('accessToken', options);
    res.clearCookie('refresh_token', options);
    res.clearCookie('session_id', options);
  }

  @ApiOperation({ summary: 'Register the user' })
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() dto: RegisterDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const { userAgent, ipAddress } = extractRequestMeta(req);
    const result = await this.authService.register(dto, userAgent, ipAddress);
    this.setAuthCookies(res, result);
    return result;
  }

  @ApiOperation({ summary: 'Register the user with email' })
  @Post('register-email')
  @HttpCode(HttpStatus.CREATED)
  async registerEmail(@Body() dto: RegisterEmailDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const { userAgent, ipAddress } = extractRequestMeta(req);
    const result = await this.authService.registerEmail(dto, userAgent, ipAddress);
    this.setAuthCookies(res, result);
    return result;
  }

  @ApiOperation({ summary: 'Check that the username is available' })
  @Post('check-username')
  @HttpCode(HttpStatus.OK)
  checkUsername(@Body() dto: CheckUsernameDto) {
    return this.authService.checkUsername(dto);
  }

  @ApiOperation({ summary: 'Update the username' })
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, SessionValidationGuard)
  @Put('username')
  @HttpCode(HttpStatus.OK)
  updateUsername(@Req() req: Request, @Body() dto: UpdateUsernameDto) {
    return this.authService.updateUsername(req.user!, dto);
  }

  @ApiOperation({ summary: 'Set password' })
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, SessionValidationGuard)
  @Patch('set-password')
  @HttpCode(HttpStatus.OK)
  setPassword(@Req() req: Request, @Body() dto: SetPasswordDto) {
    return this.authService.setPassword(req.user!, dto);
  }

  @ApiOperation({ summary: 'Login' })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const { userAgent, ipAddress } = extractRequestMeta(req);
    const result = await this.authService.login(dto, userAgent, ipAddress);
    if ('access_token' in result) {
      this.setAuthCookies(res, result);
    }
    return result;
  }

  @ApiOperation({ summary: 'Dev-only login by email (no password). Disabled in production.' })
  @Post('dev-login')
  @HttpCode(HttpStatus.OK)
  async devLogin(@Body() body: { email: string }, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const { userAgent, ipAddress } = extractRequestMeta(req);
    const result = await this.authService.devLogin(body.email, userAgent, ipAddress);
    this.setAuthCookies(res, result);
    return result;
  }

  @ApiOperation({ summary: 'Forgot Password' })
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  @ApiOperation({ summary: 'Reset password' })
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  @ApiOperation({ summary: 'Login using Google' })
  @Post('google')
  @HttpCode(HttpStatus.OK)
  async googleLogin(@Body() dto: GoogleLoginDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const { userAgent, ipAddress } = extractRequestMeta(req);
    const result = await this.authService.loginWithGoogle(dto, userAgent, ipAddress);
    this.setAuthCookies(res, result);
    return result;
  }

  @ApiOperation({ summary: 'Login using LinkedIn' })
  @Post('linkedin')
  @HttpCode(HttpStatus.OK)
  async linkedInLogin(@Body() dto: LinkedInLoginDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const { userAgent, ipAddress } = extractRequestMeta(req);
    const result = await this.authService.loginWithLinkedIn(dto, userAgent, ipAddress);
    this.setAuthCookies(res, result);
    return result;
  }

  @ApiOperation({ summary: 'Refresh' })
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Body() dto: RefreshDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const refreshToken =
      (req as any).cookies?.refresh_token ??
      dto?.refresh_token;
    const result = await this.authService.refresh({ refresh_token: refreshToken });
    this.setAuthCookies(res, result);
    return result;
  }

  @ApiOperation({ summary: 'Logout' })
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Req() req: Request, @Body() body: { refresh_token?: string } | undefined, @Res({ passthrough: true }) res: Response) {
    const refreshToken =
      body?.refresh_token ??
      (req as any).cookies?.refresh_token;
    const result = await this.authService.logout(req.user!, refreshToken);
    this.clearAuthCookies(res);
    return result;
  }

  @ApiOperation({ summary: 'Get the current user' })
  @ApiBearerAuth('access_token')
  @UseGuards(JwtAuthGuard, SessionValidationGuard)
  @Get('me')
  getProfile(@Req() req: Request) {
    return req.user ?? null;
  }

  @ApiOperation({ summary: 'List active sessions' })
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, SessionValidationGuard)
  @Get('sessions')
  getSessions(@Req() req: Request, @Query('currentSessionId') currentSessionId?: string) {
    const userId = (req.user as any)?.sub ?? (req.user as any)?.id;
    return this.authService.getSessions(userId, currentSessionId);
  }

  @ApiOperation({ summary: 'Revoke a specific session' })
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, SessionValidationGuard)
  @Delete('sessions/:id')
  @HttpCode(HttpStatus.OK)
  revokeSession(@Req() req: Request, @Param('id') sessionId: string) {
    const userId = (req.user as any)?.sub ?? (req.user as any)?.id;
    return this.authService.revokeSession(userId, sessionId);
  }

  @ApiOperation({ summary: 'Revoke all sessions except current' })
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, SessionValidationGuard)
  @Delete('sessions')
  @HttpCode(HttpStatus.OK)
  revokeAllOtherSessions(@Req() req: Request, @Query('currentSessionId') currentSessionId: string) {
    const userId = (req.user as any)?.sub ?? (req.user as any)?.id;
    return this.authService.revokeAllOtherSessions(userId, currentSessionId);
  }

  @ApiOperation({ summary: 'Heartbeat — keeps session alive and validates it' })
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, SessionValidationGuard)
  @Post('sessions/heartbeat')
  @HttpCode(HttpStatus.OK)
  heartbeat(@Req() req: Request) {
    const userId = (req.user as any)?.sub ?? (req.user as any)?.id;
    const sessionId = (req.user as any)?.sid ?? '';
    return this.authService.heartbeat(userId, sessionId);
  }

  @ApiOperation({ summary: 'Generate 2FA secret and QR code' })
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, SessionValidationGuard)
  @Post('2fa/generate')
  @HttpCode(HttpStatus.OK)
  generateTwoFactor(@Req() req: Request) {
    const userId = (req.user as any)?.sub ?? (req.user as any)?.id;
    return this.authService.generateTwoFactorSecret(userId);
  }

  @ApiOperation({ summary: 'Enable 2FA after verifying code' })
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, SessionValidationGuard)
  @Post('2fa/enable')
  @HttpCode(HttpStatus.OK)
  enableTwoFactor(@Req() req: Request, @Body() dto: VerifyTwoFactorDto) {
    const userId = (req.user as any)?.sub ?? (req.user as any)?.id;
    return this.authService.enableTwoFactor(userId, dto.code, dto.method ?? 'totp');
  }

  @ApiOperation({ summary: 'Disable 2FA' })
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, SessionValidationGuard)
  @Post('2fa/disable')
  @HttpCode(HttpStatus.OK)
  disableTwoFactor(@Req() req: Request, @Body() dto: VerifyTwoFactorDto) {
    const userId = (req.user as any)?.sub ?? (req.user as any)?.id;
    return this.authService.disableTwoFactor(userId, dto.code);
  }

  @ApiOperation({ summary: 'Generate and send SMS 2FA code during setup' })
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, SessionValidationGuard)
  @Post('2fa/generate-sms')
  @HttpCode(HttpStatus.OK)
  generateSmsTwoFactor(@Req() req: Request, @Body() dto: GenerateSmsTwoFactorDto) {
    const userId = (req.user as any)?.sub ?? (req.user as any)?.id;
    return this.authService.generateSmsTwoFactor(userId, dto.phone);
  }

  @ApiOperation({ summary: 'Resend 2FA SMS code (setup or login)' })
  @Post('2fa/resend')
  @HttpCode(HttpStatus.OK)
  async resendTwoFactorCode(@Req() req: Request, @Body() dto: ResendTwoFactorDto) {
    if (dto.partialToken) {
      const userId = await this.authService.verifyPartialToken(dto.partialToken);
      return this.authService.resendTwoFactorCode(userId);
    }

    const userId = (req.user as any)?.sub ?? (req.user as any)?.id;
    if (!userId) throw new UnauthorizedException('Authentication required');
    return this.authService.resendTwoFactorCode(userId);
  }

  @ApiOperation({ summary: 'Verify 2FA code during login' })
  @Post('2fa/verify')
  @HttpCode(HttpStatus.OK)
  async verifyTwoFactor(@Body() dto: TwoFactorVerifyLoginDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const { userAgent, ipAddress } = extractRequestMeta(req);
    const result = await this.authService.verifyTwoFactorLogin(dto.partialToken, dto.code, userAgent, ipAddress);
    this.setAuthCookies(res, result);
    return result;
  }

  @ApiOperation({ summary: 'Regenerate backup codes' })
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, SessionValidationGuard)
  @Post('2fa/backup-codes')
  @HttpCode(HttpStatus.OK)
  regenerateBackupCodes(@Req() req: Request, @Body() dto: VerifyTwoFactorDto) {
    const userId = (req.user as any)?.sub ?? (req.user as any)?.id;
    return this.authService.regenerateBackupCodes(userId, dto.code);
  }
}
