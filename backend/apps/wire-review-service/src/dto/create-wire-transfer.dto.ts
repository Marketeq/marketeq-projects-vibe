import { IsUUID, IsNumber, IsString, IsISO4217CurrencyCode } from 'class-validator';

export class CreateWireTransferDto {
  @IsUUID()
  invoiceId: string;

  @IsUUID()
  clientId: string;

  @IsNumber()
  expectedAmount: number;

  @IsISO4217CurrencyCode()
  currency: string;
}