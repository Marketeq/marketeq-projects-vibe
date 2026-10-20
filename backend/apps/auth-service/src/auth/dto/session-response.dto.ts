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

  /**
   * Human-readable place this session signed in from, e.g. "Austin, TX, US".
   * Null whenever the IP cannot be placed — loopback and private ranges
   * included — so the Devices screen shows its em dash rather than a guess.
   */
  @ApiPropertyOptional()
  location?: string | null;

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
