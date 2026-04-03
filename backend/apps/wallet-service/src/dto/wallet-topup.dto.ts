import { IsUUID, IsNumber } from 'class-validator';

export class WalletTopUpDto {
  @IsUUID()
  userId: string;

  @IsNumber()
  amount: number;
}