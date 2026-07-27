import {
  Controller,
  Post,
  Req,
  Res,
  UploadedFile,
  UseInterceptors,
  Logger,
  BadGatewayException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { HttpService } from '@nestjs/axios'
import { ConfigService } from '@nestjs/config'
import { memoryStorage } from 'multer'
import * as FormDataPkg from 'form-data'
import { Request, Response } from 'express'
import { AxiosError } from 'axios'

/**
 * Handles POST /resume/upload with multipart file upload.
 * The catch-all proxy can't forward multipart bodies properly,
 * so this controller parses the upload and re-forwards as FormData.
 */
@Controller('resume')
export class ResumeUploadController {
  private readonly logger = new Logger(ResumeUploadController.name)
  private readonly userServiceUrl: string

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {
    this.userServiceUrl = (
      config.get('USER_SERVICE_URL') || 'http://localhost:3002'
    ).replace(/\/$/, '')
  }

  @Post('upload')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  async uploadResume(
    @Req() req: Request,
    @Res() res: Response,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    const FormDataCtor: any =
      (FormDataPkg as any).default ?? (FormDataPkg as any)
    const form = new FormDataCtor()

    if (file) {
      form.append('file', file.buffer, {
        filename: file.originalname,
        contentType: file.mimetype,
      })
    }

    const headers: Record<string, string> = {
      ...form.getHeaders(),
    }

    const authHeader = req.headers.authorization as string | undefined
    const cookieToken = (req as any).cookies?.access_token as string | undefined
    if (authHeader) {
      headers['authorization'] = authHeader
    } else if (cookieToken) {
      headers['authorization'] = `Bearer ${cookieToken}`
    }

    const user = (req as any).user
    if (user) {
      headers['x-user-id'] = user.userId
      headers['x-user-email'] = user.email
      if (user.role) headers['x-user-role'] = user.role
    }

    try {
      const response = await this.http.axiosRef.post(
        `${this.userServiceUrl}/resume/upload`,
        form,
        {
          headers,
          maxBodyLength: Infinity,
          validateStatus: () => true,
          timeout: 120000,
        },
      )
      res.status(response.status).json(response.data)
    } catch (err) {
      const axiosErr = err as AxiosError
      this.logger.error(`Resume upload proxy error: ${axiosErr.message}`)
      throw new BadGatewayException({
        code: 'BAD_GATEWAY',
        message: 'The upstream user-service is temporarily unavailable.',
      })
    }
  }
}
