import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class UpdateContractTaskDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsOptional()
  @IsBoolean()
  archived?: boolean;
}
