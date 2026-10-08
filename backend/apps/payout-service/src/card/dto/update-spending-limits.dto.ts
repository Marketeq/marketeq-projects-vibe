// apps/payout-service/src/card/dto/update-spending-limits.dto.ts
// PS-13 §5: admin spending-limit overrides.
// Reviewer-caught bug: the inline object type this replaced had a runtime
// metatype of `Object`, which the global ValidationPipe (whitelist/
// forbidNonWhitelisted/transform in main.ts) silently skips — nothing was
// validated. $0/negative/fractional-cent values reached Stripe and Postgres
// unchecked, surfacing as a misleading 502/500 instead of a clean 400.
import { IsOptional, IsInt, Min, Max } from 'class-validator';

// $100,000/day is comfortably above the doc's stated defaults ($500 daily /
// $2,000 weekly / $5,000 monthly / $500 single) while still bounding the
// value against overflow or a typo'd extra zero — an admin override tool,
// not a place to enforce the doc's contractor-facing caps.
const MAX_LIMIT_CENTS = 10_000_000;

export class UpdateSpendingLimitsDto {
  @IsOptional() @IsInt() @Min(1) @Max(MAX_LIMIT_CENTS) dailyCents?: number;
  @IsOptional() @IsInt() @Min(1) @Max(MAX_LIMIT_CENTS) weeklyCents?: number;
  @IsOptional() @IsInt() @Min(1) @Max(MAX_LIMIT_CENTS) monthlyCents?: number;
  @IsOptional() @IsInt() @Min(1) @Max(MAX_LIMIT_CENTS) singleCents?: number;
}
