import { IsUUID, IsNotEmpty, IsNumber, IsPositive } from 'class-validator';

export class WalletTopUpDto {
  @IsUUID()
  @IsNotEmpty()
  userId: string;

  @IsNumber()
  @IsPositive()
  amount: number;
}
