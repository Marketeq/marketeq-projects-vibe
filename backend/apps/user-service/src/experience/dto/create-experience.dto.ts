import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsDateString,
  IsArray,
} from 'class-validator';

export class CreateExperienceDto {
  @ApiProperty({ example: 'Senior Software Engineer' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ example: 'Acme Corp' })
  @IsString()
  @IsNotEmpty()
  company: string;

  @ApiPropertyOptional({ example: 'Remote' })
  @IsString()
  @IsOptional()
  location?: string;

  @ApiProperty({ example: '2020-01-01' })
  @IsDateString()
  startDate: string;

  @ApiPropertyOptional({ example: '2022-12-31' })
  @IsDateString()
  @IsOptional()
  endDate?: string;

  @ApiPropertyOptional({ example: false })
  @IsBoolean()
  @IsOptional()
  isCurrentRole?: boolean;

  @ApiPropertyOptional({ example: 'Worked on backend services and APIs.' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ example: ['TypeScript', 'Node.js'] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  skills?: string[];
}
