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
 * Handles POST /v1/companies/logo with multipart file upload. The catch-all
 * proxy can't forward multipart bodies, so this controller parses the upload
 * and re-forwards it to user-service as FormData, the same arrangement
 * user-avatar-upload.controller.ts uses, and for the same reason.
 *
 * Registered ahead of ProxyController in api-gateway.module.ts so this
 * explicit route wins over the catch-all.
 */
@Controller('v1/companies')
export class CompanyLogoUploadController {
  private readonly logger = new Logger(CompanyLogoUploadController.name)
  private readonly userServiceUrl: string

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {
    this.userServiceUrl = (
      config.get('USER_SERVICE_URL') || 'http://localhost:3002'
    ).replace(/\/$/, '')
  }

  @Post('logo')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 2 * 1024 * 1024 },
    }),
  )
  async uploadLogo(
    @Req() req: Request,
    @Res() res: Response,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (!file) {
      res.status(HttpStatus.BAD_REQUEST).json({
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Logo file is required',
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
    // Match the catch-all proxy's auth-forwarding rules: prefer an explicit
    // Authorization header but synthesize one from the access_token cookie
    // so cookie-authenticated requests still reach the downstream service.
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
        `${this.userServiceUrl}/companies/logo`,
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
      this.logger.error(`Company logo upload proxy error: ${axiosErr.message}`)
      throw new BadGatewayException({
        code: 'BAD_GATEWAY',
        message: 'The upstream user-service is temporarily unavailable.',
      })
    }
  }
}
