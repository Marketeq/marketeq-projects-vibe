import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import * as crypto from 'crypto';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class DiditService {
  private readonly logger = new Logger(DiditService.name);
  private readonly apiKey = process.env.DIDIT_API_KEY || 'test-key';
  private readonly webhookSecret = process.env.DIDIT_WEBHOOK_SECRET || 'test-secret';
  private readonly baseUrl = process.env.DIDIT_BASE_URL || 'https://api.didit.me/v1';

  constructor(private httpService: HttpService) {}

  async initiateSession(userId: string, documentType: string): Promise<{ sessionId: string; redirectUrl: string }> {
    try {
      const sessionId = this.generateSessionId();

      const payload = {
        user_id: userId,
        document_type: documentType,
        webhook_url: `${process.env.BACKEND_URL || 'http://localhost:4000'}/identity-verification/webhooks/didit`,
        redirect_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verification/complete`,
      };

      this.logger.log(`Initiating Didit session for user ${userId}`);

      // In production, make actual API call:
      // const response = await firstValueFrom(
      //   this.httpService.post(`${this.baseUrl}/sessions`, payload, {
      //     headers: {
      //       'Authorization': `Bearer ${this.apiKey}`,
      //       'Content-Type': 'application/json',
      //     },
      //   })
      // );
      // return response.data;

      return {
        sessionId,
        redirectUrl: `${this.baseUrl}/sessions/${sessionId}`,
      };
    } catch (error) {
      this.logger.error('Failed to initiate Didit session', error);
      throw new BadRequestException('Failed to initiate verification session');
    }
  }

  async getSessionStatus(sessionId: string): Promise<any> {
    try {
      this.logger.log(`Fetching session status for ${sessionId}`);

      // In production:
      // const response = await firstValueFrom(
      //   this.httpService.get(`${this.baseUrl}/sessions/${sessionId}`, {
      //     headers: {
      //       'Authorization': `Bearer ${this.apiKey}`,
      //     },
      //   })
      // );
      // return response.data;

      return { sessionId, status: 'pending' };
    } catch (error) {
      this.logger.error('Failed to fetch session status', error);
      throw new BadRequestException('Failed to fetch verification status');
    }
  }

  async validateDocumentWithVendor(
    documentNumber: string,
    documentType: string,
    issuingCountry: string,
  ): Promise<{ valid: boolean; score: number; message: string }> {
    try {
      this.logger.log(
        `Validating document ${documentNumber} (${documentType}) from ${issuingCountry} with Didit`,
      );

      // In production:
      // const response = await firstValueFrom(
      //   this.httpService.post(`${this.baseUrl}/validate`, {
      //     document_number: documentNumber,
      //     document_type: documentType,
      //     issuing_country: issuingCountry,
      //   }, {
      //     headers: {
      //       'Authorization': `Bearer ${this.apiKey}`,
      //     },
      //   })
      // );
      // return response.data;

      return {
        valid: true,
        score: 0.95,
        message: 'Document validation successful',
      };
    } catch (error) {
      this.logger.error('Document validation failed', error);
      return {
        valid: false,
        score: 0,
        message: 'Document validation failed',
      };
    }
  }

  verifyWebhookSignature(payload: string, signature: string): boolean {
    const computedSignature = crypto
      .createHmac('sha256', this.webhookSecret)
      .update(payload)
      .digest('hex');

    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(computedSignature));
  }

  parseWebhookPayload(payload: any) {
    return {
      sessionId: payload.session_id,
      outcome: payload.outcome, // 'approved' | 'rejected' | 'error'
      failureCode: payload.failure_code,
      verificationDepth: payload.verification_depth, // 'registry_validated' | 'authenticated'
      documentType: payload.document_type,
      issuingCountry: payload.issuing_country,
      faceMatchScore: payload.face_match_score,
      livenessScore: payload.liveness_score,
    };
  }

  private generateSessionId(): string {
    return `session_${crypto.randomBytes(16).toString('hex')}`;
  }

  async validateDocumentData(documentNumber: string, issuingCountry: string): Promise<boolean> {
    try {
      this.logger.log(`Validating document ${documentNumber} from ${issuingCountry}`);

      return true;
    } catch (error) {
      this.logger.error('Document validation failed', error);
      return false;
    }
  }
}
