import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import * as jwt from 'jsonwebtoken';
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
@Injectable()
export class RoleRateService {
  private readonly logger = new Logger(RoleRateService.name);

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {}

  async getRateUsdCents(
    roleTitle: string,
    location: string | null,
    experienceLevel: string | null,
  ): Promise<number> {
    try {
      const response = await firstValueFrom(
        this.http.get(
          `${this.config.get('PRICING_SERVICE_URL')}/v1/rates`,
          {
            params: {
              role:       roleTitle,
              location:   normalizeLocation(location),
              experience: normalizeExperienceLevel(experienceLevel),
            },
            headers: { Authorization: `Bearer ${this.signInternalToken()}` },
            timeout: 2000,
          },
        ),
      );
      const median = response.data.hourlyRateMedianUsdCents;
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

  private signInternalToken(): string {
    const secret = this.config.get<string>('JWT_SECRET') ?? '';
    return jwt.sign({ sub: 'listings-service' }, secret, { expiresIn: '5m' });
  }
}
