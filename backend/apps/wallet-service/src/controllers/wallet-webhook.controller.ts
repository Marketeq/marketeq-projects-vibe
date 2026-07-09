import { Controller, Post, Req, Res, Headers, Logger } from '@nestjs/common'
import { Request, Response } from 'express'
import { stripe } from '../utils/stripe-client'
import { WalletService } from '../services/wallet.service'

@Controller('wallet/webhook')
export class WalletWebhookController {
  private readonly logger = new Logger(WalletWebhookController.name)

  constructor(private readonly walletService: WalletService) {}

  @Post()
  async handleWalletWebhook(
    @Req() req: Request,
    @Res() res: Response,
    @Headers('stripe-signature') sig: string,
  ) {
    let event
    const rawBody = (req as any).rawBody || ''

    try {
      event = stripe.webhooks.constructEvent(
        rawBody,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET!,
      )
    } catch (err: any) {
      this.logger.error(`Stripe signature verification failed: ${err.message}`)
      return res.status(400).send(`Webhook Error: ${err.message}`)
    }

    try {
      switch (event.type) {
        case 'payment_intent.succeeded':
          await this.walletService.handleStripeEvent(event)
          break

        default:
          this.logger.debug(`Unhandled event type: ${event.type}`)
          break
      }

      return res.status(200).json({ received: true })
    } catch (err: any) {
      this.logger.error(`Webhook processing failed: ${err.message}`)
      return res.status(500).send('Webhook processing failed')
    }
  }
}
