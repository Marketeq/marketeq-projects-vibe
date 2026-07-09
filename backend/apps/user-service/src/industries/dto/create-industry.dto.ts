import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

export class CreateIndustryDto {
  @ApiProperty({ example : 'Finance'})
  @IsString()
  @IsNotEmpty()
  industry: string;

  @ApiPropertyOptional({ example : '5'})
  @IsInt()
  @Min(0)
  @IsOptional()
  yearsOfExperience?: number;

  @ApiPropertyOptional({ example : 'Management of money, currency, assets and liabilities'})
  @IsString()
  @IsOptional()
  description?: string;
}
