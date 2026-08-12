import { IsUUID } from 'class-validator';

export class LogHireInitiatedDto {
  @IsUUID()
  talentId: string;
}
