import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches, MinLength } from 'class-validator';

export class SetPasswordDto {
  @ApiProperty()
  @IsString()
  @MinLength(8)
  @Matches(/[a-z]/)
  @Matches(/[A-Z]/)
  @Matches(/\d/)
  @Matches(/[-+_!@#$%^&*., ?]/)
  password: string;
}
