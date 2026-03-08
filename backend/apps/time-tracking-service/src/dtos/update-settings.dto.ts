import { IsBoolean, IsIn, IsOptional, IsString } from 'class-validator';

export class UpdateAdminSettingsDto {
  @IsOptional()
  @IsBoolean()
  allowDelete?: boolean;

  @IsOptional()
  @IsBoolean()
  allowBlur?: boolean;

  @IsOptional()
  @IsBoolean()
  autoApproveBlur?: boolean;

  @IsOptional()
  @IsBoolean()
  allowReassign?: boolean;

  @IsOptional()
  @IsBoolean()
  deletedNonBillable?: boolean;

  @IsOptional()
  @IsBoolean()
  blurredBillable?: boolean;
}

export class UpdateUserPreferencesDto {
  @IsOptional()
  @IsString()
  timezone?: string;

  @IsOptional()
  @IsIn(['MM/DD/YYYY', 'DD/MM/YYYY'])
  dateFormat?: 'MM/DD/YYYY' | 'DD/MM/YYYY';

  @IsOptional()
  @IsIn(['Sunday', 'Monday'])
  startOfWeek?: 'Sunday' | 'Monday';

  @IsOptional()
  @IsIn(['12h', '24h'])
  timeFormat?: '12h' | '24h';
}
