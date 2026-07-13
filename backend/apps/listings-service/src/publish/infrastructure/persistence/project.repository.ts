import { IPaginationOptions } from '../../../utils/types/pagination-options';
import { EntityCondition } from '../../../utils/types/entity-condition.type';

import { NullableType } from '../../../utils/types/nullable.type';
import { DeepPartial } from 'typeorm';

import { Project } from '../../interface/project';
import {
  FilterProjectDto,
  SortProjectDto,
} from '../../dto/query-project.dto';

export abstract class ProjectRepository {
  abstract create(
    data: Omit<Project, 'id' | 'createdAt' | 'deletedAt' | 'updatedAt'>,
  ): Promise<Project>;

  abstract findManyWithPagination({
    filterOptions,
    sortOptions,
    paginationOptions,
  }: {
    filterOptions?: FilterProjectDto | null;
    sortOptions?: SortProjectDto[] | null;
    paginationOptions: IPaginationOptions;
  }): Promise<Project[]>;

  abstract findAll({
    filterOptions,
  }: {
    filterOptions?: FilterProjectDto | null;
  }): Promise<Project[]>;

  abstract findBySlug(
    slug: string,
    userId: string,
  ): Promise<NullableType<Project>>;

  abstract findOne(
    fields: EntityCondition<Project>,
  ): Promise<NullableType<Project>>;

  abstract find(
    fields: EntityCondition<Project>,
  ): Promise<NullableType<Project>>;

  abstract update(
    id: Project['id'],
    payload: DeepPartial<Project>,
  ): Promise<Project | null>;

  abstract updatePublishedSnapshot(
    id: Project['id'],
    data: {
      budget: number;
      scope: unknown;
      duration: string | null;
      estimatedHours: number | null;
    },
  ): Promise<void>;

  abstract softDelete(id: Project['id']): Promise<void>;
}
