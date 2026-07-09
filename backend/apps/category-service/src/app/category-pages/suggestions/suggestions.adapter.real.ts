import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SuggestionsAdapterMock } from './suggestions.adapter.mock';
import { CategoryEntity } from '../../entities/category.entity';
import { TagEntity } from '../../entities/tag.entity';

/**
 * Production adapter: same DB-backed heuristics as the former "mock" (related/trending/popular/skills).
 */
@Injectable()
export class SuggestionsAdapterReal extends SuggestionsAdapterMock {
  constructor(
    @InjectRepository(CategoryEntity) categoryRepo: Repository<CategoryEntity>,
    @InjectRepository(TagEntity) tagRepo: Repository<TagEntity>,
  ) {
    super(categoryRepo, tagRepo);
  }
}
