import { IsString, IsInt, IsOptional, Min } from 'class-validator';

export class SyncScreenshotDto {
  @IsString() userId!: string;
  @IsString() contractId!: string;
  @IsOptional() @IsString() taskId!: string | null;
  @IsOptional() @IsString() taskName!: string | null;
  @IsString() day!: string;
  @IsInt() @Min(0) screenshotCount!: number;
  @IsString() firstAt!: string;
  @IsString() lastAt!: string;
  @IsInt() @Min(0) avgKbd!: number;
  @IsInt() @Min(0) avgMouse!: number;
}