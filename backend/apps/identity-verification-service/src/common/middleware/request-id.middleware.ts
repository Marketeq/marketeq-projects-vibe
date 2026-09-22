import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

// Attaches a request ID to every incoming request: the caller's own
// x-request-id header if it sent one, otherwise a freshly generated
// UUID. Also echoes it back on the response so a caller can match its
// own request to this service's response.
//
// This does NOT make the request ID appear inside NestJS Logger's own
// output automatically — see "Correlation" in logging-conventions.md.
export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  const incoming = req.headers['x-request-id'];
  const requestId = typeof incoming === 'string' && incoming.length > 0 ? incoming : randomUUID();
  (req as Request & { requestId: string }).requestId = requestId;
  res.setHeader('x-request-id', requestId);
  next();
}
