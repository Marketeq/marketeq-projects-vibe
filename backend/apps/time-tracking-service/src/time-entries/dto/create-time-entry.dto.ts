import { IsIn, IsISO8601, IsInt, IsOptional, IsString, Min } from 'class-validator';
 
export class CreateTimeEntryDto {
  @IsString() id!: string;
  @IsISO8601() startedAt!: string;
  @IsOptional() @IsISO8601() endedAt?: string;
  @IsOptional() @IsInt() @Min(0) durationSeconds?: number;
  @IsOptional() @IsString() idempotencyKey?: string;
  /** Defaults to 'live'. The desktop sends 'recovered' for a crash-recovered slice (DTT-US-132). */
  @IsOptional() @IsIn(['live', 'manual', 'recovered']) source?: 'live' | 'manual' | 'recovered';
}