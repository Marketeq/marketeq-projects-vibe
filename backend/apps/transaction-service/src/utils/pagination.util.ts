export class PaginationMeta {
    total!: number;
    page!: number;
    limit!: number;
    totalPages!: number;
    hasNextPage!: boolean;
    hasPreviousPage!: boolean;
  }
  
  export class PaginatedResponseDto<T> {
    data!: T[];
    meta!: PaginationMeta;
  
    static of<T>(data: T[], total: number, page: number, limit: number): PaginatedResponseDto<T> {
      const totalPages = Math.ceil(total / limit);
      return {
        data,
        meta: {
          total,
          page,
          limit,
          totalPages,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1,
        },
      };
    }
  }