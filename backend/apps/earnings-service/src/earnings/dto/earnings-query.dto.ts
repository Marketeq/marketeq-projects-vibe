import { IsOptional, IsString, IsIn, IsDateString, IsInt, Min, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';

export class EarningsQueryDto {
  @IsOptional() @IsIn(['daily','weekly','monthly'])
  view?: string = 'daily';

  @IsOptional() @IsIn(['today','yesterday','this_week','last_week','this_month',
    'last_month','this_year','last_year','all_time','custom'])
  dateRange?: string = 'all_time';

  @IsOptional() @IsDateString() startDate?: string;
  @IsOptional() @IsDateString() endDate?:   string;
  @IsOptional() @IsUUID()       projectId?: string;
  @IsOptional() @IsUUID()       clientId?:  string;

  @IsOptional() @IsIn(['manual','automated'])
  entryType?: string;

  @IsOptional() @IsIn(['paid','unpaid','failed'])
  status?: string;

  @IsOptional() @IsString() search?: string;

  @IsOptional() @Type(()=>Number) @IsInt() @Min(1)
  page?: number = 1;

  @IsOptional() @Type(()=>Number) @IsInt() @IsIn([10,25,50,100])
  limit?: number = 10;

  @IsOptional() @IsIn(['workStartAt','netAmount','durationMinutes'])
  sortBy?: string = 'workStartAt';

  @IsOptional() @IsIn(['asc','desc'])
  sortOrder?: string = 'desc';
}
