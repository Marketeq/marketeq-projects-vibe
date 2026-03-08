import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { BillingFrequency } from '../entities/subscription.entity';

export class CreateSubscriptionDto {
  @IsString()
  @IsNotEmpty()
  groupId: string;

  @IsString()
  @IsNotEmpty()
  clientId: string;

  @IsString()
  @IsNotEmpty()
  stripeCustomerId: string;

  @IsEnum(BillingFrequency)
  frequency: BillingFrequency;

  @IsNumber()
  @Min(1)
  totalAmountCents: number; // total project/service cost in cents

  @IsString()
  @IsNotEmpty()
  startDate: string; // ISO string

  @IsString()
  @IsOptional()
  endDate?: string; // ISO string — null for ongoing services

  @IsString()
  @IsOptional()
  projectId?: string;

  @IsString()
  @IsOptional()
  serviceId?: string;

  @IsString()
  @IsOptional()
  description?: string;
}
