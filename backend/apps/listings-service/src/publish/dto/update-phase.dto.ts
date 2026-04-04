import { PartialType } from '@nestjs/swagger';

import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';
import { CreateProjectPhaseDto } from './create-phase.dto';

export class UpdatePhaseDto {
  @ApiProperty()
  @IsString()
  name: string;
}
