import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsOptional, IsString, IsUrl } from 'class-validator';

export class ForgotPasswordDto {
  @ApiProperty({
    example: 'john@example.com',
    description: 'User email address',
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsEmail()
  email: string;

  @ApiProperty()
  @IsOptional()
  @IsString()
  @IsUrl({ require_tld: false })
  redirectUrl?: string;
}
