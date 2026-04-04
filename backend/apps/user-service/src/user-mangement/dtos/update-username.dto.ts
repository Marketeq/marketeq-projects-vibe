import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, Matches, MinLength } from 'class-validator';
import {
  USERNAME_PATTERN,
  USERNAME_RULE_MESSAGE,
} from './username-validation';

export class UpdateUsernameDto {
  @ApiProperty({
    example: 'john_doe_2',
    description: 'The new username to set',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @Matches(USERNAME_PATTERN, {
    message: USERNAME_RULE_MESSAGE,
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  username: string;
}
