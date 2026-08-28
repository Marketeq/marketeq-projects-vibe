import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';

export class SearchCompaniesDto {
  @ApiProperty({ example: 'alliance' })
  @IsString()
  @IsOptional()
  q?: string;
}
