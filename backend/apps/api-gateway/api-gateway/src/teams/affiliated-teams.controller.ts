import { HttpService } from '@nestjs/axios';
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpException,
  Param,
  Patch,
  Post,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { servicesConfig } from '../services-config';
import { lastValueFrom } from 'rxjs';
import axios from 'axios';

@Controller('affiliated-teams')
export class AffiliatedTeamsController {
  constructor(private readonly httpService: HttpService) {}

  private get baseUrl() {
    return servicesConfig.USER_SERVICE_URL.replace(/\/$/, '');
  }

  private rethrowAxios(error: unknown): never {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status ?? 500;
      const data = error.response?.data ?? { message: 'Request to user-service failed' };
      throw new HttpException(data, status);
    }
    throw error;
  }

  private forwardHeaders(req: Request) {
    return { Authorization: req.headers.authorization ?? '' };
  }

  @Post()
  async create(@Req() req: Request, @Body() dto: Record<string, unknown>) {
    try {
      const res = await lastValueFrom(
        this.httpService.post(`${this.baseUrl}/affiliated-teams`, dto, {
          headers: this.forwardHeaders(req),
        }),
      );
      return res.data;
    } catch (e) {
      this.rethrowAxios(e);
    }
  }

  @Get()
  async findAll(@Req() req: Request) {
    try {
      const res = await lastValueFrom(
        this.httpService.get(`${this.baseUrl}/affiliated-teams`, {
          headers: this.forwardHeaders(req),
        }),
      );
      return res.data;
    } catch (e) {
      this.rethrowAxios(e);
    }
  }

  @Get(':id')
  async findOne(@Req() req: Request, @Param('id') id: string) {
    try {
      const res = await lastValueFrom(
        this.httpService.get(`${this.baseUrl}/affiliated-teams/${id}`, {
          headers: this.forwardHeaders(req),
        }),
      );
      return res.data;
    } catch (e) {
      this.rethrowAxios(e);
    }
  }

  @Patch(':id')
  async update(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() dto: Record<string, unknown>,
  ) {
    try {
      const res = await lastValueFrom(
        this.httpService.patch(`${this.baseUrl}/affiliated-teams/${id}`, dto, {
          headers: this.forwardHeaders(req),
        }),
      );
      return res.data;
    } catch (e) {
      this.rethrowAxios(e);
    }
  }

  @Delete(':id')
  async remove(@Req() req: Request, @Param('id') id: string) {
    try {
      const res = await lastValueFrom(
        this.httpService.delete(`${this.baseUrl}/affiliated-teams/${id}`, {
          headers: this.forwardHeaders(req),
        }),
      );
      return res.data;
    } catch (e) {
      this.rethrowAxios(e);
    }
  }
}
