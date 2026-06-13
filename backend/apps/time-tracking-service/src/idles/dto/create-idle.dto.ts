import { IsString, IsOptional, IsISO8601, IsInt, Min} from 'class-validator';

export class CreateIdleDto {
  @IsString() id!: string;
  @IsISO8601() startedAt!: string;
  @IsISO8601() endedAt!: string;
  @IsInt() @Min(0) seconds!: number;
  @IsOptional() @IsString() resolution?: string; // 'keep' | 'discard' | 'convert_to_break'
  @IsOptional() @IsString() idempotencyKey?: string;
}