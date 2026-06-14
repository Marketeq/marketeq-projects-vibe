import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';
import { StrongPassword } from './password-validation';

export class SetPasswordDto {
  @ApiProperty()
  @IsString()
  @StrongPassword()
  password: string;
}
