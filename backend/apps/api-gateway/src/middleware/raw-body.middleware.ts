import type { Request, Response, NextFunction } from 'express'

// Paths whose providers sign the exact request bytes. The global json() parser
// re-serialises and loses byte-for-byte fidelity, so these skip it and carry
// the original bytes on req.rawBody (proxy.service.ts forwards that untouched).
const RAW_BODY_PREFIXES = ['/v1/webhooks']

// Method- and path-exact: only the Didit Free KYC webhook, not the rest of
// /v1/identity-verification, which keeps normal JSON parsing.
const RAW_BODY_METHOD_ROUTES: ReadonlyArray<{ method: string; path: string }> = [
  { method: 'POST', path: '/v1/identity-verification/webhooks/didit-kyc' },
]

export function isRawBodyPath(req: Pick<Request, 'originalUrl' | 'method'>): boolean {
  const rawPath = req.originalUrl.split('?')[0]
  const path = rawPath.replace(/^\/api(?=\/|$)/, '') || '/'
  if (RAW_BODY_PREFIXES.some((p) => path.startsWith(p))) return true
  return RAW_BODY_METHOD_ROUTES.some((r) => r.method === req.method && r.path === path)
}

export function captureRawBody(req: Request, _res: Response, next: NextFunction): void {
  const chunks: Buffer[] = []
  req.on('data', (chunk: Buffer) => chunks.push(chunk))
  req.on('end', () => {
    ;(req as any).rawBody = Buffer.concat(chunks)
    // body-parser skips any request already flagged as parsed. Without this, a
    // webhook posted as application/x-www-form-urlencoded would reach
    // urlencoded(), which then tries to read a stream this middleware has
    // already drained — the body arrives empty and the signature check fails.
    ;(req as any)._body = true
    next()
  })
}
