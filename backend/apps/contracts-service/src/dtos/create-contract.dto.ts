import { IsNotEmpty, IsString, IsNumber, IsOptional } from 'class-validator';

export class CreateContractDto {
  @IsNotEmpty()
  @IsString()
  talentId: string;

  @IsNotEmpty()
  @IsString()
  title: string;

  @IsNotEmpty()
  @IsNumber()
  rate: number;

  @IsNotEmpty()
  @IsString()
  schedule: string;

  @IsNotEmpty()
  @IsString()
  duration: string;

  @IsOptional()
  @IsString()
  note?: string;
}