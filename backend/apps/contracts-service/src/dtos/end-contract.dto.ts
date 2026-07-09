import { IsNotEmpty } from 'class-validator';

export class EndContractDto {
  @IsNotEmpty() reasonCode: string;
  @IsNotEmpty() notes: string;
}
