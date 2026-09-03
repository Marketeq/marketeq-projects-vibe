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

  // The frontend's own base URL for the magic-link confirmation page (e.g.
  // "https://staging.marketeq.com/verify-withdrawal") — one shared backend
  // serves three different Vercel frontends (dev/staging/live), so it can't
  // guess which one to point the email link at. Same pattern as
  // AuthService.resolveTrustedPasswordResetBase()'s redirectUrl: only used
  // if its origin is on the FRONTEND_URL trusted list server-side, never
  // trusted blindly.
  @IsOptional() @IsString()
  redirectUrl?: string;
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
