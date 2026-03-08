import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class UpdateUsernameDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  username: string;
}
