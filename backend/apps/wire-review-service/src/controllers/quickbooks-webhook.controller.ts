import { Controller, Post, Headers, Body, HttpCode } from '@nestjs/common';
import { QuickBooksWebhookService } from '../services/quickbooks-webhook.service';

@Controller('webhook/quickbooks')
export class QuickBooksWebhookController {
  constructor(private readonly quickbooksWebhookService: QuickBooksWebhookService) {}

  @Post()
  @HttpCode(200) 
  async handleWebhook(@Headers() headers: any, @Body() payload: any) {
    await this.quickbooksWebhookService.processWebhook(headers, payload);
    return { received: true };
  }
}
// This controller listens for POST requests at the /webhook/quickbooks endpoint.