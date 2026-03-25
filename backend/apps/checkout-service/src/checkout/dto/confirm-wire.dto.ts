import { IsUUID, IsNotEmpty, IsString } from 'class-validator';

export class ConfirmWireDto {
  @IsUUID()
  @IsNotEmpty()
  wireTransferId: string;

  @IsString()
  @IsNotEmpty()
  wireConfirmedBy: string;
}
