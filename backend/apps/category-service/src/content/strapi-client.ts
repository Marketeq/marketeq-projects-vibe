// apps/category-sync-service/src/content/strapi-client.ts
import axios from 'axios';

const STRAPI_URL = (process.env.STRAPI_URL || 'http://localhost:1337').replace(/\/+$/, '');
const STRAPI_API_TOKEN = process.env.STRAPI_TOKEN || process.env.STRAPI_API_TOKEN || '';

export const strapi = axios.create({
  baseURL: `${STRAPI_URL}/api`,
  headers: STRAPI_API_TOKEN
    ? { Authorization: `Bearer ${STRAPI_API_TOKEN}`, 'Content-Type': 'application/json' }
    : { 'Content-Type': 'application/json' },
});

// GET all pages for a given path with query params (Strapi v4)
export async function getAllPages<T>(path: string, params: Record<string, any>) {
  const pageSize = 100;
  let page = 1;
  const items: T[] = [];

  while (true) {
    const res = await strapi.get(path, {
      params: {
        'pagination[page]': page,
        'pagination[pageSize]': pageSize,
        ...params,
      },
    });
    const data = res.data?.data ?? [];
    items.push(...data);
    const meta = res.data?.meta?.pagination;
    if (!meta || page >= meta.pageCount) break;
    page += 1;
  }
  return items;
}
