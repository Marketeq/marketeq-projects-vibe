import { IsInt, IsNotEmpty, IsPositive, IsString } from 'class-validator';

export class CreateSessionDto {
  @IsString() @IsNotEmpty() id!: string;
  @IsString() @IsNotEmpty() contractId!: string;
  @IsString() @IsNotEmpty() taskId!: string;
  @IsString() @IsNotEmpty() deviceId!: string;
  @IsInt() @IsPositive() startedAt!: number; // Unix ms
}
