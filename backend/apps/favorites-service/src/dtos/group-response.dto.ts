import { ApiProperty } from '@nestjs/swagger';
import { FavoriteType } from '../entities/favorite.entity';

export class GroupResponseDto {
  @ApiProperty({ example: '73c2d1dc-f844-400c-b974-b910940a2ebe' })
  id: string;

  @ApiProperty({ example: '73c2d1dc-f844-400c-b974-b910940a2ebe' })
  userId: string;

  @ApiProperty({ example: 'My Group Name' })
  name: string;

  @ApiProperty({ enum: FavoriteType, example: FavoriteType.PROJECT })
  type: FavoriteType;

  @ApiProperty({ example: '2026-01-25T00:00:00.000Z' })
  createdAt: Date;
}
