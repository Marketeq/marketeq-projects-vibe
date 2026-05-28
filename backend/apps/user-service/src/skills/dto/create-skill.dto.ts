import { IsNotEmpty, IsString, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateSkillDto {
  @ApiProperty({ example: 'TypeScript' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'expert' })
  @IsString()
  @IsNotEmpty()
  proficiency: string;
}