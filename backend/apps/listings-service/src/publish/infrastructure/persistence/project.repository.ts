import { IPaginationOptions } from '../../../utils/types/pagination-options';
import { EntityCondition } from '../../../utils/types/entity-condition.type';

import { NullableType } from '../../../utils/types/nullable.type';
import { DeepPartial } from 'typeorm';

import { Project } from '../../interface/project';
import {
  FilterProjectDto,
  SortProjectDto,
} from '../../dto/query-project.dto';

export type RecentQuestion = {
  id?: string;
  question: string;
  answer: string | null;
  askedByName?: string | null;
  askedByUsername?: string | null;
  askedAt?: string | null;
  answeredByUserId?: string | null;
  answeredByName?: string | null;
  answeredByRole?: string | null;
  assignedToUserId?: string | null;
  hidden?: boolean;
  moderationFailed?: boolean;
};

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

  abstract findBySlug(slug: string): Promise<NullableType<Project>>;

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

  abstract getProjectMembers(id: Project['id']): Promise<
    Array<{
      userId: string;
      projectRole: string;
      status: string;
      isLead: boolean;
      leadLabel: string | null;
    }>
  >;

  abstract upsertProjectMembers(
    id: Project['id'],
    members: Array<{
      userId: string;
      projectRole?: string | null;
      status?: string | null;
      isLead?: boolean | null;
      leadLabel?: string | null;
    }>,
  ): Promise<void>;

  // QA-195/PMCM-403: lightweight, unpersisted signal for the dashboard's
  // error badge — "does this project have a real scope" (>=1 phase with
  // >=1 task) isn't on the Project entity itself; scope lives in the
  // separate phase/task tables. Batched by project id to avoid an N+1
  // query per dashboard card.
  abstract getProjectIdsWithScope(
    projectIds: Array<Project['id']>,
  ): Promise<Set<string>>;
  
  abstract setSingleProjectMemberStatus(
    id: Project['id'],
    userId: string,
    status: string,
  ): Promise<void>;

  abstract getRecentQuestions(id: Project['id']): Promise<RecentQuestion[]>;

  abstract updateRecentQuestions(
    id: Project['id'],
    questions: RecentQuestion[],
  ): Promise<void>;

  abstract softDelete(id: Project['id']): Promise<void>;
}
