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

@Controller('portfolio')
export class PortfolioController {
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
        .post(`${this.userBaseUrl}/portfolio`, dto, {
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
        .get(`${this.userBaseUrl}/portfolio`, {
          headers: { Authorization: req.headers.authorization ?? '' },
        })
        .toPromise();
      return response?.data;
    } catch (error) {
      this.rethrowAxios(error);
    }
  }

  @Put(':itemId')
  async update(
    @Req() req: Request,
    @Param('itemId') itemId: string,
    @Body() dto: Record<string, unknown>,
  ) {
    try {
      const response = await this.httpService
        .put(`${this.userBaseUrl}/portfolio/${itemId}`, dto, {
          headers: { Authorization: req.headers.authorization ?? '' },
        })
        .toPromise();
      return response?.data;
    } catch (error) {
      this.rethrowAxios(error);
    }
  }

  @Delete(':itemId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Req() req: Request, @Param('itemId') itemId: string) {
    try {
      await this.httpService
        .delete(`${this.userBaseUrl}/portfolio/${itemId}`, {
          headers: { Authorization: req.headers.authorization ?? '' },
        })
        .toPromise();
    } catch (error) {
      this.rethrowAxios(error);
    }
  }
}
