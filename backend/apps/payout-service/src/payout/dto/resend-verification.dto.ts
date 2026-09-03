import { IsOptional, IsString } from 'class-validator';

export class ResendVerificationDto {
  // Same purpose as InitiatePayoutDto.redirectUrl — the frontend's own base
  // URL for the magic-link confirmation page, validated against
  // FRONTEND_URL server-side before use.
  @IsOptional() @IsString()
  redirectUrl?: string;
}
