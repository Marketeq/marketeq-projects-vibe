import { Injectable, Logger, BadGatewayException } from '@nestjs/common'
import { HttpService } from '@nestjs/axios'
import { ConfigService } from '@nestjs/config'
import { Request, Response } from 'express'
import { firstValueFrom } from 'rxjs'
import { AxiosRequestConfig, AxiosError } from 'axios'

@Injectable()
export class ProxyService {
  private readonly logger = new Logger(ProxyService.name)

  private readonly serviceMap: Record<string, string>

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {
    this.serviceMap = {
      auth: config.get('AUTH_SERVICE_URL') || 'http://localhost:3001',
      users: config.get('USER_SERVICE_URL') || 'http://localhost:3002',
      listings: config.get('LISTINGS_SERVICE_URL') || 'http://localhost:3003',
      checkout: config.get('CHECKOUT_SERVICE_URL') || 'http://localhost:3004',
      messages: config.get('MESSAGING_SERVICE_URL') || 'http://localhost:3005',
      notifications: config.get('NOTIFICATION_SERVICE_URL') || 'http://localhost:3006',
      search: config.get('SEARCH_SERVICE_URL') || 'http://localhost:3007',
      algolia: config.get('ALGOLIA_SERVICE_URL') || 'http://localhost:3008',
      favorites: config.get('FAVORITES_SERVICE_URL') || 'http://localhost:3009',
      portfolio: config.get('PORTFOLIO_SERVICE_URL') || 'http://localhost:3010',
      invitations: config.get('INVITATIONS_SERVICE_URL') || 'http://localhost:3011',
      moderation: config.get('MODERATION_SERVICE_URL') || 'http://localhost:3012',
      autocomplete: config.get('AUTOCOMPLETE_SERVICE_URL') || 'http://localhost:3013',
      suggestions: config.get('SUGGESTIONS_SERVICE_URL') || 'http://localhost:3014',
      transactions: config.get('TRANSACTION_SERVICE_URL') || 'http://localhost:3016',
    }
  }

  async forward(
    serviceName: string,
    path: string,
    req: Request,
    res: Response,
    user?: { userId: string; email: string; role?: string },
  ): Promise<void> {
    const baseUrl = this.serviceMap[serviceName]
    if (!baseUrl) {
      throw new BadGatewayException({ code: 'BAD_GATEWAY', message: `Unknown service: ${serviceName}` })
    }

    const url = `${baseUrl}${path}`
    const headers: Record<string, string> = {
      'content-type': req.headers['content-type'] as string || 'application/json',
    }

    if (user) {
      headers['x-user-id'] = user.userId
      headers['x-user-email'] = user.email
      if (user.role) headers['x-user-role'] = user.role
      // Also forward Authorization header for services that validate JWT directly
      if (req.headers.authorization) {
        headers['authorization'] = req.headers.authorization as string
      }
    }

    const config: AxiosRequestConfig = {
      method: req.method as any,
      url,
      headers,
      data: req.body,
      params: req.query,
      validateStatus: () => true,
      responseType: 'stream',
    }

    try {
      const response = await firstValueFrom(this.http.request(config))
      res.status(response.status)
      Object.entries(response.headers).forEach(([k, v]) => {
        if (k !== 'transfer-encoding') res.setHeader(k, v as string)
      })
      response.data.pipe(res)
    } catch (err) {
      const axiosErr = err as AxiosError
      this.logger.error(`Proxy error for ${serviceName}${path}: ${axiosErr.message}`)
      throw new BadGatewayException({
        code: 'BAD_GATEWAY',
        message: 'The upstream service is temporarily unavailable.',
      })
    }
  }
}
