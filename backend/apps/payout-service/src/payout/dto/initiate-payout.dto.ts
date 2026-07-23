import { IsString, IsIn, IsUUID, IsNotEmpty, IsOptional, IsBoolean } from 'class-validator';

export class InitiatePayoutDto {
  @IsString() @IsNotEmpty()
  amountUsd: string;

  @IsIn(['instant', 'standard'])
  speed: 'instant' | 'standard';

  @IsUUID()
  depositMethodId: string;

  @IsUUID()
  idempotencyKey: string;

  // Same bypass as ValidateAmountDto.ignoreReserve — must be resent at
  // initiate() since that's the actual enforcement point; validateAmount()
  // is only ever a preview.
  @IsOptional() @IsBoolean()
  ignoreReserve?: boolean;
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
