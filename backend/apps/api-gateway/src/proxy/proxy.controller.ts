import { Controller, All, Req, Res, Get, ForbiddenException } from '@nestjs/common'
import { Request, Response } from 'express'
import { HttpService } from '@nestjs/axios'
import { firstValueFrom } from 'rxjs'
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
  internal: 'listings',          // internal seed/sync endpoints live in listings-service
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
  public: 'users',               // public talent profiles live in user-service
  admin: 'admin',
  'affiliate-referral': 'affiliateReferral',
  billing: 'billing',
  earnings: 'earnings',
  payouts: 'payouts',
  'deposit-methods': 'payouts',   // payout-service handles deposit methods
  pricing: 'pricing',
  rates: 'pricing',               // pricing-service rates endpoints
  currency: 'pricing',            // pricing-service currency endpoints
  budget: 'pricing',              // pricing-service budget endpoints
  wallet: 'wallet',
  'wire-transfer': 'wireReview',
  'wire-review': 'wireReview',
  offers: 'offers',                // offer-service offer management
  'counter-offers': 'offers',     // offer-service counter-offer endpoints
  legal: 'legal',                  // legal-service NDA, documents, acceptance
  nda: 'legal',                    // legal-service NDA endpoints
}

const USER_SERVICE_V1_RESOURCES = new Set([
  'experiences',
  'education',
  'languages',
  'certifications',
  'industries',
  'portfolio',
  'skills',
])

@Controller()
export class ProxyController {
  private static readonly VARIANT_MAX_LENGTH = 64
  private static readonly VARIANT_PATTERN = /^[a-zA-Z0-9_-]+$/

  constructor(
    private readonly proxy: ProxyService,
    private readonly homepageService: HomepageService,
    private readonly http: HttpService,
  ) {}

  @Get('health')
  health() {
    return { status: 'ok', service: 'api-gateway', timestamp: new Date().toISOString() }
  }

  @Get('ready')
  ready() {
    return { status: 'ready' }
  }

