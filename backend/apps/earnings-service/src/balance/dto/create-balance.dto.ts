import { IsUUID, IsString, IsNumber, IsOptional, IsDateString } from 'class-validator';

export class CreateBalanceDto {
  @IsUUID() contractorId: string;
  @IsNumber() availableBalance: number;
  @IsNumber() availableBalanceLocal: number;
  @IsNumber() availableBalanceDisplay: number;
  @IsString() displayCurrency: string;
  @IsString() localCurrency: string;
  @IsNumber() totalEarnedUsd: number;
  @IsNumber() totalPaidOutUsd: number;
  @IsNumber() pendingHoldUsd: number;
  @IsOptional() @IsDateString() lastCreditAt?: string;
  @IsOptional() @IsDateString() updatedAt?: string;
}
