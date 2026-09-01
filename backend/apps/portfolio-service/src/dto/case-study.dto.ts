import { IsString, IsOptional, IsObject, Length, IsArray, ArrayMinSize, ArrayMaxSize, IsUUID, IsIn, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateCaseStudyDto {
  @IsString()
  @Length(1, 255)
  title: string;

  @IsOptional()
  @IsString()
  templateId?: string;
}

export class UpdateCaseStudyDto {
  @IsOptional()
  @IsString()
  @Length(1, 255)
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsObject()
  schemaJson?: Record<string, any>;
}

export class PublishCaseStudyDto {
  @IsOptional()
  @IsString()
  coverImage?: string;

  @IsOptional()
  @Type(() => Number)
  coverImageZoom?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  coverImageRotation?: number;

  @IsOptional()
  @Type(() => Number)
  coverImageOffsetX?: number;

  @IsOptional()
  @Type(() => Number)
  coverImageOffsetY?: number;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  skills?: string[];
}

export class SetVisibilityDto {
  @IsIn(['published', 'hidden'])
  status: 'published' | 'hidden';
}

export class ReorderBlocksDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  blockOrder: string[];
}

export class ListCaseStudiesQueryDto {
  @IsOptional()
  @IsIn(['draft', 'published', 'hidden', 'archived', 'all'])
  status?: 'draft' | 'published' | 'hidden' | 'archived' | 'all';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number;
}
