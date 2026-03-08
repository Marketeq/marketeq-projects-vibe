import { ApiProperty } from '@nestjs/swagger';
import { IsEmail } from 'class-validator';

export class RegisterEmailDto {
  @ApiProperty({
    example: 'email@example.com',
    description: 'User email',
  })
  @IsEmail()
  email: string;
}
