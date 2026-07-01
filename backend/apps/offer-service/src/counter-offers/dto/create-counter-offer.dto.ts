// apps/offer-service/src/counter-offers/dto/create-counter-offer.dto.ts
// OS-11: POST /v1/offers/:offerId/counter-offers
import {
  IsInt, IsString, IsOptional, MaxLength, Min, Max,
  Length, IsUppercase, ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { WorkScheduleDto } from '../../common/dto/work-schedule.dto';
import { IsIso8601DateString } from '../../common/validators/is-iso8601-date-string.validator';
import { IsFutureDate } from '../../common/validators/is-future-date.validator';
import { IsNotTooFarFuture } from '../../common/validators/is-not-too-far-future.validator';
import {
  MIN_RATE, MAX_RATE, MIN_DURATION_MONTHS, MAX_DURATION_MONTHS,
  MAX_MESSAGE_LENGTH, CURRENCY_CODE_LENGTH,
} from '../../common/constants/offer.constants';

export class CreateCounterOfferDto {
  @IsInt({ message: 'rate must be a whole number.' })
  @Min(MIN_RATE, { message: `rate must be at least $${MIN_RATE}.` })
  @Max(MAX_RATE, { message: `rate cannot exceed $${MAX_RATE}.` })
  @Type(() => Number)
  rate: number;

  @IsString()
  @Length(CURRENCY_CODE_LENGTH, CURRENCY_CODE_LENGTH, {
    message: 'currencyCode must be exactly 3 characters.',
  })
  @IsUppercase({ message: 'currencyCode must be uppercase.' })
  currencyCode: string;

  @IsInt({ message: 'durationMonths must be a whole number of months.' })
  @Min(MIN_DURATION_MONTHS, { message: `durationMonths must be at least ${MIN_DURATION_MONTHS}.` })
  @Max(MAX_DURATION_MONTHS, { message: `durationMonths cannot exceed ${MAX_DURATION_MONTHS}.` })
  @Type(() => Number)
  durationMonths: number;

  @ValidateNested({ message: 'workSchedule must be a valid schedule object.' })
  @Type(() => WorkScheduleDto)
  workSchedule: WorkScheduleDto;

  @IsString()
  @IsIso8601DateString()
  @IsFutureDate()
  @IsNotTooFarFuture()
  startDate: string;

  @IsOptional()
  @IsString()
  @MaxLength(MAX_MESSAGE_LENGTH, {
    message: `message cannot exceed ${MAX_MESSAGE_LENGTH} characters.`,
  })
  message?: string;
}