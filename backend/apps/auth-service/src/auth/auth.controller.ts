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
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { SessionValidationGuard } from './guards/session-validation.guard';
import { Request } from 'express';

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
import { VerifyTwoFactorDto, TwoFactorVerifyLoginDto } from './dto/two-factor.dto';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

const extractRequestMeta = (req: Request) => ({
  userAgent: (req.headers['user-agent'] as string) ?? '',
  ipAddress: ((req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim()) ?? req.ip ?? '',
});

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @ApiOperation({ summary: 'Register the user' })
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  register(@Body() dto: RegisterDto, @Req() req: Request) {
    const { userAgent, ipAddress } = extractRequestMeta(req);
    return this.authService.register(dto, userAgent, ipAddress);
  }

  @ApiOperation({ summary: 'Register the user with email' })
  @Post('register-email')
  @HttpCode(HttpStatus.CREATED)
  registerEmail(@Body() dto: RegisterEmailDto, @Req() req: Request) {
    const { userAgent, ipAddress } = extractRequestMeta(req);
    return this.authService.registerEmail(dto, userAgent, ipAddress);
  }

  @ApiOperation({ summary: 'Check that the username is available' })
  @Post('check-username')
  @HttpCode(HttpStatus.OK)
  checkUsername(@Body() dto: CheckUsernameDto) {
    return this.authService.checkUsername(dto);
  }

  @ApiOperation({ summary: 'Update the username' })
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @Put('username')
  @HttpCode(HttpStatus.OK)
  updateUsername(@Req() req: Request, @Body() dto: UpdateUsernameDto) {
    return this.authService.updateUsername(req.user!, dto);
  }

  @ApiOperation({ summary: 'Set password' })
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @Patch('set-password')
  @HttpCode(HttpStatus.OK)
  setPassword(@Req() req: Request, @Body() dto: SetPasswordDto) {
    return this.authService.setPassword(req.user!, dto);
  }

  @ApiOperation({ summary: 'Login' })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: LoginDto, @Req() req: Request) {
    const { userAgent, ipAddress } = extractRequestMeta(req);
    return this.authService.login(dto, userAgent, ipAddress);
  }

  @ApiOperation({ summary: 'Dev-only login by email (no password). Disabled in production.' })
  @Post('dev-login')
  @HttpCode(HttpStatus.OK)
  devLogin(@Body() body: { email: string }, @Req() req: Request) {
    const { userAgent, ipAddress } = extractRequestMeta(req);
    return this.authService.devLogin(body.email, userAgent, ipAddress);
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
  googleLogin(@Body() dto: GoogleLoginDto, @Req() req: Request) {
    const { userAgent, ipAddress } = extractRequestMeta(req);
    return this.authService.loginWithGoogle(dto, userAgent, ipAddress);
  }

  @ApiOperation({ summary: 'Login using LinkedIn' })
  @Post('linkedin')
  @HttpCode(HttpStatus.OK)
  linkedInLogin(@Body() dto: LinkedInLoginDto, @Req() req: Request) {
    const { userAgent, ipAddress } = extractRequestMeta(req);
    return this.authService.loginWithLinkedIn(dto, userAgent, ipAddress);
  }

  @ApiOperation({ summary: 'Refresh' })
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  refresh(@Body() dto: RefreshDto) {
    return this.authService.refresh(dto);
  }

  @ApiOperation({ summary: 'Logout' })
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  logout(@Req() req: Request, @Body() body?: { refresh_token?: string }) {
    return this.authService.logout(req.user!, body?.refresh_token);
  }

  @ApiOperation({ summary: 'Get the current user' })
  @ApiBearerAuth('access_token')
  @UseGuards(JwtAuthGuard)
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
  @UseGuards(JwtAuthGuard)
  @Post('sessions/heartbeat')
  @HttpCode(HttpStatus.OK)
  heartbeat(@Req() req: Request) {
    const userId = (req.user as any)?.sub ?? (req.user as any)?.id;
    const sessionId = (req.user as any)?.sid ?? '';
    return this.authService.heartbeat(userId, sessionId);
  }

  @ApiOperation({ summary: 'Generate 2FA secret and QR code' })
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @Post('2fa/generate')
  @HttpCode(HttpStatus.OK)
  generateTwoFactor(@Req() req: Request) {
    const userId = (req.user as any)?.sub ?? (req.user as any)?.id;
    return this.authService.generateTwoFactorSecret(userId);
  }

  @ApiOperation({ summary: 'Enable 2FA after verifying code' })
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @Post('2fa/enable')
  @HttpCode(HttpStatus.OK)
  enableTwoFactor(@Req() req: Request, @Body() dto: VerifyTwoFactorDto) {
    const userId = (req.user as any)?.sub ?? (req.user as any)?.id;
    return this.authService.enableTwoFactor(userId, dto.code);
  }

  @ApiOperation({ summary: 'Disable 2FA' })
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @Post('2fa/disable')
  @HttpCode(HttpStatus.OK)
  disableTwoFactor(@Req() req: Request, @Body() dto: VerifyTwoFactorDto) {
    const userId = (req.user as any)?.sub ?? (req.user as any)?.id;
    return this.authService.disableTwoFactor(userId, dto.code);
  }

  @ApiOperation({ summary: 'Verify 2FA code during login' })
  @Post('2fa/verify')
  @HttpCode(HttpStatus.OK)
  async verifyTwoFactor(@Body() dto: TwoFactorVerifyLoginDto, @Req() req: Request) {
    const { userAgent, ipAddress } = extractRequestMeta(req);
    const result = await this.authService.verifyTwoFactorLogin(dto.partialToken, dto.code, userAgent, ipAddress);
    console.log('[2FA/verify] Response:', {
      hasAccessToken: !!result.access_token,
      hasRefreshToken: !!result.refresh_token,
      hasSessionId: !!result.sessionId,
      hasUser: !!result.user,
    });
    return result;
  }

  @ApiOperation({ summary: 'Regenerate backup codes' })
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @Post('2fa/backup-codes')
  @HttpCode(HttpStatus.OK)
  regenerateBackupCodes(@Req() req: Request, @Body() dto: VerifyTwoFactorDto) {
    const userId = (req.user as any)?.sub ?? (req.user as any)?.id;
    return this.authService.regenerateBackupCodes(userId, dto.code);
  }
}
