import { IsOptional, IsUUID } from 'class-validator';

export class UpdateProjectTaskDto {
  @IsOptional() @IsUUID() projectId?: string;
  @IsOptional() @IsUUID() taskId?: string;
}
