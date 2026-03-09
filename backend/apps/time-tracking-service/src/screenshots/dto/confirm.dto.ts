import { IsInt, IsISO8601, IsOptional, IsPositive, IsString } from 'class-validator';

export class ConfirmScreenshotDto {
  @IsString() userId!: string;
  @IsString() key!: string;
  @IsString() mimeType!: string;
  @IsInt() @IsPositive() bytes!: number;
  @IsOptional() @IsISO8601() timestamp?: string;
  @IsOptional() @IsString() projectId?: string;
  @IsOptional() @IsString() taskId?: string;
  @IsOptional() @IsInt() keyboard?: number;
  @IsOptional() @IsInt() mouse?: number;
  @IsOptional() @IsString() monitorId?: string;
  @IsOptional() @IsString() groupKey?: string;
}
