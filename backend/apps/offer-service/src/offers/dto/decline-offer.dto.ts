// apps/offer-service/src/offers/dto/decline-offer.dto.ts
// OS-11: POST /v1/offers/:id/decline — reason required, optional chip
import { IsString, IsOptional, IsEnum, IsNotEmpty, MaxLength } from 'class-validator';
import { DeclineChip } from '../enums/decline-chip.enum';
import { MAX_DECLINE_REASON_LENGTH } from '../../common/constants/offer.constants';

export class DeclineOfferDto {
  @IsString()
  @IsNotEmpty({ message: 'A decline reason is required.' })
  @MaxLength(MAX_DECLINE_REASON_LENGTH, {
    message: `reason cannot exceed ${MAX_DECLINE_REASON_LENGTH} characters.`,
  })
  reason: string;

  @IsOptional()
  @IsEnum(DeclineChip, { message: 'chip must be a valid DeclineChip value.' })
  chip?: DeclineChip;
}