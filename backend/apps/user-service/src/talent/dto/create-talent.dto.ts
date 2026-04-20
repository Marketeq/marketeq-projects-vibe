import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MinLength,
  Validate,
  ValidateNested,
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { AVAILABILITY } from '../enum/availability.enum';
import {
  hasOverlappingCustomAvailability,
  hasValidTimeRange,
} from '../../user/availability-validation';

export enum DAYS {
  Sunday = 'Sunday',
  Monday = 'Monday',
  Tuesday = 'Tuesday',
  Wednesday = 'Wednesday',
  Thursday = 'Thursday',
  Friday = 'Friday',
  Saturday = 'Saturday',
}

const TIME_REGEX = /^\d{2}:\d{2}$/;
const TIME_PERIOD_REGEX = /^(AM|PM)$/;
const USERNAME_PATTERN = /^[a-z0-9_]+$/;
const USERNAME_RULE_MESSAGE =
  'Username can only contain letters, numbers, and underscores';

@ValidatorConstraint({ name: 'IsValidTimeRange', async: false })
class IsValidTimeRangeConstraint implements ValidatorConstraintInterface {
  validate(_: unknown, args: ValidationArguments) {
    const obj = args.object as CustomAvailabilityDto;
    return hasValidTimeRange(obj);
  }

  defaultMessage(_: ValidationArguments) {
    return 'End time must be after start time and on the same day.';
  }
}

@ValidatorConstraint({ name: 'HasNoOverlappingCustomAvailability', async: false })
class HasNoOverlappingCustomAvailabilityConstraint
  implements ValidatorConstraintInterface
{
  validate(value?: CustomAvailabilityDto[]) {
    return !hasOverlappingCustomAvailability(value);
  }

  defaultMessage() {
    return 'Custom availability slots cannot overlap on the same day.';
  }
}

const toOptionalTrimmedString = ({ value }: { value: unknown }) => {
  if (typeof value !== 'string') return value;
  const trimmedValue = value.trim();
  return trimmedValue.length ? trimmedValue : undefined;
};

const toOptionalStringArray = ({ value }: { value: unknown }) => {
  if (typeof value === 'string') {
    const trimmedValue = value.trim();
    return trimmedValue.length ? [trimmedValue] : undefined;
  }

  if (!Array.isArray(value)) return value;

  const normalizedValues = value.filter(
    (item): item is string =>
      typeof item === 'string' && item.trim().length > 0,
  );

  return normalizedValues.length ? normalizedValues : undefined;
};

class CustomAvailabilityDto {
  @Validate(IsValidTimeRangeConstraint)
  @ApiProperty()
  @IsString({ message: 'Start time required' })
  @IsNotEmpty({ message: 'Start time required' })
  @Matches(TIME_REGEX, {
    message: 'Start time must be in HH:MM format',
  })
  startTime: string;

  @ApiProperty()
  @IsString({ message: 'Start time period required' })
  @IsNotEmpty({ message: 'Start time period required' })
  @Matches(TIME_PERIOD_REGEX, { message: 'Start time period must be AM or PM' })
  startTimeDayPeriod: string;

  @ApiProperty()
  @IsString({ message: 'Start time required' })
  @IsNotEmpty({ message: 'Start time required' })
  @Matches(TIME_REGEX, {
    message: 'Start time must be in HH:MM format',
  })
  endTime: string;

  @ApiProperty()
  @IsString({ message: 'Start time period required' })
  @IsNotEmpty({ message: 'Start time period required' })
  @Matches(TIME_PERIOD_REGEX, { message: 'Start time period must be AM or PM' })
  endTimeDayPeriod: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsEnum(DAYS)
  day: string;
}

export class CreateTalentDto {
  @ApiProperty()
  @IsOptional()
  @IsString({ message: 'First name is required' })
  @Transform(toOptionalTrimmedString)
  firstName?: string;

  @ApiProperty()
  @IsOptional()
  @IsString({ message: 'Last name is required' })
  @Transform(toOptionalTrimmedString)
  lastName?: string;

  @ApiProperty()
  @IsOptional()
  @IsString({ message: 'Username must be a string' })
  @MinLength(3, { message: 'Username must be at least 3 characters long' })
  @Matches(USERNAME_PATTERN, {
    message: USERNAME_RULE_MESSAGE,
  })
  @Transform(({ value }) => {
    if (typeof value !== 'string') return value;
    const normalized = value.toLowerCase().trim();
    // Treat empty/whitespace usernames as "not provided" so we don't write `''`.
    return normalized === '' ? undefined : normalized;
  })
  username?: string;

