import {
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  Min,
} from 'class-validator';

export class CreateScreenshotDto {
  @IsString()
  @IsNotEmpty()
  userId: string;

  @IsOptional()
  @IsString()
  projectId?: string;

  @IsOptional()
  @IsString()
  taskId?: string;

  @IsUrl()
  imageUrl: string;

  @IsDateString()
  timestamp: string;

  @IsInt()
  @Min(0)
  keyboard: number;

  @IsInt()
  @Min(0)
  mouse: number;

  @IsOptional()
  @IsString()
  monitorId?: string;

  @IsOptional()
  @IsString()
  groupKey?: string;

  @IsOptional()
  appUsage?: Record<string, any>[];
}
