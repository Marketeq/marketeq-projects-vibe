import { IsEnum, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { WorkSchedule } from '../enums/work-schedule.enum';

export class CreateTaskDto {
  @IsString()
  @MaxLength(200)
  taskName: string;

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

  @IsNumber()
  @Min(0.5)
  estimatedHours: number;
}
