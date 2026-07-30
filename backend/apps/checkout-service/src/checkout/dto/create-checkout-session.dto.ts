import {
  IsUUID,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsPositive,
  IsString,
  Min,
} from 'class-validator';

export class CreateCheckoutSessionDto {
  @IsUUID()
  @IsNotEmpty()
  projectId: string;

  @IsUUID()
  @IsOptional()
  contractId?: string;

  @IsEnum(['card', 'ach', 'wire', 'klarna'])
  @IsNotEmpty()
  paymentMethod: 'card' | 'ach' | 'wire' | 'klarna';

  @IsOptional()
  @IsEnum(['full', 'weekly', 'biweekly', 'monthly', 'quarterly', 'yearly'])
  installmentPlanOption?:
    'full' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly';

  @IsOptional()
  @IsBoolean()
  splitPaymentEnabled?: boolean = false;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  initialPaymentAmount?: number;

  @IsOptional()
  @IsString()
  giftCardCode?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  walletBalanceUsed?: number;

  @IsUUID()
  @IsNotEmpty()
  clientId: string;

  @IsNumber()
  @IsPositive()
  amount: number;
}
