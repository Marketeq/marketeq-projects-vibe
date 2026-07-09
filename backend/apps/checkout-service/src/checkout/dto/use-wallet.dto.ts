import { IsUUID, IsNotEmpty, IsNumber, IsPositive } from 'class-validator';

export class UseWalletDto {
  @IsUUID()
  @IsNotEmpty()
  userId: string;

  @IsNumber()
  @IsPositive()
  amount: number;
}
