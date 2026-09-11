import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { hourlyRateForTask, popularRegionForRole } from '../utils/pricing';

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
              location:   location       ?? undefined,
              experience: experienceLevel ?? undefined,
            },
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
}
