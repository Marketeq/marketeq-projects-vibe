import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from "class-validator";
import { WorkSchedule } from "../enums/work-schedule.enum";

export class CreateRoleRowDto {
  @IsString()
  @IsNotEmpty()
  role: string;

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

  @IsInt()
  @Min(1)
  @IsOptional()
  contractLengthMonths?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  hourlyRateLowUsdCents?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  hourlyRateHighUsdCents?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  positionOrder?: number;

  @IsOptional()
  @IsUUID()
  assignedUserId?: string;
}
