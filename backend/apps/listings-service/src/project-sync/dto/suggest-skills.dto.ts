import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsOptional, IsString } from 'class-validator';

/**
 * Request body for the wizard's live "Suggested Skills" (PL-SKILL-03).
 * Feeds the existing SkillsAdapter (embedding + cosine) with the draft's
 * current content; all fields optional so it works on empty drafts.
 */
export class SuggestSkillsDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiProperty({ type: [String], required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiProperty({ type: [String], required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  scopeTaskTitles?: string[];
}
