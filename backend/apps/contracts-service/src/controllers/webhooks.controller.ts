import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ContractsService } from '../services/contracts.service';
import { BearerGuard } from '../guards/bearer.guard';

@Controller('webhooks')
@UseGuards(BearerGuard)
export class WebhooksController {
  constructor(private readonly svc: ContractsService) {}

  @Post('checkout/deposit-cleared')
  depositCleared(@Body() payload: { groupId: string; paymentRef: string }) {
    return this.svc.activateGroup(payload.groupId, payload.paymentRef);
  }

  @Post('checkout/deposit-failed')
  depositFailed(@Body() payload: { groupId: string; reason: string }) {
    return {
      groupId: payload.groupId,
      status: 'deposit_failed',
      message: 'Contracts remain pending. Retry window active.',
    };
  }

  @Post('billing/finalized')
  billingFinalized(@Body() payload: { contractId: string; invoiceId: string; finalAmount: number }) {
    return {
      contractId: payload.contractId,
      invoiceId: payload.invoiceId,
      status: 'billing_confirmed',
    };
  }
}
