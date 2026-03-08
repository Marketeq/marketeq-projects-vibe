import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class LinkedInLoginDto {
  @ApiProperty()
  @IsOptional()
  @IsString()
  access_token?: string;

  @ApiProperty()
  @IsOptional()
  @IsString()
  code?: string;

  @ApiProperty()
  @IsOptional()
  @IsString()
  redirectUrl?: string;
}
