import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';
import { StrongPassword } from './password-validation';

export class ChangePasswordDto {
  /**
   * Not StrongPassword() — this is the password they already have. Applying
   * the current rules to it would lock out anyone whose password predates
   * them, which is exactly the person most in need of changing it.
   */
  @ApiProperty({ example: 'CurrentPassw0rd!' })
  @IsString()
  @IsNotEmpty({ message: 'Current password is required' })
  currentPassword: string;

  @ApiProperty({ example: 'NewPassw0rd!' })
  @IsString()
  @StrongPassword()
  newPassword: string;
}
