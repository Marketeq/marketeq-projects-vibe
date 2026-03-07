import {
  Controller, Post, Get, Param, Body, Req,
  HttpCode, HttpStatus, RawBodyRequest,
  Headers,
} from '@nestjs/common';
import { CheckoutService } from './checkout.service';
import { StripeService } from '../stripe/stripe.service';
import { Request } from 'express';

@Controller('v1/checkout')
export class CheckoutController {
  constructor(
    private readonly checkoutService: CheckoutService,
    private readonly stripeService: StripeService,
  ) {}

  @Post('session')
  createSession(@Body() dto: any, @Req() req: any) {
    return this.checkoutService.createSession({ ...dto, clientId: req.user?.id || dto.clientId });
  }

  @Post('apply-giftcard')
  applyGiftCard(@Body('giftCardCode') code: string) {
    return this.checkoutService.applyGiftCard(code);
  }

  @Post('use-wallet')
  useWallet(@Body('walletBalanceUsed') amount: number, @Req() req: any) {
    return this.checkoutService.useWallet(req.user?.id, amount);
  }

  @Post('confirm')
  @HttpCode(HttpStatus.OK)
  confirm(@Body('sessionId') sessionId: string) {
    return this.checkoutService.confirm(sessionId);
  }

  @Post('cancel')
  @HttpCode(HttpStatus.OK)
  cancel(@Body('sessionId') sessionId: string) {
    return this.checkoutService.cancel(sessionId);
  }

  @Get('status/:sessionId')
  getStatus(@Param('sessionId') sessionId: string) {
    return this.checkoutService.getStatus(sessionId);
  }

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  async handleWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string,
  ) {
    const event = this.stripeService.constructWebhookEvent(req.rawBody, signature);

    switch (event.type) {
      case 'checkout.session.completed':
        await this.checkoutService.handlePaymentSuccess((event.data.object as any).id);
        break;
      case 'invoice.payment_failed':
      case 'payment_intent.payment_failed':
        await this.checkoutService.handlePaymentFailed((event.data.object as any).id);
        break;
    }

    return { received: true };
  }

  @Get('health')
  health() {
    return { status: 'ok', service: 'checkout-service' };
  }
}
