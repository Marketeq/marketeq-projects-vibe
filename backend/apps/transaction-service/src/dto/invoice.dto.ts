import { Expose, Exclude, Transform } from 'class-transformer';
import { InvoiceStatus } from '../entities/enums';

// ── List response DTO ──────────────────────────────────────────────────
@Exclude()
export class InvoiceResponseDto {

  @Expose()
  id!: string;

  @Expose()
  invoiceId!: string;

  @Expose()
  @Transform(({ value }) => value?.toISOString?.().split('T')[0])
  dateIssued!: string;

  @Expose()
  descriptionType!: string;

  @Expose()
  @Transform(({ value }) => value?.toISOString?.().split('T')[0])
  dueDate!: string;

  @Expose()
  status!: InvoiceStatus;

  @Expose()
  @Transform(({ value }) => parseFloat(value))
  amount!: number;
}

// ── Detail response DTO ────────────────────────────────────────────────
@Exclude()
export class InvoiceDetailResponseDto {

  @Expose()
  id!: string;

  @Expose()
  invoiceId!: string;

  @Expose()
  stripeInvoiceId!: string | null;

  @Expose()
  @Transform(({ value }) => value?.toISOString?.().split('T')[0])
  dateIssued!: string;

  @Expose()
  descriptionType!: string;

  @Expose()
  descriptionBillingPeriod!: string | null;

  @Expose()
  @Transform(({ value }) => value?.toISOString?.().split('T')[0])
  dueDate!: string;

  @Expose()
  status!: InvoiceStatus;

  @Expose()
  @Transform(({ value }) => parseFloat(value))
  amount!: number;

  @Expose()
  contract!: {
    id: string;
    clientName: string;
    clientUsername: string;
  };

  @Expose()
  stripeHostedUrl!: string | null;

  @Expose()
  stripePdfUrl!: string | null;
}