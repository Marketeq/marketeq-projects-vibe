import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class StoreEncryptedPrivateKeyDto {
  @IsString()
  @MinLength(32)
  @MaxLength(50000)
  encryptedPrivateKey: string;

  @IsOptional()
  @IsString()
  @MinLength(32)
  @MaxLength(12000)
  publicKey?: string;
}
