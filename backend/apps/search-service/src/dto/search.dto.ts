import {
  IsString,
  IsOptional,
  IsEnum,
  IsInt,
  Min,
  Max,
  IsBoolean,
  IsArray,
  IsNumber,
  ValidateNested,
} from 'class-validator'
import { Type, Transform } from 'class-transformer'

export enum SearchCategory {
  ALL = 'all',
  TALENT = 'talent',
  TEAMS = 'teams',
  PROJECTS = 'projects',
  SERVICES = 'services',
}

export enum SortDirection {
  ASC = 'asc',
  DESC = 'desc',
}

export class SortDto {
  @IsString()
  field: string

  @IsEnum(SortDirection)
  direction: SortDirection
}

export class SearchFiltersDto {
  // ── Shared across all entity types ────────────────────────────────────────

  @IsOptional() @IsArray() @IsString({ each: true })
  skills?: string[]

  @IsOptional() @IsArray() @IsString({ each: true })
  location?: string[]

  @IsOptional() @IsArray() @IsString({ each: true })
  tags?: string[]

  @IsOptional() @IsArray() @IsString({ each: true })
  industries?: string[]

  @IsOptional() @IsNumber() @Min(0) @Type(() => Number)
  hourly_rate_min?: number

  @IsOptional() @IsNumber() @Min(0) @Type(() => Number)
  hourly_rate_max?: number

  @IsOptional() @IsNumber() @Min(0) @Type(() => Number)
  rating_min?: number

  // ── Talent ────────────────────────────────────────────────────────────────

  @IsOptional() @IsArray() @IsString({ each: true })
  job_title?: string[]

  @IsOptional() @IsArray() @IsString({ each: true })
  experience_level?: string[]

  @IsOptional() @IsString()
  availability?: string

  // ── Teams ─────────────────────────────────────────────────────────────────

  @IsOptional() @IsString()
  category?: string

  @IsOptional() @IsArray() @IsString({ each: true })
  team_size_range?: string[]

  @IsOptional() @IsNumber() @Min(0) @Type(() => Number)
  projects_completed_min?: number

  @IsOptional() @IsNumber() @Min(0) @Type(() => Number)
  projects_completed_max?: number

  @IsOptional() @IsNumber() @Min(0) @Type(() => Number)
  client_success_rate_min?: number

  @IsOptional() @IsArray() @IsString({ each: true })
  languages?: string[]

  // ── Projects ──────────────────────────────────────────────────────────────

  @IsOptional() @IsString()
  project_category?: string

  @IsOptional() @IsString()
  project_type?: string

  @IsOptional() @IsString()
  industry?: string

  @IsOptional() @IsNumber() @Min(0) @Type(() => Number)
  budget_min?: number

  @IsOptional() @IsNumber() @Min(0) @Type(() => Number)
  budget_max?: number

  @IsOptional() @IsArray() @IsString({ each: true })
  project_duration_range?: string[]

  @IsOptional() @IsArray() @IsString({ each: true })
  technologies?: string[]

  @IsOptional() @IsArray() @IsString({ each: true })
  additional_tags?: string[]

  // ── Services ──────────────────────────────────────────────────────────────

  @IsOptional() @IsString()
  service_category?: string

  @IsOptional() @IsString()
  pricing_model?: string

  @IsOptional() @IsString()
  delivery_time?: string

  @IsOptional() @IsNumber() @Min(0) @Type(() => Number)
  price_min?: number

  @IsOptional() @IsNumber() @Min(0) @Type(() => Number)
  price_max?: number
}

export class SearchDto {
  @IsOptional()
  @IsString()
  q?: string = ''

  @IsOptional()
  @IsEnum(SearchCategory)
  category?: SearchCategory = SearchCategory.ALL

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  page?: number = 0

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  ml?: boolean = false

  @IsOptional()
  @ValidateNested()
  @Type(() => SortDto)
  sort?: SortDto

  @IsOptional()
  @ValidateNested()
  @Type(() => SearchFiltersDto)
  filters?: SearchFiltersDto
}

export class IndexRecordDto {
  @IsString()
  indexName: string

  @IsString()
  objectID: string

  @IsOptional()
  record: Record<string, any>
}
