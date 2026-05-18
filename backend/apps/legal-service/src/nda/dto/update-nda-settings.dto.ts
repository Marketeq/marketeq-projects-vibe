import { IsEnum, IsUUID, IsBoolean, IsOptional } from 'class-validator';
import { DisplayNameFormat } from '../enums/display-name-format.enum';

export class UpdateNdaSettingsDto {
  @IsOptional()
  @IsEnum(DisplayNameFormat)
  displayNameFormat?: DisplayNameFormat;

  @IsOptional()
  @IsUUID()
  companyId?: string;

  @IsOptional()
  @IsBoolean()
  jobTitleVisible?: boolean;

  @IsOptional()
  @IsBoolean()
  requireNdaToViewScope?: boolean;
}
