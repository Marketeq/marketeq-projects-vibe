import { IsString, IsOptional, IsEnum, IsInt, Min, Max, IsBoolean } from 'class-validator'
import { Type, Transform } from 'class-transformer'

export enum SearchCategory {
  ALL = 'all',
  TALENT = 'talent',
  TEAMS = 'teams',
  PROJECTS = 'projects',
  SERVICES = 'services',
}

export class SearchDto {
  @IsString()
  q: string

  @IsEnum(SearchCategory)
  @IsOptional()
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

  // Filters
  @IsString()
  @IsOptional()
  skills?: string

  @IsString()
  @IsOptional()
  location?: string

  @IsString()
  @IsOptional()
  industry?: string
}

export class IndexRecordDto {
  @IsString()
  indexName: string

  @IsString()
  objectID: string

  @IsOptional()
  record: Record<string, any>
}
