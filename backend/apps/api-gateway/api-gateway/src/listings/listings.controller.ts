import { HttpService } from '@nestjs/axios';
import {
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpException,
  Param,
  Post,
  Put,
  Req,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import FormData from 'form-data';
import axios from 'axios';
import { Request } from 'express';
import { servicesConfig } from '../services-config';

@Controller('publish')
export class ListingsController {
  constructor(private readonly httpService: HttpService) {}

  private get listingsBaseUrl() {
    return servicesConfig.LISTINGS_SERVICE_URL.replace(/\/$/, '');
  }

  private getAuthorization(req: Request): string {
    const authorization = req.headers.authorization;
    if (Array.isArray(authorization)) {
      return authorization[0] ?? '';
    }
    return authorization ?? '';
  }

  private upstreamHeaders(req: Request) {
    return { Authorization: this.getAuthorization(req) };
  }

  private rethrowAxios(error: unknown): never {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status ?? 500;
      const data = error.response?.data ?? {
        message: 'Request to listings-service failed',
      };
      throw new HttpException(data, status);
    }
    throw error;
  }

  @Post('project')
  async createProject(@Req() req: Request, @Body() dto: Record<string, unknown>) {
    try {
      const response = await this.httpService
        .post(`${this.listingsBaseUrl}/publish/project`, dto, {
          headers: this.upstreamHeaders(req),
        })
        .toPromise();
      return response?.data;
    } catch (error) {
      this.rethrowAxios(error);
    }
  }

  @Post('project/:projectId/publish')
  async publishProject(
    @Req() req: Request,
    @Param('projectId') projectId: string,
  ) {
    try {
      const response = await this.httpService
        .post(`${this.listingsBaseUrl}/publish/project/${projectId}/publish`, {}, {
          headers: this.upstreamHeaders(req),
        })
        .toPromise();
      return response?.data;
    } catch (error) {
      this.rethrowAxios(error);
    }
  }

  @Post('phase')
  async createPhase(@Req() req: Request, @Body() dto: Record<string, unknown>) {
    try {
      const response = await this.httpService
        .post(`${this.listingsBaseUrl}/publish/phase`, dto, {
          headers: this.upstreamHeaders(req),
        })
        .toPromise();
      return response?.data;
    } catch (error) {
      this.rethrowAxios(error);
    }
  }

  @Post('phase/:phaseId/duplicate')
  async duplicatePhase(@Req() req: Request, @Param('phaseId') phaseId: string) {
    try {
      const response = await this.httpService
        .post(
          `${this.listingsBaseUrl}/publish/phase/${phaseId}/duplicate`,
          {},
          {
            headers: this.upstreamHeaders(req),
          },
        )
        .toPromise();
      return response?.data;
    } catch (error) {
      this.rethrowAxios(error);
    }
  }

  @Put('phase/update/:phaseId')
  async updatePhase(
    @Req() req: Request,
    @Param('phaseId') phaseId: string,
    @Body() dto: Record<string, unknown>,
  ) {
    try {
      const response = await this.httpService
        .put(`${this.listingsBaseUrl}/publish/phase/update/${phaseId}`, dto, {
          headers: this.upstreamHeaders(req),
        })
        .toPromise();
      return response?.data;
    } catch (error) {
      this.rethrowAxios(error);
    }
  }

  @Delete('phase/delete/:phaseId')
  @HttpCode(204)
  async deletePhase(@Req() req: Request, @Param('phaseId') phaseId: string) {
    try {
      await this.httpService
        .delete(`${this.listingsBaseUrl}/publish/phase/delete/${phaseId}`, {
          headers: this.upstreamHeaders(req),
        })
        .toPromise();
      return;
    } catch (error) {
      this.rethrowAxios(error);
    }
  }

  @Post('task')
  async createTask(@Req() req: Request, @Body() dto: Record<string, unknown>) {
    try {
      const response = await this.httpService
        .post(`${this.listingsBaseUrl}/publish/task`, dto, {
          headers: this.upstreamHeaders(req),
        })
        .toPromise();
      return response?.data;
    } catch (error) {
      this.rethrowAxios(error);
    }
  }

  @Put('task/update/:id')
  async updateTask(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() dto: Record<string, unknown>,
  ) {
    try {
      const response = await this.httpService
        .put(`${this.listingsBaseUrl}/publish/task/update/${id}`, dto, {
          headers: this.upstreamHeaders(req),
        })
        .toPromise();
      return response?.data;
    } catch (error) {
      this.rethrowAxios(error);
    }
  }

  @Post('media')
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'featuredImage', maxCount: 1 },
        { name: 'additionalImages', maxCount: 8 },
      ],
      { storage: memoryStorage() },
    ),
  )
  async uploadMedia(
    @Req() req: Request,
    @Body() body: Record<string, unknown>,
    @UploadedFiles()
    files: {
      featuredImage?: Express.Multer.File[];
      additionalImages?: Express.Multer.File[];
    },
  ) {
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

    const featuredImage = files?.featuredImage?.[0];
    if (featuredImage) {
      form.append('featuredImage', featuredImage.buffer, {
        filename: featuredImage.originalname,
        contentType: featuredImage.mimetype,
      });
    }

    const additionalImages = files?.additionalImages ?? [];
    additionalImages.forEach((file) => {
      form.append('additionalImages', file.buffer, {
        filename: file.originalname,
        contentType: file.mimetype,
      });
    });

    try {
      const response = await this.httpService.axiosRef.post(
        `${this.listingsBaseUrl}/publish/media`,
        form,
        {
          headers: {
            ...form.getHeaders(),
            Authorization: this.getAuthorization(req),
          },
          maxBodyLength: Infinity,
        },
      );
      return response.data;
    } catch (error) {
      this.rethrowAxios(error);
    }
  }
}
