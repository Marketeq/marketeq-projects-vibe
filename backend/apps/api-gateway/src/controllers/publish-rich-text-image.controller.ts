import {
  BadGatewayException,
  BadRequestException,
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

@Controller('publish')
export class PublishRichTextImageController {
  private readonly logger = new Logger(PublishRichTextImageController.name)
  private readonly listingsServiceUrl: string

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {
    this.listingsServiceUrl = (
      config.get('LISTINGS_SERVICE_URL') || 'http://localhost:3004'
    ).replace(/\/$/, '')
  }

  @Post('rich-text-image')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  async uploadRichTextImage(
    @Req() req: Request,
    @Res() res: Response,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('Image file is required')
    }

    if (!file.mimetype.startsWith('image/')) {
      throw new BadRequestException('Only image uploads are supported')
    }

    const FormDataCtor: any =
      (FormDataPkg as any).default ?? (FormDataPkg as any)
    const form = new FormDataCtor()
    form.append('file', file.buffer, {
      filename: file.originalname,
      contentType: file.mimetype,
    })

    const headers: Record<string, string> = { ...form.getHeaders() }
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
        `${this.listingsServiceUrl}/v1/media/upload`,
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
      this.logger.error(`Rich text image proxy error: ${axiosErr.message}`)
      throw new BadGatewayException({
        code: 'BAD_GATEWAY',
        message: 'The upstream listings-service is temporarily unavailable.',
      })
    }
  }
}
