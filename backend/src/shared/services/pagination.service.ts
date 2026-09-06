import { Injectable } from '@nestjs/common';

export interface PaginationParams {
  page?: number;
  limit?: number;
  skip?: number;
  take?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

@Injectable()
export class PaginationService {
  private readonly DEFAULT_LIMIT = 20;
  private readonly MAX_LIMIT = 100;

  parsePaginationParams(query: any): PaginationParams {
    let page = parseInt(query.page) || 1;
    let limit = parseInt(query.limit) || this.DEFAULT_LIMIT;

    // Validation
    page = Math.max(1, page);
    limit = Math.min(Math.max(1, limit), this.MAX_LIMIT);

    const skip = (page - 1) * limit;

    return {
      page,
      limit,
      skip,
      take: limit,
    };
  }

  formatPaginatedResponse<T>(
    data: T[],
    total: number,
    page: number,
    limit: number,
  ): PaginatedResponse<T> {
    return {
      data,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    };
  }
}