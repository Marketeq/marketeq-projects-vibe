import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsOptional, Min } from 'class-validator';

export class UpdateRateDto {
  @ApiProperty()
  @IsOptional()
  @IsNumber()
  @Min(0)
  rate_min?: number;

  @ApiProperty()
  @IsOptional()
  @IsNumber()
  @Min(0)
  rate_max?: number;
}
