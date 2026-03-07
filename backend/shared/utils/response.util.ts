import { ApiResponse, PaginatedResponse } from '../types';

export function success<T>(data: T, message?: string): ApiResponse<T> {
  return { data, message, statusCode: 200 };
}

export function paginated<T>(
  data: T[],
  total: number,
  page: number,
  limit: number,
): PaginatedResponse<T> {
  return { data, total, page, limit };
}
