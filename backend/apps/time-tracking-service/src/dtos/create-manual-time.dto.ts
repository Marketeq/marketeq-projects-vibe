import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateManualTimeDto {
  @IsOptional()
  @IsString()
  contractId?: string;

  @IsOptional()
  @IsString()
  taskId?: string;

  @IsDateString()
  startTime: string;

  @IsDateString()
  endTime: string;

  @IsOptional()
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
