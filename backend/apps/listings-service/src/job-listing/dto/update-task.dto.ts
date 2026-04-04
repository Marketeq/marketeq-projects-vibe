import { IsEnum, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { WorkSchedule } from '../enums/work-schedule.enum';

export class UpdateTaskDto {
  @IsString()
  @MaxLength(200)
  @IsOptional()
  taskName?: string;

  @IsString()
  @MaxLength(100)
  @IsOptional()
  roleTitle?: string;

  @IsString()
  @MaxLength(100)
  @IsOptional()
  location?: string;

  @IsString()
  @MaxLength(50)
  @IsOptional()
  experienceLevel?: string;

  @IsEnum(WorkSchedule)
  @IsOptional()
  workSchedule?: WorkSchedule;

  @IsNumber()
  @Min(0.5)
  @IsOptional()
  customHours?: number;

  @IsString()
  @IsOptional()
  customFrequency?: string;

  @IsNumber()
  @Min(0.5)
  @IsOptional()
  estimatedHours?: number;
}
