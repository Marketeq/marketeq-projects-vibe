import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  IsArray,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { CreateProjectPhaseDto } from './create-phase.dto';
import { ProjectCategorySelectionDto } from './project-category-selection.dto';

export class CreateProjectDto {
  @ApiProperty({ description: 'Project title', maxLength: 120 })
  @IsNotEmpty()
  @IsString()
  @MaxLength(120, { message: 'Title cannot exceed 120 characters.' })
  title: string;

  @ApiProperty({
    description: 'Project subtitle',
    maxLength: 120,
    required: false,
  })
  @IsOptional()
  @IsString()
  subtitle?: string;

  @ApiProperty({
    description: 'Short description of the project',
    maxLength: 300,
  })
  @IsNotEmpty()
  @IsString()
  shortDescription: string;

  @ApiProperty({ description: 'Full project description', maxLength: 2000 })
  @IsNotEmpty()
  @IsString()
  fullDescription: string;

  @ApiProperty({
    description: 'Project budget',
    example: 25000,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  budget?: number;

  @ApiProperty({
    description: 'Initial team budget',
    example: 8000,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  initialTeamBudget?: number;

  @ApiProperty({
    description: 'Project duration in months',
    example: 3,
    required: false,
  })
  @IsOptional()
  @IsInt()
  durationMonths?: number;

  @ApiProperty({ description: 'Location of the project', required: false })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiProperty({
    description: 'Preferred timezone for the project',
    required: false,
  })
  @IsOptional()
  @IsString()
  timezone?: string;

  @ApiProperty({
    description: 'Categories selected for the project',
    type: [String],
  })
  @IsArray()
  @ArrayMaxSize(3, { message: 'You can add a maximum of 3 categories.' })
  @IsString({ each: true })
  @IsOptional()
  categories?: string[];

  @ApiProperty({
    description: 'Subcategories selected for the project',
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  subCategories?: string[];

  @ApiProperty({
    description: 'Parent-child category selections selected for the project',
    type: [ProjectCategorySelectionDto],
    required: false,
  })
  @IsArray()
  @ArrayMaxSize(3, { message: 'You can add a maximum of 3 categories.' })
  @ValidateNested({ each: true })
  @Type(() => ProjectCategorySelectionDto)
  @IsOptional()
  categorySelections?: ProjectCategorySelectionDto[];

  @ApiProperty({
    description: 'Industries associated with the project',
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  industries?: string[];

  @ApiProperty({
    description: 'Industry alias from frontend payload (normalized to industries)',
    type: [String],
    required: false,
  })
  @Transform(({ value }) => {
    if (value === undefined || value === null) {
      return undefined;
    }
    return Array.isArray(value) ? value : [value];
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  industry?: string[];

  @ApiProperty({
    description: 'Tags associated with the project',
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @ApiProperty({
    description: 'Skills required for the project',
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  skills?: string[];

  @ApiProperty({ description: 'Listing type (e.g. Website, Mobile App)', required: false })
  @IsOptional()
  @IsString()
  listingType?: string;

  @ApiProperty({ description: 'User ID of the project creator' })
  @IsOptional()
  @IsString()
  userId: string;

  @ApiProperty({
    description: 'Scope of the project (phases and tasks)',
    type: [CreateProjectPhaseDto],
    required: false,
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateProjectPhaseDto)
  @IsOptional()
  scope?: CreateProjectPhaseDto[];
}
