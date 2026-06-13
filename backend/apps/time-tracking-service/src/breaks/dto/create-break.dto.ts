import { IsISO8601, IsOptional, IsString } from "class-validator";

export class CreateBreakDto {
  @IsString() id!: string;
  @IsString() kind!: string; // 'paid' | 'unpaid'
  @IsISO8601() startedAt!: string;
  @IsOptional() @IsString() idempotencyKey?: string;
}