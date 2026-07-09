export class RatesResponseDto {
  // The queried role. Null if no role was specified (cross-role average).
  role!: string | null;

  // The queried region. Null if no region was specified.
  location!: string | null;

  // The queried experience level. Null if none specified.
  experience!: string | null;

  // The queried schedule. Null if none specified.
  schedule!: string | null;

  // ── RATE DATA ──────────────────────────────────────────────────
  // All rate values are in USD cents (integer).
  // Null when no_data is true (no records match the query dimensions).
  hourlyRateLowUsdCents!: number | null;
  hourlyRateMedianUsdCents!: number | null;
  hourlyRateHighUsdCents!: number | null;

  // Number of transactions the rate is based on.
  // Null when no_data is true.
  sampleSize!: number | null;

  // ── DATA QUALITY FLAGS ─────────────────────────────────────────
  // True when rate data exists but is older than RATE_STALE_THRESHOLD_HOURS.
  // The frontend shows a stale indicator and Refresh button when true.
  isStale!: boolean;

  // Timestamp of last successful rate refresh. Null when no_data is true.
  lastUpdated!: string | null;

  // True when no matching rate record exists in the database.
  // All rate values are null when this is true.
  // The frontend shows a dash (—) in the budget calculator.
  noData!: boolean;
}
