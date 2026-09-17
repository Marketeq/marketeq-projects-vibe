import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  CheckoutDraft,
  CheckoutDraftPhase,
  CheckoutDraftTask,
} from './entities/checkout-draft.entity';

export type ScopeSeedTask = {
  title?: string;
  description?: string;
  roleName?: string;
  location?: string[];
  experienceLevel?: string;
  estimatedHours?: number;
};

export type ScopeSeedPhase = {
  phaseName?: string;
  order?: number;
  tasks?: ScopeSeedTask[];
};

// Turns the raw listing scope (no ids, whatever shape listings-service
// happens to store) into the stable-id shape the frontend renders.
// Synthetic ids are stable across the whole draft's lifetime since phases
// is never rewritten after creation — this only runs once, at seed time.
const normalizeSeedPhases = (raw: ScopeSeedPhase[]): CheckoutDraftPhase[] =>
  (Array.isArray(raw) ? raw : []).map((phase, phaseIndex) => {
    const phaseId = `phase-${phaseIndex}`;
    const tasks: CheckoutDraftTask[] = (phase?.tasks ?? []).map(
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

@Injectable()
export class CheckoutDraftService {
  constructor(
    @InjectRepository(CheckoutDraft)
    private readonly repo: Repository<CheckoutDraft>,
  ) {}

  async commit(
    clientId: string,
    listingId: string,
    seed: { phases?: ScopeSeedPhase[]; projectCost?: number | null },
  ): Promise<CheckoutDraft> {
    if (!clientId || !listingId) {
      throw new BadRequestException('clientId and listingId are required');
    }

    const existing = await this.repo.findOne({ where: { clientId, listingId } });
    if (existing) return existing;

    const draft = this.repo.create({
      clientId,
      listingId,
      phases: normalizeSeedPhases(seed.phases ?? []),
      projectCost: seed.projectCost ?? null,
    });
    return this.repo.save(draft);
  }
}
