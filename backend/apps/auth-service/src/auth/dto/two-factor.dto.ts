import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, Matches } from 'class-validator';

export class VerifyTwoFactorDto {
  @ApiProperty({ description: '6-digit TOTP code or 8-character backup code' })
  @IsString()
  code: string;

  @ApiPropertyOptional({ description: '2FA method', enum: ['totp', 'sms'] })
  @IsOptional()
  @IsIn(['totp', 'sms'])
  method?: 'totp' | 'sms';
}

export class TwoFactorVerifyLoginDto {
  @ApiProperty({ description: '6-digit TOTP code or backup code' })
  @IsString()
  code: string;

  @ApiProperty({ description: 'Partial token issued after password verification' })
  @IsString()
  partialToken: string;
}

export class GenerateSmsTwoFactorDto {
  @ApiProperty({ description: 'Phone number in E.164 format (e.g. +15551234567)' })
  @IsString()
  @Matches(/^\+[1-9]\d{1,14}$/, { message: 'Phone number must be in E.164 format (e.g. +15551234567)' })
  phone: string;
}

export class ResendTwoFactorDto {
  @ApiPropertyOptional({ description: 'Partial token for resending during login flow' })
  @IsOptional()
  @IsString()
  partialToken?: string;
}
