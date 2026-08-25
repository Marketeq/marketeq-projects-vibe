import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { WorkType } from '../enums/work-type.enum';
import { HiringType } from '../enums/hiring-type.enum';

export class GenerateToolsDto {
  @IsEnum(WorkType)
  @IsOptional()
  workType?: WorkType;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  deliverables?: string;

  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(20)
  @IsOptional()
  roles?: string[];
}

export class GenerateScopeDto {
  @IsEnum(WorkType)
  @IsOptional()
  workType?: WorkType;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  deliverables?: string;

  @IsString()
  @IsOptional()
  successCriteria?: string;

  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(30)
  @IsOptional()
  tools?: string[];

  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(20)
  @IsOptional()
  roles?: string[];

  @IsNumber()
  @Min(0)
  @IsOptional()
  budgetUsdCents?: number;

  @IsInt()
  @Min(1)
  @IsOptional()
  durationMonths?: number;

  @IsEnum(HiringType)
  @IsOptional()
  hiringType?: HiringType;

  @IsBoolean()
  @IsOptional()
  minimalInput?: boolean;

  @IsBoolean()
  @IsOptional()
  apply?: boolean;
}

export class GeneratedScopeTaskDto {
  @IsString()
  @MaxLength(200)
  taskName: string;

  @IsString()
  @MaxLength(100)
  roleTitle: string;

  @IsString()
  @IsOptional()
  location?: string;

  @IsString()
  @IsOptional()
  experienceLevel?: string;

  @IsString()
  @IsOptional()
  workSchedule?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  customHours?: number;

  @IsString()
  @IsOptional()
  customFrequency?: string;

  @IsNumber()
  @Min(0)
  estimatedHours: number;
}

export class GeneratedScopePhaseDto {
  @IsString()
  @MaxLength(100)
  phaseName: string;

  @IsString()
  @IsOptional()
  phaseType?: string;

  @IsString()
  @IsOptional()
  recurrenceSchedule?: string;

  @IsInt()
  @Min(1)
  @IsOptional()
  recurrenceCount?: number;

  @IsInt()
  @Min(1)
  @IsOptional()
  durationDays?: number;

  @ValidateNested({ each: true })
  @Type(() => GeneratedScopeTaskDto)
  @IsArray()
  @ArrayMaxSize(16)
  tasks: GeneratedScopeTaskDto[];
}

export class ApplyGeneratedScopeDto {
  @ValidateNested({ each: true })
  @Type(() => GeneratedScopePhaseDto)
  @IsArray()
  @ArrayMaxSize(10)
  phases: GeneratedScopePhaseDto[];

  @IsBoolean()
  @IsOptional()
  hasScope?: boolean;
}

export class GenerateTitleDto {
  @IsEnum(WorkType)
  @IsOptional()
  workType?: WorkType;

  @IsString()
  @IsOptional()
  description?: string;

  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(20)
  @IsOptional()
  roles?: string[];
}

export class GenerateBasicInformationDto {
  @IsEnum(WorkType)
  @IsOptional()
  workType?: WorkType;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  deliverables?: string;

  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(30)
  @IsOptional()
  tools?: string[];

  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(20)
  @IsOptional()
  roles?: string[];

  @IsBoolean()
  @IsOptional()
  save?: boolean;
}

export class RateDataDto {
  @IsString()
  region: string;

  @IsString()
  experienceLevel: string;

  @IsNumber()
  @Min(0)
  hourlyRateLow: number;

  @IsNumber()
  @Min(0)
  hourlyRateHigh: number;

  @IsNumber()
  @Min(0)
  hourlyMedian: number;
}

export class RecommendRoleConfigurationDto {
  @IsString()
  @MaxLength(100)
  roleTitle: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  budgetUsdCents?: number;

  @IsInt()
  @Min(1)
  @IsOptional()
  durationMonths?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  estimatedHours?: number;

  @ValidateNested({ each: true })
  @Type(() => RateDataDto)
  @IsArray()
  @ArrayMaxSize(100)
  rateData: RateDataDto[];
}

export class GenerateRoleDescriptionRoleDto {
  @IsString()
  @MaxLength(100)
  roleTitle: string;

  @IsString()
  @IsOptional()
  experienceLevel?: string;

  @IsString()
  @IsOptional()
  location?: string;

  @IsString()
  @IsOptional()
  workSchedule?: string;

  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(20)
  @IsOptional()
  tasks?: string[];
}

export class GenerateRoleDescriptionsDto {
  @IsString()
  @IsOptional()
  projectTitle?: string;

  @IsEnum(WorkType)
  @IsOptional()
  workType?: WorkType;

  @IsString()
  @IsOptional()
  description?: string;

  @ValidateNested({ each: true })
  @Type(() => GenerateRoleDescriptionRoleDto)
  @IsArray()
  @ArrayMaxSize(20)
  @IsOptional()
  roles?: GenerateRoleDescriptionRoleDto[];
}
