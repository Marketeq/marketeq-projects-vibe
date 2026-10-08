import { IsArray, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class UpdateScreenshotMetaDto {
  @IsOptional()
  @IsString()
  contractId?: string;

  @IsOptional()
  @IsString()
  taskId?: string;
}

export class BatchUpdateScreenshotDto {
  @IsArray()
  @IsUUID('4', { each: true })
  ids: string[];

  @IsOptional()
  @IsString()
  contractId?: string;

  @IsOptional()
  @IsString()
  taskId?: string;
}

export class DeleteScreenshotDto {
  @IsOptional()
  @IsString()
  reason?: string;
}

export class BlurScreenshotDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
