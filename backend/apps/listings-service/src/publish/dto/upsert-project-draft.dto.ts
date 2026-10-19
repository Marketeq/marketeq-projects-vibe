import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';

// PMCM-258: the five canonical period keys the Budget Calculator/buyer
// page pricing module (frontend/lib/listing-pricing.ts) understands.
export const PRICING_PERIODS = [
  'week',
  'biweek',
  'month',
  'quarter',
  'year',
] as const;
import { Transform, Type } from 'class-transformer';
import { ProjectCategorySelectionDto } from './project-category-selection.dto';

export class FaqItemDto {
  @IsString()
  question: string;

  @IsString()
  answer: string;

  @IsOptional()
  @IsBoolean()
  is_ai_generated?: boolean;
}

export class UpsertProjectDraftDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(120, { message: 'Title cannot exceed 120 characters.' })
  title?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  subtitle?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  shortDescription?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  fullDescription?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  budget?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  initialTeamBudget?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  durationMonths?: number;

  // PMCM-258: display-only preference — never used to compute the total
  // or the duration, only which slice of it is shown. Null/omitted means
  // "no preference saved yet."
  @ApiProperty({ required: false, enum: PRICING_PERIODS })
  @IsOptional()
  @IsIn(PRICING_PERIODS)
  pricingPeriod?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  timezone?: string;

  @ApiProperty({ type: [String], required: false })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(3, { message: 'You can add a maximum of 3 categories.' })
  @IsString({ each: true })
  categories?: string[];

  @ApiProperty({ type: [String], required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  subCategories?: string[];

  @ApiProperty({
    type: [ProjectCategorySelectionDto],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(3, { message: 'You can add a maximum of 3 categories.' })
  @ValidateNested({ each: true })
  @Type(() => ProjectCategorySelectionDto)
  categorySelections?: ProjectCategorySelectionDto[];

  @ApiProperty({ type: [String], required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  industries?: string[];

  @ApiProperty({ type: [String], required: false })
  @Transform(({ value }) => {
    if (value === undefined || value === null) {
      return undefined;
    }
    return Array.isArray(value) ? value : [value];
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  industry?: string[];

  @ApiProperty({ type: [String], required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiProperty({ type: [String], required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  skills?: string[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  listingType?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  projectType?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  videoUrl?: string;

  @ApiProperty({ type: [FaqItemDto], required: false })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FaqItemDto)
  faqs?: FaqItemDto[];

  @ApiProperty({ type: [String], required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  teamMemberIds?: string[];

  // QA-180/PMCM-399: emails invited (search or email, via the shared
  // InviteWindow) but not yet accepted — shown as "Pending Invite" rows
  // in the Team step's members table. Plain strings, not IsUUID, same as
  // teamMemberIds above — this DTO validates loosely even though that
  // field's own column is uuid[]; this one's column is text[] since
  // emails aren't UUIDs.
  @ApiProperty({ type: [String], required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  pendingInviteEmails?: string[];
}
