import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString } from 'class-validator';

export class CreateAffiliatedTeamDto {
  @ApiProperty({
    example: 'Design Squad',
    description: 'Name of the affiliated team',
  })
  @IsString()
  name: string;

  @ApiProperty({
    example: 'New York, USA',
    description: 'Location of the affiliated team',
  })
  @IsString()
  location: string;

  @ApiProperty({
    example: '2020-01-15',
    description: 'Date of the affiliated team',
  })
  @IsDateString()
  time: string;
}