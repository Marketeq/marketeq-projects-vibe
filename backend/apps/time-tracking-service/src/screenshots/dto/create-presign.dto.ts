import { IsIn, IsInt, IsISO8601, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreatePresignDto {
  @IsOptional() @IsString() @MaxLength(100) projectId?: string;
  @IsOptional() @IsString() @IsIn(['image/jpeg', 'image/png']) contentType?: 'image/jpeg' | 'image/png';
  @IsOptional() @IsInt() @Min(1) contentLength?: number;
  @IsOptional() @IsISO8601() capturedAtUtc?: string;
}
