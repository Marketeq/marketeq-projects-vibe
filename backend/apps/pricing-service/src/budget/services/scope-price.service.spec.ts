import { InternalServerErrorException } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { ScopePriceService } from './scope-price.service';
import { BudgetService } from './budget.service';
import { staticHourlyRate } from '../utils/static-rates';

const task = (overrides: Record<string, unknown> = {}) => ({
  roleName: 'Software Engineer',
  experienceLevel: 'Medior',
  location: 'Canada',
  estimatedHours: 10,
  ...overrides,
});

const scope = (...tasks: Array<Record<string, unknown>>) =>
  ({ phases: [{ tasks }] }) as never;

const build = (
  rates: Record<string, number | null> = {},
  fail = false,
) => {
  const calculate = jest.fn(async (dto: { roles: Array<{ roleTitle: string; location?: string; experienceLevel: string }> }) => {
    if (fail) throw new InternalServerErrorException('down');
    return {
      totalUsdCents: 0,
      hasStaleData: false,
      hasNoData: false,
      roles: dto.roles.map((role) => {
        const key = `${role.roleTitle}|${role.location}|${role.experienceLevel}`;
        const cents = rates[key] ?? null;
        return {
          roleTitle: role.roleTitle,
          location: role.location ?? null,
          experienceLevel: role.experienceLevel,
          schedule: null,
          estimatedHours: 1,
          hourlyRateUsdCents: cents,
          roleTotalUsdCents: cents,
          isStale: false,
          noData: cents === null,
        };
      }),
    };
  });
  const service = new ScopePriceService({ calculate } as unknown as BudgetService);
  return { service, calculate };
};

