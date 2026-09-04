import { Controller, Post, Body, Headers, Logger, BadRequestException } from '@nestjs/common';
import { VerificationService } from '../services/verification.service';
import { DocumentService } from '../services/document.service';
import { DiditService } from '../services/didit.service';
import { EventPublisherService } from '../services/event-publisher.service';
import { DiditWebhookPayloadDto } from '../dto/verification.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VerificationAttempt } from '../entities/verification-attempt.entity';

@Controller('identity-verification/webhooks')
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name);

  constructor(
    private verificationService: VerificationService,
    private documentService: DocumentService,
    private diditService: DiditService,
    private eventPublisher: EventPublisherService,
    @InjectRepository(VerificationAttempt)
    private attemptRepository: Repository<VerificationAttempt>,
  ) {}

  @Post('didit')
  async handleDiditWebhook(
    @Body() payload: DiditWebhookPayloadDto,
    @Headers('x-didit-signature') signature: string,
  ) {
    try {
      if (!signature) {
        throw new BadRequestException('Missing webhook signature');
      }

      const payloadString = JSON.stringify(payload);

      if (!this.diditService.verifyWebhookSignature(payloadString, signature)) {
        throw new BadRequestException('Invalid webhook signature');
      }

      this.logger.log(`Received Didit webhook for session ${payload.sessionId}`);

      const parsedPayload = this.diditService.parseWebhookPayload(payload);

      const attempt = await this.attemptRepository.findOne({
        where: { vendorSessionId: payload.sessionId },
        relations: ['profile', 'document'],
      });

      if (!attempt) {
        this.logger.warn(`No attempt found for session ${payload.sessionId}`);
        return {
          status: 'ignored',
          sessionId: payload.sessionId,
          reason: 'attempt_not_found',
        };
      }

      // Complete the verification attempt
      await this.verificationService.completeAttempt(
        payload.sessionId,
        payload.outcome,
        payload.failureCode,
        parsedPayload.verificationDepth,
      );

      // Update document with verification depth if approved
      if (payload.outcome === 'approved' && parsedPayload.verificationDepth && attempt.documentId) {
        await this.documentService.updateDocumentVerificationDepth(
          attempt.documentId,
          parsedPayload.verificationDepth,
        );
      }

      // Publish event based on outcome
      if (payload.outcome === 'approved') {
        await this.eventPublisher.publishIdentityVerified(
          attempt.profile.userId,
          parsedPayload.verificationDepth || 'authenticated',
        );
      }

      this.logger.log(
        `Webhook processed successfully for session ${payload.sessionId}: ${payload.outcome}`,
      );

      return {
        status: 'processed',
        sessionId: payload.sessionId,
        outcome: payload.outcome,
      };
    } catch (error) {
      this.logger.error('Webhook processing failed', error);
      throw error;
    }
  }
}
