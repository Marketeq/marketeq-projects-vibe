import {
  BadGatewayException,
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom, timeout } from 'rxjs';
import { CheckoutRateSelectionDto } from './dto/calculate-rate-estimate.dto';
import { LISTINGS_RPC, PRICING_RPC, USER_RPC } from './rpc-clients';

export type SummaryScopeTask = {
  id: string;
  title: string;
  description: string | null;
  roleName: string | null;
  assigneeUserId: string | null;
  location: string[] | null;
  experienceLevel: string | null;
  estimatedHours: number | null;
};

export type SummaryScopePhase = {
  id: string;
  phaseName: string;
  order: number;
  tasks: SummaryScopeTask[];
};

type RawScopeTask = {
  title?: string;
  description?: string;
  roleName?: string;
  assigneeUserId?: string | null;
  location?: string[];
  experienceLevel?: string;
  estimatedHours?: number;
};

type RawScopePhase = {
  phaseName?: string;
  order?: number;
  tasks?: RawScopeTask[];
};

type PricingBudgetRoleResult = {
  hourlyRateUsdCents: number | null;
  isStale: boolean;
  noData: boolean;
};

export type ListingTeamMember = {
  id: string;
  name: string;
  username: string | null;
  avatarUrl: string | null;
  role: string | null;
  location: string | null;
  rate: number | null;
  experienceLevel: string | null;
  status: string | null;
};

export type UserProfileSummary = {
  firstName: string;
  lastName: string;
  username: string | null;
  avatarUrl: string | null;
  location: string | null;
  rate: number | null;
};

export type OpenRoleRateRequest = {
  roleKey: string;
  roleTitle: string;
  location: string | null;
  experience: string | null;
  estimatedHours: number;
};

const normalizeRoleKey = (value: string): string =>
  value.trim().toLowerCase().replace(/\s+/g, ' ');

const normalizeExperience = (value?: string | null) => {
  const normalized = value?.trim().toLowerCase();
  if (!normalized) return undefined;
  if (normalized === 'student' || normalized === 'junior') return 'junior';
  if (
    normalized === 'medior' ||
    normalized === 'mediator' ||
    normalized === 'mid'
  ) {
    return 'mid';
  }
  if (normalized === 'senior' || normalized === 'guru') return 'senior';
  return undefined;
};

const normalizeScopePhases = (raw: RawScopePhase[]): SummaryScopePhase[] =>
  (Array.isArray(raw) ? raw : []).map((phase, phaseIndex) => {
    const phaseId = `phase-${phaseIndex}`;
    const tasks: SummaryScopeTask[] = (phase?.tasks ?? []).map(
      (task, taskIndex) => ({
        id: `${phaseId}-task-${taskIndex}`,
        title: task?.title ?? 'Untitled task',
        description: task?.description ?? null,
        roleName: task?.roleName ?? null,
        assigneeUserId: task?.assigneeUserId ?? null,
        location: task?.location ?? null,
        experienceLevel: task?.experienceLevel ?? null,
        estimatedHours: task?.estimatedHours ?? null,
      }),
    );

    return {
      id: phaseId,
      phaseName: phase?.phaseName ?? `Phase ${phaseIndex + 1}`,
      order: phase?.order ?? phaseIndex + 1,
      tasks,
    };
  });

const errorMessage = (err: unknown): string =>
  err instanceof Error
    ? err.message
    : typeof err === 'object' && err !== null && 'message' in err
      ? String((err as { message: unknown }).message)
      : String(err);

// Fully live: asks listings-service fresh every call, nothing persisted or cached.
@Injectable()
export class CheckoutSummaryService {
  private readonly logger = new Logger(CheckoutSummaryService.name);
  private readonly rpcTimeoutMs = 5_000;

  constructor(
    @Inject(LISTINGS_RPC) private readonly listings: ClientProxy,
    @Inject(PRICING_RPC) private readonly pricing: ClientProxy,
    @Inject(USER_RPC) private readonly users: ClientProxy,
  ) {}

  private call<T>(
    client: ClientProxy,
    pattern: string,
    data: unknown,
  ): Promise<T> {
    return firstValueFrom(
      client.send<T>(pattern, data).pipe(timeout(this.rpcTimeoutMs)),
    );
  }

