import { IsEnum, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { PhaseType } from '../enums/phase-type.enum';
import { RecurrenceSchedule } from '../enums/recurrence-schedule.enum';

export class CreatePhaseDto {
  @IsString()
  @MaxLength(100)
  phaseName: string;

  @IsEnum(PhaseType)
  phaseType: PhaseType;

  // ── SETUP only ─────────────────────────────────────────────────
  @IsInt()
  @Min(1)
  @IsOptional()
  durationDays?: number;

  // ── RECURRING only ─────────────────────────────────────────────
  @IsEnum(RecurrenceSchedule)
  @IsOptional()
  recurrenceSchedule?: RecurrenceSchedule;

  @IsInt()
  @Min(1)
  @Max(99)
  @IsOptional()
  recurrenceCount?: number;
}
