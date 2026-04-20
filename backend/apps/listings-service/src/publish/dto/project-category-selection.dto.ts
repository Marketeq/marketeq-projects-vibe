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
  @IsString({ each: true })
  subCategories: string[];
}