  @Get('services/health')
  async servicesHealth() {
    const serviceUrls: Record<string, string> = {
      'auth-service': process.env.AUTH_SERVICE_URL || 'http://localhost:3001',
      'user-service': process.env.USER_SERVICE_URL || 'http://localhost:3002',
      'listings-service': process.env.LISTINGS_SERVICE_URL || 'http://localhost:3003',
      'messaging-service': process.env.MESSAGING_SERVICE_URL || 'http://localhost:3005',
      'notification-service': process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3006',
      'search-service': process.env.SEARCH_SERVICE_URL || 'http://localhost:3007',
      'algolia-service': process.env.ALGOLIA_SERVICE_URL || 'http://localhost:3008',
      'checkout-service': process.env.CHECKOUT_SERVICE_URL || 'http://localhost:3009',
      'contracts-service': process.env.CONTRACTS_SERVICE_URL || 'http://localhost:3010',
      'offer-service': process.env.OFFER_SERVICE_URL || 'http://localhost:3011',
      'favorites-service': process.env.FAVORITES_SERVICE_URL || 'http://localhost:3012',
      'invitations-service': process.env.INVITATIONS_SERVICE_URL || 'http://localhost:3013',
      'content-moderation-service': process.env.MODERATION_SERVICE_URL || 'http://localhost:3014',
      'portfolio-service': process.env.PORTFOLIO_SERVICE_URL || 'http://localhost:3015',
      'autocomplete-service': process.env.AUTOCOMPLETE_SERVICE_URL || 'http://localhost:3016',
      'time-tracking-service': process.env.TIME_TRACKING_SERVICE_URL || 'http://localhost:3017',
      'transaction-service': process.env.TRANSACTION_SERVICE_URL || 'http://localhost:3018',
      'suggestions-service': process.env.SUGGESTIONS_SERVICE_URL || 'http://localhost:3020',
      'category-service': process.env.CATEGORY_SERVICE_URL || 'http://localhost:3023',
      'admin-service': process.env.ADMIN_SERVICE_URL || 'http://localhost:3024',
      'affiliate-referral-service': process.env.AFFILIATE_REFERRAL_SERVICE_URL || 'http://localhost:3025',
      'billing-service': process.env.BILLING_SERVICE_URL || 'http://localhost:3026',
      'earnings-service': process.env.EARNINGS_SERVICE_URL || 'http://localhost:3027',
      'payout-service': process.env.PAYOUT_SERVICE_URL || 'http://localhost:3028',
      'pricing-service': process.env.PRICING_SERVICE_URL || 'http://localhost:3029',
      'wallet-service': process.env.WALLET_SERVICE_URL || 'http://localhost:3030',
      'wire-review-service': process.env.WIRE_REVIEW_SERVICE_URL || 'http://localhost:3031',
      'legal-service': process.env.LEGAL_SERVICE_URL || 'http://localhost:3032',
    }

    const results: Record<string, { status: string; code: number }> = {}
    const checks = Object.entries(serviceUrls).map(async ([name, url]) => {
      try {
        const resp = await firstValueFrom(
          this.http.get(`${url}/health`, { timeout: 3000, validateStatus: () => true }),
        )
        results[name] = { status: 'healthy', code: resp.status }
      } catch {
        results[name] = { status: 'down', code: 0 }
      }
    })

    await Promise.all(checks)

    const healthy = Object.values(results).filter((r) => r.status === 'healthy').length
    const total = Object.keys(results).length
    return {
      overall: healthy === total ? 'healthy' : 'degraded',
      healthy,
      total,
      uptimePercent: ((healthy / total) * 100).toFixed(1),
      timestamp: new Date().toISOString(),
      services: results,
    }
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
    } else if (prefix === 'v1' && USER_SERVICE_V1_RESOURCES.has(segments[1])) {
      prefix = 'users'
    } else if (prefix === 'v1' && (segments[1] === 'projects' || segments[1] === 'services')) {
      prefix = 'listings'
    } else if (prefix === 'v1' && (segments[1] === 'threads' || segments[1] === 'messages')) {
      prefix = 'messages'
    } else if (prefix === 'v1' && segments[1] === 'notifications') {
      prefix = 'notifications'
    } else if (prefix === 'v1' && segments[1] === 'payouts') {
      prefix = 'payouts'
    } else if (prefix === 'v1' && (segments[1] === 'deposit-methods')) {
      prefix = 'deposit-methods'
    } else if (prefix === 'v1' && segments[1] === 'offers') {
      prefix = 'offers'
    } else if (prefix === 'v1' && segments[1] === 'counter-offers') {
      prefix = 'counter-offers'
    } else if (prefix === 'v1' && segments[1] === 'rates') {
      prefix = 'rates'
    } else if (prefix === 'v1' && segments[1] === 'currency') {
      prefix = 'currency'
    } else if (prefix === 'v1' && segments[1] === 'budget') {
      prefix = 'budget'
    } else if (prefix === 'v1' && ['nda', 'acceptance', 'legal-documents'].includes(segments[1])) {
      prefix = 'legal'
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
    if (
      segments[0] === 'v1' &&
      (segments[1] === 'users' || USER_SERVICE_V1_RESOURCES.has(segments[1]))
    ) {
      downstreamPath = '/' + segments.slice(1).join('/')
    }
    if (serviceName === 'checkout' && segments[0] === 'checkout') {
      downstreamPath = '/' + segments.slice(1).join('/')
    }
    if (serviceName === 'categories') {
      downstreamPath = `/api${downstreamPath}`
    }
    if (serviceName === 'earnings') {
      downstreamPath = `/v1${downstreamPath}`
    }
    if (req.url.includes('?')) {
      downstreamPath += '?' + req.url.split('?').slice(1).join('?')
    }
    const user = (req as any).user

    await this.proxy.forward(serviceName, downstreamPath, req, res, user)
  }
}
