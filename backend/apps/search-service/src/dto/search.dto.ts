import {
  IsString,
  IsOptional,
  IsEnum,
  IsIn,
  IsInt,
  Min,
  Max,
  MaxLength,
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

  // `category` (shared field above with Teams) doubles as talent's category
  // filter — talent supports multiple simultaneous categories, unlike teams'
  // single value, but both map onto an OR'd array filter the same way.
  @IsOptional() @IsArray() @IsString({ each: true })
  subcategory?: string[]

  @IsOptional() @IsArray() @IsString({ each: true })
  job_title?: string[]

  @IsOptional() @IsArray() @IsString({ each: true })
  experience_level?: string[]

  @IsOptional() @IsArray() @IsString({ each: true })
  availability?: string[]

  // ── Teams ─────────────────────────────────────────────────────────────────

  @IsOptional() @IsArray() @IsString({ each: true })
  category?: string[]

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

  @IsOptional() @IsArray() @IsString({ each: true })
  project_category?: string[]

  // Subcategories of the single selected parent in `project_category`. The
  // sidebar lets a user pick exactly one parent category but any number of
  // its subcategories, so these two AND together: parent narrows to the
  // branch, subcategories narrow further within it.
  //
  // Both fields carry EXPANDED taxonomy name lists (the picked node's name
  // plus every descendant's) because a listing records only its own leaf
  // category name, never its ancestors — the sidebar does the expansion
  // since it's the side that holds the category tree. Both therefore match
  // against the same indexed attribute; the parent clause is redundant
  // whenever subcategories are set, but keeping it makes the two filters
  // independent and lets either be cleared on its own.
  //
  // Kept separate from talent's `subcategory` field so a stale talent
  // selection can never leak into a projects search (and vice versa).
  @IsOptional() @IsArray() @IsString({ each: true })
  project_subcategory?: string[]

  @IsOptional() @IsArray() @IsString({ each: true })
  project_type?: string[]

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

  @IsOptional() @IsArray() @IsString({ each: true })
  service_category?: string[]

  // Services counterpart of `project_subcategory` above — same one-parent /
  // many-subcategories sidebar contract.
  @IsOptional() @IsArray() @IsString({ each: true })
  service_subcategory?: string[]

  @IsOptional() @IsArray() @IsString({ each: true })
  pricing_model?: string[]

  @IsOptional() @IsArray() @IsString({ each: true })
  delivery_time?: string[]

  @IsOptional() @IsNumber() @Min(0) @Type(() => Number)
  price_min?: number

  @IsOptional() @IsNumber() @Min(0) @Type(() => Number)
  price_max?: number
}

export class SearchDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  q?: string = ''

  @IsOptional()
  @IsEnum(SearchCategory)
  category?: SearchCategory = SearchCategory.ALL

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(300)
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

  // ── Flat filter shortcuts ────────────────────────────────────────────────
  // The frontend sends these as flat query params (e.g. ?skills=React) rather
  // than nested `filters[skills]=React` syntax. Mapped onto `filters` in
  // SearchController before reaching SearchService.
  @IsOptional() @IsString()
  skills?: string

  @IsOptional() @IsString()
  location?: string

  @IsOptional() @IsString()
  industry?: string

  @IsOptional() @IsString()
  project_type?: string

  @IsOptional() @IsString()
  project_category?: string

  @IsOptional() @IsString()
  budget_range?: string

  @IsOptional() @IsString()
  project_duration_range?: string

  @IsOptional() @IsString()
  team_size_range?: string

  @IsOptional() @IsString()
  tags?: string

  // Flat sort shortcut — mirrors earnings-service's EarningsQueryDto pattern.
  // Mapped onto `sort` in SearchController, same as the flat filter
  // shortcuts above are mapped onto `filters`.
  @IsOptional() @IsString()
  sortBy?: string

  @IsOptional() @IsIn(['asc', 'desc'])
  sortOrder?: string
}

export class IndexRecordDto {
  @IsString()
  indexName: string

  @IsString()
  objectID: string

  @IsOptional()
  record: Record<string, any>
}
