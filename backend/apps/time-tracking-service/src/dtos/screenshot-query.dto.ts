import { Transform, Type } from 'class-transformer';
import {
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
