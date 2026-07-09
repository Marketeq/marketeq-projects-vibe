import { IsString, IsOptional, IsBoolean, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class TagDto {
  @ApiProperty({ type: String, description: 'Tag display name' })
  @IsString()
  name: string;
  @ApiProperty({ type: String, description: 'Tag slug' })
  @IsString()
  slug: string;
  @ApiPropertyOptional({
    type: String,
    nullable: true,
    description: 'Optional tag UUID',
  })
  @IsOptional()
  @IsString()
  uuid?: string;
}

export class CategoryDto {
  @ApiProperty({ type: String, description: 'Category UUID' })
  @IsString()
  uuid: string;
  @ApiProperty({ type: String, description: 'Category name' })
  @IsString()
  name: string;
  @ApiProperty({ type: String, description: 'Category slug' })
  @IsString()
  slug: string;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    description: 'SEO meta title',
  })
  @IsOptional()
  @IsString()
  seo_meta_title?: string | null;
  @ApiPropertyOptional({
    type: String,
    nullable: true,
    description: 'SEO meta description',
  })
  @IsOptional()
  @IsString()
  seo_meta_description?: string | null;

  @ApiPropertyOptional({ type: Boolean, description: 'Whether category is approved' })
  @IsOptional()
  @IsBoolean()
  approved?: boolean;
  @ApiPropertyOptional({
    type: Boolean,
    description: 'Whether category is published in marketplace',
  })
  @IsOptional()
  @IsBoolean()
  published_in_marketplace?: boolean;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    description: 'Optional parent category UUID',
  })
  @IsOptional()
  @IsString()
  parent?: string | null;

  @ApiProperty({ type: TagDto, isArray: true, description: 'Tags assigned to this category' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TagDto)
  tags: TagDto[];
}
