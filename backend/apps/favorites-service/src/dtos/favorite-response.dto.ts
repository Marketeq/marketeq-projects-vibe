import { ApiProperty } from '@nestjs/swagger';
import { FavoriteType } from '../entities/favorite.entity';

export class FavoriteResponseDto {
  @ApiProperty({ example: '73c2d1dc-f844-400c-b974-b910940a2ebe' })
  id: string;

  @ApiProperty({ example: '73c2d1dc-f844-400c-b974-b910940a2ebe' })
  userId: string;

  @ApiProperty({ example: 'cc12ce7a-6dd3-4ecd-86d6-abd18294de50' })
  groupId: string;

  @ApiProperty({ enum: FavoriteType, example: FavoriteType.PROJECT })
  type: FavoriteType;

  @ApiProperty({ example: 'cc12ce7a-6dd3-4ecd-86d6-abd18294de50' })
  itemId: string;

  @ApiProperty({ example: '2026-01-25T00:00:00.000Z' })
  createdAt: Date;
}
