import {
  IsUUID,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsNumber,
  IsPositive,
  Min,
  Max,
  IsISO8601,
} from 'class-validator';

export class CreateSubscriptionDto {
  @IsUUID()
  @IsNotEmpty()
  clientId: string;

  @IsUUID()
  @IsNotEmpty()
  projectId: string;

  @IsOptional()
  @IsUUID()
  contractId?: string;

  @IsEnum(['weekly', 'biweekly', 'monthly', 'quarterly', 'yearly'])
  @IsNotEmpty()
  installmentPlanOption: 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly';

  @IsNumber()
  @Min(2)
  @Max(52)
  numberOfPayments: number;

  @IsNumber()
  @IsPositive()
  amount: number;

  @IsOptional()
  @IsISO8601()
  startDate?: string;
}
