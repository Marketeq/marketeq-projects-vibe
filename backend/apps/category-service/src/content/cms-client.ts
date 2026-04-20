// apps/category-service/src/content/cms-client.ts
import axios, { AxiosInstance } from 'axios';

let _client: AxiosInstance | null = null;

function getClient(): AxiosInstance {
  if (!_client) {
    const cmsUrl = (process.env.CMS_SERVICE_URL || 'http://localhost:3020').replace(/\/+$/, '');
    const apiKey = process.env.CMS_API_KEY?.trim() || '';

    _client = axios.create({
      baseURL: `${cmsUrl}/api`,
      headers: apiKey
        ? { Authorization: `API-Key ${apiKey}`, 'Content-Type': 'application/json' }
        : { 'Content-Type': 'application/json' },
    });
  }
  return _client;
}

export const cmsClient = new Proxy({} as AxiosInstance, {
  get(_target, prop) {
    return (getClient() as any)[prop];
  },
});

/**
 * Resolve a category-service UUID (stable cross-service identifier) to the
 * corresponding Payload `id` (auto-generated integer primary key).
 *
 * category-service speaks UUIDs in its domain and URL paths, but Payload's
 * `relationship` fields on downstream collections (Listings, Projects, etc.)
 * store the integer `id`. Passing a UUID straight into
 * `where[category][equals]=...` or into a PATCH body yields
 * `invalid input syntax for type integer: "<uuid>"` at the DB layer.
 *
 * Returns `null` when no matching category exists — callers decide whether
 * to skip or raise.
 */
export async function findCmsCategoryIdByUuid(uuid: string): Promise<number | string | null> {
  if (!uuid) return null;
  const res = await cmsClient.get('/categories', {
    params: {
      'where[uuid][equals]': uuid,
      limit: 1,
      depth: 0,
    },
  });
  const doc = res.data?.docs?.[0];
  return doc?.id ?? null;
}

/**
 * Paginate through all docs from Payload CMS REST API.
 * Payload uses { docs, totalDocs, page, totalPages, hasNextPage } response shape.
 */
export async function getAllPages<T>(path: string, params: Record<string, any>): Promise<T[]> {
  const limit = 100;
  let page = 1;
  const items: T[] = [];
  const MAX_PAGES = 500;

  while (page <= MAX_PAGES) {
    const res = await cmsClient.get(path, {
      params: {
        limit,
        page,
        ...params,
      },
    });

    const docs = res.data?.docs ?? [];
    items.push(...docs);

    const hasNextPage = res.data?.hasNextPage ?? false;
    if (!hasNextPage) break;
    page += 1;
  }

  return items;
}
