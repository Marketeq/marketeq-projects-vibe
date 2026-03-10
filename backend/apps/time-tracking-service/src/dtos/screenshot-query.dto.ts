import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Min,
  Max,
} from 'class-validator';

export class ScreenshotQueryDto {
  @IsOptional()
  @IsString()
  projectId?: string;

  @IsOptional()
  @IsString()
  taskId?: string;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;

  /** Filter by app name(s) — matches against the apps JSONB column */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) => (Array.isArray(value) ? value : [value]))
  apps?: string[];

  /** Filter screenshots where url ILIKE %urlContains% */
  @IsOptional()
  @IsString()
  urlContains?: string;

  /** Minimum activity level (0–100), computed as (keyboard + mouse) / 2 */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  activityLevel?: number;

  /** Filter by time entry type; 'manual' returns empty from screenshots endpoint */
  @IsOptional()
  @IsIn(['automatic', 'manual', 'all'])
  timeEntryType?: 'automatic' | 'manual' | 'all';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  minKeyboard?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  maxKeyboard?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  minMouse?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  maxMouse?: number;

  @IsOptional()
  @IsIn(['timestamp', 'keyboard', 'mouse', 'project'])
  sortBy?: 'timestamp' | 'keyboard' | 'mouse' | 'project';

  @IsOptional()
  @IsIn(['ASC', 'DESC'])
  sortOrder?: 'ASC' | 'DESC';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;
}
