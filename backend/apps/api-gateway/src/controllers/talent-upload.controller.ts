import {
  Controller,
  Post,
  Req,
  Res,
  Body,
  HttpCode,
  HttpStatus,
  UploadedFile,
  UseInterceptors,
  Logger,
  BadGatewayException,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { HttpService } from '@nestjs/axios'
import { ConfigService } from '@nestjs/config'
import { memoryStorage } from 'multer'
import * as FormDataPkg from 'form-data'
import { Request, Response } from 'express'
import { AxiosError } from 'axios'

/**
 * Handles POST /talent with multipart file upload (avatar).
 * The catch-all proxy can't forward multipart bodies properly,
 * so this controller parses the upload and re-forwards as FormData.
 */
@Controller('talent')
export class TalentUploadController {
  private readonly logger = new Logger(TalentUploadController.name)
  private readonly userServiceUrl: string

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {
    this.userServiceUrl = (
      config.get('USER_SERVICE_URL') || 'http://localhost:3002'
    ).replace(/\/$/, '')
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(
    FileInterceptor('avatar', { storage: memoryStorage() }),
  )
  async createTalent(
    @Req() req: Request,
    @Res() res: Response,
    @Body() body: Record<string, any>,
    @UploadedFile() avatar?: Express.Multer.File,
  ) {
    const FormDataCtor: any =
      (FormDataPkg as any).default ?? (FormDataPkg as any)
    const form = new FormDataCtor()

    Object.entries(body ?? {}).forEach(([key, value]) => {
      if (value === undefined || value === null) return
      if (Array.isArray(value)) {
        value.forEach((item) => form.append(key, String(item)))
        return
      }
      if (typeof value === 'object') {
        form.append(key, JSON.stringify(value))
        return
      }
      form.append(key, String(value))
    })

    if (avatar) {
      form.append('avatar', avatar.buffer, {
        filename: avatar.originalname,
        contentType: avatar.mimetype,
      })
    }

    const headers: Record<string, string> = {
      ...form.getHeaders(),
    }
    if (req.headers.authorization) {
      headers['authorization'] = req.headers.authorization as string
    }
    const user = (req as any).user
    if (user) {
      headers['x-user-id'] = user.userId
      headers['x-user-email'] = user.email
      if (user.role) headers['x-user-role'] = user.role
    }

    try {
      const response = await this.http.axiosRef.post(
        `${this.userServiceUrl}/talent`,
        form,
        {
          headers,
          maxBodyLength: Infinity,
          validateStatus: () => true,
        },
      )
      res.status(response.status).json(response.data)
    } catch (err) {
      const axiosErr = err as AxiosError
      this.logger.error(`Talent upload proxy error: ${axiosErr.message}`)
      throw new BadGatewayException({
        code: 'BAD_GATEWAY',
        message: 'The upstream user-service is temporarily unavailable.',
      })
    }
  }
}
