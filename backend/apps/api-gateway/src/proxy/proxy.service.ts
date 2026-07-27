import { Injectable, Logger, BadGatewayException } from '@nestjs/common'
import { HttpService } from '@nestjs/axios'
import { ConfigService } from '@nestjs/config'
import { Request, Response } from 'express'
import { firstValueFrom } from 'rxjs'
import { AxiosRequestConfig, AxiosError, AxiosResponse } from 'axios'

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
      checkout: config.get('CHECKOUT_SERVICE_URL') || 'http://localhost:3009',
      messages: config.get('MESSAGING_SERVICE_URL') || 'http://localhost:3005',
      notifications: config.get('NOTIFICATION_SERVICE_URL') || 'http://localhost:3006',
      search: config.get('SEARCH_SERVICE_URL') || 'http://localhost:3007',
      algolia: config.get('ALGOLIA_SERVICE_URL') || 'http://localhost:3008',
      favorites: config.get('FAVORITES_SERVICE_URL') || 'http://localhost:3012',
      portfolio: config.get('PORTFOLIO_SERVICE_URL') || 'http://localhost:3015',
      invitations: config.get('INVITATIONS_SERVICE_URL') || 'http://localhost:3013',
      moderation: config.get('MODERATION_SERVICE_URL') || 'http://localhost:3014',
      autocomplete: config.get('AUTOCOMPLETE_SERVICE_URL') || 'http://localhost:3016',
      suggestions: config.get('SUGGESTIONS_SERVICE_URL') || 'http://localhost:3020',
      transactions: config.get('TRANSACTION_SERVICE_URL') || 'http://localhost:3018',
      contracts: config.get('CONTRACTS_SERVICE_URL') || 'http://localhost:3010',
      categories: config.get('CATEGORY_SERVICE_URL') || 'http://localhost:3023',
      timeTracking: config.get('TIME_TRACKING_SERVICE_URL') || 'http://localhost:3017',
      admin: config.get('ADMIN_SERVICE_URL') || 'http://localhost:3024',
      affiliateReferral: config.get('AFFILIATE_REFERRAL_SERVICE_URL') || 'http://localhost:3025',
      billing: config.get('BILLING_SERVICE_URL') || 'http://localhost:3026',
      // Defaults matched to ecosystem.config.js's actual assigned ports (earnings-service:3026,
      // payout-service:3022) — the previous 3027/3028 fallbacks didn't correspond to any running
      // service, so gateway-proxied earnings/payouts calls always 502'd unless the env vars
      // happened to be set to override them.
      earnings: config.get('EARNINGS_SERVICE_URL') || 'http://localhost:3026',
      payouts: config.get('PAYOUT_SERVICE_URL') || 'http://localhost:3022',
      pricing: config.get('PRICING_SERVICE_URL') || 'http://localhost:3029',
      wallet: config.get('WALLET_SERVICE_URL') || 'http://localhost:3030',
      wireReview: config.get('WIRE_REVIEW_SERVICE_URL') || 'http://localhost:3031',
      offers: config.get('OFFER_SERVICE_URL') || 'http://localhost:3011',
      legal: config.get('LEGAL_SERVICE_URL') || 'http://localhost:3032',
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

    // These services use a global /api prefix, so re-add it
    const needsApiPrefix = (serviceName === 'timeTracking' || serviceName === 'categories') && !path.startsWith('/api')
    const url = `${baseUrl}${needsApiPrefix ? '/api' : ''}${path}`
    const headers: Record<string, string> = {
      'content-type': req.headers['content-type'] as string || 'application/json',
      ...(req.headers['x-internal-token'] ? { 'x-internal-token': req.headers['x-internal-token'] as string } : {}),
      // Stripe/Ramp webhook signature headers — downstream (payout-service)
      // verifies authenticity via these, not JWT, so they must survive the
      // proxy same as the raw body below (main.ts captures req.rawBody for
      // these exact paths ahead of the global json() parser).
      ...(req.headers['stripe-signature'] ? { 'stripe-signature': req.headers['stripe-signature'] as string } : {}),
      ...(req.headers['x-ramp-signature'] ? { 'x-ramp-signature': req.headers['x-ramp-signature'] as string } : {}),
    }

    // Downstream services (timezone-resolution.service.ts, geo.service.ts's
    // currency detection) do their own IP-geolocation and need the real
    // client IP — without this they only ever see the gateway's own
    // request, which silently breaks that detection with no error anywhere.
    // Preserve any existing x-forwarded-for chain (CDN/load balancer hops)
    // and append this gateway's view of the client, same convention as
    // every other reverse proxy.
    const existingXff = req.headers['x-forwarded-for']
    const xffChain = (Array.isArray(existingXff) ? existingXff.join(',') : existingXff) || ''
    const clientIp = req.ip || req.socket?.remoteAddress || ''
    headers['x-forwarded-for'] = [xffChain, clientIp].filter(Boolean).join(', ')

    // Always forward auth headers so downstream services can validate JWT
    const authHeader = req.headers.authorization as string | undefined
    const cookieToken = (req as any).cookies?.access_token as string | undefined
    // Time-tracking service uses a static bearer token, not JWT
    if (authHeader) {
      headers['authorization'] = authHeader
    } else if (cookieToken) {
      headers['authorization'] = `Bearer ${cookieToken}`
    }

    if (user) {
      headers['x-user-id'] = user.userId
      headers['x-user-email'] = user.email
      if (user.role) headers['x-user-role'] = user.role
    }

    // For multipart/form-data, Express's default body parser leaves the
    // stream untouched, so we must forward the raw request stream. If we
    // instead handed axios the parsed `req.body` (an empty object), Multer
    // on the downstream side errors with "Unexpected end of form".
    const contentType = (req.headers['content-type'] as string) || ''
    const isMultipart = contentType.startsWith('multipart/')

    // main.ts skips the json() parser and captures req.rawBody verbatim for
    // /v1/webhooks/* — forward those exact bytes, not a re-parsed req.body,
    // or Stripe's/Ramp's signature check fails on a byte mismatch.
    const rawBody = (req as any).rawBody as Buffer | undefined

    const config: AxiosRequestConfig = {
      method: req.method as any,
      url,
      headers,
      data: rawBody ?? (isMultipart ? req : req.body),
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
      // Query params are already included in the URL path from the proxy controller
      // Do NOT also set params here — that would duplicate them
      validateStatus: () => true,
      responseType: 'stream',
    }

    try {
      const response: AxiosResponse = await firstValueFrom(this.http.request(config))
      res.status(response.status)
      const skipHeaders = new Set(['transfer-encoding', 'access-control-allow-origin', 'access-control-allow-credentials', 'access-control-allow-methods', 'access-control-allow-headers', 'access-control-expose-headers', 'access-control-max-age'])
      Object.entries(response.headers).forEach(([k, v]) => {
        if (!skipHeaders.has(k)) res.setHeader(k, v as string)
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
