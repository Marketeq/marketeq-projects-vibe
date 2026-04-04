import { IsString, IsIn, IsUUID, IsNotEmpty } from 'class-validator';

export class InitiatePayoutDto {
  @IsString() @IsNotEmpty()
  amountUsd: string;

  @IsIn(['instant', 'standard'])
  speed: 'instant' | 'standard';

  @IsUUID()
  depositMethodId: string;

  @IsUUID()
  idempotencyKey: string;
}

export class InitiatePayoutResponseDto {
  payoutRequestId:    string;
  status:             string;
  amountUsd:          string;
  feeUsd:             string;
  netAmountUsd:       string;
  magicLinkSentTo:    string;
  magicLinkExpiresAt: string;
  message:            string;
  replayed?:          boolean;
}
