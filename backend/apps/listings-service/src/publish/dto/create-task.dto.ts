import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsInt, IsOptional, IsString } from 'class-validator';

export class CreateProjectTaskDto {
  @ApiProperty({ description: 'Task name/title' })
  @IsString()
  taskName: string;

  @ApiProperty({ description: 'Role name for this task' })
  @IsString()
  role: string;

  @ApiProperty({ description: 'Task description', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Location of the task (e.g., Remote)' })
  @IsArray()
  @IsString({ each: true })
  location: string[];

  @ApiProperty({ description: 'Experience tags (e.g., ["React", "GraphQL"])' })
  @IsArray()
  @IsString({ each: true })
  experience: string[];

  @ApiProperty({ description: 'Experience level required (e.g., Senior)' })
  @IsString()
  experienceLevel: string;

  @ApiProperty({ description: 'Duration string (e.g., 2 weeks)' })
  @IsString()
  duration: string;

  @ApiProperty({ description: 'Estimated hours for the task', required: false })
  @IsOptional()
  @IsInt()
  estimatedHours?: number;

  @ApiProperty({ description: 'Phase ID this task belongs to' })
  @IsString()
  phaseId: string;
}
