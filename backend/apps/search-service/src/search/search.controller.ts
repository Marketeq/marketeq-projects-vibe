import { BadRequestException, Controller, Get, Post, Delete, Query, Body, Param, HttpCode, HttpStatus, UseGuards } from '@nestjs/common'
import { MessagePattern, Payload } from '@nestjs/microservices'
import { SearchService } from './search.service'
import { SearchDto, IndexRecordDto, SearchCategory, SearchFiltersDto, SortDirection } from '../dto/search.dto'
import { JwtAuthGuard } from '../guards/jwt-auth.guard'
import {
  CATEGORY_NAME_ATTRIBUTE,
  DEFAULT_FILTER_VALUE_LIMIT,
  FACET_FIELDS,
  FILTER_ENUMS,
  FILTER_VALUE_LIMITS,
  FILTER_VALUE_SOURCES,
  NUMERIC_BUCKET_SOURCES,
  MAX_FILTER_VALUE_LIMIT,
} from '../config/search-config'

@Controller('search')
export class SearchController {
  constructor(private readonly svc: SearchService) {}

  @Get()
  search(@Query() dto: SearchDto) {
    return this.svc.search(this.mergeSort(this.mergeFlatFilters(dto)))
  }

  // The frontend sends a flat ?sortBy=rating&sortOrder=desc pair rather than
  // nested `sort[field]=rating&sort[direction]=desc` query syntax. Merge it
  // onto dto.sort here, mirroring mergeFlatFilters below, so SearchService
  // only ever has to deal with the nested SortDto shape.
  private mergeSort(dto: SearchDto): SearchDto {
    if (dto.sortBy === undefined) return dto
    return {
      ...dto,
      sort: { field: dto.sortBy, direction: (dto.sortOrder ?? 'desc') as SortDirection },
    }
  }

  // The frontend sends flat query params (?skills=React&location=NYC) rather
  // than nested `filters[skills]=React` syntax. Merge them onto dto.filters
  // here so SearchService's Algolia filter-building logic doesn't need to
  // know about both shapes.
  private mergeFlatFilters(dto: SearchDto): SearchDto {
    const { skills, location, industry, project_type, project_category, project_duration_range, team_size_range, tags } = dto
    if (
      skills === undefined &&
      location === undefined &&
      industry === undefined &&
      project_type === undefined &&
      project_category === undefined &&
      project_duration_range === undefined &&
      team_size_range === undefined &&
      tags === undefined
    ) {
      return dto
    }

    const filters: SearchFiltersDto = dto.filters ?? new SearchFiltersDto()
    if (skills !== undefined) filters.skills = [...(filters.skills ?? []), skills]
    if (location !== undefined) filters.location = [...(filters.location ?? []), location]
    if (industry !== undefined) {
      filters.industry = industry
      filters.industries = [...(filters.industries ?? []), industry]
    }
    if (project_type !== undefined) {
      filters.project_type = [...(filters.project_type ?? []), project_type]
    }
    if (project_category !== undefined) {
      filters.project_category = [...(filters.project_category ?? []), project_category]
    }
    if (project_duration_range !== undefined) {
      filters.project_duration_range = [...(filters.project_duration_range ?? []), project_duration_range]
    }
    if (team_size_range !== undefined) {
      filters.team_size_range = [...(filters.team_size_range ?? []), team_size_range]
    }
    if (tags !== undefined) filters.tags = [...(filters.tags ?? []), tags]

    return { ...dto, filters }
  }

  @Get('facets')
  getFacets(@Query('category') category?: SearchCategory) {
    if (category && category !== SearchCategory.ALL && FACET_FIELDS[category]) {
      return { category, fields: FACET_FIELDS[category], enums: FILTER_ENUMS }
    }
    return { fields: FACET_FIELDS, enums: FILTER_ENUMS }
  }

  // Taxonomy names that this entity's own records actually use — the sidebar
  // prunes the global taxonomy tree to these, so Projects, Services and Talent
  // each offer their own categories and never a branch with zero results
  // behind it. Only the entities in CATEGORY_NAME_ATTRIBUTE (those that drill
  // down through the taxonomy) are answerable here; teams carry a single flat
  // category with no levels to drill into.
  @Get('category-values')
  getCategoryValues(@Query('category') category?: SearchCategory) {
    if (!category || !CATEGORY_NAME_ATTRIBUTE[category]) {
      throw new BadRequestException(
        `category must be one of: ${Object.keys(CATEGORY_NAME_ATTRIBUTE).join(', ')}`,
      )
    }
    return this.svc.getCategoryValues(category)
  }

