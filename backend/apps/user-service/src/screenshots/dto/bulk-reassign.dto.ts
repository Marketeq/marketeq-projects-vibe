import { IsArray, ArrayNotEmpty, IsUUID, IsOptional } from 'class-validator';

export class BulkReassignDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsUUID('4', { each: true })
  screenshotIds: string[];

  @IsOptional()
  @IsUUID()
  projectId?: string;

  @IsOptional()
  @IsUUID()
  taskId?: string;
}
