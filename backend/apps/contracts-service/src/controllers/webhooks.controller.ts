import { Controller, Post, Body } from '@nestjs/common';
import { ContractsService } from '../services/contracts.service';

@Controller('webhooks')
export class WebhooksController {
  constructor(private readonly svc: ContractsService) {}

  @Post('checkout/deposit-cleared')
  depositCleared(@Body() payload: { groupId: string; paymentRef: string }) {
    return this.svc.activateGroup(payload.groupId, payload.paymentRef);
  }

  @Post('checkout/deposit-failed')
  depositFailed(@Body() payload: { groupId: string; reason: string }) {
    // Contracts remain PENDING — cancel only if retry window expired (handled by scheduler)
    // For now, log the failure and return status
    return { groupId: payload.groupId, status: 'deposit_failed', message: 'Contracts remain pending. Retry window active.' };
  }

  @Post('billing/finalized')
  billingFinalized(@Body() payload: { contractId: string; invoiceId: string; finalAmount: number }) {
    // Billing confirmation — contracts already ended via contract.ended event
    return { contractId: payload.contractId, invoiceId: payload.invoiceId, status: 'billing_confirmed' };
  }
}
