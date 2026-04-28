import { IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CloseSessionDto {
  @IsInt() endedAt!: number; // Unix ms
  @IsString() @IsNotEmpty() reason!: string;
  @IsOptional() @IsInt() billableSeconds?: number;
}
