import { HttpService } from '@nestjs/axios';
import { Body, Controller, Get, Param, Post, Req } from '@nestjs/common';
import { Request } from 'express';
import { servicesConfig } from '../services-config';

@Controller('users')
export class UsersController {
  constructor(private readonly httpService: HttpService) {}

  private get userBaseUrl() {
    return servicesConfig.USER_SERVICE_URL.replace(/\/$/, '');
  }

  @Get(':id')
  async getUserById(@Req() req: Request, @Param('id') id: string) {
    const response = await this.httpService
      .get(`${this.userBaseUrl}/users/${id}`, {
        headers: { Authorization: req.headers.authorization ?? '' },
      })
      .toPromise();
    return response.data;
  }

  @Post(':userId/skills')
  async createSkillForUser(
    @Req() req: Request,
    @Param('userId') userId: string,
    @Body() dto: Record<string, unknown>,
  ) {
    const response = await this.httpService
      .post(`${this.userBaseUrl}/users/${userId}/skills`, dto, {
        headers: { Authorization: req.headers.authorization ?? '' },
      })
      .toPromise();
    return response.data;
  }

  @Post(':userId/experience')
  async createExperienceForUser(
    @Req() req: Request,
    @Param('userId') userId: string,
    @Body() dto: Record<string, unknown>,
  ) {
    const response = await this.httpService
      .post(`${this.userBaseUrl}/users/${userId}/experience`, dto, {
        headers: { Authorization: req.headers.authorization ?? '' },
      })
      .toPromise();
    return response.data;
  }
}
