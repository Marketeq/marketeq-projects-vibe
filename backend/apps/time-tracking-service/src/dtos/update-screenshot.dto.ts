import { IsArray, IsOptional, IsString, IsUUID } from 'class-validator';

export class UpdateScreenshotMetaDto {
  @IsOptional()
  @IsString()
  projectId?: string;

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
  projectId?: string;

  @IsOptional()
  @IsString()
  taskId?: string;
}

export class DeleteScreenshotDto {
  @IsOptional()
  @IsString()
  reason?: string;
}
