import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

export class CreateManualTimeDto {
  // AC-76.04 / AC-77.02: manual time is always logged against a contract.
  // One rule, so a missing contract returns a single message.
  @Matches(/\S/, { message: 'Contract is required.' })
  contractId: string;

  @IsOptional()
  @IsString()
  taskId?: string;

  @IsDateString()
  startTime: string;

  @IsDateString()
  endTime: string;

  // BTB-332: whitespace is trimmed, so a spaces-only note is saved as no note.
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() || undefined : value))
  @IsString()
  @MaxLength(500)
  notes?: string;

  // US-78: overlap is a soft, dismissible warning, not a hard block — create()
  // throws ERR_MANUAL_TIME_OVERLAP on first submit; the contractor can resubmit
  // with confirmOverlap: true to proceed anyway.
  @IsOptional()
  @IsBoolean()
  confirmOverlap?: boolean;
}

export class ReviewManualTimeDto {
  @IsEnum(['approved', 'rejected'])
  status: 'approved' | 'rejected';

  @IsOptional()
  @IsString()
  comment?: string;
}
