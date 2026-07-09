import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class UpdateFavoriteDto {
  @ApiProperty({
    description: 'The ID of the group to which the favorite belongs',
    example: '73c2d1dc-f844-400c-b974-b910940a2ebe',
  })
  @IsUUID()
  groupId: string;
}
