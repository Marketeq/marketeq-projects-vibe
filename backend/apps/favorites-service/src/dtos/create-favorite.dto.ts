import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { FavoriteType } from '../entities/favorite.entity';
import { ApiProperty } from '@nestjs/swagger';

export class CreateFavoriteDto {
  @ApiProperty({
    description: 'The type of the favorite item',
    enum: FavoriteType,
    example: FavoriteType.PROJECT,
  })
  @IsEnum(FavoriteType)
  type: FavoriteType;

  @ApiProperty({
    description: 'The ID of the favorite item',
    example: '73c2d1dc-f844-400c-b974-b910940a2ebe',
  })
  @IsUUID('4')
  itemId: string;

  @ApiProperty({
    description: 'The UUID of the group to which the favorite belongs',
    example: '73c2d1dc-f844-400c-b974-b910940a2ebe',
  })
  @IsOptional()
  @IsUUID()
  groupId?: string;
}
