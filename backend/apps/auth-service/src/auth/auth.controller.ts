import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
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
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @ApiOperation({ summary: 'Register the user' })
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @ApiOperation({ summary: 'Register the user with email' })
  @Post('register-email')
  @HttpCode(HttpStatus.CREATED)
  registerEmail(@Body() dto: RegisterEmailDto) {
    return this.authService.registerEmail(dto);
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
    return this.authService.updateUsername(req.user, dto);
  }

  @ApiOperation({ summary: 'Set password' })
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @Patch('set-password')
  @HttpCode(HttpStatus.OK)
  setPassword(@Req() req: Request, @Body() dto: SetPasswordDto) {
    return this.authService.setPassword(req.user, dto);
  }

  @ApiOperation({ summary: 'Login' })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
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
  googleLogin(@Body() dto: GoogleLoginDto) {
    return this.authService.loginWithGoogle(dto);
  }

  @ApiOperation({ summary: 'Login using LinkedIn' })
  @Post('linkedin')
  @HttpCode(HttpStatus.OK)
  linkedInLogin(@Body() dto: LinkedInLoginDto) {
    return this.authService.loginWithLinkedIn(dto);
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
  logout(@Req() req: Request) {
    return this.authService.logout(req.user);
  }

  @ApiOperation({ summary: 'Get the current user' })
  @ApiBearerAuth('access_token')
  @UseGuards(JwtAuthGuard)
  @Get('me')
  getProfile(@Req() req: Request) {
    return req.user ?? null;
  }
}
