// apps/category-service/src/content/cms-client.ts
// Replaces the old Strapi v4 client with Payload CMS REST client
import axios from 'axios';

const CMS_URL = (process.env.CMS_SERVICE_URL || process.env.STRAPI_URL || 'http://localhost:3020').replace(/\/+$/, '');
const CMS_API_KEY = process.env.CMS_API_KEY || process.env.STRAPI_TOKEN || process.env.STRAPI_API_TOKEN || '';

export const cmsClient = axios.create({
  baseURL: `${CMS_URL}/api`,
  headers: CMS_API_KEY
    ? { Authorization: `API-Key ${CMS_API_KEY}`, 'Content-Type': 'application/json' }
    : { 'Content-Type': 'application/json' },
});

// Backward-compatible alias
export const strapi = cmsClient;

/**
 * Paginate through all docs from Payload CMS REST API.
 * Payload uses { docs, totalDocs, page, totalPages, hasNextPage } response shape.
 */
export async function getAllPages<T>(path: string, params: Record<string, any>): Promise<T[]> {
  const limit = 100;
  let page = 1;
  const items: T[] = [];

  while (true) {
    const res = await cmsClient.get(path, {
      params: {
        limit,
        page,
        ...params,
      },
    });

    // Payload REST response shape
    const docs = res.data?.docs ?? [];
    items.push(...docs);

    const hasNextPage = res.data?.hasNextPage ?? false;
    if (!hasNextPage) break;
    page += 1;
  }

  return items;
}
