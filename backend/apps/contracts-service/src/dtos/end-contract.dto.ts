import { IsNotEmpty, IsString } from 'class-validator';

export class EndContractDto {
  @IsString()
  @IsNotEmpty()
  reasonCode: string;

  @IsString()
  @IsNotEmpty()
  notes: string;
}
