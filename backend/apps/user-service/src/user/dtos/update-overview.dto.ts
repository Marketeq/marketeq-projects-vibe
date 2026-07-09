import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class UpdateOverviewDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  overview: string;
}
