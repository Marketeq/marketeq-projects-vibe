// apps/offer-service/src/offers/dto/create-offer.dto.ts
// OS-11: Full validation for POST /v1/offers
import {
  IsUUID, IsEnum, IsInt, IsString, IsOptional, MaxLength,
  Min, Max, Length, IsUppercase, ValidateNested, ValidateIf, IsNotEmpty,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ContractType, CONTRACT_TYPES_REQUIRING_TITLE } from '../enums/contract-type.enum';
import { WorkScheduleDto } from '../../common/dto/work-schedule.dto';
import { IsIso8601DateString } from '../../common/validators/is-iso8601-date-string.validator';
import { IsFutureDate } from '../../common/validators/is-future-date.validator';
import { IsNotTooFarFuture } from '../../common/validators/is-not-too-far-future.validator';
import {
  MIN_RATE, MAX_RATE,
  MIN_DURATION_MONTHS, MAX_DURATION_MONTHS,
  MAX_CONTRACT_TITLE_LENGTH, MAX_MESSAGE_LENGTH,
  CURRENCY_CODE_LENGTH,
} from '../../common/constants/offer.constants';

export class CreateOfferDto {
  @IsUUID('4', { message: 'talentId must be a valid UUID v4.' })
  talentId: string;

  // BTB-364/D1: optional — a "Hire Me" offer sent directly from a talent's
  // profile has no job listing at all (confirmed: HireMeButton has no
  // listing/project prop anywhere). @ValidateIf skips @IsUUID entirely when
  // the field is absent/null, same shape as every other optional field in
  // this DTO; still validated as a real UUID whenever a caller does send one
  // (e.g. the inbox's Resend Offer flow, which always has one). Requires
  // the matching migration making offer_service.offers.job_listing_id
  // nullable — see backend/apps/offer-service/migrations.
  @ValidateIf((o: CreateOfferDto) => o.jobListingId !== undefined && o.jobListingId !== null)
  @IsUUID('4', { message: 'jobListingId must be a valid UUID v4.' })
  jobListingId?: string | null;

  @IsEnum(ContractType, {
    message: 'contractType must be one of: PROJECT, SERVICE, TEAM, CONTRACT.',
  })
  contractType: ContractType;

  @ValidateIf((o: CreateOfferDto) => CONTRACT_TYPES_REQUIRING_TITLE.includes(o.contractType))
  @IsNotEmpty({
    message: 'contractTitle is required for TEAM, CONTRACT, and SERVICE contract types.',
  })
  @IsString()
  @MaxLength(MAX_CONTRACT_TITLE_LENGTH, {
    message: `contractTitle cannot exceed ${MAX_CONTRACT_TITLE_LENGTH} characters.`,
  })
  contractTitle?: string;

  @IsInt({ message: 'rate must be a whole number with no decimal places.' })
  @Min(MIN_RATE, { message: `rate must be at least $${MIN_RATE}.` })
  @Max(MAX_RATE, { message: `rate cannot exceed $${MAX_RATE}.` })
  @Type(() => Number)
  rate: number;

  @IsString()
  @Length(CURRENCY_CODE_LENGTH, CURRENCY_CODE_LENGTH, {
    message: 'currencyCode must be exactly 3 characters (e.g. USD, EUR, GBP).',
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