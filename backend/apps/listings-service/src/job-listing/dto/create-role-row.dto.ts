import { IsString, IsOptional, IsInt, IsUUID } from 'class-validator';

export class CreateRoleRowDto {
  @IsString()
  role: string;

  @IsOptional()
  @IsInt()
  positionOrder?: number;

  @IsOptional()
  @IsUUID()
  assignedUserId?: string;
}
