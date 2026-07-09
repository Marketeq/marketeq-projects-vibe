// apps/offer-service/src/offers/dto/resend-offer.dto.ts
// OS-11: POST /v1/offers/:id/resend — optional message
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { MAX_MESSAGE_LENGTH } from '../../common/constants/offer.constants';

export class ResendOfferDto {
  @IsOptional()
  @IsString()
  @MaxLength(MAX_MESSAGE_LENGTH, {
    message: `message cannot exceed ${MAX_MESSAGE_LENGTH} characters.`,
  })
  message?: string;
}