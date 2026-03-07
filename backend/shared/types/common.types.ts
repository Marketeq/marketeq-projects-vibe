export interface ApiResponse<T = unknown> {
  data: T;
  message?: string;
  statusCode: number;
}

export interface PaginatedResponse<T = unknown> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export interface ServiceError {
  code: string;
  message: string;
  details?: unknown;
}

export type UserRole = 'client' | 'talent' | 'admin';

export type UserStatus = 'active' | 'inactive' | 'suspended' | 'pending';

export interface JwtPayload {
  sub: string;
  email: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}
