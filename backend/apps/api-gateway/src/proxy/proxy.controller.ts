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
  'browsing-history': 'browsingHistory',
  portfolio: 'portfolio',
  'case-studies': 'portfolio',  // portfolio-service's case-study builder API
  media: 'portfolio',           // portfolio-service's R2 presigned media upload/delete
  invitations: 'invitations',
  companies: 'users',           // company + roster CRUD lives in user-service
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
  'manual-time': 'timeTracking', // time-tracking-service manual-time entries — was
                                  // missing entirely, so GET/POST /manual-time always 404'd
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
  resume: 'users',                  // resume upload/parse lives in user-service
  'dashboard-tasks': 'users',       // personal to-do tasks live in user-service
  privacy: 'users',                  // privacy settings live in user-service
  'identity-verification': 'identityVerification',
  location: 'location',              // location-service: IP/GPS resolution
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

  // Reports migrations that exist in the image but were never applied. Three
  // sat unapplied for an unknown period because the oldest failed and stopped
  // the rest, while the deploy still reported success. Nothing surfaced that
  // until an endpoint started returning 500, so the watchdog now asks here.
  @Get('health/migrations')
  async migrationsHealth() {
    const { Client } = await import('pg')
    const fs = await import('fs')
    const path = await import('path')

    const schemaFor: Record<string, string> = {
      'listings-service': 'listings',
      'user-service': 'user_service',
      'messaging-service': 'messaging',
      'time-tracking-service': 'time_tracking',
    }

    const client = new Client({
      connectionString: process.env.DATABASE_URL,
      ssl:
        (process.env.DATABASE_SSL ?? 'false').toLowerCase() === 'true'
          ? { rejectUnauthorized: false }
          : false,
    })

    const services: Array<{ service: string; pending: string[] }> = []

    try {
      await client.connect()

      for (const [service, schema] of Object.entries(schemaFor)) {
        const dir = path.join(__dirname, '..', '..', service, 'migrations')
        if (!fs.existsSync(dir)) continue

        const files = fs
          .readdirSync(dir)
          .filter((f) => f.endsWith('.js') && /^\d+-/.test(f))

        let applied = new Set<string>()
        try {
          const rows = await client.query(
            `select name from "${schema}".migrations`,
          )
          applied = new Set(rows.rows.map((r: any) => r.name))
        } catch {
          continue // no migrations table for this schema yet
        }

        // The recorded name is the migration's class name, which does not
        // always match the filename: 1776457086364-add-slug-column.js holds
        // class AddSlugColumn1776457086364. Deriving it from the filename
        // reports migrations as pending when they have already run.
        const pending = files
          .map((f) => {
            try {
              const body = fs.readFileSync(path.join(dir, f), 'utf8')
              const m =
                body.match(/exports\.(\w+)\s*=/) ?? body.match(/class\s+(\w+)/)
              return m ? m[1] : ''
            } catch {
              return ''
            }
          })
          .filter((name) => name && !applied.has(name))

        if (pending.length) services.push({ service, pending })
      }
    } catch (err: any) {
      return {
        status: 'error',
        message: err?.message ?? 'migration check failed',
      }
    } finally {
      await client.end().catch(() => undefined)
    }

    const pending = services.reduce((n, s) => n + s.pending.length, 0)
    return { status: pending ? 'pending' : 'ok', pending, services }
  }

  @Get('services/debug')
  async servicesDebug() {
    try {
      const resp = await firstValueFrom(
        this.http.get('http://127.0.0.1:9999/services/debug', { timeout: 5000 }),
      )
      return resp.data
    } catch {
      return { error: 'boot-all debug endpoint not available' }
    }
  }

  @Get('services/health')
  async servicesHealth() {
    const serviceUrls: Record<string, string> = {
      'auth-service': process.env.AUTH_SERVICE_URL || 'http://localhost:3001',
      'user-service': process.env.USER_SERVICE_URL || 'http://localhost:3002',
      'listings-service': process.env.LISTINGS_SERVICE_URL || 'http://localhost:3004',
      'messaging-service': process.env.MESSAGING_SERVICE_URL || 'http://localhost:3005',
      'notification-service': process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3006',
      'search-service': process.env.SEARCH_SERVICE_URL || 'http://localhost:3007',
      'algolia-service': process.env.ALGOLIA_SERVICE_URL || 'http://localhost:3008',
      'checkout-service': process.env.CHECKOUT_SERVICE_URL || 'http://localhost:3009',
      'contracts-service': process.env.CONTRACTS_SERVICE_URL || 'http://localhost:3010',
      'offer-service': process.env.OFFER_SERVICE_URL || 'http://localhost:3011',
      'favorites-service': process.env.FAVORITES_SERVICE_URL || 'http://localhost:3012',
      'browsing-history-service': process.env.BROWSING_HISTORY_SERVICE_URL || 'http://localhost:3034',
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
      'earnings-service': process.env.EARNINGS_SERVICE_URL || 'http://localhost:3026',
      'payout-service': process.env.PAYOUT_SERVICE_URL || 'http://localhost:3028',
      'pricing-service': process.env.PRICING_SERVICE_URL || 'http://localhost:3029',
      'wallet-service': process.env.WALLET_SERVICE_URL || 'http://localhost:3030',
      'wire-review-service': process.env.WIRE_REVIEW_SERVICE_URL || 'http://localhost:3031',
      'legal-service': process.env.LEGAL_SERVICE_URL || 'http://localhost:3032',
      // boot-all.js runs this on 3033 and sets RESUME_PARSING_SERVICE_URL to match;
      // the 3028 default is the ecosystem.config.js port used by local PM2.
      'resume-parsing-service': process.env.RESUME_PARSING_SERVICE_URL || 'http://localhost:3028',
      'location-service': process.env.LOCATION_SERVICE_URL || 'http://localhost:3036',
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

    // /v1/companies/:companyId/invitations belongs to invitations-service
    // (company-invitations.controller.ts is mounted at exactly that path),
    // while every other /v1/companies/* route belongs to user-service's
    // @Controller('companies'). Computed once so service selection below and
    // the /v1-strip further down cannot disagree.
    const isCompanyInvitationsPath =
      segments[0] === 'v1' && segments[1] === 'companies' && segments[3] === 'invitations'

    // /v1/users/* → user-service
    // /v1/projects/* or /v1/services/* → listings-service
    // /v1/transactions/* or /v1/invoices/* → transaction-service (default for v1)
    if (prefix === 'v1' && segments[1] === 'invitations') {
      // invitations-service mounts @Controller(['invitations', 'v1/invitations']),
      // so the path forwards verbatim, with no /v1 strip. Without this branch,
      // /v1/invitations/* silently fell through to the 'v1' default
      // (transaction-service) and 404'd, breaking accept/list/preview/
      // resend/cancel, the entire invitation flow the frontend uses.
      prefix = 'invitations'
    } else if (isCompanyInvitationsPath) {
      // Must be tested before the generic /v1/companies branch below.
      prefix = 'invitations'
    } else if (prefix === 'v1' && segments[1] === 'companies') {
      prefix = 'companies'
    } else if (prefix === 'v1' && segments[1] === 'users') {
      prefix = 'users'
    } else if (prefix === 'v1' && USER_SERVICE_V1_RESOURCES.has(segments[1])) {
      prefix = 'users'
    } else if (
      prefix === 'v1' &&
      (segments[1] === 'projects' ||
        segments[1] === 'services' ||
        segments[1] === 'recently-viewed' ||
        segments[1] === 'my-teams')
    ) {
      prefix = 'listings'
    } else if (prefix === 'v1' && (segments[1] === 'threads' || segments[1] === 'messages')) {
      prefix = 'messages'
    } else if (prefix === 'v1' && segments[1] === 'notifications') {
      prefix = 'notifications'
    } else if (prefix === 'v1' && segments[1] === 'payouts') {
      prefix = 'payouts'
    } else if (prefix === 'v1' && segments[1] === 'earnings') {
      // Without this branch, /v1/earnings/* silently fell through to the 'v1'
      // default (transaction-service) instead of earnings-service.
      prefix = 'earnings'
    } else if (prefix === 'v1' && segments[1] === 'checkout') {
      // checkout-service's controller is @Controller("v1/checkout"), so it
      // expects the full /v1/checkout/... path unchanged. Without this
      // branch, /v1/checkout/* silently fell through to the 'v1' default
      // (transaction-service) and 404'd — every CheckoutAPI call from the
      // frontend (session, wallet balance, gift cards, status, cancel) was
      // broken through the gateway.
      prefix = 'checkout'
    } else if (prefix === 'v1' && (segments[1] === 'deposit-methods')) {
      prefix = 'deposit-methods'
    } else if (prefix === 'v1' && segments[1] === 'oauth') {
      // /v1/oauth/:provider/callback (Wise OAuth redirect
      // target) lives in payout-service. Without this branch it silently
      // fell through to the 'v1' default (transaction-service) and 404'd,
      // so the OAuth callback that actually persists tokens never ran.
      prefix = 'payouts'
    } else if (prefix === 'v1' && segments[1] === 'webhooks') {
      // /v1/webhooks/stripe and /v1/webhooks/ramp both live in payout-service.
      // Without this branch these silently fell through to the 'v1' default
      // (transaction-service) instead of payout-service — external providers
      // hitting the public webhook URL would never reach the real handler.
      prefix = 'payouts'
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
    } else if (prefix === 'v1' && segments[1] === 'identity-verification') {
      // identity-verification-service's controller is @Controller('v1/identity-verification'),
      // so — like checkout-service — it expects the full /v1/identity-verification/...
      // path unchanged. Without this branch, /v1/identity-verification/* silently
      // fell through to the 'v1' default (transaction-service) and 404'd.
      prefix = 'identity-verification'
    } else if (prefix === 'v1' && segments[1] === 'job-listings') {
      // /v1/job-listings and /v1/job-listings/:id/phases live in
      // listings-service. Without this branch they fell through to the 'v1'
      // default (transaction-service) and 404'd, so every job listing read and
      // write through the gateway failed — job creation, the listing context
      // the invite talent screen loads, and sending invites.
      prefix = 'publish'
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
    // user-service's companies.controller.ts is @Controller('companies') with
    // no global prefix, so /v1/companies/... must lose its /v1 exactly like
    // /v1/users/... does. The company-scoped invitations sub-route is
    // excluded. It goes to invitations-service, whose controller IS mounted
    // at v1/companies/:companyId/invitations and would 404 on a stripped path.
    if (segments[0] === 'v1' && segments[1] === 'companies' && !isCompanyInvitationsPath) {
      downstreamPath = '/' + segments.slice(1).join('/')
    }
    if (serviceName === 'checkout' && segments[0] === 'checkout') {
      downstreamPath = '/' + segments.slice(1).join('/')
    }
    if (serviceName === 'categories') {
      downstreamPath = `/api${downstreamPath}`
    }
    // earnings-service sets a global 'v1' prefix, so its real routes are
    // /v1/earnings/... — matching the incoming path already; no rewrite needed
    // here (the previous `/v1${downstreamPath}` rewrite doubled it to /v1/v1/...).
    if (req.url.includes('?')) {
      downstreamPath += '?' + req.url.split('?').slice(1).join('?')
    }
    const user = (req as any).user

    await this.proxy.forward(serviceName, downstreamPath, req, res, user)
  }
}
