import { IsOptional, IsString, IsBoolean, MaxLength } from 'class-validator';

export class UpdateMethodDto {
  @IsOptional() @IsString() @MaxLength(64)
  nickname?: string;

  @IsOptional() @IsBoolean()
  isDefault?: boolean;
}
