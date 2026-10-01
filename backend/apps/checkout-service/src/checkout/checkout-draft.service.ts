import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { CheckoutDraft } from './entities/checkout-draft.entity';
import { CheckoutDraftPhaseEntity } from './entities/checkout-draft-phase.entity';
import { CheckoutDraftTaskEntity } from './entities/checkout-draft-task.entity';
import { CheckoutSession } from './entities/checkout-session.entity';
import { CheckoutSummaryService } from './checkout-summary.service';
import { isDraftExpired } from './checkout-draft.util';

type ListingTask = {
  title?: string;
  description?: string;
  roleName?: string;
  assigneeUserId?: string | null;
  location?: string[];
  experienceLevel?: string;
  estimatedHours?: number;
};

type ListingPhase = {
  phaseName?: string;
  tasks?: ListingTask[];
};

type ListingProject = {
  title?: string;
  mediaUrls?: string[];
  featuredImage?: string;
  updatedAt?: string;
  scope?: ListingPhase[];
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const UNIQUE_VIOLATION = '23505';

const taskDays = (hours: number | null): number =>
  Math.max(1, Math.round(((hours ?? 0) * 7) / 40));

@Injectable()
export class CheckoutDraftService {
  constructor(
    @InjectRepository(CheckoutDraft)
    private readonly repo: Repository<CheckoutDraft>,
    @InjectRepository(CheckoutDraftPhaseEntity)
    private readonly phaseRepo: Repository<CheckoutDraftPhaseEntity>,
    private readonly dataSource: DataSource,
    private readonly summaryService: CheckoutSummaryService,
  ) {}

  async getDraft(clientId: string, listingId: string) {
    const draft = await this.repo.findOne({ where: { clientId, listingId } });
    if (!draft || isDraftExpired(draft.updatedAt)) {
      throw new NotFoundException('Draft not found');
    }
    return this.toResponse(draft);
  }

  private async findOwnedDraft(clientId: string, draftId: string) {
    const draft = await this.repo.findOne({ where: { id: draftId, clientId } });
    if (!draft || isDraftExpired(draft.updatedAt)) {
      throw new NotFoundException('Draft not found');
    }
    return draft;
  }

  private loadPhases(draftId: string) {
    return this.phaseRepo.find({
      where: { draftId },
      relations: { tasks: true },
      order: { order: 'ASC', tasks: { order: 'ASC' } },
    });
  }

  async getTeam(clientId: string, draftId: string) {
    const draft = await this.findOwnedDraft(clientId, draftId);
    const phases = await this.loadPhases(draft.id);

    type Group = {
      roleTitle: string;
      experience: string | null;
      location: string | null;
      hours: number;
      phaseTitles: string[];
    };
    const assigned = new Map<string, Group>();
    const open = new Map<string, Group>();

    for (const phase of phases) {
      for (const task of phase.tasks) {
        const isAssigned = Boolean(task.assigneeUserId);
        if (!isAssigned && !task.roleName) continue;
        const groups = isAssigned ? assigned : open;
        const key = isAssigned
          ? (task.assigneeUserId as string)
          : (task.roleName as string).trim().toLowerCase();
        const group = groups.get(key) ?? {
          roleTitle: task.roleName ?? '',
          experience: task.experienceLevel,
          location: task.location?.[0] ?? null,
          hours: 0,
          phaseTitles: [],
        };
        group.hours += task.durationHours ?? 0;
        if (!group.phaseTitles.includes(phase.title)) {
          group.phaseTitles.push(phase.title);
        }
        groups.set(key, group);
      }
    }

    const phaseLabel = (titles: string[]) =>
      titles.length === 0
        ? ''
        : titles.length === 1
          ? titles[0]
          : `${titles.length} Phase`;

    const assignedIds = Array.from(assigned.keys());
    const [listingTeam, rates] = await Promise.all([
      this.summaryService.fetchListingTeam(draft.listingId),
      this.summaryService.estimateRoleRates(
        Array.from(open.entries()).map(([roleKey, group]) => ({
          roleKey,
          roleTitle: group.roleTitle,
          location: group.location,
          experience: group.experience,
          estimatedHours: group.hours,
        })),
      ),
    ]);
    const teamById = new Map(listingTeam.map((m) => [String(m.id), m]));
    const profiles = new Map(
      await Promise.all(
        assignedIds
          .filter((id) => !teamById.has(id))
          .map(
            async (id) =>
              [id, await this.summaryService.fetchUserProfile(id)] as const,
          ),
      ),
    );

    const members = assignedIds.map((userId) => {
      const group = assigned.get(userId) as Group;
      const member = teamById.get(userId);
      const profile = profiles.get(userId);
      const fullName = profile
        ? `${profile.firstName} ${profile.lastName}`.trim()
        : '';
      const memberStatus = member?.status;
      return {
        userId,
        roleKey: null,
        name: member?.name || fullName || profile?.username || 'Team Member',
        username: member?.username ?? profile?.username ?? null,
        avatarUrl: member?.avatarUrl ?? profile?.avatarUrl ?? null,
        role: member?.role || group.roleTitle || null,
        phase: phaseLabel(group.phaseTitles),
        experience: member?.experienceLevel ?? group.experience ?? null,
        location: member?.location ?? profile?.location ?? null,
        rate: member?.rate ?? profile?.rate ?? null,
        status:
          member &&
          memberStatus !== 'Pending Invite' &&
          memberStatus !== 'Pending'
            ? 'Confirmed'
            : 'Pending Invite',
      };
    });

    const openRoles = Array.from(open.entries()).map(([roleKey, group]) => ({
      userId: null,
      roleKey,
      name: 'Unassigned Member',
      username: null,
      avatarUrl: null,
      role: group.roleTitle,
      phase: phaseLabel(group.phaseTitles),
      experience: group.experience,
      location: group.location,
      rate: rates.get(roleKey) ?? null,
      status: 'Unassigned',
    }));

    return { draftId: draft.id, members: [...members, ...openRoles] };
  }

  async getScope(clientId: string, draftId: string) {
    const draft = await this.findOwnedDraft(clientId, draftId);
    const phases = await this.loadPhases(draft.id);

    return {
      draftId: draft.id,
      version: draft.version,
      phases: phases.map((phase) => ({
        id: phase.id,
        title: phase.title,
        order: phase.order,
        startDay: phase.startDay,
        endDay: phase.endDay,
        tasks: phase.tasks.map((task) => ({
          id: task.id,
          title: task.title,
          description: task.description,
          roleName: task.roleName,
          location: task.location,
          experienceLevel: task.experienceLevel,
          durationHours: task.durationHours,
          assigneeUserId: task.assigneeUserId,
          order: task.order,
          isDraftOverride: task.isDraftOverride,
        })),
      })),
    };
  }

  async createDraft(clientId: string, listingId: string) {
    const existing = await this.repo.findOne({ where: { clientId, listingId } });
    if (existing && !isDraftExpired(existing.updatedAt)) {
      throw new ConflictException({
        message: 'Draft already exists',
        draftId: existing.id,
      });
    }

    const project: ListingProject =
      await this.summaryService.fetchProject(listingId);

    try {
      const draft = await this.dataSource.transaction(async (manager) => {
        if (existing) {
          await this.discardDraft(manager, existing);
        }
        return this.copyListingScope(manager, clientId, listingId, project);
      });
      return { draftId: draft.id, version: draft.version };
    } catch (err) {
      if ((err as { code?: string }).code !== UNIQUE_VIOLATION) throw err;
      const winner = await this.repo.findOneOrFail({
        where: { clientId, listingId },
      });
      throw new ConflictException({
        message: 'Draft already exists',
        draftId: winner.id,
      });
    }
  }

  private toResponse(draft: CheckoutDraft) {
    return {
      draftId: draft.id,
      version: draft.version,
      listingId: draft.listingId,
      title: draft.title,
      mediaUrl: draft.mediaUrl,
      teamMemberCount: draft.teamMemberCount,
      durationDays: draft.durationDays,
      createdAt: draft.createdAt,
      updatedAt: draft.updatedAt,
    };
  }

  private async discardDraft(manager: EntityManager, draft: CheckoutDraft) {
    if (draft.sessionId) {
      await manager.update(
        CheckoutSession,
        { id: draft.sessionId, status: 'pending' },
        { status: 'cancelled' },
      );
    }
    await manager.delete(CheckoutDraft, draft.id);
  }

  private async copyListingScope(
    manager: EntityManager,
    clientId: string,
    listingId: string,
    project: ListingProject,
  ) {
    const listingPhases = Array.isArray(project.scope) ? project.scope : [];
    let nextStartDay = 1;
    const plans = listingPhases.map((listingPhase, phaseIndex) => {
      const tasks = (listingPhase?.tasks ?? []).map((task, taskIndex) => {
        const hours = Number(task?.estimatedHours);
        return manager.create(CheckoutDraftTaskEntity, {
          sourceTaskId: `phase-${phaseIndex}-task-${taskIndex}`,
          title: task?.title ?? 'Untitled task',
          description: task?.description ?? null,
          roleName: task?.roleName ?? null,
          location: task?.location ?? [],
          experienceLevel: task?.experienceLevel ?? null,
          durationHours: Number.isFinite(hours) ? Math.round(hours) : null,
          assigneeUserId:
            task?.assigneeUserId && UUID_PATTERN.test(task.assigneeUserId)
              ? task.assigneeUserId
              : null,
          order: taskIndex + 1,
        });
      });
      const phaseDays = Math.max(
        1,
        ...tasks.map((task) => taskDays(task.durationHours)),
      );
      const startDay = nextStartDay;
      nextStartDay = startDay + phaseDays;
      return {
        sourcePhaseId: `phase-${phaseIndex}`,
        title: listingPhase?.phaseName ?? `Phase ${phaseIndex + 1}`,
        order: phaseIndex + 1,
        startDay,
        endDay: nextStartDay - 1,
        tasks,
      };
    });

    const allTasks = plans.flatMap((plan) => plan.tasks);
    const assignees = new Set(
      allTasks.map((task) => task.assigneeUserId).filter(Boolean),
    );
    const roles = new Set(
      allTasks
        .map((task) => task.roleName?.trim().toLowerCase())
        .filter(Boolean),
    );

    const updatedAt = project.updatedAt ? new Date(project.updatedAt) : null;
    const draft = await manager.save(
      manager.create(CheckoutDraft, {
        clientId,
        listingId,
        sourceListingUpdatedAt:
          updatedAt && !Number.isNaN(updatedAt.getTime()) ? updatedAt : null,
        title: project.title ?? null,
        mediaUrl: project.mediaUrls?.[0] || project.featuredImage || null,
        durationDays: plans.length > 0 ? nextStartDay - 1 : null,
        teamMemberCount: assignees.size || roles.size || null,
      }),
    );

    const savedPhases = await manager.save(
      plans.map(({ tasks: _tasks, ...phase }) =>
        manager.create(CheckoutDraftPhaseEntity, {
          ...phase,
          draftId: draft.id,
        }),
      ),
    );
    const tasks = savedPhases.flatMap((savedPhase, index) =>
      plans[index].tasks.map((task) => {
        task.phaseId = savedPhase.id;
        return task;
      }),
    );
    if (tasks.length > 0) {
      await manager.save(tasks);
    }

    return draft;
  }
}