  async getSummary(listingId: string) {
    const project = await this.fetchProject(listingId);

    return {
      listing: {
        id: project.id,
        title: project.title,
      },
      phases: normalizeScopePhases(project.scope ?? []),
      projectCost: typeof project.budget === 'number' ? project.budget : null,
    };
  }

  async getRateEstimate(
    listingId: string,
    selections: CheckoutRateSelectionDto[],
  ) {
    const project = await this.fetchProject(listingId);
    const phases = normalizeScopePhases(project.scope ?? []);
    const selectionByRole = new Map(
      selections.map((selection) => [
        normalizeRoleKey(selection.roleKey),
        selection,
      ]),
    );
    const groups = new Map<
      string,
      {
        roleTitle: string;
        experience: string | null;
        location: string | null;
        estimatedHours: number;
      }
    >();

    for (const phase of phases) {
      for (const task of phase.tasks) {
        if (task.assigneeUserId || !task.roleName) continue;
        const roleKey = normalizeRoleKey(task.roleName);
        const group = groups.get(roleKey) ?? {
          roleTitle: task.roleName,
          experience: task.experienceLevel,
          location: task.location?.[0] ?? null,
          estimatedHours: 0,
        };
        const hours = Number(task.estimatedHours);
        if (Number.isFinite(hours) && hours > 0) {
          group.estimatedHours += hours;
        }
        groups.set(roleKey, group);
      }
    }

    for (const selection of selections) {
      const roleKey = normalizeRoleKey(selection.roleKey);
      if (groups.has(roleKey) || !selection.roleTitle) continue;
      groups.set(roleKey, {
        roleTitle: selection.roleTitle,
        experience: selection.experience ?? null,
        location: selection.location ?? null,
        estimatedHours: 0,
      });
    }

    if (groups.size === 0) {
      return { listingId, rates: [] };
    }
    const groupedRoles = Array.from(groups.entries());
    const roles = groupedRoles.map(([roleKey, group]) => {
      const selection = selectionByRole.get(roleKey);
      return {
        roleTitle: group.roleTitle,
        location: selection?.location ?? group.location ?? undefined,
        experienceLevel: normalizeExperience(
          selection?.experience ?? group.experience,
        ),
        estimatedHours: Math.max(1, Math.round(group.estimatedHours)),
      };
    });

    const resolvedIndices: number[] = [];
    const rolesToPrice: typeof roles = [];
    roles.forEach((role, index) => {
      if (role.location) {
        resolvedIndices.push(index);
        rolesToPrice.push(role);
      }
    });

    const pricingRoles: PricingBudgetRoleResult[] = roles.map(() => ({
      hourlyRateUsdCents: null,
      isStale: false,
      noData: true,
    }));

    if (rolesToPrice.length > 0) {
      try {
        const response = await this.call<{ roles?: PricingBudgetRoleResult[] }>(
          this.pricing,
          'budget.calculate',
          { roles: rolesToPrice },
        );
        const pricedResults = response?.roles;
        if (
          !Array.isArray(pricedResults) ||
          pricedResults.length !== rolesToPrice.length
        ) {
          throw new BadGatewayException(
            'Pricing service returned an invalid response',
          );
        }
        resolvedIndices.forEach((roleIndex, i) => {
          pricingRoles[roleIndex] = pricedResults[i];
        });
      } catch (err) {
        if (err instanceof BadGatewayException) throw err;
        this.logger.warn(
          `Failed to estimate rates for listing ${listingId}: ${errorMessage(err)}`,
        );
        throw new BadGatewayException(
          'Pricing estimate is temporarily unavailable',
        );
      }
    }

    return {
      listingId,
      rates: groupedRoles.map(([roleKey], index) => ({
        roleKey,
        hourlyRateUsdCents:
          typeof pricingRoles[index].hourlyRateUsdCents === 'number'
            ? pricingRoles[index].hourlyRateUsdCents
            : null,
        noData: Boolean(pricingRoles[index].noData),
        isStale: Boolean(pricingRoles[index].isStale),
      })),
    };
  }

