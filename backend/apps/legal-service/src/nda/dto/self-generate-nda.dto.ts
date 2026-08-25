import { IsUUID, IsString, MaxLength, IsEnum, IsOptional, IsBoolean } from 'class-validator';
import { DisplayNameFormat } from '../enums/display-name-format.enum';

export class SelfGenerateNdaDto {
  @IsUUID()
  jobListingId: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  listingTitle?: string;

  @IsOptional()
  @IsEnum(DisplayNameFormat)
  displayNameFormat?: DisplayNameFormat;

  @IsOptional()
  @IsUUID()
  companyId?: string;

  @IsOptional()
  @IsBoolean()
  jobTitleVisible?: boolean;
}
