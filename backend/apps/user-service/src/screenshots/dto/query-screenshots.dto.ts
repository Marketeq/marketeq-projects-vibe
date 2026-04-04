import { IsInt, IsOptional, IsString, IsUUID, IsBoolean, IsIn, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

export class QueryScreenshotsDto {
  @IsOptional() @IsUUID() userId?: string; // fallback to x-user-id header
  @IsOptional() @IsUUID() projectId?: string;
  @IsOptional() @IsUUID() taskId?: string;

  @IsOptional() @IsString() dateFrom?: string; // ISO or YYYY-MM-DD
  @IsOptional() @IsString() dateTo?: string;

  @IsOptional() @IsString() app?: string;
  @IsOptional() @Type(() => Number) @IsNumber() minActivity?: number; // 0..100
  @IsOptional() @Type(() => Number) @IsNumber() maxActivity?: number; // 0..100

  @IsOptional() @Type(() => Boolean) @IsBoolean() includeDeleted?: boolean;
  @IsOptional() @Type(() => Boolean) @IsBoolean() blurred?: boolean;

  @IsOptional() @IsIn(['newest', 'oldest']) sort?: 'newest' | 'oldest' = 'newest';

  @IsOptional() @Type(() => Number) @IsInt() page?: number = 1;
  @IsOptional() @Type(() => Number) @IsInt() limit?: number = 24; // screenshots per page
}
