import { IsISO8601, IsOptional } from "class-validator";

export class UpdateBreakDto {
  @IsOptional() @IsISO8601() endedAt?: string;
}