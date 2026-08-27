import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsUrl, MaxLength } from 'class-validator';
import { IsCompanyName } from './company-name.constraint';

export class CreateCompanyDto {
  @ApiProperty({ example: 'Alliance Corp.' })
  @IsString()
  @MaxLength(255)
  @IsCompanyName()
  name!: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  domain?: string;

  @ApiProperty({ required: false })
  @IsUrl()
  @IsOptional()
  logoUrl?: string;
}
