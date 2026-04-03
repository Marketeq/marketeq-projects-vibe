import { HttpService } from '@nestjs/axios';
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpException,
  HttpStatus,
  Param,
  Post,
  Put,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import axios from 'axios';
import { servicesConfig } from '../services-config';

@Controller('experiences')
export class ExperiencesController {
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

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Req() req: Request, @Body() dto: Record<string, unknown>) {
    try {
      const response = await this.httpService
        .post(`${this.userBaseUrl}/experiences`, dto, {
          headers: { Authorization: req.headers.authorization ?? '' },
        })
        .toPromise();
      return response?.data;
    } catch (error) {
      this.rethrowAxios(error);
    }
  }

  @Get()
  async findAll(@Req() req: Request) {
    try {
      const response = await this.httpService
        .get(`${this.userBaseUrl}/experiences`, {
          headers: { Authorization: req.headers.authorization ?? '' },
        })
        .toPromise();
      return response?.data;
    } catch (error) {
      this.rethrowAxios(error);
    }
  }

  @Put(':id')
  async update(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() dto: Record<string, unknown>,
  ) {
    try {
      const response = await this.httpService
        .put(`${this.userBaseUrl}/experiences/${id}`, dto, {
          headers: { Authorization: req.headers.authorization ?? '' },
        })
        .toPromise();
      return response?.data;
    } catch (error) {
      this.rethrowAxios(error);
    }
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Req() req: Request, @Param('id') id: string) {
    try {
      await this.httpService
        .delete(`${this.userBaseUrl}/experiences/${id}`, {
          headers: { Authorization: req.headers.authorization ?? '' },
        })
        .toPromise();
    } catch (error) {
      this.rethrowAxios(error);
    }
  }
}
