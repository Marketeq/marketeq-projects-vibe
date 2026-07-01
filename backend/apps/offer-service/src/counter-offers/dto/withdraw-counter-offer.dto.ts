// apps/offer-service/src/counter-offers/dto/withdraw-counter-offer.dto.ts
// OS-11: POST /v1/offers/:offerId/counter-offers/:id/withdraw — optional message
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { MAX_MESSAGE_LENGTH } from '../../common/constants/offer.constants';

export class WithdrawCounterOfferDto {
  @IsOptional()
  @IsString()
  @MaxLength(MAX_MESSAGE_LENGTH, {
    message: `message cannot exceed ${MAX_MESSAGE_LENGTH} characters.`,
  })
  message?: string;
}