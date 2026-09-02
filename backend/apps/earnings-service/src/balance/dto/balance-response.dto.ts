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
  // ES-06 EC-13: true when the talent's region currency couldn't be
  // resolved and this response fell back to USD — frontend surfaces the
  // Currency Settings entry point when set.
  currencyFallback?:       boolean;
}
