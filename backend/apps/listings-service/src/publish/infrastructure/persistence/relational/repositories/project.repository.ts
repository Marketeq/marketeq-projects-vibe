import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, ILike, Repository } from 'typeorm';
import { IPaginationOptions } from '../../../../../utils/types/pagination-options';
import { NullableType } from '../../../../../utils/types/nullable.type';
import { EntityCondition } from '../../../../../utils/types/entity-condition.type';
import { ProjectRepository } from '../../project.repository';
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

  async findBySlug(
    slug: string,
    userId: string,
  ): Promise<NullableType<Project>> {
    const entity = await this.projectRepository.findOne({
      where: { slug, userId } as FindOptionsWhere<ProjectEntity>,
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

  async softDelete(id: Project['id']): Promise<void> {
    await this.projectRepository.softDelete(id!);
  }
}