describe('ScopePriceService', () => {
  it('uses the median rate for role, level and country', async () => {
    const { service } = build({ 'Software Engineer|Canada|mid': 8500 });
    await expect(service.price(scope(task({ estimatedHours: 20 })))).resolves.toEqual({ total: 1700 });
  });

  it('maps Student and Guru to junior and senior', async () => {
    const { service, calculate } = build({
      'Software Engineer|Canada|junior': 6500,
      'Software Engineer|Canada|senior': 11500,
    });
    await expect(service.price(scope(task({ experienceLevel: 'Student' })))).resolves.toEqual({ total: 650 });
    await expect(service.price(scope(task({ experienceLevel: 'Guru' })))).resolves.toEqual({ total: 1150 });
    expect(calculate).toHaveBeenCalledTimes(2);
  });

  it('defaults a missing or unknown level to mid', async () => {
    const { service } = build({ 'Software Engineer|Canada|mid': 8500 });
    await expect(service.price(scope(task({ experienceLevel: null })))).resolves.toEqual({ total: 850 });
    await expect(service.price(scope(task({ experienceLevel: 'Wizard' })))).resolves.toEqual({ total: 850 });
  });

  it('prefers a member rate and skips the lookup for that task', async () => {
    const { service, calculate } = build({ 'Software Engineer|Canada|mid': 8500 });
    await expect(service.price(scope(task({ hourlyRate: 60 })))).resolves.toEqual({ total: 600 });
    expect(calculate).not.toHaveBeenCalled();
  });

  it('ignores a member rate of 0 or below', async () => {
    const { service } = build({ 'Software Engineer|Canada|mid': 8500 });
    await expect(service.price(scope(task({ hourlyRate: 0 })))).resolves.toEqual({ total: 850 });
  });

  it('falls back to the static table when there is no median', async () => {
    const { service } = build();
    const expected = staticHourlyRate({ roleName: 'Software Engineer', experienceLevel: 'Medior', location: 'Canada' });
    await expect(service.price(scope(task()))).resolves.toEqual({ total: expected * 10 });
  });

  it('falls back to the static table when the lookup throws', async () => {
    const { service } = build({}, true);
    const expected = staticHourlyRate({ roleName: 'Software Engineer', experienceLevel: 'Medior', location: 'Canada' });
    await expect(service.price(scope(task()))).resolves.toEqual({ total: expected * 10 });
  });

  it('skips the lookup when there is no location and uses the static table', async () => {
    const { service, calculate } = build();
    const expected = staticHourlyRate({ roleName: 'Software Engineer', experienceLevel: 'Medior', location: null });
    await expect(service.price(scope(task({ location: null })))).resolves.toEqual({ total: expected * 10 });
    expect(calculate).not.toHaveBeenCalled();
  });

  it('looks each role, country and level up once even when repeated', async () => {
    const { service, calculate } = build({ 'Software Engineer|Canada|mid': 8500 });
    await service.price({ phases: [{ tasks: [task(), task()] }, { tasks: [task()] }] } as never);
    expect(calculate).toHaveBeenCalledTimes(1);
    expect(calculate.mock.calls[0][0].roles).toHaveLength(1);
  });

  it('adds up several phases and tasks', async () => {
    const { service } = build({ 'Software Engineer|Canada|mid': 8500 });
    await expect(
      service.price({ phases: [{ tasks: [task()] }, { tasks: [task({ hourlyRate: 60, estimatedHours: 5 })] }] } as never),
    ).resolves.toEqual({ total: 850 + 300 });
  });

  it('ignores tasks with no hours, even with no role', async () => {
    const { service } = build();
    await expect(service.price(scope(task({ estimatedHours: 0, roleName: null })))).resolves.toEqual({ total: 0 });
  });

  it('returns 0 for an empty scope', async () => {
    const { service } = build();
    await expect(service.price({ phases: [] } as never)).resolves.toEqual({ total: 0 });
  });

  it('rounds the total once, to cents', async () => {
    const { service } = build();
    await expect(service.price(scope(task({ hourlyRate: 33.33, estimatedHours: 3 })))).resolves.toEqual({ total: 99.99 });
    await expect(service.price(scope(task({ hourlyRate: 0.1, estimatedHours: 3 })))).resolves.toEqual({ total: 0.3 });
  });

  it('rejects hours with no role and no member rate, naming the task', async () => {
    const { service } = build();
    const error = await service
      .price({ phases: [{ tasks: [task()] }, { tasks: [task(), task({ roleName: '  ' })] }] } as never)
      .catch((e) => e);
    expect(error).toBeInstanceOf(RpcException);
    expect((error as RpcException).getError()).toEqual({
      statusCode: 400,
      message: 'Cannot price phase 2, task 2: it has no role and no member rate',
    });
  });
});

describe('staticHourlyRate', () => {
  it('uses the most common region for the role when there is no location', () => {
    expect(staticHourlyRate({ roleName: 'Backend Developer', location: null })).toBe(
      staticHourlyRate({ roleName: 'Backend Developer', location: 'Eastern Europe' }),
    );
  });

  it('scales by level and location', () => {
    const base = staticHourlyRate({ roleName: 'Backend Developer', experienceLevel: 'Medior', location: 'United States' });
    expect(base).toBe(105);
    expect(staticHourlyRate({ roleName: 'Backend Developer', experienceLevel: 'Senior', location: 'United States' })).toBe(131);
    expect(staticHourlyRate({ roleName: 'Backend Developer', experienceLevel: 'Student', location: 'United States' })).toBe(53);
    expect(staticHourlyRate({ roleName: 'Backend Developer', experienceLevel: 'Medior', location: 'India' })).toBe(26);
  });

  it('treats USA in a city string as the United States', () => {
    const us = staticHourlyRate({ roleName: 'Backend Developer', experienceLevel: 'Medior', location: 'United States' });
    expect(staticHourlyRate({ roleName: 'Backend Developer', experienceLevel: 'Medior', location: 'Washington, DC, USA' })).toBe(us);
    expect(staticHourlyRate({ roleName: 'Backend Developer', experienceLevel: 'Medior', location: 'Lausanne' })).not.toBe(us);
  });

  it('uses 85 for a role it does not know', () => {
    expect(staticHourlyRate({ roleName: 'Wizard', experienceLevel: 'Medior', location: 'United States' })).toBe(85);
  });
});
