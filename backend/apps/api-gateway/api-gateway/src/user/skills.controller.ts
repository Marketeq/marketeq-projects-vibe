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
  Query,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import axios from 'axios';
import { servicesConfig } from '../services-config';

@Controller('skills')
export class SkillsController {
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
  async createSkill(@Req() req: Request, @Body() dto: Record<string, unknown>) {
    try {
      const response = await this.httpService
        .post(`${this.userBaseUrl}/skills`, dto, {
          headers: { Authorization: req.headers.authorization ?? '' },
        })
        .toPromise();
      return response?.data;
    } catch (error) {
      this.rethrowAxios(error);
    }
  }

  @Get()
  async getSkills(
    @Req() req: Request,
    @Query('search') search?: string,
    @Query('limit') limit?: string,
  ) {
    try {
      const response = await this.httpService
        .get(`${this.userBaseUrl}/skills`, {
          headers: { Authorization: req.headers.authorization ?? '' },
          params: {
            ...(search !== undefined ? { search } : {}),
            ...(limit !== undefined ? { limit } : {}),
          },
        })
        .toPromise();
      return response?.data;
    } catch (error) {
      this.rethrowAxios(error);
    }
  }

  @Put(':id')
  async updateSkill(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() dto: Record<string, unknown>,
  ) {
    try {
      const response = await this.httpService
        .put(`${this.userBaseUrl}/skills/${id}`, dto, {
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
  async deleteSkill(@Req() req: Request, @Param('id') id: string) {
    try {
      await this.httpService
        .delete(`${this.userBaseUrl}/skills/${id}`, {
          headers: { Authorization: req.headers.authorization ?? '' },
        })
        .toPromise();
    } catch (error) {
      this.rethrowAxios(error);
    }
  }
}
