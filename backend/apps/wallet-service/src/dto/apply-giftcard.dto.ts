import { IsUUID, IsString } from 'class-validator';

export class ApplyGiftCardDto {
  @IsString()
  code: string;

  @IsUUID()
  userId: string;
}