import { ApiProperty } from '@nestjs/swagger';
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
    description: 'Additional image URLs (max 8)',
    type: [String],
    required: false,
  })
  @IsOptional()
  @ArrayMaxSize(8, { message: 'You can upload a maximum of 8 images.' })
  @IsArray()
  @IsString({ each: true })
  additionalImages?: string[];

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
