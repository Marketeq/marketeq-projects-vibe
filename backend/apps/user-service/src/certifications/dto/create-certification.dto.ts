import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateCertificationDto {
  @ApiProperty({ example: 'AWS Certified Solutions Architect' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ example: 'AWS Training and Certification' })
  @IsString()
  @IsOptional()
  issuer?: string;

  @ApiProperty({ example: '2021' })
  @IsDateString()
  issueDate: string;

  @ApiPropertyOptional({ example: '2031' })
  @IsDateString()
  @IsOptional()
  expirationDate?: string;

  @ApiPropertyOptional({ example: 'aws-credential-123' })
  @IsString()
  @IsOptional()
  credentialId?: string;

  @ApiPropertyOptional({ example: 'http://credential.com' })
  @IsString()
  @IsOptional()
  credentialUrl?: string;

  @ApiPropertyOptional({ type: [String], example: ['AWS', 'Cloud'] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  skills?: string[];

  @ApiPropertyOptional({ example: false })
  @IsBoolean()
  @IsOptional()
  doesntExpire?: boolean;
}
