import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNotEmpty, IsString } from 'class-validator';

export class ProjectCategorySelectionDto {
  @ApiProperty({ description: 'Selected parent category name' })
  @IsString()
  @IsNotEmpty()
  category: string;

  @ApiProperty({
    description: 'Selected subcategories that belong to the parent category',
    type: [String],
  })
  @IsArray()
  // PMCM-254: no @ArrayMaxSize(5) here — this DTO is nested inside the
  // autosave/upsert payload, so a hard cap would 400 every autosave for any
  // existing listing already over 5 in a row (can't verify staging/live
  // data from local). The 5-item cap is enforced client-side only, on both
  // editors, at the point a seller tries to add a 6th.
  @IsString({ each: true })
  subCategories: string[];
}
