import { IsISO8601, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class TimelineQueryDto {
  @IsOptional()
  @IsString()
  userId?: string;

  @IsISO8601()
  @IsNotEmpty()
  from!: string;

  @IsISO8601()
  @IsNotEmpty()
  to!: string;

  @IsOptional()
  @IsString()
  projectId?: string;
}
