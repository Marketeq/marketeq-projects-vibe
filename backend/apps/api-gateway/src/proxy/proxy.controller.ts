import { Controller, All, Req, Res, Get, ForbiddenException } from '@nestjs/common'
import { Request, Response } from 'express'
import { ProxyService } from './proxy.service'
import { HomepageService } from '../homepage/homepage.service'

const SERVICE_PREFIX_MAP: Record<string, string> = {
  auth: 'auth',
  user: 'users',
  users: 'users',
  listings: 'listings',
  checkout: 'checkout',
  messages: 'messages',
  messaging: 'messages',
  'user-keys': 'users',
  devices: 'users',
  notifications: 'notifications',
  search: 'search',
  algolia: 'algolia',
  favorites: 'favorites',
  portfolio: 'portfolio',
  invitations: 'invitations',
  moderation: 'moderation',
  autocomplete: 'autocomplete',
  suggestions: 'suggestions',
  'v1': 'transactions', // transaction-service uses /v1/transactions and /v1/invoices
  contracts: 'contracts',
  client: 'users',              // client onboarding profile lives in user-service
  talent: 'users',              // talent profiles live in user-service
  publish: 'listings',          // project publish workflow lives in listings-service
  teams: 'users',               // team management lives in user-service
  'affiliated-teams': 'users',  // affiliated teams lives in user-service
  categories: 'categories',      // category taxonomy service
  tags: 'categories',            // tags managed by category-service
  'category-pages': 'categories', // category page assembly
  tasks: 'timeTracking',          // time-tracking-service contract task endpoints
  screenshots: 'timeTracking',   // time-tracking-service screenshot endpoints
  'time-tracking': 'timeTracking', // time-tracking-service general endpoints
  sessions: 'timeTracking',      // time-tracking-service session endpoints
  metadata: 'timeTracking',      // time-tracking-service metadata/tooltips
}

@Controller()
export class ProxyController {
  private static readonly VARIANT_MAX_LENGTH = 64
  private static readonly VARIANT_PATTERN = /^[a-zA-Z0-9_-]+$/

  constructor(
    private readonly proxy: ProxyService,
    private readonly homepageService: HomepageService,
  ) {}

  @Get('health')
  health() {
    return { status: 'ok', service: 'api-gateway', timestamp: new Date().toISOString() }
  }

  @Get('ready')
  ready() {
    return { status: 'ready' }
  }

  @Get('homepage')
  async homepage(@Req() req: Request) {
    return this.getHomepagePayload(req)
  }

  @Get('api/homepage')
  async apiHomepage(@Req() req: Request) {
    return this.getHomepagePayload(req)
  }

  @Get('v1/homepage')
  async v1Homepage(@Req() req: Request) {
    return this.getHomepagePayload(req)
  }

  @Get('homepage/health')
  async homepageHealth() {
    return this.homepageService.healthCheck()
  }

  @Get('api/homepage/health')
  async apiHomepageHealth() {
    return this.homepageService.healthCheck()
  }

  @Get('v1/homepage/health')
  async v1HomepageHealth() {
    return this.homepageService.healthCheck()
  }

  private async getHomepagePayload(req: Request) {
    const rawVariant = (req as any).cookies?.mktq_hp_variant as string | undefined
    const preview = typeof req.query.preview === 'string' ? req.query.preview : undefined
    const previewToken = req.headers['x-preview-token']
    const previewTokenValue =
      typeof previewToken === 'string' ? previewToken : Array.isArray(previewToken) ? previewToken[0] : undefined

    let variant: string | undefined
    if (
      rawVariant &&
      rawVariant.length <= ProxyController.VARIANT_MAX_LENGTH &&
      ProxyController.VARIANT_PATTERN.test(rawVariant)
    ) {
      variant = rawVariant
    }

    if (preview === '1' && !previewTokenValue) {
      throw new ForbiddenException('Invalid or missing preview token')
    }

    return this.homepageService.getHomepage({
      variant,
      preview: preview === '1',
      previewToken: previewTokenValue,
    })
  }

  @All('*')
  async catchAll(@Req() req: Request, @Res() res: Response) {
    // Strip a leading "/api" so /api/auth/login and /auth/login both route
    // to the same downstream service. Frontend uses both forms.
    const normalizedPath = req.path.replace(/^\/api(?=\/|$)/, '') || '/'
    const segments = normalizedPath.replace(/^\//, '').split('/')
    let prefix = segments[0]

    // /v1/users/* → user-service
    // /v1/projects/* or /v1/services/* → listings-service
    // /v1/transactions/* or /v1/invoices/* → transaction-service (default for v1)
    if (prefix === 'v1' && segments[1] === 'users') {
      prefix = 'users'
    } else if (prefix === 'v1' && (segments[1] === 'projects' || segments[1] === 'services')) {
      prefix = 'listings'
    } else if (prefix === 'v1' && (segments[1] === 'threads' || segments[1] === 'messages')) {
      prefix = 'messages'
    } else if (prefix === 'v1' && segments[1] === 'notifications') {
      prefix = 'notifications'
    }

    const serviceName = SERVICE_PREFIX_MAP[prefix]

    if (!serviceName) {
      res.status(404).json({ code: 'NOT_FOUND', message: `No service mapped for path: ${req.path}` })
      return
    }

    // Build downstream path from the normalized (api-stripped) path so
    // downstream services receive /auth/login, not /api/auth/login.
    // Strip /v1/ only for user-service — its controllers are mounted at /users.
    // listings-service controllers are mounted at /v1/projects and /v1/services,
    // so we forward the full /v1/... path unchanged.
    let downstreamPath = normalizedPath
    if (segments[0] === 'v1' && segments[1] === 'users') {
      downstreamPath = '/' + segments.slice(1).join('/')
    }
    if (serviceName === 'categories') {
      downstreamPath = `/api${downstreamPath}`
    }
    if (req.url.includes('?')) {
      downstreamPath += '?' + req.url.split('?').slice(1).join('?')
    }
    const user = (req as any).user

    await this.proxy.forward(serviceName, downstreamPath, req, res, user)
  }
}
