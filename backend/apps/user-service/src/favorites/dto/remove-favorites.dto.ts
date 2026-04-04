import { IsString } from 'class-validator';

export class RemoveFavoritesDto {
  @IsString()
  listingId: string;
}
