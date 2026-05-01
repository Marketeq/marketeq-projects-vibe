import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class BlockStatusDto {
  @ApiProperty({ example: true })
  blocked: boolean;

  @ApiPropertyOptional({ example: '2026-04-30T10:00:00.000Z' })
  blockedAt?: string;
}

export class BlockedUserDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  blockedId: string;

  @ApiPropertyOptional()
  reason: string | null;

  @ApiProperty()
  createdAt: string;
}

export class BlockPairStatusDto {
  @ApiProperty({ description: 'Whether userA has blocked userB' })
  aBlockedB: boolean;

  @ApiProperty({ description: 'Whether userB has blocked userA' })
  bBlockedA: boolean;
}
