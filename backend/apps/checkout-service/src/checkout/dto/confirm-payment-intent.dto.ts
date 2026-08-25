import { IsNotEmpty, IsString } from 'class-validator';

export class ConfirmPaymentIntentDto {
  @IsString()
  @IsNotEmpty()
  paymentIntentId: string;
}
