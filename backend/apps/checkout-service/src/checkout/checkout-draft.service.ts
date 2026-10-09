import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, In, Repository } from 'typeorm';
import { CheckoutDraft } from './entities/checkout-draft.entity';
import { CheckoutDraftPhaseEntity } from './entities/checkout-draft-phase.entity';
import { CheckoutDraftTaskEntity } from './entities/checkout-draft-task.entity';
import { CheckoutSession } from './entities/checkout-session.entity';
import { CheckoutSummaryService } from './checkout-summary.service';
import {
  isDraftExpired,
  loadOwnedDraft,
  releaseSession,
} from './checkout-draft.util';
import {
  AddDraftPhaseDto,
  AddDraftTaskDto,
  DuplicateDraftPhaseDto,
  RemoveDraftMemberDto,
  ReplaceDraftMemberDto,
  UpdateDraftRoleDto,
  UpdateDraftPhaseDto,
  UpdateDraftTaskDto,
} from './dto/draft-task.dto';
import {
  DraftMembers,
  WorkScheduleType,
  effectiveTaskSchedule,
  resolveMemberSchedule,
  scheduleToTaskColumns,
} from './checkout-draft-schedule.util';

type ListingTask = {
  title?: string;
  roleName?: string;
  assigneeUserId?: string | null;
  location?: string[];
  experienceLevel?: string;
  estimatedHours?: number;
  workSchedule?: WorkScheduleType;
  customHours?: number | null;
  customFrequency?: string | null;
};

type ListingPhase = {
  phaseName?: string;
  tasks?: ListingTask[];
};

