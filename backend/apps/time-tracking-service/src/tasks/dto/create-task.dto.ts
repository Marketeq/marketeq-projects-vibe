import { IsNotEmpty, IsString } from 'class-validator';

export class CreateContractTaskDto {
  @IsString()
  @IsNotEmpty()
  contractId: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  createdBy: string;
}