  @ApiProperty()
  @IsOptional()
  @IsString({ message: 'Location is required' })
  @Transform(toOptionalTrimmedString)
  location?: string;

  @ApiProperty()
  @IsOptional()
  @IsString({ message: 'Language is required' })
  @Transform(toOptionalTrimmedString)
  language?: string;

  @ApiProperty()
  @IsOptional()
  @IsString({ message: 'Recent job title is required' })
  @Transform(toOptionalTrimmedString)
  recentJobTitle?: string;

  @ApiProperty()
  @IsOptional()
  @IsString({ message: 'Industry is required' })
  @Transform(toOptionalTrimmedString)
  industriesWorkedIn?: string;

  @ApiProperty({ type: [String] })
  @IsOptional()
  @IsArray({ message: 'Looking to work with are required' })
  @Transform(toOptionalStringArray)
  lookingToWorkWith?: string[];

  @ApiProperty()
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => {
    if (value === undefined || value === null || value === '') return undefined;
    if (value === true || value === 'true' || value === '1' || value === 'yes')
      return true;
    if (
      value === false ||
      value === 'false' ||
      value === '0' ||
      value === 'no'
    )
      return false;
    return value;
  })
  isStudent: boolean;

  @ApiProperty()
  @IsOptional()
  @IsArray({ message: 'Types of projects are required' })
  @Transform(toOptionalStringArray)
  projectTypes?: string[];

  @ApiProperty({ default: AVAILABILITY.FULL_TIME })
  @IsOptional()
  @Transform(toOptionalTrimmedString)
  @IsEnum(AVAILABILITY)
  availability?: string;

  @ApiProperty({ type: [CustomAvailabilityDto] })
  @IsOptional()
  @IsArray({ message: 'Custom availability is required' })
  @ValidateNested({ each: true, message: 'Each custom availability entry must be valid.' })
  @Validate(HasNoOverlappingCustomAvailabilityConstraint)
  @Type(() => CustomAvailabilityDto)
  @Transform(({ value }) => {
    const toDto = (obj: any): CustomAvailabilityDto => {
      const dto = new CustomAvailabilityDto();
      dto.day = obj?.day;
      dto.startTime = obj?.startTime;
      dto.startTimeDayPeriod = obj?.startTimeDayPeriod;
      dto.endTime = obj?.endTime;
      dto.endTimeDayPeriod = obj?.endTimeDayPeriod;
      return dto;
    };

    const flattenEntries = (entries: any[]): CustomAvailabilityDto[] => {
      const output: CustomAvailabilityDto[] = [];

      entries.forEach((entry) => {
        if (!entry || typeof entry !== 'object') return;

        // Supports nested payload shape:
        // { day: "Monday", times: [{ startTime, startTimeDayPeriod, endTime, endTimeDayPeriod }] }
        if (Array.isArray(entry.times)) {
          entry.times.forEach((slot: any) => {
            output.push(
              toDto({
                day: entry.day,
                startTime: slot?.startTime,
                startTimeDayPeriod: slot?.startTimeDayPeriod,
                endTime: slot?.endTime,
                endTimeDayPeriod: slot?.endTimeDayPeriod,
              }),
            );
          });
          return;
        }

        // Supports flat payload shape:
        // { day, startTime, startTimeDayPeriod, endTime, endTimeDayPeriod }
        output.push(toDto(entry));
      });

      return output;
    };

    const parseValue = (raw: any): any[] => {
      if (typeof raw === 'string') {
        try {
          const parsed = JSON.parse(raw);
          return Array.isArray(parsed) ? parsed : [parsed];
        } catch {
          return [];
        }
      }

      if (Array.isArray(raw)) {
        return raw.map((item) => {
          if (typeof item === 'string') {
            try {
              return JSON.parse(item);
            } catch {
              return null;
            }
          }
          return item;
        });
      }

      if (raw && typeof raw === 'object') {
        return [raw];
      }
      return [];
    };

    return flattenEntries(parseValue(value));
  })
  customAvailability?: CustomAvailabilityDto[];
}
