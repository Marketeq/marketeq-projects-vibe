import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class UpsertTaxInfoDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(160)
  legalFullName?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(80)
  federalTaxClassification?: string;

  @ApiPropertyOptional({ enum: ['SSN', 'EIN'] })
  @IsOptional() @IsIn(['SSN', 'EIN'])
  tinType?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(32)
  tin?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(80)
  country?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(160)
  addressLine1?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(160)
  addressLine2?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(80)
  city?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(80)
  stateOrProvince?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(20)
  postalCode?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(160)
  signature?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(10)
  signedDate?: string;

  @ApiPropertyOptional() @IsOptional() @IsBoolean()
  consentESignature?: boolean;

  @ApiPropertyOptional() @IsOptional() @IsBoolean()
  consentDigitalDelivery?: boolean;
}
