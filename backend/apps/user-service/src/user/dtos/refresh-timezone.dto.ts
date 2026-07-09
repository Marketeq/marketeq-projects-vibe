import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class RefreshTimezoneDto {
  @ApiPropertyOptional({
    description: 'Client-reported IANA timezone, e.g. America/New_York',
  })
  @IsOptional()
  @IsString()
  clientTimeZone?: string;
}

