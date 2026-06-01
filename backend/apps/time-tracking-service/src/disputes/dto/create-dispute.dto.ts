import { IsString, IsOptional } from 'class-validator';


export class CreateDisputeDto {
  @IsString() id!: string;
  @IsString() reason!: string; // 'inaccurate_time' | 'wrong_task' | 'tech_issue' | 'other'
  @IsOptional() @IsString() note?: string;
}