import { DataSource } from 'typeorm';
import { PaymentMethod } from '../entities/payment-method.entity';
import { PaymentMethodType } from '../entities/enums';

export async function seedPaymentMethods(ds: DataSource): Promise<void> {
  const repo = ds.getRepository(PaymentMethod);

  const methods = [
    {
      id:         '00000000-0000-0000-0000-000000000020',
      type:       PaymentMethodType.BANK_ACH,
      label:      'Chase Bank',
      identifier: '4553',
    },
    {
      id:         '00000000-0000-0000-0000-000000000021',
      type:       PaymentMethodType.CREDIT_CARD,
      label:      'Visa',
      identifier: '4242',
    },
    {
      id:         '00000000-0000-0000-0000-000000000022',
      type:       PaymentMethodType.KLARNA,
      label:      'Klarna',
      identifier: 'klarna',
    },
    {
      id:         '00000000-0000-0000-0000-000000000023',
      type:       PaymentMethodType.GOOGLE_PAY,
      label:      'Google Pay',
      identifier: 'gpay',
    },
    {
      id:         '00000000-0000-0000-0000-000000000024',
      type:       PaymentMethodType.APPLE_PAY,
      label:      'Apple Pay',
      identifier: 'apay',
    },
  ];

  for (const method of methods) {
    await repo.save(repo.create(method));
  }

  console.log(`  ✓ Seeded ${methods.length} payment methods`);
}
