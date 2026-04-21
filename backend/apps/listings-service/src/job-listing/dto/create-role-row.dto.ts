import { IsString, IsOptional, IsInt, IsUUID, IsNotEmpty, Min } from 'class-validator';

export class CreateRoleRowDto {
  @IsString()
  @IsNotEmpty()
  role: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  positionOrder?: number;

  @IsOptional()
  @IsUUID()
  assignedUserId?: string;
}
