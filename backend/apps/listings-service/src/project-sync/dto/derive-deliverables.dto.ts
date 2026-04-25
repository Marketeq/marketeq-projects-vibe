import { IsOptional } from 'class-validator';

export class DeriveDeliverablesDto {
  // Scope comes from Payload (Phase → tasks). We accept unknown and normalize in service.
  @IsOptional()
  scope?: unknown;
}

