import {
  Controller,
  Post,
  Req,
  Res,
  Body,
  UploadedFiles,
  UseInterceptors,
  Logger,
  BadGatewayException,
} from '@nestjs/common'
import { FileFieldsInterceptor } from '@nestjs/platform-express'
import { HttpService } from '@nestjs/axios'
import { ConfigService } from '@nestjs/config'
import { memoryStorage } from 'multer'
import FormData from 'form-data'
import { Request, Response } from 'express'
import { AxiosError } from 'axios'

/**
 * Handles POST /publish/media with multipart file uploads
 * (featuredImage + additionalImages).
 * The catch-all proxy can't forward multipart bodies properly,
 * so this controller parses uploads and re-forwards as FormData.
 */
@Controller('publish')
export class PublishMediaController {
  private readonly logger = new Logger(PublishMediaController.name)
  private readonly listingsServiceUrl: string

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {
    this.listingsServiceUrl = (
      config.get('LISTINGS_SERVICE_URL') || 'http://localhost:3003'
    ).replace(/\/$/, '')
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
    @Res() res: Response,
    @Body() body: Record<string, any>,
    @UploadedFiles()
    files: {
      featuredImage?: Express.Multer.File[]
      additionalImages?: Express.Multer.File[]
    },
  ) {
    const form = new FormData()

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

    const featuredImage = files?.featuredImage?.[0]
    if (featuredImage) {
      form.append('featuredImage', featuredImage.buffer, {
        filename: featuredImage.originalname,
        contentType: featuredImage.mimetype,
      })
    }

    const additionalImages = files?.additionalImages ?? []
    additionalImages.forEach((file) => {
      form.append('additionalImages', file.buffer, {
        filename: file.originalname,
        contentType: file.mimetype,
      })
    })

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
        `${this.listingsServiceUrl}/publish/media`,
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
      this.logger.error(`Publish media proxy error: ${axiosErr.message}`)
      throw new BadGatewayException({
        code: 'BAD_GATEWAY',
        message: 'The upstream listings-service is temporarily unavailable.',
      })
    }
  }
}
