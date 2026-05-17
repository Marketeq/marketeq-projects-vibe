import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsOptional, IsString } from 'class-validator';

export class UpdateTaskDto {
  @ApiProperty()
  @IsString()
  taskName: string;

  @ApiProperty()
  @IsString()
  role: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  location: string[];

  @ApiProperty({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  experience: string[];

  @ApiProperty()
  @IsString()
  duration: string;
}
