import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsPositive,
  IsOptional,
  IsObject,
} from 'class-validator';

export class PayACHDto {
  @IsString()
  @IsNotEmpty()
  customerId: string;

  @IsString()
  @IsNotEmpty()
  paymentMethodId: string;

  @IsNumber()
  @IsPositive()
  amount: number;

  @IsOptional()
  @IsString()
  currency?: string = 'usd';

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
