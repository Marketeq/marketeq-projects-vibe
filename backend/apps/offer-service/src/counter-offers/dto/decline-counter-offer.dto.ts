// apps/offer-service/src/counter-offers/dto/decline-counter-offer.dto.ts
// BTB-287 follow-up: POST /v1/offers/:offerId/counter-offers/:id/decline —
// mirrors DeclineOfferDto (offers/dto/decline-offer.dto.ts) exactly: reason
// required, optional chip. The base-offer decline endpoint already accepted
// these; declining a counter offer had no DTO at all until now.
import { IsString, IsOptional, IsEnum, IsNotEmpty, MaxLength } from 'class-validator';
import { DeclineChip } from '../../offers/enums/decline-chip.enum';
import { MAX_DECLINE_REASON_LENGTH } from '../../common/constants/offer.constants';

export class DeclineCounterOfferDto {
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
