/**
 * Gateway rate-limit rules (Security Tasklist, revised, item #5).
 *
 * Every limit here is a default. Each one can be overridden without a code
 * change through RATE_LIMIT_<NAME>_LIMIT and RATE_LIMIT_<NAME>_WINDOW_SEC,
 * where <NAME> is the rule name upper-cased with dashes as underscores
 * (e.g. RATE_LIMIT_AUTH_LOGIN_LIMIT=20).
 *
 * Limits are counted in two places in the middleware chain:
 *   - pre-auth  (before CsrfOriginMiddleware/JwtMiddleware): keyed by client
 *     IP, so anonymous floods and bad-token floods are counted before any
 *     other work is done for them.
 *   - post-auth (after JwtMiddleware): keyed by the verified user id, so
 *     people who share an IP (an office, Vercel server-side rendering) are
 *     counted separately. Falls back to the IP when there is no user.
 */

export type RateLimitMode = 'off' | 'monitor' | 'enforce'
export type RateLimitStage = 'pre-auth' | 'post-auth'
export type RateLimitKeyBy = 'ip' | 'user'

export interface RateLimitRule {
  name: string
  limit: number
  windowMs: number
}

export interface RateLimitTier extends RateLimitRule {
  stage: RateLimitStage
  keyBy: RateLimitKeyBy
  matches: (method: string, path: string) => boolean
}

type Getter = (key: string) => string | undefined

const WRITE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])
const isWrite = (method: string) => WRITE_METHODS.has(method.toUpperCase())

// Operational endpoints: uptime checks and Render's health check must never
// be throttled (a 429 on /health would make Render restart the container).
const EXEMPT_EXACT = new Set([
  '/health',
  '/ready',
  '/health/migrations',
  '/services/health',
  '/services/debug',
  '/homepage/health',
  '/v1/homepage/health',
])

// Stripe/Ramp webhooks. Kept out of the general per-IP bucket (providers
// retry in bursts from a small set of IPs) and given their own, larger one.
const WEBHOOK_PATH = /^\/v1\/webhooks(?:\/|$)/

const LOGIN_PATH =
  /^\/auth\/(?:login|dev-login|signup|register|register-email|google|linkedin|magic-link)$/
const PASSWORD_RESET_PATH = /^\/auth\/(?:forgot-password|reset-password)$/
const OTP_VERIFY_PATH = /^\/auth\/(?:2fa\/verify|verify)$/
const OTP_SEND_PATH = /^\/auth\/2fa\/(?:resend|generate-sms)$/
const USERNAME_CHECK_PATH = /^\/auth\/check-username$/

// Money-moving services. Only writes are limited: balance and history reads
// are left to the general per-user bucket.
const MONEY_PATH =
  /^\/(?:v1\/)?(?:payouts|deposit-methods|wallet|wire-transfer|wire-review|checkout)(?:\/|$)/

// Upload endpoints handled by the gateway's own multer controllers.
const UPLOAD_PATH =
  /^\/(?:user\/me\/avatar|v1\/companies\/logo|publish\/media|publish\/rich-text-image|resume\/upload|talent)$/

/**
 * Canonical form of a request path, used only for matching rules. Mirrors
 * the "/api" stripping in JwtMiddleware and ProxyController, and also
 * lower-cases, decodes, collapses repeated slashes and drops a trailing slash
 * so that trivially different spellings of the same route cannot land in a
 * different (or no) bucket.
 */
export function normalizePath(originalUrl: string | undefined): string {
  let path = (originalUrl || '/').split('?')[0]
  try {
    path = decodeURIComponent(path)
  } catch {
    // Malformed escape sequence: match on the raw path.
  }
  path = path.replace(/\/{2,}/g, '/').toLowerCase()
  path = path.replace(/^\/api(?=\/|$)/, '') || '/'
  if (path.length > 1) path = path.replace(/\/+$/, '') || '/'
  return path
}

export function isExemptPath(path: string): boolean {
  return EXEMPT_EXACT.has(path)
}

export function isWebhookPath(path: string): boolean {
  return WEBHOOK_PATH.test(path)
}

interface TierDefault {
  name: string
  stage: RateLimitStage
  keyBy: RateLimitKeyBy
  limit: number
  windowSec: number
  matches: (method: string, path: string) => boolean
}

