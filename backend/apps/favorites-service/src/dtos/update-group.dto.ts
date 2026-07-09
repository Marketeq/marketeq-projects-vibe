import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength, MaxLength } from 'class-validator';

export class UpdateGroupDto {
  @ApiProperty({
    description: 'The name of the group',
    example: 'My Favorite Projects',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name!: string;
}
