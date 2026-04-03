import {
  Body,
  Controller,
  Get,
  HttpException,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Req,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { HttpService } from '@nestjs/axios';
import { memoryStorage } from 'multer';
import FormData from 'form-data';
import { Request } from 'express';
import { Public } from '@libs/auth';
import { servicesConfig } from '../services-config';
import axios from 'axios';

@Controller('talent')
export class TalentController {
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
  @UseInterceptors(
    FileInterceptor('avatar', {
      storage: memoryStorage(),
    }),
  )
  async createTalent(
    @Req() req: Request,
    @Body() body: Record<string, any>,
    @UploadedFile() avatar?: Express.Multer.File,
  ) {
    try {
      const form = new FormData();

      Object.entries(body ?? {}).forEach(([key, value]) => {
        if (value === undefined || value === null) return;
        if (Array.isArray(value)) {
          value.forEach((item) => form.append(key, String(item)));
          return;
        }
        if (typeof value === 'object') {
          form.append(key, JSON.stringify(value));
          return;
        }
        form.append(key, String(value));
      });

      if (avatar) {
        form.append('avatar', avatar.buffer, {
          filename: avatar.originalname,
          contentType: avatar.mimetype,
        });
      }

      const response = await this.httpService.axiosRef.post(
        `${this.userBaseUrl}/talent`,
        form,
        {
          headers: {
            ...form.getHeaders(),
            Authorization: req.headers.authorization ?? '',
          },
          maxBodyLength: Infinity,
        },
      );

      return response.data;
    } catch (error) {
      this.rethrowAxios(error);
    }
  }

  @Public()
  @Get('users/:username')
  async getTalentUser(@Param('username') username: string, @Req() req: Request) {
    const res = await this.httpService.axiosRef.get(
      `${this.userBaseUrl}/talent/users/${username}`,
      { headers: { Authorization: req.headers.authorization ?? '' } },
    );
    return res.data;
  }

}
