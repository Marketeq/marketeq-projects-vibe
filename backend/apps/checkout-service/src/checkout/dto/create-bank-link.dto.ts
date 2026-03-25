import { IsString, IsNotEmpty } from 'class-validator';

export class CreateBankLinkDto {
  @IsString()
  @IsNotEmpty()
  customerId: string;
}
