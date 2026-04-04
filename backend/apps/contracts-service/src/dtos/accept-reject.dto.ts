import { IsBoolean, IsNotEmpty } from 'class-validator';

export class AcceptRejectDto {
  @IsBoolean() accepted: boolean;
  @IsNotEmpty() talentId: string;
}
