import { IsOptional, IsEnum, IsDateString, IsInt, Min, Max, IsString } from 'class-validator'
import { Type } from 'class-transformer'
import { TransactionType, TransactionStatus } from '../entities/transaction.entity'
import { InvoiceStatus } from '../entities/invoice.entity'

export class TransactionFilterDto {
  @IsOptional()
  @IsEnum(TransactionType)
  type?: TransactionType

  @IsOptional()
  @IsEnum(TransactionStatus)
  status?: TransactionStatus

  @IsOptional()
  @IsDateString()
  dateFrom?: string

  @IsOptional()
  @IsDateString()
  dateTo?: string

  @IsOptional()
  @IsString()
  search?: string

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10
}

export class InvoiceFilterDto {
  @IsOptional()
  @IsEnum(InvoiceStatus)
  status?: InvoiceStatus

  @IsOptional()
  @IsDateString()
  dateFrom?: string

  @IsOptional()
  @IsDateString()
  dateTo?: string

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10
}

export class PaginationMeta {
  total: number
  page: number
  limit: number
  totalPages: number
  hasNextPage: boolean
  hasPreviousPage: boolean
}

export class PaginatedResponseDto<T> {
  data: T[]
  meta: PaginationMeta

  static of<T>(data: T[], total: number, page: number, limit: number): PaginatedResponseDto<T> {
    const totalPages = Math.ceil(total / limit)
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
    }
  }
}
