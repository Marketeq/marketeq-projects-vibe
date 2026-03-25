import {
  IsUUID,
  IsNumber,
  IsPositive,
  IsEnum,
  IsOptional,
  IsObject,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class SplitPaymentItemDto {
  @IsEnum(['credit_card', 'wallet', 'gift_card', 'bank_transfer'])
  method: 'credit_card' | 'wallet' | 'gift_card' | 'bank_transfer';

  @IsNumber()
  @IsPositive()
  amount: number;

  @IsOptional()
  @IsObject()
  details?: Record<string, any>;
}

export class SplitPaymentDto {
  @IsUUID()
  projectId: string;

  @IsNumber()
  @IsPositive()
  totalAmount: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SplitPaymentItemDto)
  payments: SplitPaymentItemDto[];
}
