import { IsBoolean, IsNotEmpty, IsString } from 'class-validator';

export class AcceptRejectDto {
  @IsBoolean()
  accepted: boolean;

  @IsString()
  @IsNotEmpty()
  talentId: string;
}
