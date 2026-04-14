import { PartialType } from '@nestjs/mapped-types';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Validate,
  ValidateNested,
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { CreateUserDto } from './create-user.dto';
import {
  hasOverlappingCustomAvailability,
  hasValidTimeRange,
} from '../availability-validation';

enum DAYS {
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

class CustomAvailabilityDto {
  @ApiPropertyOptional({ enum: DAYS })
  @IsNotEmpty()
  @IsEnum(DAYS)
  day: string;

  @Validate(IsValidTimeRangeConstraint)
  @ApiPropertyOptional()
  @IsString({ message: 'Start time required' })
  @IsNotEmpty({ message: 'Start time required' })
  @Matches(TIME_REGEX, {
    message: 'Start time must be in HH:MM format',
  })
  startTime: string;

  @ApiPropertyOptional()
  @IsString({ message: 'Start time period required' })
  @IsNotEmpty({ message: 'Start time period required' })
  @Matches(TIME_PERIOD_REGEX, { message: 'Start time period must be AM or PM' })
  startTimeDayPeriod: string;

  @ApiPropertyOptional()
  @IsString({ message: 'End time required' })
  @IsNotEmpty({ message: 'End time required' })
  @Matches(TIME_REGEX, {
    message: 'End time must be in HH:MM format',
  })
  endTime: string;

  @ApiPropertyOptional()
  @IsString({ message: 'End time period required' })
  @IsNotEmpty({ message: 'End time period required' })
  @Matches(TIME_PERIOD_REGEX, { message: 'End time period must be AM or PM' })
  endTimeDayPeriod: string;
}

export class UpdateUserDto extends PartialType(CreateUserDto) {
  @ApiPropertyOptional({ type: [CustomAvailabilityDto] })
  @IsOptional()
  @IsArray({ message: 'customAvailability must be an array' })
  @ValidateNested({ each: true })
  @Validate(HasNoOverlappingCustomAvailabilityConstraint)
  @Transform(({ value }) => {
    const parseValue = (raw: any): any[] => {
      if (typeof raw === 'string') {
        try {
          const parsed = JSON.parse(raw);
          return Array.isArray(parsed) ? parsed : [parsed];
        } catch {
          return [];
        }
      }
      if (Array.isArray(raw)) return raw;
      if (raw && typeof raw === 'object') return [raw];
      return [];
    };

    const entries = parseValue(value);
    return entries.flatMap((entry) => {
      if (!entry || typeof entry !== 'object') return [];

      if (Array.isArray(entry.times)) {
        return entry.times.map((slot: any) => ({
          day: entry.day,
          startTime: slot?.startTime,
          startTimeDayPeriod: slot?.startTimeDayPeriod,
          endTime: slot?.endTime,
          endTimeDayPeriod: slot?.endTimeDayPeriod,
        }));
      }

      return [entry];
    });
  })
  @Type(() => CustomAvailabilityDto)
  customAvailability?: CustomAvailabilityDto[] | null;
}
