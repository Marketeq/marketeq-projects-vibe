import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';

export class CheckoutRateSelectionDto {
  @IsString()
  @MaxLength(100)
  roleKey!: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  experience?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  location?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  roleTitle?: string;
}

export class CalculateRateEstimateDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CheckoutRateSelectionDto)
  selections!: CheckoutRateSelectionDto[];
}
