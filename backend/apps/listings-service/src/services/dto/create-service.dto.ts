import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  IsNumber,
  Min,
  IsEnum,
} from 'class-validator';
import { ListingStatus } from '../../shared/enums/listing.enum';

export class CreateServiceDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsString()
  @IsOptional()
  category?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  skills?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  industry?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  mediaUrls?: string[];

  @IsEnum(ListingStatus)
  @IsOptional()
  status?: ListingStatus;

  @IsNumber()
  @Min(0)
  @IsOptional()
  priceMin?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  priceMax?: number;

  @IsString()
  @IsOptional()
  deliveryTime?: string;
}
