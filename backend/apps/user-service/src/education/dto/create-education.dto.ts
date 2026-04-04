import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class CreateEducationDto {
  @ApiProperty({ example: 'Harvard University' })
  @IsString()
  @IsNotEmpty()
  school: string;

  @ApiProperty({ example: "Master's of Science" })
  @IsString()
  @IsNotEmpty()
  degree: string;

  @ApiPropertyOptional({ example: 'Computer Engineering' })
  @IsString()
  @IsOptional()
  fieldOfStudy?: string;

  @ApiProperty({ example: '2021' })
  @IsInt()
  @Min(1900)
  startYear: number;

  @ApiPropertyOptional({ example: '9' })
  @IsInt()
  @Min(1)
  @Max(12)
  @IsOptional()
  startMonth?: number;

  @ApiPropertyOptional({ example: '2025' })
  @IsInt()
  @IsOptional()
  endYear?: number;

  @ApiPropertyOptional({ example: '6' })
  @IsInt()
  @Min(1)
  @Max(12)
  @IsOptional()
  endMonth?: number;

  @ApiPropertyOptional({ example: 'false' })
  @IsBoolean()
  @IsOptional()
  currentlyStudying?: boolean;
}
