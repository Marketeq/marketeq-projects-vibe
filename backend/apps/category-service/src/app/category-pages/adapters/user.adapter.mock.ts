import { Injectable, Logger } from '@nestjs/common';
import { UserAdapter } from './user.adapter';
import { PaginatedResponse, PaginatedQueryParams } from '../types/taxonomy.types';
import { encodeCursor, decodeCursor } from '../utils/cursor.utils';

@Injectable()
export class UserAdapterMock extends UserAdapter {
  private readonly logger = new Logger(UserAdapterMock.name);

  private generateTalent(count: number, startId: number = 1): any[] {
    return Array.from({ length: count }, (_, i) => ({
      id: `talent-${startId + i}`,
      name: `Mock Talent ${startId + i}`,
      title: 'UI/UX Designer',
      rating: 4.8,
      hourlyRate: Math.floor(Math.random() * 100) + 50,
      jobsCompleted: Math.floor(Math.random() * 200),
      createdAt: new Date(Date.now() - (startId + i) * 86400000).toISOString(),
    }));
  }

  async queryTalent(params: PaginatedQueryParams): Promise<PaginatedResponse<any>> {
    this.logger.log(
      `Mock: queryTalent(order=${params.order}, limit=${params.limit}, cursor=${params.cursor})`
    );

    const cursorData = decodeCursor(params.cursor);
    const startId = cursorData?.id ? parseInt(cursorData.id.split('-')[1]) + 1 : 1;

    const items = this.generateTalent(params.limit + 1, startId);
    const hasMore = items.length > params.limit;
    const returnItems = hasMore ? items.slice(0, params.limit) : items;

    const nextCursor = hasMore
      ? encodeCursor({
          id: returnItems[returnItems.length - 1].id,
          createdAt: returnItems[returnItems.length - 1].createdAt,
        })
      : undefined;

    // Sort
    if (params.order === 'top_rated') {
      returnItems.sort((a, b) => b.rating - a.rating);
    }

    return {
      items: returnItems,
      nextCursor,
      hasMore,
    };
  }
}