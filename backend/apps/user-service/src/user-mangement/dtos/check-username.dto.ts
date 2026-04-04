import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, Matches, MinLength } from 'class-validator';
import {
  USERNAME_PATTERN,
  USERNAME_RULE_MESSAGE,
} from './username-validation';

export class CheckUsernameDto {
  @ApiProperty({
    example: 'john_doe',
    description: 'Username to check availability for',
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
