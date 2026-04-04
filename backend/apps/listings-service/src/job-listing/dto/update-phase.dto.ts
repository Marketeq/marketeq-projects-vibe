import { IsEnum, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { RecurrenceSchedule } from '../enums/recurrence-schedule.enum';

export class UpdatePhaseDto {
  @IsString()
  @MaxLength(100)
  @IsOptional()
  phaseName?: string;

  @IsInt()
  @Min(1)
  @IsOptional()
  durationDays?: number;

  @IsEnum(RecurrenceSchedule)
  @IsOptional()
  recurrenceSchedule?: RecurrenceSchedule;

  @IsInt()
  @Min(1)
  @Max(99)
  @IsOptional()
  recurrenceCount?: number;
}
