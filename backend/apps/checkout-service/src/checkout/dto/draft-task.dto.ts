import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsInt,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';

const EXPERIENCE_LEVELS = ['Student', 'Junior', 'Medior', 'Mediator', 'Senior', 'Guru'];

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

const isSent = (_: unknown, value: unknown) => value !== undefined;

export class AddDraftTaskDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  version!: number;

  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title!: string;

  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  roleName!: string;

  @IsInt()
  @Min(1)
  @Max(100000)
  durationHours!: number;

  @IsOptional()
  @IsIn(['full_time', 'part_time', 'custom'])
  workSchedule?: 'full_time' | 'part_time' | 'custom';

  @ValidateIf((dto) => dto.workSchedule === 'custom')
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(168)
  customHoursPerWeek?: number;

  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  @IsIn(EXPERIENCE_LEVELS)
  experienceLevel!: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @MaxLength(100, { each: true })
  location?: string[];

  @IsOptional()
  @IsUUID()
  assigneeUserId?: string | null;
}

export class UpdateDraftTaskDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  version!: number;

  @ValidateIf(isSent)
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title?: string;

  @ValidateIf(isSent)
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  roleName?: string;

  @ValidateIf(isSent)
  @IsInt()
  @Min(1)
  @Max(100000)
  durationHours?: number;

  @ValidateIf(isSent)
  @IsIn(['full_time', 'part_time', 'custom'])
  workSchedule?: 'full_time' | 'part_time' | 'custom';

  @ValidateIf((_dto, value) => value !== undefined && value !== null)
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(168)
  customHoursPerWeek?: number | null;

  @ValidateIf(isSent)
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  @IsIn(EXPERIENCE_LEVELS)
  experienceLevel?: string;

  @ValidateIf(isSent)
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @MaxLength(100, { each: true })
  location?: string[];

  @IsOptional()
  @IsUUID()
  assigneeUserId?: string | null;

  @ValidateIf(isSent)
  @Type(() => Number)
  @IsInt()
  @Min(1)
  order?: number;
}

export class AddDraftPhaseDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  version!: number;

  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title!: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  order?: number;
}

export class DuplicateDraftPhaseDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  version!: number;
}

export class ReplaceDraftMemberDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  version!: number;

  @IsUUID()
  toUserId!: string;

  @ValidateIf(isSent)
  @IsUUID()
  fromUserId?: string;

  @ValidateIf(isSent)
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  roleKey?: string;
}

export class RemoveDraftMemberDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  version!: number;

  @ValidateIf(isSent)
  @IsUUID()
  fromUserId?: string;

  @ValidateIf(isSent)
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  roleKey?: string;
}

export class UpdateDraftRoleDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  version!: number;

  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  roleKey!: string;

  @ValidateIf(isSent)
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  @IsIn(EXPERIENCE_LEVELS)
  experienceLevel?: string;

  @ValidateIf(isSent)
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  location?: string;
}

export class UpdateDraftPhaseDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  version!: number;

  @ValidateIf(isSent)
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title?: string;

  @ValidateIf(isSent)
  @Type(() => Number)
  @IsInt()
  @Min(1)
  order?: number;
}
