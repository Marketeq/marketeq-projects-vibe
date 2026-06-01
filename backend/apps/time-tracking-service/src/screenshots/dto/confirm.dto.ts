// import { IsInt, IsISO8601, IsOptional, IsPositive, IsString } from 'class-validator';

// export class ConfirmScreenshotDto {
//   @IsString() userId!: string;
//   @IsString() key!: string;
//   @IsString() mimeType!: string;
//   @IsInt() @IsPositive() bytes!: number;
//   @IsOptional() @IsISO8601() timestamp?: string;
//   @IsOptional() @IsString() contractId?: string;
//   @IsOptional() @IsString() taskId?: string;
//   @IsOptional() @IsInt() keyboard?: number;
//   @IsOptional() @IsInt() mouse?: number;
//   @IsOptional() @IsString() monitorId?: string;
//   @IsOptional() @IsString() groupKey?: string;

// }


import { IsInt, IsISO8601, IsOptional, IsString, Min } from 'class-validator';
export class ConfirmScreenshotDto {
  @IsString() userId!: string;
  @IsString() key!: string;
  @IsString() mimeType!: string;
  @IsInt() @Min(0) bytes!: number;
  @IsOptional() @IsISO8601() timestamp?: string;
  @IsOptional() @IsString() contractId?: string;
  @IsOptional() @IsString() taskId?: string;
  @IsOptional() @IsInt() keyboard?: number;
  @IsOptional() @IsInt() mouse?: number;
  @IsOptional() @IsString() monitorId?: string;
  @IsOptional() @IsString() groupKey?: string;
  @IsOptional() @IsString() imageBase64?: string;
  @IsOptional()
  apps?: Array<{ appName: string; iconUrl?: string; url?: string }>;
}
