import {
  IsBoolean,
  IsEmail,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
  Matches,
} from 'class-validator';
import { Type } from 'class-transformer';

export class InAppChannelDto {
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsBoolean()
  bell?: boolean;

  @IsOptional()
  @IsBoolean()
  popup?: boolean;

  @IsOptional()
  @IsBoolean()
  browser?: boolean;
}

export class EmailChannelDto {
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsEmail()
  address?: string | null;
}

export class SmsChannelDto {
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @Matches(/^\+?[1-9]\d{6,14}$/, {
    message: 'phone must be a valid E.164-style phone number',
  })
  phone?: string | null;
}

export class GlobalChannelsDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => InAppChannelDto)
  inApp?: InAppChannelDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => EmailChannelDto)
  email?: EmailChannelDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => SmsChannelDto)
  sms?: SmsChannelDto;
}

export class ScopedChannelDto {
  @IsOptional()
  @IsBoolean()
  inApp?: boolean;

  @IsOptional()
  @IsBoolean()
  email?: boolean;

  @IsOptional()
  @IsBoolean()
  sms?: boolean;
}

export class CategoryPrefDto {
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @ValidateNested()
  @Type(() => ScopedChannelDto)
  channels?: ScopedChannelDto;
}

export class NotificationPrefDto {
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @ValidateNested()
  @Type(() => ScopedChannelDto)
  channels?: ScopedChannelDto;
}

export class UpdatePreferencesDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => GlobalChannelsDto)
  channels?: GlobalChannelsDto;

  @IsOptional()
  @IsObject()
  categories?: Record<string, CategoryPrefDto>;

  @IsOptional()
  @IsObject()
  notifications?: Record<string, NotificationPrefDto>;
}
