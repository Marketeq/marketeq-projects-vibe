import { Inject, Injectable, Logger } from '@nestjs/common';
import { ClientProxy, RmqRecordBuilder } from '@nestjs/microservices';
import { firstValueFrom, timeout } from 'rxjs';
import { hourlyRateForTask, popularRegionForRole } from '../utils/pricing';
import { COUNTRY_TO_REGION } from '../../job-listing/services/job-listing-budget.service';

const COUNTRY_TO_REGION_LOWER: Record<string, string> = Object.fromEntries(
  Object.entries(COUNTRY_TO_REGION).map(([country, region]) => [
    country.toLowerCase(),
    region,
  ]),
);

const normalizeLocation = (location: string | null): string | undefined =>
  location ? COUNTRY_TO_REGION_LOWER[location.toLowerCase()] : undefined;

const normalizeExperienceLevel = (
  experienceLevel: string | null,
): string | undefined => {
  if (!experienceLevel) return undefined;
  const key = experienceLevel.toLowerCase();
  return key === 'mid' ? 'medior' : key;
};

// ── RoleRateService ───────────────────────────────────────────────────────
// Fetches the hourly median rate for a role from pricing-service, with a
// static-table fallback when pricing-service has no data for that role/
// region/experience combo. Shared by anything that needs a role-based rate
// (budget calculation, team-member rate display) so the fallback chain
// lives in exactly one place.
//
// Fallback chain:
//   1. pricing-service real data (PlatformRateAverage)
//   2. Static rate table (hourlyRateForTask) using the most popular
//      sourcing region for the role — produces realistic estimates
//      when the platform lacks transaction history for a role/region combo.
export const PRICING_RPC = 'PRICING_RPC';

const RATE_RPC_TIMEOUT_MS = 2000;

@Injectable()
export class RoleRateService {
  private readonly logger = new Logger(RoleRateService.name);

  constructor(@Inject(PRICING_RPC) private readonly pricing: ClientProxy) {}

  async getRateUsdCents(
    roleTitle: string,
    location: string | null,
    experienceLevel: string | null,
  ): Promise<number> {
    try {
      const record = new RmqRecordBuilder({
        role: roleTitle,
        location: normalizeLocation(location),
        experience: normalizeExperienceLevel(experienceLevel),
      })
        .setOptions({ expiration: String(RATE_RPC_TIMEOUT_MS) })
        .build();
      const data = await firstValueFrom(
        this.pricing
          .send<{ hourlyRateMedianUsdCents?: number | null }>('rate.get', record)
          .pipe(timeout(RATE_RPC_TIMEOUT_MS)),
      );
      const median = data?.hourlyRateMedianUsdCents;
      if (median != null) return median;

      this.logger.log(
        `No platform rate data for "${roleTitle}" in "${location ?? 'any'}" — using static fallback`,
      );
    } catch {
      this.logger.warn(`pricing-service unavailable for rate lookup: ${roleTitle}`);
    }

    const fallbackLocation = location ?? popularRegionForRole(roleTitle);
    const fallbackRate = hourlyRateForTask({
      roleName: roleTitle,
      experienceLevel: experienceLevel ?? 'Medior',
      location: fallbackLocation,
    });
    // hourlyRateForTask returns dollars — convert to USD cents
    return fallbackRate * 100;
  }
}
