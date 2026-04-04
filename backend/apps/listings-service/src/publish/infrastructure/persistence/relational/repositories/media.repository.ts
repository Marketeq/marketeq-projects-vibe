import { FilterMediaDto, SortMediaDto } from '../../../../dto/query-media.dto';
import { Media } from '../../../../interface/media';
import { IPaginationOptions } from '../../../../../utils/types/pagination-options';
import { FindOptionsWhere, Repository } from 'typeorm';
import { MediaEntity } from '../entities/media.entity';
import { MediaRepository } from '../../media.repository';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MediaMapper } from '../mappers/media.mapper';
import { EntityCondition } from '../../../../../utils/types/entity-condition.type';
import { NullableType } from '../../../../../utils/types/nullable.type';

@Injectable()
export class MediaRelationalRepository implements MediaRepository {
  constructor(
    @InjectRepository(MediaEntity)
    private readonly mediaRepository: Repository<MediaEntity>,
  ) {}

  async create(data: Media): Promise<Media> {
    try {
      const persistenceModel = MediaMapper.toPersistence(data);

      const media = await this.mediaRepository.save(
        this.mediaRepository.create(persistenceModel),
      );

      return MediaMapper.toDomain(media);
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
    filterOptions?: FilterMediaDto | null;
    sortOptions?: SortMediaDto[] | null;
    paginationOptions: IPaginationOptions;
  }): Promise<Media[]> {
    const where: FindOptionsWhere<MediaEntity> = {};

    // if (filterOptions?.searchText) {
    // where.featuredImage = ILike(`%${filterOptions.searchText?.trim()}%`);
    // }

    if (filterOptions?.projectId) {
      where.project = { id: filterOptions.projectId };
    }

    const entities = await this.mediaRepository.find({
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

    return entities.map((media) => MediaMapper.toDomain(media));
  }

  async findAll({
    filterOptions,
  }: {
    filterOptions?: FilterMediaDto | null;
  }): Promise<Media[]> {
    const where: FindOptionsWhere<MediaEntity> = {};

    if (filterOptions?.additionalImages) {
      where;
    }

    if (filterOptions?.featuredImage) {
      // where.email = ILike(`%${filterOptions.searchText}%`);
    }

    const entities = await this.mediaRepository.find({
      where,
    });

    return entities.map((media) => MediaMapper.toDomain(media));
  }

  async findOne(fields: EntityCondition<Media>): Promise<NullableType<Media>> {
    const entity = await this.mediaRepository.findOne({
      where: fields as unknown as FindOptionsWhere<MediaEntity>,
    });

    return entity ? MediaMapper.toDomain(entity) : null;
  }

  async find(fields: EntityCondition<Media>): Promise<NullableType<Media>> {
    const entity = await this.mediaRepository.findOne({
      where: fields as unknown as FindOptionsWhere<MediaEntity>,
    });

    return entity ? MediaMapper.toDomain(entity) : null;
  }

  async update(id: Media['id'], payload: Partial<Media>): Promise<Media> {
    const entity = await this.mediaRepository.findOne({
      where: { id: id?.toString() },
    });

    if (!entity) {
      throw new Error('Media not found');
    }

    const updatedEntity = await this.mediaRepository.save(
      this.mediaRepository.create(
        MediaMapper.toPersistence({
          ...MediaMapper.toDomain(entity),
          ...payload,
        }),
      ),
    );

    return MediaMapper.toDomain(updatedEntity);
  }

  async softDelete(id: Media['id']): Promise<void> {
    await this.mediaRepository.softDelete(id!);
  }
}
