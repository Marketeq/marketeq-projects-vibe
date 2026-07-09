import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { JobListingStatus } from '../enums/job-listing-status.enum';
import { JobListingType } from '../enums/job-listing-type.enum';

export class ListJobListingsQueryDto {
  @IsEnum(JobListingStatus)
  @IsOptional()
  status?: JobListingStatus;

  @IsEnum(JobListingType)
  @IsOptional()
  type?: JobListingType;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit?: number = 20;
}
