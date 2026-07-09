import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ReportStatus } from '../reports.entity';

export class ReportDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  reporterId: string;

  @ApiProperty()
  reportedId: string;

  @ApiProperty()
  reason: string;

  @ApiPropertyOptional({ nullable: true })
  contextThreadId: string | null;

  @ApiPropertyOptional({ nullable: true })
  contextMessageId: string | null;

  @ApiProperty({ enum: ['pending', 'reviewing', 'actioned', 'dismissed'] })
  status: ReportStatus;

  @ApiProperty()
  createdAt: string;

  @ApiPropertyOptional({
    description:
      'True when an equivalent report already existed; the row returned is the prior submission and no new moderation queue item was created.',
  })
  wasAlreadyReported?: boolean;
}
