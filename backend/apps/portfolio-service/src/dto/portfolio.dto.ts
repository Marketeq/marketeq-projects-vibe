import { IsString, IsOptional, IsObject, MaxLength, Matches } from 'class-validator';

export class UpsertDraftDto {
  @IsString()
  @MaxLength(500)
  @Matches(/^[a-z0-9-]+$/, { message: 'slug must be lowercase alphanumeric with hyphens' })
  slug: string;

  @IsString()
  @MaxLength(200)
  title: string;

  @IsString()
  ownerUserId: string;

  @IsObject()
  @IsOptional()
  schemaJson?: Record<string, any>;

  @IsString()
  @IsOptional()
  htmlDraft?: string;
}

export class PublishDto {
  @IsString()
  slug: string;
}
