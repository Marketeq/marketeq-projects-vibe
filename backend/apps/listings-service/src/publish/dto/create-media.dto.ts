import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateMediaDto {
  @ApiProperty({
    description: 'Featured image URL for the project',
    example: 'https://cdn.example.com/project1/cover.jpg',
    required: false,
  })
  @IsOptional()
  @IsString()
  featuredImage?: string;

  @ApiProperty({
    description:
      "Upload target: 'featured' sets the cover, 'additional' appends to the gallery without touching the cover",
    required: false,
  })
  @IsOptional()
  @IsString()
  target?: 'featured' | 'additional';

  @ApiProperty({
    description: 'Additional image URLs (max 8)',
    type: [String],
    required: false,
  })
  @Transform(({ value }) =>
    value === undefined || value === null
      ? undefined
      : Array.isArray(value)
        ? value
        : [value],
  )
  @IsOptional()
  @ArrayMaxSize(8, { message: 'You can upload a maximum of 8 images.' })
  @IsArray()
  @IsString({ each: true })
  additionalImages?: string[];

  @ApiProperty({
    description: 'Additional image URLs hidden from the client-facing gallery',
    type: [String],
    required: false,
  })
  @Transform(({ value }) =>
    value === undefined || value === null
      ? undefined
      : Array.isArray(value)
        ? value
        : [value],
  )
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  hiddenImages?: string[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  replaceHidden?: string;

  @ApiProperty({
    description: 'Featured YouTube or video URL',
    example: 'https://www.youtube.com/watch?v=abc123',
    required: false,
  })
  @IsOptional()
  @IsString()
  videoUrl?: string;

  @ApiProperty({ description: 'ID of the project this media belongs to' })
  @IsNotEmpty()
  @IsString()
  projectId: string;
}
