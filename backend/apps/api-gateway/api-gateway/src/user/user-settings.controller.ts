import { HttpService } from '@nestjs/axios';
import {
  Body,
  Controller,
  HttpException,
  Put,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import axios from 'axios';
import { servicesConfig } from '../services-config';

@Controller()
export class UserSettingsController {
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

  @Put('rate')
  async updateRate(@Req() req: Request, @Body() dto: Record<string, unknown>) {
    try {
      const response = await this.httpService
        .put(`${this.userBaseUrl}/rate`, dto, {
          headers: { Authorization: req.headers.authorization ?? '' },
        })
        .toPromise();
      return response?.data;
    } catch (error) {
      this.rethrowAxios(error);
    }
  }

  @Put('overview')
  async updateOverview(
    @Req() req: Request,
    @Body() dto: Record<string, unknown>,
  ) {
    try {
      const response = await this.httpService
        .put(`${this.userBaseUrl}/overview`, dto, {
          headers: { Authorization: req.headers.authorization ?? '' },
        })
        .toPromise();
      return response?.data;
    } catch (error) {
      this.rethrowAxios(error);
    }
  }

  @Put('bio')
  async updateBio(@Req() req: Request, @Body() dto: Record<string, unknown>) {
    try {
      const response = await this.httpService
        .put(`${this.userBaseUrl}/bio`, dto, {
          headers: { Authorization: req.headers.authorization ?? '' },
        })
        .toPromise();
      return response?.data;
    } catch (error) {
      this.rethrowAxios(error);
    }
  }

  @Put('availability')
  async updateAvailability(
    @Req() req: Request,
    @Body() dto: Record<string, unknown>,
  ) {
    try {
      const response = await this.httpService
        .put(`${this.userBaseUrl}/availability`, dto, {
          headers: { Authorization: req.headers.authorization ?? '' },
        })
        .toPromise();
      return response?.data;
    } catch (error) {
      this.rethrowAxios(error);
    }
  }

  @Put('job-title')
  async updateJobTitle(
    @Req() req: Request,
    @Body() dto: Record<string, unknown>,
  ) {
    try {
      const response = await this.httpService
        .put(`${this.userBaseUrl}/job-title`, dto, {
          headers: { Authorization: req.headers.authorization ?? '' },
        })
        .toPromise();
      return response?.data;
    } catch (error) {
      this.rethrowAxios(error);
    }
  }
}
