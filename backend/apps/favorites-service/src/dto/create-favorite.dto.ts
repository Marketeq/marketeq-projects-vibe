import { IsEnum, IsNotEmpty, IsOptional, IsUUID, IsString, MaxLength } from 'class-validator';
import { FavoriteType } from '../entities/favorite.entity';

export class CreateFavoriteDto {
  @IsEnum(FavoriteType)
  type: FavoriteType;

  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  itemId: string;

  @IsUUID()
  @IsOptional()
  groupId?: string;
}

export class CreateGroupDto {
  @IsString()
  @MaxLength(100)
  name: string;
}

export class UpdateFavoriteDto {
  @IsUUID()
  groupId: string;
}
