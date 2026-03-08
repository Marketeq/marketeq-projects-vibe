import { IsUUID, IsEnum, IsOptional, IsString } from 'class-validator';
import { ReviewAction } from '../entities/autocomplete-review-queue.entity';

export class ReviewAutocompleteDto {
  @IsUUID()
  entryId: string;

  @IsEnum(ReviewAction)
  action: ReviewAction;

  @IsString()
  @IsOptional()
  reason?: string;

  @IsString()
  @IsOptional()
  reviewedBy?: string;
}
