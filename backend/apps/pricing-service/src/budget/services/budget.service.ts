import { Injectable } from '@nestjs/common';
import { RatesService } from '../../rates/services/rates.service';
import { CalculateBudgetDto, BudgetRoleInputDto } from '../dto/calculate-budget.dto';
import { BudgetResponseDto, BudgetRoleResultDto } from '../dto/budget-response.dto';

@Injectable()
export class BudgetService {
  constructor(private readonly ratesService: RatesService) {}

  async calculate(dto: CalculateBudgetDto): Promise<BudgetResponseDto> {
    const rateResults = await Promise.all(
      dto.roles.map((role) =>
        this.ratesService.getRates({
          role: role.roleTitle,
          location: role.location,
          experience: role.experienceLevel,
          schedule: role.workSchedule,
        }),
      ),
    );

    let totalUsdCents = 0;
    let hasStaleData = false;
    let hasNoData = false;

    const roles: BudgetRoleResultDto[] = dto.roles.map((role, i) => {
      const rates = rateResults[i];
      const hourlyRate = rates.hourlyRateMedianUsdCents;
      const roleTotalUsdCents = hourlyRate != null
        ? Math.round(hourlyRate * role.estimatedHours * (role.fxMultiplier ?? 1))
        : null;

      if (rates.isStale) hasStaleData = true;
      if (rates.noData) hasNoData = true;
      if (roleTotalUsdCents != null) totalUsdCents += roleTotalUsdCents;

      return {
        roleTitle: role.roleTitle,
        location: role.location ?? null,
        experienceLevel: role.experienceLevel ?? null,
        schedule: role.workSchedule ?? null,
        estimatedHours: role.estimatedHours,
        hourlyRateUsdCents: hourlyRate,
        roleTotalUsdCents,
        isStale: rates.isStale,
        noData: rates.noData,
      };
    });

    return { totalUsdCents, hasStaleData, hasNoData, roles };
  }
}
