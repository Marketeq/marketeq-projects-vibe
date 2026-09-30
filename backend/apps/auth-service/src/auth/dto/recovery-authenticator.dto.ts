import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, Length } from 'class-validator';

export class VerifyRecoveryAuthenticatorDto {
  @ApiProperty()
  @IsEmail()
  email: string;

  @ApiProperty({
    description: '6-digit TOTP code, or one of the account\'s backup codes',
  })
  @IsString()
  // The same range validateTwoFactorCode already accepts: six digits from the
  // app, or a longer backup code. Bounded here so a malformed body is rejected
  // before it reaches bcrypt.
  @Length(6, 64)
  code: string;
}
