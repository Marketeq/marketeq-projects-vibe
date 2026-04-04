import { IPaginationOptions } from '../../../utils/types/pagination-options';
import { EntityCondition } from '../../../utils/types/entity-condition.type';

import { NullableType } from '../../../utils/types/nullable.type';
import { DeepPartial } from 'typeorm';
import { Media } from '../../interface/media';
import { FilterMediaDto, SortMediaDto } from '../../dto/query-media.dto';

export abstract class MediaRepository {
  abstract create(
    data: Omit<Media, 'id' | 'createdAt' | 'deletedAt' | 'updatedAt'>,
  ): Promise<Media>;

  abstract findManyWithPagination(params: {
    filterOptions?: FilterMediaDto;
    sortOptions?: SortMediaDto[];
    paginationOptions: IPaginationOptions;
  }): Promise<Media[]>;

  abstract findAll({
    filterOptions,
  }: {
    filterOptions?: FilterMediaDto | null;
  }): Promise<Media[]>;

  abstract findOne(
    fields: EntityCondition<Media>,
  ): Promise<NullableType<Media>>;

  abstract find(fields: EntityCondition<Media>): Promise<NullableType<Media>>;

  abstract update(
    id: Media['id'],
    payload: DeepPartial<Media>,
  ): Promise<Media | null>;

  abstract softDelete(id: Media['id']): Promise<void>;
}
