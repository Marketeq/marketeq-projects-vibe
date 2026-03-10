import { IsNotEmpty, IsString } from 'class-validator';

export class DisputeContractDto {
  @IsString()
  @IsNotEmpty()
  reason: string;
}
