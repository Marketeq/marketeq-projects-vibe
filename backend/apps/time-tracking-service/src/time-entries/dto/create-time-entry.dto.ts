import { IsISO8601, IsInt, IsOptional, IsString, Min } from 'class-validator';
 
export class CreateTimeEntryDto {
  @IsString() id!: string;
  @IsISO8601() startedAt!: string;
  @IsOptional() @IsISO8601() endedAt?: string;
  @IsOptional() @IsInt() @Min(0) durationSeconds?: number;
  @IsOptional() @IsString() idempotencyKey?: string;
}