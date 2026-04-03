import { Injectable, Logger } from '@nestjs/common';
import { ListingAdapter } from './listing.adapter';
import { PaginatedResponse, PaginatedQueryParams } from '../types/taxonomy.types';
import { encodeCursor, decodeCursor } from '../utils/cursor.utils';

@Injectable()
export class ListingAdapterMock extends ListingAdapter {
  private readonly logger = new Logger(ListingAdapterMock.name);

  // Mock data generators
  private generateProjects(count: number, startId: number = 1): any[] {
    return Array.from({ length: count }, (_, i) => ({
      id: `project-${startId + i}`,
      title: `Mock Project ${startId + i}`,
      description: 'A sample project for testing',
      rating: 4.5,
      reviewCount: Math.floor(Math.random() * 100),
      price: Math.floor(Math.random() * 1000) + 100,
      createdAt: new Date(Date.now() - (startId + i) * 86400000).toISOString(),
    }));
  }

  private generateServices(count: number, startId: number = 1): any[] {
    return Array.from({ length: count }, (_, i) => ({
      id: `service-${startId + i}`,
      title: `Mock Service ${startId + i}`,
      description: 'A sample service for testing',
      rating: 4.2,
      deliveryTime: '3-5 days',
      price: Math.floor(Math.random() * 500) + 50,
      createdAt: new Date(Date.now() - (startId + i) * 86400000).toISOString(),
    }));
  }

  private generateTeams(count: number, startId: number = 1): any[] {
    return Array.from({ length: count }, (_, i) => ({
      id: `team-${startId + i}`,
      name: `Mock Team ${startId + i}`,
      description: 'A sample team for testing',
      memberCount: Math.floor(Math.random() * 10) + 2,
      projectsCompleted: Math.floor(Math.random() * 50),
      createdAt: new Date(Date.now() - (startId + i) * 86400000).toISOString(),
    }));
  }

  async queryProjects(params: PaginatedQueryParams): Promise<PaginatedResponse<any>> {
    this.logger.log(
      `Mock: queryProjects(order=${params.order}, limit=${params.limit}, cursor=${params.cursor})`
    );

    // Decode cursor to get starting point
    const cursorData = decodeCursor(params.cursor);
    const startId = cursorData?.id ? parseInt(cursorData.id.split('-')[1]) + 1 : 1;

    // Generate items (simulate having 50 total items)
    const totalItems = 50;
    const items = this.generateProjects(params.limit + 1, startId); // +1 to check if more exist

    // Check if there are more items
    const hasMore = items.length > params.limit;
    const returnItems = hasMore ? items.slice(0, params.limit) : items;

    // Generate nextCursor if there are more items
    const nextCursor = hasMore
      ? encodeCursor({
          id: returnItems[returnItems.length - 1].id,
          createdAt: returnItems[returnItems.length - 1].createdAt,
        })
      : undefined;

    // Sort based on order type
    this.sortItems(returnItems, params.order);

    this.logger.log(
      `Returning ${returnItems.length} projects, hasMore: ${hasMore}, nextCursor: ${!!nextCursor}`
    );

    return {
      items: returnItems,
      nextCursor,
      hasMore,
    };
  }

  async queryServices(params: PaginatedQueryParams): Promise<PaginatedResponse<any>> {
    this.logger.log(
      `Mock: queryServices(order=${params.order}, limit=${params.limit}, cursor=${params.cursor})`
    );

    const cursorData = decodeCursor(params.cursor);
    const startId = cursorData?.id ? parseInt(cursorData.id.split('-')[1]) + 1 : 1;

    const items = this.generateServices(params.limit + 1, startId);
    const hasMore = items.length > params.limit;
    const returnItems = hasMore ? items.slice(0, params.limit) : items;

    const nextCursor = hasMore
      ? encodeCursor({
          id: returnItems[returnItems.length - 1].id,
          createdAt: returnItems[returnItems.length - 1].createdAt,
        })
      : undefined;

    this.sortItems(returnItems, params.order);

    return {
      items: returnItems,
      nextCursor,
      hasMore,
    };
  }

  async queryTeams(params: PaginatedQueryParams): Promise<PaginatedResponse<any>> {
    this.logger.log(
      `Mock: queryTeams(order=${params.order}, limit=${params.limit}, cursor=${params.cursor})`
    );

    const cursorData = decodeCursor(params.cursor);
    const startId = cursorData?.id ? parseInt(cursorData.id.split('-')[1]) + 1 : 1;

    const items = this.generateTeams(params.limit + 1, startId);
    const hasMore = items.length > params.limit;
    const returnItems = hasMore ? items.slice(0, params.limit) : items;

    const nextCursor = hasMore
      ? encodeCursor({
          id: returnItems[returnItems.length - 1].id,
          createdAt: returnItems[returnItems.length - 1].createdAt,
        })
      : undefined;

    this.sortItems(returnItems, params.order);

    return {
      items: returnItems,
      nextCursor,
      hasMore,
    };
  }

  private sortItems(items: any[], order: string): void {
    switch (order) {
      case 'top_rated':
        items.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        break;
      case 'trending':
        items.sort((a, b) => (b.reviewCount || 0) - (a.reviewCount || 0));
        break;
      case 'new':
        items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;
      default:
        break;
    }
  }
}