// apps/payout-service/src/schedule/dto/update-schedule.dto.ts
// PS-03 + PS-18: Schedule configuration DTO
// Split fields are now managed via PATCH /v1/payouts/schedule/split (UpdateSplitDto)
import { IsOptional, IsBoolean, IsString, IsNumber, IsUUID, IsIn, IsISO8601, Min, Max } from 'class-validator';

export class UpdateScheduleDto {
  @IsOptional() @IsBoolean()
  isActive?: boolean;

  @IsOptional() @IsIn(['daily', 'weekly', 'bi_weekly', 'monthly', 'custom'])
  frequency?: string;

  @IsOptional() @IsNumber() @Min(0) @Max(6)
  dayOfWeek?: number;

  @IsOptional() @IsNumber() @Min(1) @Max(28)
  dayOfMonth?: number;

  @IsOptional() @IsNumber() @Min(1) @Max(365)
  customIntervalDays?: number;

  // US-72: optional window, only meaningful for frequency === 'custom'.
  @IsOptional() @IsISO8601()
  startDate?: string;

  @IsOptional() @IsISO8601()
  endDate?: string;

  @IsOptional() @IsString()
  thresholdUsd?: string;

  @IsOptional() @IsString()
  reserveUsd?: string;

  @IsOptional() @IsUUID()
  primaryMethodId?: string;
}
