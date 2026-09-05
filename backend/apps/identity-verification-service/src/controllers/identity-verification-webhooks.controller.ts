import { Controller, Post, Body, Headers, HttpCode, HttpStatus } from '@nestjs/common';
import { IdentityVerificationService } from '../services/identity-verification.service';
import { DiditWebhookPayloadDto } from '../dto/webhooks/didit-webhook.payload.dto';

@Controller('v1/identity-verification/webhooks')
export class IdentityVerificationWebhooksController {
  constructor(private readonly service: IdentityVerificationService) {}

  @Post('didit')
  @HttpCode(HttpStatus.OK)
  async handleDiditWebhook(
    @Body() payload: DiditWebhookPayloadDto,
    @Headers('x-didit-signature') signature: string | undefined,
  ): Promise<{ received: boolean }> {
    await this.service.handleDiditWebhook(payload, signature);
    return { received: true };
  }
}
