import { Injectable, NestMiddleware } from '@nestjs/common';
import type { Request, Response } from 'express';
import { requestContext } from './request-context';

@Injectable()
export class RequestContextMiddleware implements NestMiddleware {
  use(req: Request, _res: Response, next: () => void) {
    requestContext.run({ req }, next);
  }
}
