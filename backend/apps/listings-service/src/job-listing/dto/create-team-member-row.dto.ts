import { IsEnum, IsInt, IsNumber, IsOptional, IsString, IsUUID, MaxLength, Min } from 'class-validator';
import { WorkSchedule } from '../enums/work-schedule.enum';

export class CreateTeamMemberRowDto {
  @IsString()
  @MaxLength(100)
  roleTitle: string;

  @IsString()
  @MaxLength(100)
  @IsOptional()
  location?: string;

  @IsString()
  @MaxLength(50)
  @IsOptional()
  experienceLevel?: string;

  @IsEnum(WorkSchedule)
  workSchedule: WorkSchedule;

  @IsNumber()
  @Min(0.5)
  @IsOptional()
  customHours?: number;

  @IsString()
  @IsOptional()
  customFrequency?: string;

  @IsInt()
  @Min(1)
  @IsOptional()
  contractLengthMonths?: number;

  @IsUUID()
  @IsOptional()
  assignedUserId?: string;
}
