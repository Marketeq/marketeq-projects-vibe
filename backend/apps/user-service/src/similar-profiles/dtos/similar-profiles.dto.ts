import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNumber,
  IsArray,
  IsUUID,
  IsOptional,
} from 'class-validator';

export class SimilarProfilesDto {
  @ApiProperty({ example: 'uuid-123' })
  @IsUUID()
  id: string;

  @ApiProperty({ example: 'John Doe' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'johndoe', nullable: true })
  @IsOptional()
  @IsString()
  username: string | null;

  @ApiProperty({ example: 'https://cdn.example.com/avatar.png', nullable: true })
  @IsOptional()
  @IsString()
  avatarUrl: string | null;

  @ApiProperty({ example: 'Full Stack Developer', nullable: true })
  @IsOptional()
  @IsString()
  jobTitle: string | null;

  @ApiProperty({ example: ['React', 'TypeScript', 'Node.js'] })
  @IsArray()
  @IsString({ each: true })
  skills: string[];

  @ApiProperty({ example: 'TALENT' })
  @IsString()
  role: string;

  @ApiProperty({ example: 75 })
  @IsNumber()
  hourlyRate: number;

  @ApiProperty({ example: 34, nullable: true })
  @IsOptional()
  @IsNumber()
  rateMin: number | null;

  @ApiProperty({ example: 45, nullable: true })
  @IsOptional()
  @IsNumber()
  rateMax: number | null;

  @ApiProperty({ example: 'New York, NY' })
  @IsString()
  location: string;

  @ApiProperty({ example: 5 })
  @IsNumber()
  experience: number;

  @ApiProperty({ example: 'America/New_York' })
  @IsString()
  timezone: string;

  @ApiProperty({ example: 4.5 })
  @IsNumber()
  rating: number;
}

export class SimilarProfilesResponseDto {
  @ApiProperty({ type: [SimilarProfilesDto] })
  similarProfiles: SimilarProfilesDto[];
}
