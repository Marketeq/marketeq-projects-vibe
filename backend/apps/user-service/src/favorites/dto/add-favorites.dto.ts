import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { ListingType } from '../enums/listing-type.enum';

export class CreateFavoritesDto {
  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'Unique identifier of the listing being favorited',
  })
  @IsString()
  @IsNotEmpty()
  listingId: string;

  @ApiProperty({
    example: ListingType.PROJECT,
    description: 'Type of the listing being favorited',
    enum: ListingType,
  })
  @IsEnum(ListingType)
  listingType: ListingType;
}
