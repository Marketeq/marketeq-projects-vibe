import { Request, Response, NextFunction } from 'express';
import { requestIdMiddleware } from './request-id.middleware';

describe('requestIdMiddleware', () => {
  const buildReqRes = (headers: Record<string, unknown>) => {
    const req = { headers } as unknown as Request & { requestId?: string };
    const res = { setHeader: jest.fn() } as unknown as Response;
    const next = jest.fn() as unknown as NextFunction;
    return { req, res, next };
  };

  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  it('reuses a valid incoming x-request-id', () => {
    const { req, res, next } = buildReqRes({ 'x-request-id': 'client-supplied-id' });

    requestIdMiddleware(req, res, next);

    expect(req.requestId).toBe('client-supplied-id');
    expect(res.setHeader).toHaveBeenCalledWith('x-request-id', 'client-supplied-id');
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('generates a UUID when no x-request-id header is present', () => {
    const { req, res, next } = buildReqRes({});

    requestIdMiddleware(req, res, next);

    expect(req.requestId).toMatch(UUID_RE);
    expect(res.setHeader).toHaveBeenCalledWith('x-request-id', req.requestId);
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('generates a UUID when x-request-id is an empty string', () => {
    const { req, res, next } = buildReqRes({ 'x-request-id': '' });

    requestIdMiddleware(req, res, next);

    expect(req.requestId).toMatch(UUID_RE);
    expect(res.setHeader).toHaveBeenCalledWith('x-request-id', req.requestId);
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('generates a UUID when x-request-id is array-valued (duplicate header)', () => {
    const { req, res, next } = buildReqRes({ 'x-request-id': ['first-id', 'second-id'] });

    requestIdMiddleware(req, res, next);

    expect(req.requestId).toMatch(UUID_RE);
    expect(res.setHeader).toHaveBeenCalledWith('x-request-id', req.requestId);
    expect(next).toHaveBeenCalledTimes(1);
  });
});
