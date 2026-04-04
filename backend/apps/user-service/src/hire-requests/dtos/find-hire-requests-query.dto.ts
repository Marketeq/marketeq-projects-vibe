import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { HireStatus } from '../enums/hire-status.enums';

export enum HireRequestRole {
  CLIENT = 'client',
  TALENT = 'talent',
}

export class FindHireRequestsQueryDto {
  @ApiPropertyOptional({
    enum: HireRequestRole,
    example: 'client',
    description: 'Filter by role: client (sent) or talent (received)',
  })
  @IsOptional()
  @IsEnum(HireRequestRole)
  role?: HireRequestRole;

  @ApiPropertyOptional({
    enum: HireStatus,
    example: HireStatus.PENDING,
    description: 'Filter by status',
  })
  @IsOptional()
  @IsEnum(HireStatus)
  status?: HireStatus;
}
