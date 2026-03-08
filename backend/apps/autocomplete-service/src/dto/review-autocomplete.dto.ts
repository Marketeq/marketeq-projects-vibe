import { IsUUID, IsEnum, IsOptional, IsString, ValidateIf } from 'class-validator';
import { ReviewAction } from '../entities/autocomplete-review-queue.entity';

export class ReviewAutocompleteDto {
  @IsUUID()
  entryId: string;

  @IsEnum(ReviewAction)
  action: ReviewAction;

  @ValidateIf(o => o.action === ReviewAction.REJECT)
  @IsString()
  reason: string;

  @IsString()
  @IsOptional()
  reviewedBy?: string;
}
