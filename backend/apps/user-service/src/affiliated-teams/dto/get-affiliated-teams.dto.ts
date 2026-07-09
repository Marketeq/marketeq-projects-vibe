import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class GetAffiliatedTeamsDto {
  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'Unique identifier of the affiliated team',
  })
  id: string;

  @ApiProperty({
    example: 'Design Squad',
    description: 'Name of the affiliated team',
  })
  name: string;

  @ApiProperty({
    example: 'New York',
    description: 'Location of the affiliated team',
  })
  location: string;

  @ApiProperty({
    example: '9am - 5pm',
    description: 'Working hours of the affiliated team',
  })
  time: string;
}
