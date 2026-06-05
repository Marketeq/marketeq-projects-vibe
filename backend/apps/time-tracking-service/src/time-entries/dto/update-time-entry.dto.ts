import { IsOptional, IsISO8601, IsInt, Min } from 'class-validator';

export class UpdateTimeEntryDto {
  @IsOptional() @IsISO8601() endedAt?: string;
  @IsOptional() @IsInt() @Min(0) durationSeconds?: number;
}