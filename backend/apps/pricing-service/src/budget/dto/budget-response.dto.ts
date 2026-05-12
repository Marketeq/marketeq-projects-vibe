// Per-role breakdown returned alongside the total.
export class BudgetRoleResultDto {
  roleTitle!: string;
  location!: string | null;
  experienceLevel!: string | null;
  schedule!: string | null;
  estimatedHours!: number;
  hourlyRateUsdCents!: number | null; // Median rate used for calculation.
  roleTotalUsdCents!: number | null;  // estimatedHours * hourlyRateUsdCents.
  isStale!: boolean;                  // True if rate data is stale.
  noData!: boolean;                   // True if no rate data found.
}

export class BudgetResponseDto {
  // Sum of all roleTotalUsdCents values.
  // Roles with noData: true contribute 0 to this total.
  totalUsdCents!: number;

  // True if any role in the calculation used stale rate data.
  hasStaleData!: boolean;

  // True if any role had no rate data and contributed 0 to the total.
  hasNoData!: boolean;

  // Per-role breakdown. One entry per BudgetRoleInputDto in the request.
  roles!: BudgetRoleResultDto[];
}
