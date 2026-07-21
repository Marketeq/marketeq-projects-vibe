import { IsString, IsIn, IsNotEmpty, IsOptional, IsBoolean } from 'class-validator';

export class ValidateAmountDto {
  @IsString() @IsNotEmpty()
  amountUsd: string;

  @IsIn(['instant', 'standard'])
  speed: 'instant' | 'standard';

  // Figma "Your withdrawal was declined — reserve balance is too low":
  // the contractor can explicitly bypass the reserve-balance floor for
  // this one transfer rather than being hard-blocked.
  @IsOptional() @IsBoolean()
  ignoreReserve?: boolean;
}

export class ValidateAmountResponseDto {
  amountUsd:           string;
  speed:               string;
  feeUsd:              string;
  netAmountUsd:        string;
  availableBalanceUsd: string;
  balanceAfterUsd:     string;
  meetsMinimum:        boolean;
  standardPreview:     { feeUsd: string; netAmountUsd: string };
  instantPreview:      { feeUsd: string; netAmountUsd: string };
}
