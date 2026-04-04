import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsArray, IsUUID } from 'class-validator';

export class SimilarProfilesDto {
  @ApiProperty({ example: 'uuid-123' })
  @IsUUID()
  id: string;

  @ApiProperty({ example: 'John Doe' })
  @IsString()
  name: string;

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
