import { IsBoolean } from 'class-validator';

export class SetBlurredDto {
  @IsBoolean()
  blurred: boolean;
}
