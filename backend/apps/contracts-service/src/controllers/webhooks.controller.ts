import { Controller, Post, Body } from '@nestjs/common';
import { WebhooksService } from '../services/webhooks.service';

@Controller('webhooks')
export class WebhooksController {
  constructor(private readonly webhooksService: WebhooksService) {}

  // Deposit cleared from Checkout Service
  @Post('checkout/deposit-cleared')
  async depositCleared(@Body() payload: any) {
    return this.webhooksService.handleDepositCleared(payload);
  }

  // Billing finalized from Billing Service
  @Post('billing/finalized')
  async billingFinalized(@Body() payload: any) {
    return this.webhooksService.handleBillingFinalized(payload);
  }
}
