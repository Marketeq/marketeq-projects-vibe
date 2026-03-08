import { IsString, IsEnum, IsOptional } from 'class-validator'

export enum SyncOperation {
  UPSERT = 'upsert',
  DELETE = 'delete',
}

export enum AlgoliaIndex {
  TALENT = 'talent',
  PROJECTS = 'projects',
  SERVICES = 'services',
  TEAMS = 'teams',
}

export class SyncRecordDto {
  @IsEnum(AlgoliaIndex)
  index: AlgoliaIndex

  @IsEnum(SyncOperation)
  operation: SyncOperation

  @IsString()
  objectID: string

  @IsOptional()
  record?: Record<string, any>
}
