import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { IsAllowedIpAddress } from './allowed-ip-address.validator';

export class CreateAllowedIpDto {
  @IsAllowedIpAddress()
  address!: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;
}

export class UpdateAllowedIpDto {
  @IsOptional()
  @IsAllowedIpAddress()
  address?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;
}

/**
 * CSV import. Capped at 500 per request: the screen imports a file the user
 * picked, and an uncapped array is an unbounded write behind a single call.
 */
export class BulkCreateAllowedIpsDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(500)
  @ValidateNested({ each: true })
  @Type(() => CreateAllowedIpDto)
  entries!: CreateAllowedIpDto[];
}
