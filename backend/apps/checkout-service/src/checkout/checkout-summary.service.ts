import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { AxiosError } from 'axios';

export type SummaryScopeTask = {
  id: string;
  title: string;
  description: string | null;
  roleName: string | null;
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
  location?: string[];
  experienceLevel?: string;
  estimatedHours?: number;
};

type RawScopePhase = {
  phaseName?: string;
  order?: number;
  tasks?: RawScopeTask[];
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

  constructor(
    private readonly http: HttpService,
    config: ConfigService,
  ) {
    this.listingsUrl =
      config.get<string>('LISTINGS_SERVICE_URL') || 'http://localhost:3004';
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
