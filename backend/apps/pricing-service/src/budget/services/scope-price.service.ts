import { Injectable, Logger } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { BudgetService } from './budget.service';
import { PriceScopeDto, ScopePriceTaskDto } from '../dto/price-scope.dto';
import { staticHourlyRate } from '../utils/static-rates';

const RATE_LEVEL: Record<string, string> = {
  student: 'junior',
  junior: 'junior',
  medior: 'mid',
  mid: 'mid',
  senior: 'senior',
  guru: 'senior',
};

const toRateLevel = (value?: string | null) =>
  RATE_LEVEL[(value ?? '').trim().toLowerCase()] ?? 'mid';

const escapeLike = (value: string) => value.replace(/[\\%_]/g, '\\$&');

const lookupKey = (roleName: string, location: string, level: string) =>
  `${roleName.toLowerCase()}|${location.toLowerCase()}|${level}`;

@Injectable()
export class ScopePriceService {
  private readonly logger = new Logger(ScopePriceService.name);

  constructor(private readonly budgetService: BudgetService) {}

  async price(dto: PriceScopeDto): Promise<{ total: number }> {
    const tasks: Array<{ task: ScopePriceTaskDto; label: string }> = [];
    dto.phases.forEach((phase, phaseIndex) =>
      phase.tasks.forEach((task, taskIndex) => {
        if (task.estimatedHours > 0) {
          tasks.push({
            task,
            label: `phase ${phaseIndex + 1}, task ${taskIndex + 1}`,
          });
        }
      }),
    );

    const lookups = new Map<
      string,
      { roleTitle: string; location?: string; experienceLevel: string }
    >();
    for (const { task, label } of tasks) {
      if (this.memberRate(task) !== null) continue;
      const roleName = (task.roleName ?? '').trim();
      if (!roleName) {
        throw new RpcException({
          statusCode: 400,
          message: `Cannot price ${label}: it has no role and no member rate`,
        });
      }
      const location = (task.location ?? '').trim();
      if (!location) continue;
      const level = toRateLevel(task.experienceLevel);
      lookups.set(lookupKey(roleName, location, level), {
        roleTitle: escapeLike(roleName),
        location: escapeLike(location),
        experienceLevel: level,
      });
    }

    const medianByKey = await this.medianRates(lookups);

    let totalCents = 0;
    for (const { task, label } of tasks) {
      const memberRate = this.memberRate(task);
      let rateCents: number;
      if (memberRate !== null) {
        rateCents = memberRate * 100;
      } else {
        const roleName = (task.roleName ?? '').trim();
        const location = (task.location ?? '').trim();
        const median = medianByKey.get(
          lookupKey(roleName, location, toRateLevel(task.experienceLevel)),
        );
        rateCents =
          median ??
          staticHourlyRate({
            roleName,
            experienceLevel: task.experienceLevel,
            location: location || null,
          }) * 100;
      }
      if (!Number.isFinite(rateCents) || rateCents <= 0) {
        throw new RpcException({
          statusCode: 400,
          message: `Cannot price ${label}: no usable rate`,
        });
      }
      totalCents += task.estimatedHours * rateCents;
    }

    return { total: Math.round(totalCents) / 100 };
  }

  private memberRate(task: ScopePriceTaskDto): number | null {
    const rate = Number(task.hourlyRate);
    return Number.isFinite(rate) && rate > 0 ? rate : null;
  }

  private async medianRates(
    lookups: Map<
      string,
      { roleTitle: string; location?: string; experienceLevel: string }
    >,
  ): Promise<Map<string, number>> {
    const rates = new Map<string, number>();
    if (lookups.size === 0) return rates;
    const keys = Array.from(lookups.keys());
    try {
      const result = await this.budgetService.calculate({
        roles: keys.map((key) => ({
          ...(lookups.get(key) as {
            roleTitle: string;
            location?: string;
            experienceLevel: string;
          }),
          estimatedHours: 1,
        })),
      });
      result.roles.forEach((role, index) => {
        const cents = role.hourlyRateUsdCents;
        if (!role.noData && typeof cents === 'number' && cents > 0) {
          rates.set(keys[index], cents);
        }
      });
    } catch (err) {
      this.logger.warn(
        `Rate lookup failed, using the static table: ${err instanceof Error ? err.message : err}`,
      );
    }
    return rates;
  }
}