type ListingProject = {
  title?: string;
  mediaUrls?: string[];
  featuredImage?: string;
  scope?: ListingPhase[];
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const UNIQUE_VIOLATION = '23505';

const OPEN_ROLE_EXPERIENCE = 'Medior';
const OPEN_ROLE_LOCATION = 'United States';

const normalizeKeyPart = (value: string | null): string =>
  (value ?? '').trim().toLowerCase().replace(/\s+/g, ' ');

const WORKING_DAYS_PER_WEEK = 5;

const taskDays = (
  task: CheckoutDraftTaskEntity,
  members: DraftMembers,
): number => {
  const hours = Number(task.durationHours) || 0;
  return hours > 0
    ? Math.ceil(
        hours /
          (effectiveTaskSchedule(task, members).weeklyHours /
            WORKING_DAYS_PER_WEEK),
      )
    : 0;
};

const phaseLengthDays = (
  tasks: CheckoutDraftTaskEntity[],
  members: DraftMembers,
): number =>
  tasks.length === 0
    ? 0
    : Math.max(...tasks.map((task) => taskDays(task, members)));

const uniqueIds = (ids: Iterable<string>): string[] => Array.from(new Set(ids));

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
    if (!draft || isDraftExpired(draft)) {
      throw new NotFoundException('Draft not found');
    }
    await this.touchLastOpened(draft.id);
    return this.toResponse(draft, await this.loadDurationDays(draft.id));
  }

  private async touchLastOpened(draftId: string) {
    await this.repo.query(
      `UPDATE "checkout"."drafts" SET "lastOpenedAt" = now() WHERE id = $1`,
      [draftId],
    );
  }

  private async loadDurationDays(draftId: string): Promise<number | null> {
    const rows: { days: number | null }[] = await this.repo.query(
      `SELECT MAX(p."endDay") AS days FROM "checkout"."draft_phases" p
       WHERE p."draftId" = $1
         AND EXISTS (SELECT 1 FROM "checkout"."draft_tasks" t WHERE t."phaseId" = p.id)`,
      [draftId],
    );
    return rows[0]?.days ?? null;
  }

  private findOwnedDraft(clientId: string, draftId: string) {
    return loadOwnedDraft(this.repo.manager, clientId, draftId);
  }

  async getPricingScope(clientId: string, draftId: string) {
    const draft = await this.findOwnedDraft(clientId, draftId);
    const phases = await this.loadPhases(draft.id);
    return { draft, phases };
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
    const emptyGroup = (): Group => ({
      roleTitle: '',
      experience: null,
      location: null,
      hours: 0,
      phaseTitles: [],
    });

    for (const phase of phases) {
      for (const task of phase.tasks) {
        const isAssigned = Boolean(task.assigneeUserId);
        if (!isAssigned && !task.roleName) continue;
        const groups = isAssigned ? assigned : open;
        const key = isAssigned
          ? (task.assigneeUserId as string)
          : `${normalizeKeyPart(task.roleName)}|${normalizeKeyPart(task.experienceLevel)}`;
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

    const assignedIds = uniqueIds([
      ...Object.keys(draft.members),
      ...assigned.keys(),
    ]);
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
      const group = assigned.get(userId) ?? emptyGroup();
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
        tasks: phase.tasks.map((task) =>
          this.toTaskResponse(task, draft.members),
        ),
      })),
    };
  }

  private async loadMembers(draftId: string): Promise<DraftMembers> {
    const draft = await this.repo.findOneOrFail({ where: { id: draftId } });
    return draft.members;
  }

  private toTaskResponse(
    task: CheckoutDraftTaskEntity,
    members: DraftMembers,
  ) {
    const schedule = effectiveTaskSchedule(task, members);
    return {
      id: task.id,
      title: task.title,
      roleName: task.roleName,
      location: task.location,
      experienceLevel: task.experienceLevel,
      durationHours: task.durationHours,
      workSchedule: schedule.workSchedule,
      customHoursPerWeek: schedule.customHoursPerWeek,
      customHours: schedule.customHours,
      customFrequency: schedule.customFrequency,
      locked: schedule.locked,
      assigneeUserId: task.assigneeUserId,
      order: task.order,
    };
  }

  private async applyScopeChange<T>(
    clientId: string,
    draftId: string,
    version: number,
    change: (manager: EntityManager, draft: CheckoutDraft) => Promise<T>,
  ) {
    return this.dataSource.transaction(async (manager) => {
      const draft = await loadOwnedDraft(manager, clientId, draftId, {
        lock: true,
      });
      if (draft.version !== version) {
        throw new ConflictException('Draft version is out of date');
      }

      await releaseSession(manager, draft);
      const result = await change(manager, draft);

      const phases = await manager.find(CheckoutDraftPhaseEntity, {
        where: { draftId: draft.id },
        relations: { tasks: true },
        order: { order: 'ASC' },
      });
      let nextStartDay = 1;
      const members: DraftMembers = { ...draft.members };
      for (const phase of phases) {
        for (const task of phase.tasks) {
          if (task.assigneeUserId && !members[task.assigneeUserId]) {
            members[task.assigneeUserId] = resolveMemberSchedule();
          }
        }
      }
      const phaseDays: { id: string; startDay: number; endDay: number }[] = [];
      for (const phase of phases) {
        const days = phaseLengthDays(phase.tasks, members);
        const startDay = nextStartDay;
        nextStartDay += days;
        const endDay = days > 0 ? nextStartDay - 1 : startDay;
        if (phase.startDay !== startDay || phase.endDay !== endDay) {
          await manager.update(CheckoutDraftPhaseEntity, phase.id, {
            startDay,
            endDay,
          });
        }
        phaseDays.push({ id: phase.id, startDay, endDay });
      }

      const durationDays = nextStartDay > 1 ? nextStartDay - 1 : null;
      const teamMemberCount = Object.keys(members).length;
      const nextVersion = draft.version + 1;
      await manager.update(CheckoutDraft, draft.id, {
        version: nextVersion,
        members,
      });

      return {
        result,
        version: nextVersion,
        phases: phaseDays,
        durationDays,
        teamMemberCount,
      };
    });
  }

  private async renumberTasks(
    manager: EntityManager,
    tasks: CheckoutDraftTaskEntity[],
  ) {
    for (const [index, task] of tasks.entries()) {
      if (task.order !== index + 1) {
        await manager.update(CheckoutDraftTaskEntity, task.id, {
          order: index + 1,
        });
      }
    }
  }

  private async findDraftTask(
    manager: EntityManager,
    draftId: string,
    taskId: string,
  ) {
    const task = await manager.findOne(CheckoutDraftTaskEntity, {
      where: { id: taskId, phase: { draftId } },
    });
    if (!task) throw new NotFoundException('Task not found');
    return task;
  }

  private async renumberPhases(
    manager: EntityManager,
    phases: CheckoutDraftPhaseEntity[],
  ) {
    for (const [index, phase] of phases.entries()) {
      if (phase.order !== index + 1) {
        await manager.update(CheckoutDraftPhaseEntity, phase.id, {
          order: index + 1,
        });
      }
    }
  }

  private async findDraftPhase(
    manager: EntityManager,
    draftId: string,
    phaseId: string,
  ) {
    const phase = await manager.findOne(CheckoutDraftPhaseEntity, {
      where: { id: phaseId, draftId },
    });
    if (!phase) throw new NotFoundException('Phase not found');
    return phase;
  }

  private draftPhases(manager: EntityManager, draftId: string) {
    return manager.find(CheckoutDraftPhaseEntity, {
      where: { draftId },
      order: { order: 'ASC' },
    });
  }

  private async toPhaseResponse(manager: EntityManager, phaseId: string) {
    const phase = await manager.findOneOrFail(CheckoutDraftPhaseEntity, {
      where: { id: phaseId },
    });
    return {
      id: phase.id,
      title: phase.title,
      order: phase.order,
      startDay: phase.startDay,
      endDay: phase.endDay,
    };
  }

  async addPhase(clientId: string, draftId: string, dto: AddDraftPhaseDto) {
    let phaseId = '';
    const { result: _created, ...summary } = await this.applyScopeChange(
      clientId,
      draftId,
      dto.version,
      async (manager) => {
        const phases = await this.draftPhases(manager, draftId);
        const order = dto.order ?? phases.length + 1;
        if (order > phases.length + 1) {
          throw new BadRequestException('Order is out of range');
        }
        const created = await manager.save(
          manager.create(CheckoutDraftPhaseEntity, {
            draftId,
            title: dto.title,
            order,
          }),
        );
        phaseId = created.id;
        phases.splice(order - 1, 0, created);
        await this.renumberPhases(manager, phases);
        return created.id;
      },
    );
    const phase = await this.dataSource.transaction((manager) =>
      this.toPhaseResponse(manager, phaseId),
    );
    return { phase, ...summary };
  }

  private async reassignTasks(
    clientId: string,
    draftId: string,
    version: number,
    match: { fromUserId?: string; roleKey?: string },
    toUserId: string | null,
  ) {
    const wantedRoleKey = match.roleKey
      ? normalizeKeyPart(match.roleKey)
      : null;
    const { result: updatedTasks, ...summary } = await this.applyScopeChange(
      clientId,
      draftId,
      version,
      async (manager, draft) => {
        const tasks = await manager.find(CheckoutDraftTaskEntity, {
          where: { phase: { draftId } },
        });
        const matched = tasks.filter((task) =>
          match.fromUserId
            ? task.assigneeUserId === match.fromUserId
            : !task.assigneeUserId &&
              `${normalizeKeyPart(task.roleName)}|${normalizeKeyPart(task.experienceLevel)}` ===
                wantedRoleKey,
        );
        const isListedMember =
          Boolean(match.fromUserId) &&
          draft.members[match.fromUserId as string] !== undefined;
        if (matched.length === 0 && !isListedMember) {
          throw new NotFoundException('No tasks found for that member');
        }
        const departing = match.fromUserId
          ? draft.members[match.fromUserId]
          : undefined;
        const openRoleDefaults = toUserId
          ? {}
          : {
              experienceLevel: OPEN_ROLE_EXPERIENCE,
              location: [OPEN_ROLE_LOCATION],
              ...(departing ? scheduleToTaskColumns(departing) : {}),
            };
        if (matched.length > 0) {
          await manager.update(
            CheckoutDraftTaskEntity,
            { id: In(matched.map((task) => task.id)) },
            { assigneeUserId: toUserId, ...openRoleDefaults },
          );
        }
        if (match.fromUserId) {
          const nextMembers = { ...draft.members };
          delete nextMembers[match.fromUserId];
          if (toUserId && !nextMembers[toUserId]) {
            nextMembers[toUserId] = resolveMemberSchedule(undefined, departing);
          }
          draft.members = nextMembers;
        }
        return matched.map((task) => ({
          id: task.id,
          phaseId: task.phaseId,
          assigneeUserId: toUserId,
          ...openRoleDefaults,
        }));
      },
    );
    const team = await this.getTeam(clientId, draftId);
    return {
      version: summary.version,
      teamMemberCount: summary.teamMemberCount,
      updatedTasks,
      members: team.members,
    };
  }

  async replaceMember(
    clientId: string,
    draftId: string,
    dto: ReplaceDraftMemberDto,
  ) {
    if (Boolean(dto.fromUserId) === Boolean(dto.roleKey)) {
      throw new BadRequestException(
        'Send exactly one of fromUserId and roleKey',
      );
    }
    if (dto.fromUserId && dto.fromUserId === dto.toUserId) {
      throw new BadRequestException('Cannot replace a member with themselves');
    }
    return this.reassignTasks(
      clientId,
      draftId,
      dto.version,
      { fromUserId: dto.fromUserId, roleKey: dto.roleKey },
      dto.toUserId,
    );
  }

  async removeMember(
    clientId: string,
    draftId: string,
    userId: string,
    version: number,
  ) {
    return this.reassignTasks(
      clientId,
      draftId,
      version,
      { fromUserId: userId },
      null,
    );
  }

  async removeMemberAndTasks(
    clientId: string,
    draftId: string,
    dto: RemoveDraftMemberDto,
  ) {
    if (Boolean(dto.fromUserId) === Boolean(dto.roleKey)) {
      throw new BadRequestException(
        'Send exactly one of fromUserId and roleKey',
      );
    }

    const wantedRoleKey = dto.roleKey ? normalizeKeyPart(dto.roleKey) : null;
    const { result: deletedTaskIds, ...summary } = await this.applyScopeChange(
      clientId,
      draftId,
      dto.version,
      async (manager, draft) => {
        const tasks = await manager.find(CheckoutDraftTaskEntity, {
          where: { phase: { draftId } },
        });
        const matched = tasks.filter((task) =>
          dto.fromUserId
            ? task.assigneeUserId === dto.fromUserId
            : !task.assigneeUserId &&
              `${normalizeKeyPart(task.roleName)}|${normalizeKeyPart(task.experienceLevel)}` ===
                wantedRoleKey,
        );
        const isListedMember =
          Boolean(dto.fromUserId) &&
          draft.members[dto.fromUserId as string] !== undefined;
        if (matched.length === 0 && !isListedMember) {
          throw new NotFoundException('No tasks found for that member');
        }

        const ids = matched.map((task) => task.id);
        if (ids.length > 0) {
          await manager.delete(CheckoutDraftTaskEntity, { id: In(ids) });
        }
        if (dto.fromUserId) {
          const nextMembers = { ...draft.members };
          delete nextMembers[dto.fromUserId];
          draft.members = nextMembers;
        }
        return ids;
      },
    );
    const team = await this.getTeam(clientId, draftId);
    return { deletedTaskIds, members: team.members, ...summary };
  }

  async updateRole(clientId: string, draftId: string, dto: UpdateDraftRoleDto) {
    if (dto.experienceLevel === undefined && dto.location === undefined) {
      throw new BadRequestException('No fields to update');
    }
    const wantedRoleKey = normalizeKeyPart(dto.roleKey);
    const { result: updatedTasks, ...summary } = await this.applyScopeChange(
      clientId,
      draftId,
      dto.version,
      async (manager) => {
        const tasks = await manager.find(CheckoutDraftTaskEntity, {
          where: { phase: { draftId } },
        });
        const matched = tasks.filter(
          (task) =>
            !task.assigneeUserId &&
            `${normalizeKeyPart(task.roleName)}|${normalizeKeyPart(task.experienceLevel)}` ===
              wantedRoleKey,
        );
        if (matched.length === 0) {
          throw new NotFoundException('No open tasks found for that role');
        }
        const changes: Partial<
          Pick<CheckoutDraftTaskEntity, 'experienceLevel' | 'location'>
        > = {};
        if (dto.experienceLevel !== undefined) {
          changes.experienceLevel = dto.experienceLevel;
        }
        if (dto.location !== undefined) changes.location = [dto.location];
        if (Object.keys(changes).length > 0) {
          await manager.update(
            CheckoutDraftTaskEntity,
            { id: In(matched.map((task) => task.id)) },
            changes,
          );
        }
        return matched.map((task) => ({
          id: task.id,
          phaseId: task.phaseId,
          assigneeUserId: null,
          experienceLevel: changes.experienceLevel ?? task.experienceLevel,
          location: changes.location ?? task.location,
        }));
      },
    );
    const team = await this.getTeam(clientId, draftId);
    return {
      version: summary.version,
      teamMemberCount: summary.teamMemberCount,
      updatedTasks,
      members: team.members,
    };
  }

  async duplicatePhase(
    clientId: string,
    draftId: string,
    phaseId: string,
    dto: DuplicateDraftPhaseDto,
  ) {
    const { result, ...summary } = await this.applyScopeChange(
      clientId,
      draftId,
      dto.version,
      async (manager) => {
        const source = await this.findDraftPhase(manager, draftId, phaseId);
        const sourceTasks = await manager.find(CheckoutDraftTaskEntity, {
          where: { phaseId: source.id },
          order: { order: 'ASC' },
        });
        const phases = await this.draftPhases(manager, draftId);
        const created = await manager.save(
          manager.create(CheckoutDraftPhaseEntity, {
            draftId,
            title: `${source.title} (Copy)`,
            order: source.order + 1,
          }),
        );
        const sourceIndex = phases.findIndex((item) => item.id === source.id);
        phases.splice(sourceIndex + 1, 0, created);
        await this.renumberPhases(manager, phases);
        const tasks: CheckoutDraftTaskEntity[] = [];
        for (const [index, task] of sourceTasks.entries()) {
          tasks.push(
            await manager.save(
              manager.create(CheckoutDraftTaskEntity, {
                phaseId: created.id,
                title: task.title,
                roleName: task.roleName,
                durationHours: task.durationHours,
                workSchedule: task.workSchedule,
                customHoursPerWeek: task.customHoursPerWeek,
                experienceLevel: task.experienceLevel,
                location: task.location,
                assigneeUserId: task.assigneeUserId,
                order: index + 1,
              }),
            ),
          );
        }
        return { phaseId: created.id, tasks };
      },
    );
    const phase = await this.dataSource.transaction((manager) =>
      this.toPhaseResponse(manager, result.phaseId),
    );
    const members = await this.loadMembers(draftId);
    return {
      phase,
      tasks: result.tasks.map((task) => this.toTaskResponse(task, members)),
      ...summary,
    };
  }

  async updatePhase(
    clientId: string,
    draftId: string,
    phaseId: string,
    dto: UpdateDraftPhaseDto,
  ) {
    if (dto.title === undefined && dto.order === undefined) {
      throw new BadRequestException('No fields to update');
    }

    const { result: _updated, ...summary } = await this.applyScopeChange(
      clientId,
      draftId,
      dto.version,
      async (manager) => {
        const phase = await this.findDraftPhase(manager, draftId, phaseId);
        if (dto.title !== undefined) {
          await manager.update(CheckoutDraftPhaseEntity, phase.id, {
            title: dto.title,
          });
        }
        if (dto.order !== undefined) {
          const phases = await this.draftPhases(manager, draftId);
          if (dto.order > phases.length) {
            throw new BadRequestException('Order is out of range');
          }
          const others = phases.filter((item) => item.id !== phase.id);
          others.splice(dto.order - 1, 0, phase);
          await this.renumberPhases(manager, others);
        }
        return phase.id;
      },
    );
    const phase = await this.dataSource.transaction((manager) =>
      this.toPhaseResponse(manager, phaseId),
    );
    return { phase, ...summary };
  }

  async deletePhase(
    clientId: string,
    draftId: string,
    phaseId: string,
    version: number,
  ) {
    const { result: deletedTaskIds, ...summary } = await this.applyScopeChange(
      clientId,
      draftId,
      version,
      async (manager) => {
        const phase = await this.findDraftPhase(manager, draftId, phaseId);
        const tasks = await manager.find(CheckoutDraftTaskEntity, {
          where: { phaseId: phase.id },
        });
        await manager.delete(CheckoutDraftPhaseEntity, phase.id);
        const remaining = await this.draftPhases(manager, draftId);
        await this.renumberPhases(manager, remaining);
        return tasks.map((task) => task.id);
      },
    );
    return { deletedTaskIds, ...summary };
  }

  async addTask(
    clientId: string,
    draftId: string,
    phaseId: string,
    dto: AddDraftTaskDto,
  ) {
    const { result, ...summary } = await this.applyScopeChange(
      clientId,
      draftId,
      dto.version,
      async (manager, draft) => {
        const phase = await manager.findOne(CheckoutDraftPhaseEntity, {
          where: { id: phaseId, draftId },
        });
        if (!phase) throw new NotFoundException('Phase not found');
        const ownSchedule = dto.assigneeUserId
          ? resolveMemberSchedule(undefined, draft.members[dto.assigneeUserId])
          : resolveMemberSchedule({
              workSchedule: dto.workSchedule,
              customHours: dto.customHoursPerWeek,
              customFrequency: 'per_week',
            });
        const last = await manager.findOne(CheckoutDraftTaskEntity, {
          where: { phaseId },
          order: { order: 'DESC' },
        });
        return manager.save(
          manager.create(CheckoutDraftTaskEntity, {
            phaseId,
            title: dto.title,
            roleName: dto.roleName,
            durationHours: dto.durationHours,
            ...scheduleToTaskColumns(ownSchedule),
            experienceLevel: dto.experienceLevel,
            location: dto.location?.length
              ? dto.location
              : dto.assigneeUserId
                ? []
                : [OPEN_ROLE_LOCATION],
            assigneeUserId: dto.assigneeUserId ?? null,
            order: (last?.order ?? 0) + 1,
          }),
        );
      },
    );
    const members = await this.loadMembers(draftId);
    return { task: this.toTaskResponse(result, members), ...summary };
  }

  async updateTask(
    clientId: string,
    draftId: string,
    taskId: string,
    dto: UpdateDraftTaskDto,
  ) {
    const { version, order, ...fields } = dto;
    const changes = Object.fromEntries(
      Object.entries(fields).filter(([, value]) => value !== undefined),
    ) as Partial<
      Pick<
        CheckoutDraftTaskEntity,
        | 'title'
        | 'roleName'
        | 'durationHours'
        | 'workSchedule'
        | 'customHoursPerWeek'
        | 'experienceLevel'
        | 'location'
        | 'assigneeUserId'
      >
    >;
    if (Object.keys(changes).length === 0 && order === undefined) {
      throw new BadRequestException('No fields to update');
    }
    if (changes.assigneeUserId === null) {
      changes.experienceLevel ??= OPEN_ROLE_EXPERIENCE;
      changes.location ??= [OPEN_ROLE_LOCATION];
    }

    const { result, ...summary } = await this.applyScopeChange(
      clientId,
      draftId,
      version,
      async (manager, draft) => {
        const task = await this.findDraftTask(manager, draftId, taskId);
        const nextAssignee =
          changes.assigneeUserId !== undefined
            ? changes.assigneeUserId
            : task.assigneeUserId;
        if (nextAssignee) {
          delete changes.workSchedule;
          delete changes.customHoursPerWeek;
          if (nextAssignee !== task.assigneeUserId) {
            Object.assign(
              changes,
              scheduleToTaskColumns(
                resolveMemberSchedule(undefined, draft.members[nextAssignee]),
              ),
            );
          }
        } else {
          if (task.assigneeUserId) {
            const departing = draft.members[task.assigneeUserId];
            if (departing) {
              const kept = scheduleToTaskColumns(departing);
              changes.workSchedule ??= kept.workSchedule;
              changes.customHoursPerWeek ??= kept.customHoursPerWeek;
            }
          }
          const workSchedule = changes.workSchedule ?? task.workSchedule;
          const customHoursPerWeek =
            changes.customHoursPerWeek ?? task.customHoursPerWeek;
          if (
            workSchedule === 'custom' &&
            (!customHoursPerWeek || customHoursPerWeek < 1)
          ) {
            throw new BadRequestException(
              'Custom hours per week are required for a custom work schedule',
            );
          }
          if (workSchedule !== 'custom') {
            changes.customHoursPerWeek = null;
          }
        }
        if (Object.keys(changes).length > 0) {
          await manager.update(CheckoutDraftTaskEntity, task.id, changes);
        }
        Object.assign(task, changes);
        if (order !== undefined && order !== task.order) {
          const siblings = await manager.find(CheckoutDraftTaskEntity, {
            where: { phaseId: task.phaseId },
            order: { order: 'ASC' },
          });
          const others = siblings.filter((item) => item.id !== task.id);
          const position = Math.min(order, others.length + 1);
          others.splice(position - 1, 0, task);
          await this.renumberTasks(manager, others);
          task.order = position;
        }
        return task;
      },
    );
    const members = await this.loadMembers(draftId);
    return { task: this.toTaskResponse(result, members), ...summary };
  }

  async deleteTask(
    clientId: string,
    draftId: string,
    taskId: string,
    version: number,
  ) {
    const { result: _removed, ...summary } = await this.applyScopeChange(
      clientId,
      draftId,
      version,
      async (manager) => {
        const task = await this.findDraftTask(manager, draftId, taskId);
        await manager.delete(CheckoutDraftTaskEntity, task.id);
        const siblings = await manager.find(CheckoutDraftTaskEntity, {
          where: { phaseId: task.phaseId },
          order: { order: 'ASC' },
        });
        await this.renumberTasks(manager, siblings);
        return task.id;
      },
    );
    return summary;
  }

  async createDraft(clientId: string, listingId: string) {
    const existing = await this.repo.findOne({
      where: { clientId, listingId },
    });
    if (existing && !isDraftExpired(existing)) {
      await this.touchLastOpened(existing.id);
      throw new ConflictException({
        message: 'Draft already exists',
        draftId: existing.id,
      });
    }

    const project: ListingProject =
      await this.summaryService.fetchProject(listingId);
    const listingTeam = await this.summaryService.fetchListingTeam(listingId);

    try {
      const draft = await this.dataSource.transaction(async (manager) => {
        if (existing) {
          await this.discardDraft(manager, existing);
        }
        return this.copyListingScope(
          manager,
          clientId,
          listingId,
          project,
          listingTeam,
        );
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

  async discard(clientId: string, draftId: string) {
    await this.dataSource.transaction(async (manager) => {
      const draft = await loadOwnedDraft(manager, clientId, draftId, {
        lock: true,
      });
      await this.discardDraft(manager, draft);
    });
    return { deleted: true };
  }

  private toResponse(draft: CheckoutDraft, durationDays: number | null) {
    return {
      draftId: draft.id,
      version: draft.version,
      listingId: draft.listingId,
      title: draft.title,
      mediaUrl: draft.mediaUrl,
      teamMemberCount: Object.keys(draft.members).length,
      durationDays,
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
    listingTeam: { id: string }[],
  ) {
    const listingPhases = Array.isArray(project.scope) ? project.scope : [];
    const members: DraftMembers = {};
    for (const listingPhase of listingPhases) {
      for (const task of listingPhase?.tasks ?? []) {
        const id = task?.assigneeUserId;
        if (id && UUID_PATTERN.test(id) && !members[id]) {
          members[id] = resolveMemberSchedule(task);
        }
      }
    }
    for (const member of listingTeam) {
      const id = String(member.id);
      if (UUID_PATTERN.test(id) && !members[id]) {
        members[id] = resolveMemberSchedule();
      }
    }
    let nextStartDay = 1;
    const plans = listingPhases.map((listingPhase, phaseIndex) => {
      const tasks = (listingPhase?.tasks ?? []).map((task, taskIndex) => {
        const assigneeUserId =
          task?.assigneeUserId && UUID_PATTERN.test(task.assigneeUserId)
            ? task.assigneeUserId
            : null;
        return manager.create(CheckoutDraftTaskEntity, {
          title: task?.title ?? 'Untitled task',
          roleName: task?.roleName ?? null,
          location: task?.location?.length
            ? task.location
            : assigneeUserId
              ? []
              : [OPEN_ROLE_LOCATION],
          experienceLevel:
            task?.experienceLevel ||
            (assigneeUserId ? null : OPEN_ROLE_EXPERIENCE),
          durationHours:
            Number.isFinite(Number(task?.estimatedHours)) &&
            Number(task?.estimatedHours) > 0
              ? Math.round(Number(task.estimatedHours))
              : null,
          ...scheduleToTaskColumns(
            resolveMemberSchedule(
              task,
              assigneeUserId ? members[assigneeUserId] : undefined,
            ),
          ),
          assigneeUserId,
          order: taskIndex + 1,
        });
      });
      const days = phaseLengthDays(tasks, members);
      const startDay = nextStartDay;
      nextStartDay = startDay + days;
      return {
        title: listingPhase?.phaseName ?? `Phase ${phaseIndex + 1}`,
        order: phaseIndex + 1,
        startDay,
        endDay: days > 0 ? nextStartDay - 1 : startDay,
        tasks,
      };
    });

    const draft = await manager.save(
      manager.create(CheckoutDraft, {
        clientId,
        listingId,
        title: project.title ?? null,
        mediaUrl: project.mediaUrls?.[0] || project.featuredImage || null,
        members,
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
