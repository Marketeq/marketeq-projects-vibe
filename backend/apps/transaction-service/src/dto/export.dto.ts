import { IsEnum, IsOptional, IsDateString, IsUUID,
    IsString, MinLength } from 'class-validator';
import { Transform } from 'class-transformer';
import { PaymentMethodType, TransactionType } from '../entities/enums';

export enum ExportFormat {
  CSV = 'csv',
  PDF = 'pdf',
}

export enum ExportScope {
  TRANSACTIONS = 'transactions',
  INVOICES     = 'invoices',
}

export class ExportRequestDto {

  @IsEnum(ExportFormat)
  format!: ExportFormat;

  @IsEnum(ExportScope)
  scope!: ExportScope;

  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @IsOptional()
  @IsEnum(TransactionType)
  type?: TransactionType;

  @IsOptional()
  @IsUUID()
  contractId?: string;

  @IsOptional()
  @IsEnum(PaymentMethodType)
  paymentMethodType?: PaymentMethodType;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @Transform(({ value }) => value?.trim())
  search?: string;
}