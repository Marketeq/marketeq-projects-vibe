export class BalanceResponseDto {
  availableBalance:        string;
  availableBalanceDisplay: string;
  displayCurrency:         string;
  availableBalanceLocal:   string;
  localCurrency:           string;
  reserveBalance:          string;
  pendingHoldUsd:          string;
  totalEarnedUsd:          string;
  totalPaidOutUsd:         string;
  displayLabel:            string;
  stale:                   boolean;
  lastUpdatedAt:           string;
  cachedAt:                string;
}
