export class CurrencyResponseDto {
  // Original amount in the from currency.
  amount!: number;

  // Converted amount in the to currency.
  // Rounded to 2 decimal places.
  converted!: number;

  // The exchange rate applied: 1 from = rate to.
  rate!: number;

  // ISO 4217 codes.
  from!: string;
  to!: string;

  // UTC timestamp when this rate was last fetched from the FX API.
  fetchedAt!: string;

  // True if the rate is older than FX_CACHE_TTL_SECONDS.
  isStale!: boolean;
}

export class AllRatesResponseDto {
  // Base currency. Always "USD".
  base!: string;

  // Map of ISO 4217 code to exchange rate.
  // Example: { "EUR": 0.9231, "GBP": 0.7845, "CAD": 1.3612 }
  rates!: Record<string, number>;

  // UTC timestamp of the most recent successful FX refresh.
  fetchedAt!: string;

  // True if the rates are older than FX_CACHE_TTL_SECONDS.
  isStale!: boolean;
}
