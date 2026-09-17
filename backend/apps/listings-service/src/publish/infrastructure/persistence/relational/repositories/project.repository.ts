import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, ILike, Repository } from 'typeorm';
import { IPaginationOptions } from '../../../../../utils/types/pagination-options';
import { NullableType } from '../../../../../utils/types/nullable.type';
import { EntityCondition } from '../../../../../utils/types/entity-condition.type';
import { ProjectRepository, RecentQuestion } from '../../project.repository';
import { ProjectEntity } from '../entities/project.entity';
import { Project } from '../../../../interface/project';
import { ProjectMapper } from '../mappers/project.mapper';
import {
  FilterProjectDto,
  SortProjectDto,
} from '../../../../dto/query-project.dto';

@Injectable()
export class ProjectRelationalRepository implements ProjectRepository {
  constructor(
    @InjectRepository(ProjectEntity)
    private readonly projectRepository: Repository<ProjectEntity>,
  ) {}

  async create(data: Project): Promise<Project> {
    try {
      const persistenceModel = ProjectMapper.toPersistence(data);

      const project = await this.projectRepository.save(
        this.projectRepository.create(persistenceModel),
      );

      return ProjectMapper.toDomain(project);
    } catch (error) {
      console.log('_error >>> ', error);
      throw new Error('Internal Server Error');
    }
  }

  async findManyWithPagination({
    filterOptions,
    sortOptions,
    paginationOptions,
  }: {
    filterOptions?: FilterProjectDto | null;
    sortOptions?: SortProjectDto[] | null;
    paginationOptions: IPaginationOptions;
  }): Promise<Project[]> {
    const where: FindOptionsWhere<ProjectEntity> = {};

    if (filterOptions?.searchText) {
      // where.firstName = ILike(`%${filterOptions.searchText?.trim()}%`);
      // where.email = ILike(`%${filterOptions.searchText?.trim()}%`);
    }

    if (filterOptions?.email) {
      // where.email = filterOptions?.email;
    }

    const entities = await this.projectRepository.find({
      skip: (paginationOptions.page - 1) * paginationOptions.limit,
      take: paginationOptions.limit,
      where: where,
      order: sortOptions?.reduce(
        (accumulator, sort) => ({
          ...accumulator,
          [sort.orderBy]: sort.order,
        }),
        {},
      ),
    });

    return entities.map((project) => ProjectMapper.toDomain(project));
  }

  async findAll({
    filterOptions,
  }: {
    filterOptions?: FilterProjectDto | null;
  }): Promise<Project[]> {
    const where: FindOptionsWhere<ProjectEntity> = {};

    if (filterOptions?.userId) {
      where.userId = filterOptions.userId;
    }

    if (filterOptions?.email) {
      where;
    }

    if (filterOptions?.searchText) {
      // where.email = ILike(`%${filterOptions.searchText}%`);
    }

    const entities = await this.projectRepository.find({
      where,
      relations: ['media'],
    });

    return entities.map((project) => ProjectMapper.toDomain(project));
  }

  async findBySlug(slug: string): Promise<NullableType<Project>> {
    const entity = await this.projectRepository.findOne({
      where: { slug } as FindOptionsWhere<ProjectEntity>,
    });
    return entity ? ProjectMapper.toDomain(entity) : null;
  }

  async findOne(
    fields: EntityCondition<Project>,
  ): Promise<NullableType<Project>> {
    const entity = await this.projectRepository.findOne({
      where: fields as unknown as FindOptionsWhere<ProjectEntity>,
    });

    return entity ? ProjectMapper.toDomain(entity) : null;
  }

  async find(fields: EntityCondition<Project>): Promise<NullableType<Project>> {
    const entity = await this.projectRepository.findOne({
      where: fields as unknown as FindOptionsWhere<ProjectEntity>,
    });

    return entity ? ProjectMapper.toDomain(entity) : null;
  }

  async update(id: Project['id'], payload: Partial<Project>): Promise<Project> {
    const entity = await this.projectRepository.findOne({
      where: { id: id?.toString() },
    });

    if (!entity) {
      throw new Error('project not found');
    }

    const updatedEntity = await this.projectRepository.save(
      this.projectRepository.create(
        ProjectMapper.toPersistence({
          ...ProjectMapper.toDomain(entity),
          ...payload,
        }),
      ),
    );

    return ProjectMapper.toDomain(updatedEntity);
  }

  async updatePublishedSnapshot(
    id: Project['id'],
    data: {
      budget: number;
      scope: unknown;
      duration: string | null;
      estimatedHours: number | null;
    },
  ): Promise<void> {
    await this.projectRepository.manager.query(
      `UPDATE listings.project
       SET budget = $1, scope = $2::jsonb, duration = $3, "estimatedHours" = $4
       WHERE id = $5`,
      [
        data.budget,
        JSON.stringify(data.scope ?? []),
        data.duration,
        data.estimatedHours,
        id?.toString(),
      ],
    );
  }

