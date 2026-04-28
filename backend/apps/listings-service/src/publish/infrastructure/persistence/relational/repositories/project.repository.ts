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
    });

    return entities.map((project) => ProjectMapper.toDomain(project));
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

  async softDelete(id: Project['id']): Promise<void> {
    await this.projectRepository.softDelete(id!);
  }
}
