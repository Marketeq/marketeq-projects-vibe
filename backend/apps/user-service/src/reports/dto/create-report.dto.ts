import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class CreateReportDto {
  @ApiProperty({
    example: 'User attempted to take the project off-platform.',
    description: 'Free-text reason for the report',
    maxLength: 2000,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  reason: string;

  @ApiPropertyOptional({
    description: 'Thread the report is filed against, if applicable',
  })
  @IsOptional()
  @IsUUID()
  contextThreadId?: string;

  @ApiPropertyOptional({
    description: 'Specific message the report is filed against, if applicable',
  })
  @IsOptional()
  @IsUUID()
  contextMessageId?: string;
}
