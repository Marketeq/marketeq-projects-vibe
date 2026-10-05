import { randomUUID } from 'crypto';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Repository,
  FindOptionsWhere,
  In,
  IsNull,
  EntityManager,
  EntityTarget,
  ObjectLiteral,
} from 'typeorm';
import { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';
import { IPaginationOptions } from '../../../../../utils/types/pagination-options';
import { EntityCondition } from '../../../../../utils/types/entity-condition.type';
import { NullableType } from '../../../../../utils/types/nullable.type';
import { PhaseEntity } from '../entities/phase.entity';
import { TaskEntity } from '../entities/task.entity';

import { Phase } from '../../../../interface/phase';
import { FilterPhaseDto, SortPhaseDto } from '../../../../dto/query-phase.dto';
import { PhaseMapper } from '../mappers/phase.mapper';
import { ReplacementPhase } from '../../phase.repository';

// Rows per INSERT, well under Postgres' 65535 bind-parameter limit.
const INSERT_CHUNK_SIZE = 500;

@Injectable()
export class PhaseRelationalRepository {
  constructor(
    @InjectRepository(PhaseEntity)
    private readonly phaseRepository: Repository<PhaseEntity>,
  ) {}

  async create(data: Phase): Promise<Phase> {
    try {
      const persistenceModel = PhaseMapper.toPersistence(data);
      const phase = await this.phaseRepository.save(persistenceModel);
      return PhaseMapper.toDomain(phase);
    } catch (error) {
      console.error('_error >>> ', error);
      throw new Error('Internal Server Error');
    }
  }

  async findManyWithPagination({
    filterOptions,
    sortOptions,
    paginationOptions,
  }: {
    filterOptions?: FilterPhaseDto | null;
    sortOptions?: SortPhaseDto[] | null;
    paginationOptions: IPaginationOptions;
  }): Promise<Phase[]> {
    const where: FindOptionsWhere<PhaseEntity> = {};

    if (filterOptions?.projectId) {
      where.projectId = filterOptions.projectId;
    }

    const entities = await this.phaseRepository.find({
      skip: (paginationOptions.page - 1) * paginationOptions.limit,
      take: paginationOptions.limit,
      where,
      order: sortOptions?.reduce(
        (accumulator, sort) => ({
          ...accumulator,
          [sort.orderBy]: sort.order,
        }),
        {},
      ),
    });

    return entities.map((phase) => PhaseMapper.toDomain(phase));
  }

  async findAll({
    filterOptions,
  }: {
    filterOptions?: FilterPhaseDto | null;
  }): Promise<Phase[]> {
    const where: FindOptionsWhere<PhaseEntity> = {};

    if (filterOptions?.projectId) {
      where.projectId = filterOptions.projectId;
    }

    if (filterOptions?.phaseName) {
      where.name = filterOptions.phaseName;
    }

    const entities = await this.phaseRepository.find({
      where,
    });

    return entities.map((phase) => PhaseMapper.toDomain(phase));
  }

  async findOne(fields: EntityCondition<Phase>): Promise<NullableType<Phase>> {
    const entity = await this.phaseRepository.findOne({
      where: fields as unknown as FindOptionsWhere<PhaseEntity>,
    });

    return entity ? PhaseMapper.toDomain(entity) : null;
  }

  async findOneWithTasks(id: string): Promise<NullableType<Phase>> {
    const entity = await this.phaseRepository.findOne({
      where: { id },
      relations: { tasks: true },
    });
    return entity ? PhaseMapper.toDomain(entity) : null;
  }

  async find(fields: EntityCondition<Phase>): Promise<NullableType<Phase>> {
    const entity = await this.phaseRepository.findOne({
      where: fields as unknown as FindOptionsWhere<PhaseEntity>,
    });

    return entity ? PhaseMapper.toDomain(entity) : null;
  }

  async update(id: Phase['id'], payload: Partial<Phase>): Promise<Phase> {
    const entity = await this.phaseRepository.findOne({
      where: { id: id?.toString() },
    });

    if (!entity) {
      throw new Error('Phase not found');
    }

    const updatedEntity = await this.phaseRepository.save(
      this.phaseRepository.create(
        PhaseMapper.toPersistence({
          ...PhaseMapper.toDomain(entity),
          ...payload,
        }),
      ),
    );

    return PhaseMapper.toDomain(updatedEntity);
  }

  async softDelete(id: Phase['id']): Promise<void> {
    await this.phaseRepository.delete(id);
  }

  // Same end state as softDelete()-ing every task and phase and create()-ing
  // the new ones one row at a time, in a handful of queries instead of
  // several per task, and atomically.
  async replaceForProject(
    projectId: Phase['projectId'],
    phases: ReplacementPhase[],
  ): Promise<Phase[]> {
    return this.phaseRepository.manager.transaction(async (manager) => {
      // Serialises concurrent replaces of the same project, across processes
      // too; released at commit.
      await manager.query('SELECT pg_advisory_xact_lock(hashtext($1))', [
        `listings.phase.replace:${projectId}`,
      ]);

      const existing = await manager.find(PhaseEntity, {
        where: { projectId },
        select: { id: true },
      });
      const existingIds = existing.map((phase) => phase.id);
      if (existingIds.length > 0) {
        await manager.softDelete(TaskEntity, {
          phaseId: In(existingIds),
          deletedAt: IsNull(),
        });
        await manager.delete(PhaseEntity, { id: In(existingIds) });
      }

      // The draft endpoints order tasks by createdAt, and every row written
      // in one transaction would otherwise share the same now(). Step it 1ms
      // per row, in the order the rows used to be created one by one.
      let sequence = 0;
      const nextCreatedAt = () => {
        const offset = sequence++;
        return () => `now() + interval '${offset} milliseconds'`;
      };

      const phaseRows: QueryDeepPartialEntity<PhaseEntity>[] = [];
      const taskRows: QueryDeepPartialEntity<TaskEntity>[] = [];
      const phaseIds: string[] = [];
      for (const phase of phases) {
        const phaseId = randomUUID();
        phaseIds.push(phaseId);
        phaseRows.push({
          id: phaseId,
          name: phase.name,
          stageName: phase.stageName,
          startDay: phase.startDay,
          endDay: phase.endDay,
          order: phase.order,
          phaseType: phase.phaseType ?? null,
          recurrenceSchedule: phase.recurrenceSchedule ?? null,
          recurrenceCount: phase.recurrenceCount ?? null,
          projectId,
          createdAt: nextCreatedAt(),
        });
        for (const task of phase.tasks) {
          taskRows.push({
            taskName: task.taskName,
            role: task.role,
            description: task.description ?? undefined,
            location: task.location ?? [],
            experience: task.experience ?? [],
            experienceLevel: task.experienceLevel,
            duration: task.duration,
            estimatedHours: task.estimatedHours,
            assigneeUserId: task.assigneeUserId ?? null,
            phaseId,
            createdAt: nextCreatedAt(),
          });
        }
      }

      await this.insertInChunks(manager, PhaseEntity, phaseRows);
      await this.insertInChunks(manager, TaskEntity, taskRows);

      if (phaseIds.length === 0) return [];

      const saved = await manager.find(PhaseEntity, {
        where: { id: In(phaseIds) },
        relations: { tasks: true },
      });
      const savedById = new Map(saved.map((phase) => [phase.id, phase]));

      return phaseIds
        .map((id) => savedById.get(id))
        .filter((phase): phase is PhaseEntity => Boolean(phase))
        .map((phase) => {
          phase.tasks?.sort(
            (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
          );
          return PhaseMapper.toDomain(phase);
        });
    });
  }

  private async insertInChunks<Entity extends ObjectLiteral>(
    manager: EntityManager,
    target: EntityTarget<Entity>,
    rows: QueryDeepPartialEntity<Entity>[],
  ): Promise<void> {
    for (let i = 0; i < rows.length; i += INSERT_CHUNK_SIZE) {
      await manager.insert(target, rows.slice(i, i + INSERT_CHUNK_SIZE));
    }
  }
}
