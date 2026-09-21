// apps/payout-service/src/providers/wise-platform-webhook.controller.ts
// PS-36 §10: Wise Platform calls this directly — no Marketeq auth header
// exists, same reasoning as stripe-webhook.controller.ts. main.ts mounts
// express.raw() on this exact path so req.body is the raw Buffer the HMAC
// signature check needs.
import { Controller, Post, Req, Headers, HttpCode, Logger } from '@nestjs/common';
import type { Request } from 'express';
import { WisePlatformWebhookService } from './wise-platform-webhook.service';
import { Public } from '../decorators/public.decorator';

@Controller('v1/webhooks')
export class WisePlatformWebhookController {
  private readonly logger = new Logger(WisePlatformWebhookController.name);

  constructor(private readonly webhookService: WisePlatformWebhookService) {}

  @Public()
  @Post('wise-platform')
  @HttpCode(200)
  async handleWisePlatformWebhook(
    @Req() req: Request,
    @Headers('x-signature-sha256') signature: string,
  ) {
    try {
      await this.webhookService.handleWebhook(req.body as Buffer, signature);
    } catch (err: any) {
      this.logger.warn(`Wise Platform webhook rejected: ${err.message}`);
      return { received: false };
    }
    return { received: true };
  }
}
