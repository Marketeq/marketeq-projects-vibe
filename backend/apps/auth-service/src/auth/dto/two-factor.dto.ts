import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length } from 'class-validator';

export class VerifyTwoFactorDto {
  @ApiProperty({ description: '6-digit TOTP code or 8-character backup code' })
  @IsString()
  code: string;
}

export class TwoFactorVerifyLoginDto {
  @ApiProperty({ description: '6-digit TOTP code or backup code' })
  @IsString()
  code: string;

  @ApiProperty({ description: 'Partial token issued after password verification' })
  @IsString()
  partialToken: string;
}
