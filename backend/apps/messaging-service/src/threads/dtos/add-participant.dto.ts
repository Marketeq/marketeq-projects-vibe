import { IsUUID, IsString } from 'class-validator';

export class AddParticipantDto {
  @IsUUID()
  userId: string;

  @IsString()
  encryptedGroupKey: string;
}
