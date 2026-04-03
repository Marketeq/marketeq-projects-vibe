import { HttpService } from '@nestjs/axios';
import { Body, Controller, Get, HttpException, Patch, Req } from '@nestjs/common';
import { Request } from 'express';
import { servicesConfig } from '../services-config';
import axios from 'axios';

@Controller('user')
export class UserController {
  constructor(private readonly httpService: HttpService) {}

  private get userBaseUrl() {
    return servicesConfig.USER_SERVICE_URL.replace(/\/$/, '');
  }

  private rethrowAxios(error: unknown): never {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status ?? 500;
      const data = error.response?.data ?? {
        message: 'Request to user-service failed',
      };
      throw new HttpException(data, status);
    }
    throw error;
  }

  private firstHeaderValue(value: string | string[] | undefined): string | undefined {
    if (Array.isArray(value)) {
      return value[0];
    }
    return value;
  }

  @Get('/profile')
  async getProfile() {
    try {
      const response = await this.httpService
        .get(`${this.userBaseUrl}/user/profile`)
        .toPromise();
      return response?.data;
    } catch (error) {
      this.rethrowAxios(error);
    }
  }

  @Get('me')
  async me(@Req() req: Request) {
    try {
      const response = await this.httpService
        .get(`${this.userBaseUrl}/user/me`, {
          headers: { Authorization: req.headers.authorization ?? '' },
        })
        .toPromise();
      return response?.data;
    } catch (error) {
      this.rethrowAxios(error);
    }
  }

  @Patch('onboarding-dismissed')
  async dismissOnboarding(@Req() req: Request, @Body() dto: Record<string, unknown>) {
    try {
      const response = await this.httpService
        .patch(`${this.userBaseUrl}/user/onboarding-dismissed`, dto, {
          headers: { Authorization: req.headers.authorization ?? '' },
        })
        .toPromise();
      return response?.data;
    } catch (error) {
      this.rethrowAxios(error);
    }
  }

  @Patch('refresh-timezone')
  async refreshTimezone(@Req() req: Request, @Body() dto: Record<string, unknown>) {
    try {
      const forwardedFor = this.firstHeaderValue(req.headers['x-forwarded-for']);
      const realIp = this.firstHeaderValue(req.headers['x-real-ip']);

      const response = await this.httpService
        .patch(`${this.userBaseUrl}/user/refresh-timezone`, dto, {
          headers: {
            Authorization: req.headers.authorization ?? '',
            ...(forwardedFor ? { 'x-forwarded-for': forwardedFor } : {}),
            ...(realIp ? { 'x-real-ip': realIp } : {}),
          },
        })
        .toPromise();
      return response?.data;
    } catch (error) {
      this.rethrowAxios(error);
    }
  }
}
