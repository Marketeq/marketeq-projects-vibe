import { IsString, IsIn, IsNotEmpty } from 'class-validator';

export class ValidateAmountDto {
  @IsString() @IsNotEmpty()
  amountUsd: string;

  @IsIn(['instant', 'standard'])
  speed: 'instant' | 'standard';
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
