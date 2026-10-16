import { IsBoolean, IsOptional, IsString } from 'class-validator';
import { Transform } from 'class-transformer';

export class ListContractsQueryDto {
  @IsOptional()
  @IsString()
  clientUserId?: string;

  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  addableJobsOnly?: boolean;
}
