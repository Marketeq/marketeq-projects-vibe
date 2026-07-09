// apps/offer-service/src/counter-offers/dto/edit-counter-offer.dto.ts
// OS-11: PATCH /v1/offers/:offerId/counter-offers/:id — in-place edit, all fields optional
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

export class EditCounterOfferDto {
  @IsOptional()
  @IsInt({ message: 'rate must be a whole number.' })
  @Min(MIN_RATE, { message: `rate must be at least $${MIN_RATE}.` })
  @Max(MAX_RATE, { message: `rate cannot exceed $${MAX_RATE}.` })
  @Type(() => Number)
  rate?: number;

  @IsOptional()
  @IsString()
  @Length(CURRENCY_CODE_LENGTH, CURRENCY_CODE_LENGTH, {
    message: 'currencyCode must be exactly 3 characters.',
  })
  @IsUppercase({ message: 'currencyCode must be uppercase.' })
  currencyCode?: string;

  @IsOptional()
  @IsInt({ message: 'durationMonths must be a whole number.' })
  @Min(MIN_DURATION_MONTHS, { message: `durationMonths must be at least ${MIN_DURATION_MONTHS}.` })
  @Max(MAX_DURATION_MONTHS, { message: `durationMonths cannot exceed ${MAX_DURATION_MONTHS}.` })
  @Type(() => Number)
  durationMonths?: number;

  @IsOptional()
  @ValidateNested()
  @Type(() => WorkScheduleDto)
  workSchedule?: WorkScheduleDto;

  @IsOptional()
  @IsString()
  @IsIso8601DateString()
  @IsFutureDate()
  @IsNotTooFarFuture()
  startDate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(MAX_MESSAGE_LENGTH, {
    message: `message cannot exceed ${MAX_MESSAGE_LENGTH} characters.`,
  })
  message?: string;
}