import { AsyncLocalStorage } from 'node:async_hooks';
import type { Request } from 'express';

type RequestContext = {
  req: Request;
};

export const requestContext = new AsyncLocalStorage<RequestContext>();

export const getRequest = (): Request | undefined =>
  requestContext.getStore()?.req;
