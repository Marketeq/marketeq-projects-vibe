import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateModeratedSubcategoryDto {
  @ApiProperty({ description: 'Subcategory name to create' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: 'Parent category UUID. When omitted, category-service will infer it.',
    required: false,
  })
  @IsOptional()
  @IsString()
  parentUuid?: string;
}
