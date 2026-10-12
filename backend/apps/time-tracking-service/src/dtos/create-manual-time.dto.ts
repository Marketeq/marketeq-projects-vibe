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
  // AC-76.04 / AC-77.02: manual time is always logged against a contract.
  @IsString()
  @IsNotEmpty({ message: 'Contract is required.' })
  contractId: string;

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
