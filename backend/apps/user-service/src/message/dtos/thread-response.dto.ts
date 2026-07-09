import { ApiProperty } from '@nestjs/swagger';

export class ThreadResponseDto {
  @ApiProperty({ example: 'thread_abc123' })
  threadId: string;

  @ApiProperty({
    example: true,
    description: 'true if newly created, false if existing',
  })
  created: boolean;
}