  async fetchMemberRates(
    listingId: string,
    userIds: string[],
  ): Promise<Map<string, number>> {
    const rates = new Map<string, number>();
    if (userIds.length === 0) return rates;
    const team = await this.fetchListingTeam(listingId);
    const teamById = new Map(team.map((member) => [String(member.id), member]));
    await Promise.all(
      userIds.map(async (userId) => {
        const member = teamById.get(userId);
        const rate = member
          ? member.rate
          : ((await this.fetchUserProfile(userId))?.rate ?? null);
        if (typeof rate === 'number' && rate > 0) rates.set(userId, rate);
      }),
    );
    return rates;
  }

  async priceScope(
    phases: Array<{
      tasks: Array<{
        roleName: string | null;
        experienceLevel: string | null;
        location: string | null;
        estimatedHours: number;
        hourlyRate: number | null;
      }>;
    }>,
  ): Promise<number> {
    try {
      const response = await this.call<{ total?: number }>(
        this.pricing,
        'scope.price',
        { phases },
      );
      if (
        typeof response?.total !== 'number' ||
        !Number.isFinite(response.total)
      ) {
        throw new Error('Invalid pricing response');
      }
      return response.total;
    } catch (err) {
      if (
        typeof err === 'object' &&
        err !== null &&
        (err as { statusCode?: number }).statusCode === 400
      ) {
        throw new BadRequestException(errorMessage(err));
      }
      this.logger.warn(`Failed to price scope: ${errorMessage(err)}`);
      throw new BadGatewayException('Pricing is temporarily unavailable');
    }
  }

  async fetchListingTeam(listingId: string): Promise<ListingTeamMember[]> {
    try {
      const project = await this.call<{ team?: ListingTeamMember[] }>(
        this.listings,
        'project.findPublishedBySlug',
        { slug: listingId },
      );
      return Array.isArray(project?.team) ? project.team : [];
    } catch (err) {
      this.logger.warn(
        `Failed to fetch team for listing ${listingId}: ${errorMessage(err)}`,
      );
      return [];
    }
  }

  async fetchUserProfile(userId: string): Promise<UserProfileSummary | null> {
    try {
      const user = await this.call<Record<string, any>>(
        this.users,
        'user.profile.get',
        { id: userId },
      );
      return {
        firstName: user?.firstName ?? '',
        lastName: user?.lastName ?? '',
        username: user?.username ?? null,
        avatarUrl: user?.avatarUrl ?? null,
        location: user?.location ?? null,
        rate: user?.rate != null ? Number(user.rate) : null,
      };
    } catch (err) {
      this.logger.warn(`Failed to fetch user ${userId}: ${errorMessage(err)}`);
      return null;
    }
  }

  async estimateRoleRates(
    roles: OpenRoleRateRequest[],
  ): Promise<Map<string, number | null>> {
    const rates = new Map<string, number | null>();
    roles.forEach((role) => rates.set(role.roleKey, null));

    const priceable = roles.filter((role) => role.roleTitle?.trim());
    if (priceable.length === 0) return rates;

    await Promise.all(
      priceable.map(async (role) => {
        try {
          const total = await this.priceScope([
            {
              tasks: [
                {
                  roleName: role.roleTitle,
                  experienceLevel: role.experience,
                  location: role.location,
                  estimatedHours: 1,
                  hourlyRate: null,
                },
              ],
            },
          ]);
          rates.set(role.roleKey, total > 0 ? total : null);
        } catch (err) {
          this.logger.warn(
            `Failed to estimate open role rate for ${role.roleKey}: ${errorMessage(err)}`,
          );
        }
      }),
    );
    return rates;
  }

  async fetchProject(listingId: string): Promise<any> {
    try {
      return await this.call<any>(this.listings, 'project.findPublishedById', {
        id: listingId,
      });
    } catch (err) {
      if ((err as { statusCode?: number })?.statusCode === 404) {
        throw new NotFoundException('Listing not found');
      }
      this.logger.warn(
        `Failed to fetch project ${listingId}: ${errorMessage(err)}`,
      );
      throw new BadGatewayException('Listings service is unavailable');
    }
  }
}
