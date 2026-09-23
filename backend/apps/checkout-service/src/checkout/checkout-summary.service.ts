import {
  BadGatewayException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { AxiosError } from 'axios';
import * as jwt from 'jsonwebtoken';
import { CheckoutRateSelectionDto } from './dto/calculate-rate-estimate.dto';

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

// Fully live: fetches listings-service fresh every call, nothing persisted or cached.
@Injectable()
export class CheckoutSummaryService {
  private readonly logger = new Logger(CheckoutSummaryService.name);
  private readonly listingsUrl: string;
  private readonly pricingUrl: string;
  private readonly jwtSecret?: string;

  constructor(
    private readonly http: HttpService,
    config: ConfigService,
  ) {
    this.listingsUrl =
      config.get<string>('LISTINGS_SERVICE_URL') || 'http://localhost:3004';
    this.pricingUrl =
      config.get<string>('PRICING_SERVICE_URL') || 'http://localhost:3029';
    this.jwtSecret = config.get<string>('JWT_SECRET');
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
    if (!this.jwtSecret) {
      throw new ServiceUnavailableException(
        'Pricing authentication is not configured',
      );
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
        const token = jwt.sign({ sub: 'checkout-service' }, this.jwtSecret, {
          expiresIn: '5m',
        });
        const response = await firstValueFrom(
          this.http.post(
            `${this.pricingUrl}/v1/budget/calculate`,
            { roles: rolesToPrice },
            {
              headers: { Authorization: `Bearer ${token}` },
              timeout: 5_000,
            },
          ),
        );
        const pricedResults = response.data?.roles as
          | PricingBudgetRoleResult[]
          | undefined;
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
        const axiosErr = err as AxiosError;
        this.logger.warn(
          `Failed to estimate rates for listing ${listingId}: ${axiosErr.message}`,
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

  private async fetchProject(listingId: string): Promise<any> {
    try {
      const response = await firstValueFrom(
        this.http.get(`${this.listingsUrl}/v1/projects/${listingId}`),
      );
      return response.data;
    } catch (err) {
      const axiosErr = err as AxiosError;
      if (axiosErr.response?.status === 404) {
        throw new NotFoundException('Listing not found');
      }
      this.logger.warn(`Failed to fetch project ${listingId}: ${axiosErr.message}`);
      throw err;
    }
  }
}
