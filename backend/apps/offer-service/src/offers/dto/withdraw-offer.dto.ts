// apps/offer-service/src/offers/dto/withdraw-offer.dto.ts
// OS-11: POST /v1/offers/:id/withdraw — optional withdrawal message
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { MAX_MESSAGE_LENGTH } from '../../common/constants/offer.constants';

export class WithdrawOfferDto {
  @IsOptional()
  @IsString()
  @MaxLength(MAX_MESSAGE_LENGTH, {
    message: `message cannot exceed ${MAX_MESSAGE_LENGTH} characters.`,
  })
  message?: string;
}