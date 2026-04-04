import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsInt, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateProjectTaskDto } from './create-task.dto';

export class CreateProjectPhaseDto {
  @ApiProperty({ description: 'Name of the phase (e.g., Phase One)' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Stage name within the phase (e.g., Stage 1)' })
  @IsString()
  stageName: string;

  @ApiProperty({ description: 'Start day of the phase (e.g., 1)' })
  @IsInt()
  startDay: number;

  @ApiProperty({ description: 'End day of the phase (e.g., 8)' })
  @IsInt()
  endDay: number;

  @ApiProperty({ description: 'Order of the phase in the project (e.g., 1)' })
  @IsInt()
  order: number;

  @ApiProperty({ description: 'Project ID this phase belongs to' })
  @IsString()
  projectId: string;

  @ApiProperty({
    description: 'List of tasks under this phase',
    type: [CreateProjectTaskDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateProjectTaskDto)
  tasks: CreateProjectTaskDto[];
}
