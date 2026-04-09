import { ApiProperty } from '@nestjs/swagger';

export class SessionResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  userAgent: string;

  @ApiProperty()
  ipAddress: string;

  @ApiProperty()
  createdAt: string;

  @ApiProperty()
  lastActiveAt: string;

  @ApiProperty()
  isCurrent: boolean;
}
