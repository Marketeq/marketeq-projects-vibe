// We are not using this file now remove this.
import { Controller, Post, Body, Headers, HttpCode } from '@nestjs/common';
import { MercuryWebhookService } from '../services/mercury-webhook.service';

@Controller('webhook/mercury')
export class MercuryWebhookController {
  constructor(private readonly mercuryWebhookService: MercuryWebhookService) {}

  @Post()
  @HttpCode(200)
  async handleIncoming(@Body() body: any, @Headers() headers: any) {
    await this.mercuryWebhookService.processWebhook(body, headers);
    return { received: true };
  }
}