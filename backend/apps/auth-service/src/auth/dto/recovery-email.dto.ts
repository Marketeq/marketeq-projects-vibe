import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';

export class SetRecoveryEmailDto {
  /**
   * Lower-cased and trimmed before validation so "Olivia@Example.com " and
   * "olivia@example.com" cannot become two different pending addresses.
   *
   * 320 is the RFC 3696 maximum (64 local + @ + 255 domain) and matches the
   * column width, so an over-long address is refused with a message rather
   * than truncated into a different address than the one that was typed.
   */
  @ApiProperty({ example: 'olivia@example.com' })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail({}, { message: 'Enter a valid email address' })
  @MaxLength(320, { message: 'That email address is too long' })
  email: string;
}

export class VerifyRecoveryEmailDto {
  @ApiProperty({ description: 'Token from the confirmation link' })
  @IsString()
  @IsNotEmpty({ message: 'Token is required' })
  token: string;
}
