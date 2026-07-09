import { IsString, IsNotEmpty, IsObject } from 'class-validator';

export class StoreMetadataDto {
  @IsString()
  @IsNotEmpty()
  sessionId: string;

  @IsObject()
  @IsNotEmpty()
  metadata: Record<string, any>;
}
