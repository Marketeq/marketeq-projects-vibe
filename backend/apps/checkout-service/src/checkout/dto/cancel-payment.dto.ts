import { IsString, IsNotEmpty } from 'class-validator';

export class CancelPaymentDto {
  @IsString()
  @IsNotEmpty()
  sessionId: string;
}
