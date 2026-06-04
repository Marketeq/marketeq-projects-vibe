import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({
    example: 'email@example.com',
    description: 'User email',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    example: 'password123',
    description: 'User password',
  })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiProperty({
    example: true,
    description: 'Persist the login session for a longer period',
    required: false,
  })
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true' || value === '1' || value === 'on')
  @IsBoolean()
  rememberMe?: boolean;
}
