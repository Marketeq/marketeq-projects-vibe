import { IsString, MinLength, Matches } from 'class-validator';

export class CreatePasswordDto {
  @IsString()
  @MinLength(8)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).+$/, {
    message:
      'Password must contain at least one uppercase letter, one lowercase letter, one number, and one symbol',
  })
  password: string;
}
