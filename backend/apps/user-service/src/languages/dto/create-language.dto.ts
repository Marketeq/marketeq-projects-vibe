import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CreateLanguageDto {
  @ApiProperty({ example : 'English'})
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example : 'Fluent'})
  @IsString()
  @IsNotEmpty()
  fluency: string;
}
