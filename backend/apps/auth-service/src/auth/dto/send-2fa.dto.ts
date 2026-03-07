import { IsPhoneNumber } from 'class-validator';

export class Send2FADto {
  @IsPhoneNumber()
  phoneNumber: string;
}
