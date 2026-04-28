import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SessionResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  userAgent: string;

  @ApiPropertyOptional()
  browserName?: string | null;

  @ApiPropertyOptional()
  browserVersion?: string | null;

  @ApiPropertyOptional()
  osName?: string | null;

  @ApiPropertyOptional()
  osVersion?: string | null;

  @ApiPropertyOptional()
  deviceType?: string | null;

  @ApiProperty()
  ipAddress: string;

  @ApiProperty()
  createdAt: string;

  @ApiProperty()
  lastActiveAt: string;

  @ApiProperty()
  isCurrent: boolean;
}
