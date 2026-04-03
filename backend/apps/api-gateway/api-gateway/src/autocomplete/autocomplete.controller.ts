import { HttpService } from '@nestjs/axios';
import {
  Controller,
  Get,
  HttpException,
  Query,
  Req,
} from '@nestjs/common';
import { Public } from '@libs/auth';
import { Request } from 'express';
import axios from 'axios';
import { servicesConfig } from '../services-config';

@Controller('autocomplete')
export class AutocompleteController {
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

  @Get('job_titles')
  @Public()
  async getJobTitles(@Req() req: Request, @Query('q') q?: string) {
    try {
      const response = await this.httpService
        .get(`${this.userBaseUrl}/autocomplete/job_titles`, {
          headers: { Authorization: req.headers.authorization ?? '' },
          params: {
            ...(q !== undefined ? { q } : {}),
          },
        })
        .toPromise();

      return Array.isArray(response?.data) ? response.data : [];
    } catch (error) {
      this.rethrowAxios(error);
    }
  }

  @Get('skills')
  @Public()
  async getSkills(@Req() req: Request, @Query('q') q?: string) {
    try {
      const response = await this.httpService
        .get(`${this.userBaseUrl}/autocomplete/skills`, {
          headers: { Authorization: req.headers.authorization ?? '' },
          params: {
            ...(q !== undefined ? { q } : {}),
          },
        })
        .toPromise();

      return Array.isArray(response?.data) ? response.data : [];
    } catch (error) {
      this.rethrowAxios(error);
    }
  }
}
