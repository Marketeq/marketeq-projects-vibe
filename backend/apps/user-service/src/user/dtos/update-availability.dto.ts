import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsString,
  Matches,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { AVAILABILITY } from '../../talent/enum/availability.enum';

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

class CustomAvailabilityDto {
  @ApiProperty({ enum: DAYS })
  @IsNotEmpty()
  @IsEnum(DAYS)
  day: string;

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
  @IsString({ message: 'End time required' })
  @IsNotEmpty({ message: 'End time required' })
  @Matches(TIME_REGEX, {
    message: 'End time must be in HH:MM format',
  })
  endTime: string;

  @ApiProperty()
  @IsString({ message: 'End time period required' })
  @IsNotEmpty({ message: 'End time period required' })
  @Matches(TIME_PERIOD_REGEX, { message: 'End time period must be AM or PM' })
  endTimeDayPeriod: string;
}

export class UpdateAvailabilityDto {
  @ApiProperty({ enum: AVAILABILITY })
  @IsEnum(AVAILABILITY)
  @IsNotEmpty()
  availability: AVAILABILITY;

  @ApiPropertyOptional({ type: [CustomAvailabilityDto] })
  @ValidateIf(
    (o) =>
      o.availability === AVAILABILITY.CUSTOM ||
      o.customAvailability !== undefined,
  )
  @IsArray({ message: 'customAvailability must be an array' })
  @ArrayNotEmpty({ message: 'customAvailability cannot be empty' })
  @ValidateNested({ each: true })
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
    const normalized = entries.flatMap((entry) => {
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

    return normalized;
  })
  @Type(() => CustomAvailabilityDto)
  customAvailability?: CustomAvailabilityDto[];
}
