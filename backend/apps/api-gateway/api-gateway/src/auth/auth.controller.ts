import { HttpService } from '@nestjs/axios';
import {
  Body,
  Controller,
  Get,
  HttpException,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  Put,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { Public } from '@libs/auth';
import { servicesConfig } from '../services-config';
import axios from 'axios';

@Controller('auth')
export class AuthController {
  constructor(private readonly httpService: HttpService) {}
  private get authBaseUrl() {
    return servicesConfig.AUTH_SERVICE_URL.replace(/\/$/, '');
  }

  private rethrowAxios(error: unknown): never {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status ?? 500;
      const data = error.response?.data ?? {
        message: 'Request to auth-service failed',
      };
      throw new HttpException(data, status);
    }
    throw error;
  }

  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() dto: Record<string, unknown>) {
    try {
      const response = await this.httpService
        .post(`${this.authBaseUrl}/auth/register`, dto)
        .toPromise();
      return response?.data;
    } catch (error) {
      this.rethrowAxios(error);
    }
  }

  @Public()
  @Post('register-email')
  @HttpCode(HttpStatus.CREATED)
  async registerEmail(@Body() dto: Record<string, unknown>) {
    try {
      const response = await this.httpService
        .post(`${this.authBaseUrl}/auth/register-email`, dto)
        .toPromise();
      return response?.data;
    } catch (error) {
      this.rethrowAxios(error);
    }
  }

  @Public()
  @Post('check-username')
  @HttpCode(HttpStatus.OK)
  async checkUsername(@Body() dto: Record<string, unknown>) {
    const response = await this.httpService
      .post(`${this.authBaseUrl}/auth/check-username`, dto)
      .toPromise();
    return response.data;
  }

  @Put('username')
  @HttpCode(HttpStatus.OK)
  async updateUsername(@Req() req: Request, @Body() dto: Record<string, unknown>) {
    const response = await this.httpService
      .put(`${this.authBaseUrl}/auth/username`, dto, {
        headers: { Authorization: req.headers.authorization ?? '' },
      })
      .toPromise();
    return response.data;
  }

  @Patch('set-password')
  @HttpCode(HttpStatus.OK)
  async setPassword(@Req() req: Request, @Body() dto: Record<string, unknown>) {
    const response = await this.httpService
      .patch(`${this.authBaseUrl}/auth/set-password`, dto, {
        headers: { Authorization: req.headers.authorization ?? '' },
      })
      .toPromise();
    return response.data;
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: Record<string, unknown>) {
    const response = await this.httpService
      .post(`${this.authBaseUrl}/auth/login`, dto)
      .toPromise();
    return response.data;
  }

  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body() dto: Record<string, unknown>) {
    const response = await this.httpService
      .post(`${this.authBaseUrl}/auth/forgot-password`, dto)
      .toPromise();
    return response.data;
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() dto: Record<string, unknown>) {
    const response = await this.httpService
      .post(`${this.authBaseUrl}/auth/reset-password`, dto)
      .toPromise();
    return response.data;
  }

  @Public()
  @Post('google')
  @HttpCode(HttpStatus.OK)
  async googleLogin(@Body() dto: Record<string, unknown>) {
    try {
      const response = await this.httpService
        .post(`${this.authBaseUrl}/auth/google`, dto)
        .toPromise();
      return response?.data;
    } catch (error) {
      this.rethrowAxios(error);
    }
  }

  @Public()
  @Post('linkedin')
  @HttpCode(HttpStatus.OK)
  async linkedInLogin(@Body() dto: Record<string, unknown>) {
    try {
      const response = await this.httpService
        .post(`${this.authBaseUrl}/auth/linkedin`, dto)
        .toPromise();
      return response?.data;
    } catch (error) {
      this.rethrowAxios(error);
    }
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Body() dto: Record<string, unknown>) {
    const response = await this.httpService
      .post(`${this.authBaseUrl}/auth/refresh`, dto)
      .toPromise();
    return response.data;
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Req() req: Request) {
    const response = await this.httpService
      .post(
        `${this.authBaseUrl}/auth/logout`,
        {},
        {
          headers: { Authorization: req.headers.authorization ?? '' },
        },
      )
      .toPromise();
    return response.data;
  }

  @Get('me')
  async me(@Req() req: Request) {
    const response = await this.httpService
      .get(`${this.authBaseUrl}/auth/me`, {
        headers: { Authorization: req.headers.authorization ?? '' },
      })
      .toPromise();
    return response.data;
  }

  @Public()
  @Get('/dashboard')
  async getAuthDashboard() {
    const response = await this.httpService
      .get(`${this.authBaseUrl}/auth/dashboard`)
      .toPromise();
    return response.data;
  }
}
