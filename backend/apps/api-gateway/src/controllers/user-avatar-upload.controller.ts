import {
  BadGatewayException,
  Controller,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
  Req,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { HttpService } from '@nestjs/axios'
import { ConfigService } from '@nestjs/config'
import { memoryStorage } from 'multer'
import * as FormDataPkg from 'form-data'
import { Request, Response } from 'express'
import { AxiosError } from 'axios'

/**
 * Handles POST /user/me/avatar with multipart file upload. The catch-all
 * proxy can't forward multipart bodies, so this controller parses the upload
 * and re-forwards it to user-service as FormData.
 */
@Controller('user')
export class UserAvatarUploadController {
  private readonly logger = new Logger(UserAvatarUploadController.name)
  private readonly userServiceUrl: string

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {
    this.userServiceUrl = (
      config.get('USER_SERVICE_URL') || 'http://localhost:3002'
    ).replace(/\/$/, '')
  }

  @Post('me/avatar')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  async uploadAvatar(
    @Req() req: Request,
    @Res() res: Response,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (!file) {
      res.status(HttpStatus.BAD_REQUEST).json({
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Avatar file is required',
      })
      return
    }

    const FormDataCtor: any =
      (FormDataPkg as any).default ?? (FormDataPkg as any)
    const form = new FormDataCtor()
    form.append('file', file.buffer, {
      filename: file.originalname,
      contentType: file.mimetype,
    })

    const headers: Record<string, string> = { ...form.getHeaders() }
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
        `${this.userServiceUrl}/user/me/avatar`,
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
      this.logger.error(`Avatar upload proxy error: ${axiosErr.message}`)
      throw new BadGatewayException({
        code: 'BAD_GATEWAY',
        message: 'The upstream user-service is temporarily unavailable.',
      })
    }
  }
}
