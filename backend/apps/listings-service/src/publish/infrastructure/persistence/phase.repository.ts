import { IPaginationOptions } from '../../../utils/types/pagination-options';
import { EntityCondition } from '../../../utils/types/entity-condition.type';
import { NullableType } from '../../../utils/types/nullable.type';
import { DeepPartial } from 'typeorm';
import { Phase } from '../../interface/phase';
import { Task } from '../../interface/task';

export type ReplacementTask = Omit<
  Task,
  'id' | 'phaseId' | 'createdAt' | 'deletedAt' | 'updatedAt'
>;

export type ReplacementPhase = Omit<
  Phase,
  'id' | 'projectId' | 'task' | 'createdAt' | 'deletedAt' | 'updatedAt'
> & { tasks: ReplacementTask[] };

export abstract class PhaseRepository {
  abstract create(
    data: Omit<Phase, 'id' | 'createdAt' | 'deletedAt' | 'updatedAt'>,
  ): Promise<Phase>;

  abstract findManyWithPagination(params: {
    filterOptions?: Partial<Phase>;
    paginationOptions: IPaginationOptions;
  }): Promise<Phase[]>;

  abstract findAll(params: {
    filterOptions?: Partial<Phase>;
  }): Promise<Phase[]>;

  abstract findOne(
    fields: EntityCondition<Phase>,
  ): Promise<NullableType<Phase>>;

  abstract findOneWithTasks(id: string): Promise<NullableType<Phase>>;

  abstract update(
    id: Phase['id'],
    payload: DeepPartial<Phase>,
  ): Promise<Phase | null>;

  abstract softDelete(id: Phase['id']): Promise<void>;

  // Replaces every phase (and its tasks) of a project in one transaction and
  // returns the new phases, in the given order, with their tasks loaded.
  abstract replaceForProject(
    projectId: Phase['projectId'],
    phases: ReplacementPhase[],
  ): Promise<Phase[]>;
}
