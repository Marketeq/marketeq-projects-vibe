import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class RefreshDto {
  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  refresh_token?: string;
}
