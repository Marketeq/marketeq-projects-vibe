import { IsNotEmpty, IsString } from 'class-validator';

export class StorePublicKeyDto {
  @IsNotEmpty()
  @IsString()
  publicKey: string;
}
