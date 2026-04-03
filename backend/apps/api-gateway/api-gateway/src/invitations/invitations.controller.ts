import { Body, Controller, Delete, Get, HttpException, Param, Post, Query, Req } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { servicesConfig } from '../services-config';
import { lastValueFrom } from 'rxjs';
import axios from 'axios';
import { Request } from 'express';

@Controller('invitations')
export class InvitationsController {
  constructor(private readonly httpService: HttpService) {}

  private get invitationsBaseUrl() {
    return servicesConfig.INVITATIONS_SERVICE_URL.replace(/\/$/, '');
  }

  private rethrowAxios(error: unknown): never {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status ?? 500;
      const data = error.response?.data ?? {
        message: 'Request to invitations-service failed',
      };
      throw new HttpException(data, status);
    }
    throw error;
  }

  private getForwardHeaders(req: Request) {
    const userIdHeader = process.env.GATEWAY_TRUST_HEADER || 'x-user-id';
    const userEmailHeader = process.env.GATEWAY_TRUST_EMAIL_HEADER || 'x-user-email';
    const forwardedHeaders: Record<string, string> = {};

    const userId = req.header(userIdHeader);
    const userEmail = req.header(userEmailHeader);

    if (userId) {
      forwardedHeaders[userIdHeader] = userId;
    }

    if (userEmail) {
      forwardedHeaders[userEmailHeader] = userEmail;
    }

    return forwardedHeaders;
  }

  @Post()
  async create(@Body() dto: Record<string, unknown>, @Req() req: Request) {
    try {
      const response = await lastValueFrom(
        this.httpService.post(`${this.invitationsBaseUrl}/invitations`, dto, {
          headers: this.getForwardHeaders(req),
        }),
      );
      return response?.data;
    } catch (error) {
      this.rethrowAxios(error);
    }
  }

  @Post('link')
  async createLink(@Body() dto: Record<string, unknown>, @Req() req: Request) {
    try {
      const response = await lastValueFrom(
        this.httpService.post(`${this.invitationsBaseUrl}/invitations/link`, dto, {
          headers: this.getForwardHeaders(req),
        }),
      );
      return response?.data;
    } catch (error) {
      this.rethrowAxios(error);
    }
  }

  @Get()
  async list(@Query() query: Record<string, string>, @Req() req: Request) {
    const queryString = new URLSearchParams(query).toString();
    const url = queryString 
      ? `${this.invitationsBaseUrl}/invitations?${queryString}`
      : `${this.invitationsBaseUrl}/invitations`;
    
    try {
      const response = await lastValueFrom(
        this.httpService.get(url, {
          headers: this.getForwardHeaders(req),
        }),
      );
      return response?.data;
    } catch (error) {
      this.rethrowAxios(error);
    }
  }

  @Get(':id')
  async getOne(@Param('id') id: string, @Req() req: Request) {
    try {
      const response = await lastValueFrom(
        this.httpService.get(`${this.invitationsBaseUrl}/invitations/${id}`, {
          headers: this.getForwardHeaders(req),
        }),
      );
      return response?.data;
    } catch (error) {
      this.rethrowAxios(error);
    }
  }

  
  @Post('accept')
  async accept(@Body() dto: Record<string, unknown>, @Req() req: Request) {
    try {
      const response = await lastValueFrom(
        this.httpService.post(`${this.invitationsBaseUrl}/invitations/accept`, dto, {
          headers: this.getForwardHeaders(req),
        }),
      );
      return response?.data;
    } catch (error) {
      this.rethrowAxios(error);
    }
  }
  
  @Post(':id/resend')
  async resend(@Param('id') id: string, @Req() req: Request) {
    try {
      const response = await lastValueFrom(
        this.httpService.post(`${this.invitationsBaseUrl}/invitations/${id}/resend`, {}, {
          headers: this.getForwardHeaders(req),
        }),
      );
      return response?.data;
    } catch (error) {
      this.rethrowAxios(error);
    }
  }

  @Delete(':id/cancel')
  async cancel(@Param('id') id: string, @Req() req: Request) {
    try {
      const response = await lastValueFrom(
        this.httpService.delete(`${this.invitationsBaseUrl}/invitations/${id}/cancel`, {
          headers: this.getForwardHeaders(req),
        }),
      );
      return response?.data;
    } catch (error) {
      this.rethrowAxios(error);
    }
  }

}
