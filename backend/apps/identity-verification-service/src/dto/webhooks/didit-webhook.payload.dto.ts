export class DiditWebhookPayloadDto {
  vendorSessionId!: string;
  eventType!: string;
  occurredAt!: string;
  raw!: Record<string, unknown>;
}