  async getProjectMembers(id: Project['id']): Promise<
    Array<{
      userId: string;
      projectRole: string;
      status: string;
      isLead: boolean;
      leadLabel: string | null;
    }>
  > {
    return this.projectRepository.manager.query(
      `SELECT "userId"::text AS "userId", "projectRole", "status", "isLead", "leadLabel"
       FROM listings.project_members WHERE "projectId" = $1`,
      [id?.toString()],
    );
  }

  async upsertProjectMembers(
    id: Project['id'],
    members: Array<{
      userId: string;
      projectRole?: string | null;
      status?: string | null;
      isLead?: boolean | null;
      leadLabel?: string | null;
    }>,
  ): Promise<void> {
    const userIds = members
      .map((m) => (m?.userId ? String(m.userId) : null))
      .filter((x): x is string => !!x);

    // QA-181/PMCM-399: the whole roster (including which single member is
    // lead) is replaced together, so it must commit together — otherwise a
    // failure partway through the loop below could leave the old lead
    // cleared without the new one having been written yet, or vice versa.
    await this.projectRepository.manager.transaction(async (manager) => {
      if (userIds.length > 0) {
        await manager.query(
          `DELETE FROM listings.project_members WHERE "projectId" = $1 AND "userId" <> ALL($2::uuid[])`,
          [id?.toString(), userIds],
        );
      } else {
        await manager.query(
          `DELETE FROM listings.project_members WHERE "projectId" = $1`,
          [id?.toString()],
        );
      }
      for (const m of members) {
        if (!m?.userId) continue;
        await manager.query(
          `INSERT INTO listings.project_members
             ("projectId", "userId", "projectRole", "status", "isLead", "leadLabel", "updatedAt")
           VALUES ($1, $2, COALESCE($3, 'Contributor'), COALESCE($4, 'Active'), COALESCE($5, false), $6, now())
           ON CONFLICT ("projectId", "userId") DO UPDATE SET
             "projectRole" = EXCLUDED."projectRole",
             "status" = EXCLUDED."status",
             "isLead" = EXCLUDED."isLead",
             "leadLabel" = EXCLUDED."leadLabel",
             "updatedAt" = now()`,
          [
            id?.toString(),
            String(m.userId),
            m.projectRole ?? null,
            m.status ?? null,
            m.isLead ?? null,
            m.leadLabel ?? null,
          ],
        );
      }
    });
  }

  async getProjectIdsWithScope(
    projectIds: Array<Project['id']>,
  ): Promise<Set<string>> {
    const ids = projectIds.filter((id): id is string => !!id).map(String);
    if (!ids.length) return new Set();
    const rows: Array<{ projectId: string }> =
      await this.projectRepository.manager.query(
        `SELECT DISTINCT p."projectId"::text AS "projectId"
         FROM listings.phase p
         INNER JOIN listings.task t
           ON t."phaseId" = p.id AND t."deletedAt" IS NULL
         WHERE p."projectId" = ANY($1::uuid[])
           AND p."deletedAt" IS NULL
           AND btrim(p."phaseName") <> ''`,
        [ids],
      );
    return new Set(rows.map((r) => r.projectId));
  }

  async setSingleProjectMemberStatus(
    id: Project['id'],
    userId: string,
    status: string,
  ): Promise<void> {
    await this.projectRepository.manager.query(
      `INSERT INTO listings.project_members
         ("projectId", "userId", "projectRole", "status", "isLead", "updatedAt")
       VALUES ($1, $2, 'Contributor', $3, false, now())
       ON CONFLICT ("projectId", "userId") DO UPDATE SET
         "status" = EXCLUDED."status",
         "updatedAt" = now()`,
      [id?.toString(), userId, status],
    );
  }

  async getRecentQuestions(id: Project['id']): Promise<RecentQuestion[]> {
    const rows = await this.projectRepository.manager.query(
      `SELECT "recentQuestions" FROM listings.project WHERE id = $1`,
      [id?.toString()],
    );
    return (rows?.[0]?.recentQuestions ?? []) as RecentQuestion[];
  }

  async updateRecentQuestions(
    id: Project['id'],
    questions: RecentQuestion[],
  ): Promise<void> {
    await this.projectRepository.manager.query(
      `UPDATE listings.project SET "recentQuestions" = $1::jsonb WHERE id = $2`,
      [JSON.stringify(questions ?? []), id?.toString()],
    );
  }

  async softDelete(id: Project['id']): Promise<void> {
    await this.projectRepository.softDelete(id!);
  }
}
