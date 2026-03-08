import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CheckUsernameDto {
  @ApiProperty({
    example: 'alice',
    description: 'username',
  })
  @IsString()
  @IsNotEmpty()
  username: string;
}
