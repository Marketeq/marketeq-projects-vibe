import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere } from 'typeorm';
import { IPaginationOptions } from '../../../../../utils/types/pagination-options';
import { EntityCondition } from '../../../../../utils/types/entity-condition.type';
import { NullableType } from '../../../../../utils/types/nullable.type';
import { TaskRepository } from '../../task.repository';
import { TaskEntity } from '../entities/task.entity';
import { TaskMapper } from '../mappers/task.mapper';
import { Task } from '../../../../interface/task';
import { FilterTaskDto, SortTaskDto } from '../../../../dto/query-task.dto';

@Injectable()
export class TaskRelationalRepository implements TaskRepository {
  constructor(
    @InjectRepository(TaskEntity)
    private readonly taskRepository: Repository<TaskEntity>,
  ) {}

  async create(data: Task): Promise<Task> {
    try {
      const persistenceModel = TaskMapper.toPersistence(data);
      const task = await this.taskRepository.save(persistenceModel);
      return TaskMapper.toDomain(task);
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
    filterOptions?: FilterTaskDto | null;
    sortOptions?: SortTaskDto[] | null;
    paginationOptions: IPaginationOptions;
  }): Promise<Task[]> {
    const where: FindOptionsWhere<Task> = {};

    if (filterOptions?.phaseId) {
      where.phaseId = filterOptions.phaseId;
    }

    const entities = await this.taskRepository.find({
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

    return entities.map((task) => TaskMapper.toDomain(task));
  }

  async findAll({
    filterOptions,
  }: {
    filterOptions?: FilterTaskDto | null;
  }): Promise<Task[]> {
    const where: FindOptionsWhere<Task> = {};

    if (filterOptions?.taskName) {
      where.taskName = filterOptions.taskName;
    }

    const entities = await this.taskRepository.find({
      where,
    });

    return entities.map((task) => TaskMapper.toDomain(task));
  }

  async findOne(fields: EntityCondition<Task>): Promise<NullableType<Task>> {
    const entity = await this.taskRepository.findOne({
      where: fields as unknown as FindOptionsWhere<Task>,
    });

    return entity ? TaskMapper.toDomain(entity) : null;
  }

  async find(fields: EntityCondition<Task>): Promise<NullableType<Task>> {
    const entity = await this.taskRepository.findOne({
      where: fields as unknown as FindOptionsWhere<Task>,
    });

    return entity ? TaskMapper.toDomain(entity) : null;
  }

  async update(id: Task['id'], payload: Partial<Task>): Promise<Task> {
    const entity = await this.taskRepository.findOne({
      where: { id: id?.toString() },
    });

    if (!entity) {
      throw new Error('Task not found');
    }

    const updatedEntity = await this.taskRepository.save(
      this.taskRepository.create(
        TaskMapper.toPersistence({
          ...TaskMapper.toDomain(entity),
          ...payload,
        }),
      ),
    );

    return TaskMapper.toDomain(updatedEntity);
  }

  async softDelete(id: Task['id']): Promise<void> {
    await this.taskRepository.softDelete(id);
  }
}