  // The values this entity's records actually carry for one sidebar filter
  // field (tags/industries/skills for listings, job_title for talent), most
  // used first. Those filters are built from this, so their options come from
  // what people typed into their listings and profiles instead of a hardcoded
  // list, each entity gets its own values (values common to several
  // legitimately appear in each response), and ticking one on its own can't
  // land on zero results. Only the entity/field pairs in FILTER_VALUE_SOURCES
  // are answerable here — the fields differ per entity, so the error names the
  // ones valid for the requested category.
  @Get('filter-values')
  getFilterValues(
    @Query('category') category?: SearchCategory,
    @Query('field') field?: string,
    @Query('limit') limit?: string,
  ) {
    if (!category || !FILTER_VALUE_SOURCES[category]) {
      throw new BadRequestException(
        `category must be one of: ${Object.keys(FILTER_VALUE_SOURCES).join(', ')}`,
      )
    }
    const fields = FILTER_VALUE_SOURCES[category]
    if (!field || !fields[field]) {
      throw new BadRequestException(
        `field must be one of: ${Object.keys(fields).join(', ')}`,
      )
    }
    return this.svc.getFilterValues(category, field, this.resolveValueLimit(field, limit))
  }

  // The rungs of a numeric sidebar filter (Talent's Client Success Rate), each
  // with how many records currently reach it. The rungs themselves are a
  // product decision and stay declared in NUMERIC_BUCKET_SOURCES — unlike
  // filter-values, this returns all of them, empty ones included, because the
  // section is a fixed part of the sidebar's design. The live part is the
  // count, which comes off the same attribute the checkbox filters on.
  @Get('numeric-buckets')
  getNumericBuckets(
    @Query('category') category?: SearchCategory,
    @Query('field') field?: string,
  ) {
    if (!category || !NUMERIC_BUCKET_SOURCES[category]) {
      throw new BadRequestException(
        `category must be one of: ${Object.keys(NUMERIC_BUCKET_SOURCES).join(', ')}`,
      )
    }
    const fields = NUMERIC_BUCKET_SOURCES[category]
    if (!field || !fields[field]) {
      throw new BadRequestException(
        `field must be one of: ${Object.keys(fields).join(', ')}`,
      )
    }
    return this.svc.getNumericBuckets(category, field)
  }

  // `limit` arrives as a raw query string. Anything non-numeric falls back to
  // the field's default rather than erroring — a bad value is a malformed
  // caller, not a reason to break the filter.
  private resolveValueLimit(field: string, limit?: string): number {
    const parsed = Number(limit)
    if (!Number.isFinite(parsed) || parsed < 1) {
      return FILTER_VALUE_LIMITS[field] ?? DEFAULT_FILTER_VALUE_LIMIT
    }
    return Math.min(Math.floor(parsed), MAX_FILTER_VALUE_LIMIT)
  }

  @Get('health')
  health() {
    return { status: 'ok', service: 'search-service' }
  }

  // Index management (called by other services via RabbitMQ or REST)
  @Post('index')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  index(@Body() dto: IndexRecordDto) {
    return this.svc.indexRecord(dto.indexName, dto.objectID, dto.record)
  }

  @Post('index/:index/:id')
  @UseGuards(JwtAuthGuard)
  update(
    @Param('index') index: string,
    @Param('id') id: string,
    @Body() attributes: Record<string, any>,
  ) {
    return this.svc.updateRecord(index, id, attributes)
  }

  @Delete('index/:index/:id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('index') index: string, @Param('id') id: string) {
    return this.svc.removeRecord(index, id)
  }

  // RabbitMQ
  @MessagePattern('search.query')
  handleSearch(@Payload() dto: SearchDto) {
    return this.svc.search(dto)
  }

  @MessagePattern('search.index')
  handleIndex(@Payload() dto: IndexRecordDto) {
    return this.svc.indexRecord(dto.indexName, dto.objectID, dto.record)
  }

  @MessagePattern('search.remove')
  handleRemove(@Payload() data: { indexName: string; objectID: string }) {
    return this.svc.removeRecord(data.indexName, data.objectID)
  }
}
