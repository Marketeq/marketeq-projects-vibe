import { IPaginationOptions } from '../../../utils/types/pagination-options';
import { EntityCondition } from '../../../utils/types/entity-condition.type';
import { NullableType } from '../../../utils/types/nullable.type';
import { DeepPartial } from 'typeorm';
import { Phase } from '../../interface/phase';

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
}
