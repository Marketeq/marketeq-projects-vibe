import {
  IsBoolean,
  IsEmail,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
  Matches,
  registerDecorator,
  ValidationOptions,
  validateSync,
} from 'class-validator';
import { Type, plainToInstance } from 'class-transformer';

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

function IsRecordOf<T>(cls: new () => T, validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isRecordOf',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown) {
          if (value === undefined || value === null) return true;
          if (typeof value !== 'object' || Array.isArray(value)) return false;
          for (const [, v] of Object.entries(value)) {
            if (v === null || typeof v !== 'object' || Array.isArray(v)) return false;
            const instance = plainToInstance(cls, v);
            const errors = validateSync(instance as object, {
              whitelist: true,
              forbidNonWhitelisted: true,
            });
            if (errors.length > 0) return false;
          }
          return true;
        },
        defaultMessage() {
          return `${propertyName} must be a record of valid ${cls.name} objects`;
        },
      },
    });
  };
}

export class UpdatePreferencesDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => GlobalChannelsDto)
  channels?: GlobalChannelsDto;

  @IsOptional()
  @IsObject()
  @IsRecordOf(CategoryPrefDto)
  categories?: Record<string, CategoryPrefDto>;

  @IsOptional()
  @IsObject()
  @IsRecordOf(NotificationPrefDto)
  notifications?: Record<string, NotificationPrefDto>;
}
