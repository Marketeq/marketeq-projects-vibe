import { IPaginationOptions } from '../../../utils/types/pagination-options';
import { EntityCondition } from '../../../utils/types/entity-condition.type';
import { NullableType } from '../../../utils/types/nullable.type';
import { DeepPartial } from 'typeorm';
import { Task } from '../../interface/task';

export abstract class TaskRepository {
  abstract create(
    data: Omit<Task, 'id' | 'createdAt' | 'deletedAt' | 'updatedAt'>,
  ): Promise<Task>;

  abstract findManyWithPagination(params: {
    filterOptions?: Partial<Task>;
    paginationOptions: IPaginationOptions;
  }): Promise<Task[]>;

  abstract findAll({
    filterOptions,
  }: {
    filterOptions?: Partial<Task>;
  }): Promise<Task[]>;

  abstract findOne(fields: EntityCondition<Task>): Promise<NullableType<Task>>;

  abstract find(fields: EntityCondition<Task>): Promise<NullableType<Task>>;

  abstract update(
    id: Task['id'],
    payload: DeepPartial<Task>,
  ): Promise<Task | null>;

  abstract softDelete(id: Task['id']): Promise<void>;
}