const TIER_DEFAULTS: TierDefault[] = [
  // ── pre-auth, keyed by IP ──
  {
    name: 'ip',
    stage: 'pre-auth',
    keyBy: 'ip',
    limit: 1200,
    windowSec: 60,
    matches: (_m, p) => !isWebhookPath(p),
  },
  {
    name: 'webhook',
    stage: 'pre-auth',
    keyBy: 'ip',
    limit: 300,
    windowSec: 60,
    matches: (_m, p) => isWebhookPath(p),
  },
  {
    name: 'auth-login',
    stage: 'pre-auth',
    keyBy: 'ip',
    limit: 10,
    windowSec: 60,
    matches: (_m, p) => LOGIN_PATH.test(p),
  },
  {
    name: 'auth-password-reset',
    stage: 'pre-auth',
    keyBy: 'ip',
    limit: 10,
    windowSec: 15 * 60,
    matches: (_m, p) => PASSWORD_RESET_PATH.test(p),
  },
  {
    name: 'auth-otp-verify',
    stage: 'pre-auth',
    keyBy: 'ip',
    limit: 10,
    windowSec: 15 * 60,
    matches: (_m, p) => OTP_VERIFY_PATH.test(p),
  },
  {
    name: 'auth-otp-send',
    stage: 'pre-auth',
    keyBy: 'ip',
    limit: 5,
    windowSec: 15 * 60,
    matches: (_m, p) => OTP_SEND_PATH.test(p),
  },
  {
    name: 'auth-username-check',
    stage: 'pre-auth',
    keyBy: 'ip',
    limit: 60,
    windowSec: 60,
    matches: (_m, p) => USERNAME_CHECK_PATH.test(p),
  },
  // ── post-auth, keyed by verified user (IP if anonymous) ──
  {
    name: 'user',
    stage: 'post-auth',
    keyBy: 'user',
    limit: 300,
    windowSec: 60,
    // Anonymous traffic is already counted by the pre-auth 'ip' rule; the
    // service skips user-keyed rules that apply only when a user exists.
    matches: (_m, p) => !isWebhookPath(p),
  },
  {
    name: 'money',
    stage: 'post-auth',
    keyBy: 'user',
    limit: 30,
    windowSec: 60,
    matches: (m, p) => isWrite(m) && MONEY_PATH.test(p),
  },
  {
    name: 'upload',
    stage: 'post-auth',
    keyBy: 'user',
    limit: 20,
    windowSec: 60,
    matches: (m, p) => isWrite(m) && UPLOAD_PATH.test(p),
  },
]

// Rules that only make sense for a signed-in user. Anonymous requests skip
// them instead of being re-counted against their IP.
export const USER_ONLY_RULES = new Set(['user'])

function positiveInt(raw: string | undefined, fallback: number): number {
  if (raw === undefined || raw.trim() === '') return fallback
  const n = Number(raw)
  return Number.isInteger(n) && n > 0 ? n : fallback
}

const envName = (rule: string) => rule.toUpperCase().replace(/-/g, '_')

export function buildTiers(get: Getter): RateLimitTier[] {
  return TIER_DEFAULTS.map((t) => {
    const base = `RATE_LIMIT_${envName(t.name)}`
    return {
      name: t.name,
      stage: t.stage,
      keyBy: t.keyBy,
      matches: t.matches,
      limit: positiveInt(get(`${base}_LIMIT`), t.limit),
      windowMs: positiveInt(get(`${base}_WINDOW_SEC`), t.windowSec) * 1000,
    }
  })
}

export function parseMode(raw: string | undefined): { mode: RateLimitMode; valid: boolean } {
  // Defaults to monitor: a fresh deploy logs would-be blocks but never
  // rejects a request until someone deliberately sets "enforce".
  if (raw === undefined || raw.trim() === '') return { mode: 'monitor', valid: true }
  const v = raw.trim().toLowerCase()
  if (v === 'off' || v === 'monitor' || v === 'enforce') return { mode: v, valid: true }
  return { mode: 'monitor', valid: false }
}

export function parseTrustedProxyHops(raw: string | undefined): number {
  if (raw === undefined || raw.trim() === '') return 1
  const n = Number(raw)
  return Number.isInteger(n) && n >= 0 && n <= 10 ? n : 1
}

export function parseAllowlist(raw: string | undefined): Set<string> {
  return new Set(
    (raw || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
  )
}
