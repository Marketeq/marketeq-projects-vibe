import { IsIn, IsOptional, IsString } from 'class-validator';

export class ReviewScreenshotDto {
  @IsIn(['approved', 'rejected'])
  status: 'approved' | 'rejected';

  @IsOptional()
  @IsString()
  comment?: string;
}
