import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere } from 'typeorm';
import { IPaginationOptions } from '../../../../../utils/types/pagination-options';
import { EntityCondition } from '../../../../../utils/types/entity-condition.type';
import { NullableType } from '../../../../../utils/types/nullable.type';
import { PhaseEntity } from '../entities/phase.entity';

import { Phase } from '../../../../interface/phase';
import { FilterPhaseDto, SortPhaseDto } from '../../../../dto/query-phase.dto';
import { PhaseMapper } from '../mappers/phase.mapper';

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
}
