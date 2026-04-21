import { Controller, All, Req, Res, Get } from '@nestjs/common'
import { Request, Response } from 'express'
import { ProxyService } from './proxy.service'

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
}

@Controller()
export class ProxyController {
  constructor(private readonly proxy: ProxyService) {}

  @Get('health')
  health() {
    return { status: 'ok', service: 'api-gateway', timestamp: new Date().toISOString() }
  }

  @Get('ready')
  ready() {
    return { status: 'ready' }
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
    if (req.url.includes('?')) {
      downstreamPath += '?' + req.url.split('?').slice(1).join('?')
    }
    const user = (req as any).user

    await this.proxy.forward(serviceName, downstreamPath, req, res, user)
  }
}
