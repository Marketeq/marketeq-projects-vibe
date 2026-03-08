import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, IsUrl } from 'class-validator';

export class ForgotPasswordDto {
  @ApiProperty({
    example: 'john@example.com',
    description: 'User email address',
  })
  @IsEmail()
  email: string;

  @ApiProperty()
  @IsOptional()
  @IsString()
  @IsUrl({ require_tld: false })
  redirectUrl?: string;
}
