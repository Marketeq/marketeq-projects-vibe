import { IsOptional, IsString } from 'class-validator';

export class CreateFlagDto {
  @IsOptional()
  @IsString()
  reason?: string;
}
