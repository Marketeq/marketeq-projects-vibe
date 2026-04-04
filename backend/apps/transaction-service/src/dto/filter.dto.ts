import { IsOptional, IsEnum, IsDateString, IsString,
    IsInt, Min, Max, IsUUID, MinLength } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import {
TransactionType, TransactionStatus, PaymentMethodType,
ContractType, InvoiceStatus,
} from '../entities/enums';

export class TransactionFilterDto {

// ── Date range ─────────────────────────────────────────────────────
@IsOptional()
@IsDateString()
dateFrom?: string;

@IsOptional()
@IsDateString()
dateTo?: string;

// ── Transaction type filter ────────────────────────────────────────
@IsOptional()
@IsEnum(TransactionType)
type?: TransactionType;

// ── Contract filter ────────────────────────────────────────────────
@IsOptional()
@IsUUID()
contractId?: string;

// ── Payment method filter ──────────────────────────────────────────
@IsOptional()
@IsEnum(PaymentMethodType)
paymentMethodType?: PaymentMethodType;

// ── Search ────────────────────────────────────────────────────────
// Minimum 2 characters; trimmed of whitespace before query
@IsOptional()
@IsString()
@MinLength(2, { message: 'Please enter a valid search term.' })
@Transform(({ value }) => value?.trim())
search?: string;

// ── Pagination ────────────────────────────────────────────────────
@IsOptional()
@Type(() => Number)
@IsInt()
@Min(1)
page?: number = 1;

@IsOptional()
@Type(() => Number)
@IsInt()
@Min(1)
@Max(100)
limit?: number = 10;
}

export class InvoiceFilterDto {

@IsOptional()
@IsDateString()
dateFrom?: string;

@IsOptional()
@IsDateString()
dateTo?: string;

@IsOptional()
@IsEnum(InvoiceStatus)
status?: InvoiceStatus;

@IsOptional()
@IsUUID()
contractId?: string;

@IsOptional()
@IsString()
@MinLength(2, { message: 'Please enter a valid search term.' })
@Transform(({ value }) => value?.trim())
search?: string;

@IsOptional()
@Type(() => Number)
@IsInt()
@Min(1)
page?: number = 1;

@IsOptional()
@Type(() => Number)
@IsInt()
@Min(1)
@Max(100)
limit?: number = 10;
}
