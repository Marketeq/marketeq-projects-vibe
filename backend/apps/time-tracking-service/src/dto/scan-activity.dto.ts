import { IsISO8601, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class ScanActivityDto {
  @IsOptional() @IsString() userId?: string;
  @IsOptional() @IsString() bucketId?: string;
  @IsISO8601() start!: string;
  @IsISO8601() end!: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) gapMin?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) afkMin?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) maxWindowHours?: number;
  @IsOptional() @IsISO8601() from?: string;
  @IsOptional() @IsISO8601() to?: string;
}
