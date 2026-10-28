import { IsOptional, IsString, MaxLength } from 'class-validator';

// Start / resume of a hosted KYC session. `returnOrigin` is the browser's own origin
// (window.location.origin): the backend uses it ONLY to pick which configured
// FRONTEND_URL origin Didit returns the browser to, and only when it equals one of them
// exactly (see common/config/frontend-origin.ts). It is never used as a URL as sent.
// Everything else (country, session id, ...) is still rejected by the global
// ValidationPipe (whitelist + forbidNonWhitelisted).
export class KycSessionRequestDto {
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  returnOrigin?: string;
}
