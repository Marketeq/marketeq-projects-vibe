import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateLanguageDto {
  @ApiProperty({ example : 'English'})
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ example : 'Fluent'})
  @IsString()
  @IsOptional()
  fluency?: string;
}
