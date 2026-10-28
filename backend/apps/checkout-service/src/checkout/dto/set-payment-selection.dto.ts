import { IsEmpty, IsIn, IsUUID } from 'class-validator';
import type { PaymentMethod } from '../entities/payment.entity';

export const PAYMENT_METHOD_IDS: PaymentMethod[] = [
  'card',
  'ach',
  'wire',
  'klarna',
];

export class SetPaymentSelectionDto {
  @IsIn(PAYMENT_METHOD_IDS)
  method: PaymentMethod;

  @IsUUID()
  id: string;

  @IsEmpty({ message: 'Card and bank details are never accepted here' })
  cardNumber?: never;

  @IsEmpty({ message: 'Card and bank details are never accepted here' })
  number?: never;

  @IsEmpty({ message: 'Card and bank details are never accepted here' })
  cvv?: never;

  @IsEmpty({ message: 'Card and bank details are never accepted here' })
  cvc?: never;

  @IsEmpty({ message: 'Card and bank details are never accepted here' })
  accountNumber?: never;

  @IsEmpty({ message: 'Card and bank details are never accepted here' })
  routingNumber?: never;
}
