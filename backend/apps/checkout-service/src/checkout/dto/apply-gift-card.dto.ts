import { IsString, IsNotEmpty, IsOptional, IsUUID } from 'class-validator';

export class ApplyGiftCardDto {
  @IsString()
  @IsNotEmpty()
  code: string;

  @IsOptional()
  @IsUUID()
  userId?: string;
}
