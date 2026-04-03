import { HttpService } from '@nestjs/axios';
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpException,
  Param,
  Post,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { servicesConfig } from '../services-config';
import { lastValueFrom } from 'rxjs';
import axios from 'axios';

@Controller('teams')
export class TeamsController {
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

  @Get(':teamId/members')
  async getTeamMembers(@Req() req: Request, @Param('teamId') teamId: string) {
    try {
      const res = await lastValueFrom(
        this.httpService.get(`${this.baseUrl}/teams/${teamId}/members`, {
          headers: this.forwardHeaders(req),
        }),
      );
      return res.data;
    } catch (e) {
      this.rethrowAxios(e);
    }
  }

  @Post(':teamId/members')
  async addMember(
    @Req() req: Request,
    @Param('teamId') teamId: string,
    @Body() dto: Record<string, unknown>,
  ) {
    try {
      const res = await lastValueFrom(
        this.httpService.post(`${this.baseUrl}/teams/${teamId}/members`, dto, {
          headers: this.forwardHeaders(req),
        }),
      );
      return res.data;
    } catch (e) {
      this.rethrowAxios(e);
    }
  }

  @Delete(':teamId/members/:userId')
  async removeMember(
    @Req() req: Request,
    @Param('teamId') teamId: string,
    @Param('userId') userId: string,
  ) {
    try {
      const res = await lastValueFrom(
        this.httpService.delete(
          `${this.baseUrl}/teams/${teamId}/members/${userId}`,
          { headers: this.forwardHeaders(req) },
        ),
      );
      return res.data;
    } catch (e) {
      this.rethrowAxios(e);
    }
  }
}