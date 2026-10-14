import 'reflect-metadata';
import { of } from 'rxjs';
import { HomepageService } from './homepage.service';

// G5 (Christopher): the homepage's listing / member tiles are assembled from
// listings-service's PUBLIC endpoints, so they already carry the roster rule, and
// the existing cache may serve a result for at most 15 seconds - the accepted
// staleness window for a roster change to reach the homepage.

describe('G5 - homepage tiles and cache staleness', () => {
  const build = (config: Record<string, unknown> = {}) => {
    const calls: Array<{ url: string; options: any }> = [];
    const http = {
      get: jest.fn((url: string, options?: any) => {
        calls.push({ url, options });
        return of({ data: [] });
      }),
    };
    const service = new HomepageService(http as any, { get: (k: string) => config[k] } as any);
    return { service, http, calls };
  };

  it('the default cache lifetime is 15 seconds', () => {
    expect((build().service as any).cacheTtl).toBe(15);
  });

  it('a fresh assembly is cached for exactly that lifetime, never longer', async () => {
    const { service } = build();
    const redis = { get: jest.fn(async () => null), setex: jest.fn(async () => 'OK') };
    (service as any).redis = redis;
    await service.getHomepage({});
    expect(redis.setex).toHaveBeenCalledTimes(1);
    expect((redis.setex as jest.Mock).mock.calls[0][1]).toBe(15);
  });

  it('a cached homepage is served without re-assembling (so staleness is bounded by the TTL only)', async () => {
    const { service, http } = build();
    (service as any).redis = { get: jest.fn(async () => JSON.stringify({ cached: true })), setex: jest.fn() };
    expect(await service.getHomepage({})).toEqual({ cached: true });
    expect(http.get).not.toHaveBeenCalled();
  });

  it('project, service and team tiles come from the listings-service public endpoints, called anonymously', async () => {
    const { service, calls } = build();
    await service.getHomepage({ skipCache: true });
    const urls = calls.map((c) => c.url);
    expect(urls).toEqual(expect.arrayContaining([
      'http://localhost:3004/v1/projects',
      'http://localhost:3004/v1/services',
      'http://localhost:3004/v1/teams',
    ]));
    // No viewer identity is forwarded: the homepage is the public (client-facing) view.
    for (const call of calls.filter((c) => c.url.startsWith('http://localhost:3004'))) {
      expect(call.options?.headers?.authorization ?? call.options?.headers?.Authorization).toBeUndefined();
    }
  });
});
