import { Controller, Post, Body, Headers, HttpCode, HttpStatus, Req } from '@nestjs/common';
import { RawBodyRequest } from '@nestjs/common';
import { Request } from 'express';
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
    @Req() req: RawBodyRequest<Request>,
  ): Promise<{ received: boolean }> {
    await this.service.handleDiditWebhook(payload, signature, req.rawBody as Buffer);
    return { received: true };
  }
}
