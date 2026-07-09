import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsString, MinLength, MaxLength } from 'class-validator';
import { FavoriteType } from '../entities/favorite.entity';

export class CreateGroupDto {
  @ApiProperty({
    description: 'The name of the group',
    example: 'My Group Name',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name: string;

  @ApiProperty({
    description: 'Listing category this group is for',
    enum: FavoriteType,
    example: FavoriteType.PROJECT,
  })
  @IsEnum(FavoriteType)
  type: FavoriteType;
}
