import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  Res,
  UseGuards,
  HttpCode,
  HttpStatus,
  Inject,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { LoginDto } from './dto/login.dto';
import { GoogleLoginDto } from './dto/google-login.dto';
import { LinkedInLoginDto } from './dto/linkedin-login.dto';
import { CreatePasswordDto } from './dto/create-password.dto';
import { Send2FADto } from './dto/send-2fa.dto';

@Controller('v1/auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    @Inject('NOTIFICATION_SERVICE')
    private readonly notificationClient: ClientProxy,
  ) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.login(dto);
    this.setAuthCookie(res, result.accessToken);
    return { user: result.user };
  }

  @Post('social/google')
  @HttpCode(HttpStatus.OK)
  async googleLogin(@Body() dto: GoogleLoginDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.googleLogin(dto);
    this.setAuthCookie(res, result.accessToken);
    return { user: result.user };
  }

  @Post('social/linkedin')
  @HttpCode(HttpStatus.OK)
  async linkedinLogin(@Body() dto: LinkedInLoginDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.linkedinLogin(dto);
    this.setAuthCookie(res, result.accessToken);
    return { user: result.user };
  }

  @Post('create-password')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async createPassword(@Req() req: Request & { user: any }, @Body() dto: CreatePasswordDto) {
    await this.authService.createPassword(req.user.id, dto.password);
    return { message: 'Password created successfully' };
  }

  @Post('send-2fa-link')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async send2FALink(@Req() req: Request & { user: any }, @Body() dto: Send2FADto) {
    await this.authService.send2FALink(req.user.id, dto.phoneNumber, this.notificationClient);
    return { message: 'Magic link sent to your email' };
  }

  @Post('verify-2fa-link')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async verify2FA(@Req() req: Request & { user: any }) {
    await this.authService.verify2FA(req.user.id);
    return { message: 'Phone verification complete' };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie('accessToken');
    return { message: 'Logged out successfully' };
  }

  @Get('health')
  health() {
    return { status: 'ok', service: 'auth-service' };
  }

  private setAuthCookie(res: Response, token: string) {
    res.cookie('accessToken', token, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      domain: process.env.NODE_ENV === 'production' ? process.env.COOKIE_DOMAIN : undefined,
      path: '/',
    });
  }
}
