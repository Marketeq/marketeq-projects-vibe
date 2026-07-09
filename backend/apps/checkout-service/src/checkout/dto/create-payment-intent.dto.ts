import {
  IsBoolean,
  IsEnum,
  IsNumber,
  IsObject,
  IsOptional,
  IsPositive,
  IsString,
} from 'class-validator';

export class CreatePaymentIntentDto {
  @IsNumber()
  @IsPositive()
  amount: number;

  @IsOptional()
  @IsString()
  currency?: string = 'usd';

  @IsOptional()
  @IsEnum(['card', 'ach'])
  paymentMethod?: 'card' | 'ach' = 'card';

  @IsOptional()
  @IsString()
  projectId?: string;

  @IsOptional()
  @IsString()
  contractId?: string;

  @IsOptional()
  @IsBoolean()
  savePaymentMethod?: boolean = false;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, string>;
}
