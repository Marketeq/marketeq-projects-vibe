import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class GoogleLoginDto {
  @ApiProperty()
  @IsOptional()
  @IsString()
  id_token?: string;

  @ApiProperty()
  @IsOptional()
  @IsString()
  credential?: string;

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
