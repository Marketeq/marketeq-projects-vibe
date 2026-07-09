import { IsString, IsNotEmpty } from 'class-validator';

export class AttachBankAccountDto {
  @IsString()
  @IsNotEmpty()
  customerId: string;

  @IsString()
  @IsNotEmpty()
  financialConnectionsAccountId: string;
}
