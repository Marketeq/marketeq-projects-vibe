import {
  IsUUID,
  IsString,
  MaxLength,
  IsEnum,
  IsOptional,
  IsBoolean,
} from 'class-validator';
import { DisplayNameFormat } from '../enums/display-name-format.enum';

export class GenerateNdaDto {
  @IsUUID()
  jobListingId: string;

  @IsUUID()
  clientUserId: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  listingTitle?: string;

  @IsOptional()
  @IsEnum(DisplayNameFormat)
  displayNameFormat?: DisplayNameFormat;

  /**
   * Required when displayNameFormat = COMPANY_REPRESENTATIVE.
   * Validated at service level — cannot be expressed as a DTO-only constraint.
   */
  @IsOptional()
  @IsUUID()
  companyId?: string;

  @IsOptional()
  @IsBoolean()
  jobTitleVisible?: boolean;
}
