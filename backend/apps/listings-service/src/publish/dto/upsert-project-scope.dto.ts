import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, ValidateNested } from 'class-validator';
import { CreateProjectPhaseDto } from './create-phase.dto';

export class UpsertProjectScopeDto {
  @ApiProperty({
    type: [CreateProjectPhaseDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateProjectPhaseDto)
  scope: CreateProjectPhaseDto[];
}
