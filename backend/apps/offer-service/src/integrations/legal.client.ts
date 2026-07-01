// apps/offer-service/src/integrations/legal.client.ts
// OS-29: NDA status for scope view gate. NON-BLOCKING.
// Returns { signed: false } on any error — conservative fallback.
import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom, timeout } from 'rxjs';
import { OfferConfig } from '../config/offer.config';

export interface NdaStatus {
  userId: string;
  clientId: string;
  projectId: string;
  signed: boolean;
  signedAt: string | null;
}

@Injectable()
export class LegalClient {
  private readonly logger = new Logger(LegalClient.name);
  private readonly baseUrl: string;
  private readonly timeoutMs: number;

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {
    const cfg = config.get<OfferConfig>('offer')!;
    this.baseUrl = cfg.integrations?.legalServiceUrl ?? cfg.services?.legalUrl ?? '';
    this.timeoutMs = cfg.integrations?.legalTimeoutMs ?? 2000;
  }

  async getNdaStatus(
    userId: string,
    clientId: string,
    projectId: string,
  ): Promise<NdaStatus> {
    const url = `${this.baseUrl}/internal/nda/status` +
      `?userId=${userId}&clientId=${clientId}&projectId=${projectId}`;

    try {
      const response = await firstValueFrom(
        this.http.get<NdaStatus>(url).pipe(timeout(this.timeoutMs)),
      );
      return response.data;
    } catch (err) {
      this.logger.warn(
        `legal-service NDA check failed for user ${userId}: ${(err as Error).message}. ` +
        'Treating as unsigned (conservative fallback).',
      );
      return { userId, clientId, projectId, signed: false, signedAt: null };
    }
  }
}