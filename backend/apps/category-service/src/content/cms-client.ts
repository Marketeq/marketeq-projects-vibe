// apps/category-service/src/content/cms-client.ts
import axios, { AxiosInstance } from 'axios';

let _client: AxiosInstance | null = null;

function getClient(): AxiosInstance {
  if (!_client) {
    const cmsUrl = (process.env.CMS_SERVICE_URL || 'http://localhost:3020').replace(/\/+$/, '');
    const apiKey = process.env.CMS_API_KEY || '';

    _client = axios.create({
      baseURL: `${cmsUrl}/api`,
      headers: apiKey
        ? { Authorization: `JWT ${apiKey}`, 'Content-Type': 'application/json' }
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
