import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { UserAdapter } from './user.adapter';
import { PaginatedResponse, PaginatedQueryParams } from '../types/taxonomy.types';
import { UserAdapterMock } from './user.adapter.mock';

/**
 * Talent listing: uses USER_SERVICE_URL (or TALENT_API_URL) when set; otherwise same behavior as mock.
 */
@Injectable()
export class UserAdapterReal extends UserAdapter {
  private readonly logger = new Logger(UserAdapterReal.name);
  private readonly fallback = new UserAdapterMock();

  constructor(private readonly http: HttpService) {
    super();
  }

  async queryTalent(params: PaginatedQueryParams): Promise<PaginatedResponse<any>> {
    const base =
      process.env.USER_SERVICE_URL?.replace(/\/+$/, '') ||
      process.env.TALENT_API_URL?.replace(/\/+$/, '') ||
      '';

    if (!base) {
      return this.fallback.queryTalent(params);
    }

    try {
      const page = params.cursor ? parseInt(String(params.cursor), 10) || 1 : 1;
      const url = `${base}/api/talent`;
      const res = await firstValueFrom(
        this.http.get(url, {
          params: {
            categoryUuid: params.categoryUuid,
            order: params.order,
            page,
            pageSize: params.limit,
          },
          timeout: 15000,
        }),
      );
      const data = res.data?.data ?? res.data?.items ?? res.data ?? [];
      const items = Array.isArray(data) ? data : [];
      const hasMore = items.length === params.limit;
      return {
        items,
        hasMore,
        nextCursor: hasMore ? String(page + 1) : undefined,
      };
    } catch (e: any) {
      this.logger.warn(`Talent API unavailable (${base}), using mock: ${e?.message || e}`);
      return this.fallback.queryTalent(params);
    }
  }
}
