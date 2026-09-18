// apps/payout-service/src/common/identity.client.ts
// PS-35 §4: identity-service Didit biometric verification gate — schedule
// gate (once per contractor lifetime) and method gate (once per deposit
// method). payout-service never talks to Didit directly; it only calls
// identity-service's two status endpoints and reacts to their RabbitMQ
// events (consumers/identity-events.consumer.ts).
//
// identity-service does not implement these endpoints yet (confirmed —
// grep of its codebase found no biometric capability, only Didit document
// verification). Every call here will 503 until that ships. This client is
// still correct to write now: the contract is fully specified by PS-35 §4
// (this repo's own doc, not a guess), and PS-35 §8's explicit rule is to
// fail closed — return 503, never skip the gate — so a client that throws
// a clear PayoutError on an unreachable/unconfigured identity-service is
// the correct behavior today, not a placeholder for later.
import { Injectable, Logger, HttpStatus } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { PayoutError } from './errors/payout.error';

export interface BiometricGateStatus {
  gate: 'VERIFIED' | 'REQUIRED' | 'FAILED';
  sessionUrl?: string;
  attemptsUsed?: number;
  verifiedAt?: string;
}

@Injectable()
export class IdentityServiceClient {
  private readonly logger = new Logger(IdentityServiceClient.name);
  private readonly baseUrl: string;
  private readonly serviceToken: string;

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {
    this.baseUrl = this.config.get('IDENTITY_SERVICE_URL', '');
    this.serviceToken = this.config.get('INTERNAL_SERVICE_TOKEN', '');
  }

  private assertUnavailable(context: string, err?: any): never {
    this.logger.error(`identity-service unreachable (${context})${err ? `: ${err.message}` : ' — IDENTITY_SERVICE_URL not configured'}`);
    throw new PayoutError(
      'Identity verification is temporarily unavailable. Please try again shortly.',
      HttpStatus.SERVICE_UNAVAILABLE,
      'ERR_IDENTITY_SERVICE_UNAVAILABLE',
    );
  }

  // GET /v1/identity/verification-status/{contractorId}
  async getScheduleGateStatus(contractorId: string): Promise<BiometricGateStatus> {
    if (!this.baseUrl) this.assertUnavailable('schedule gate');

    try {
      const { data } = await firstValueFrom(
        this.http.get<any>(`${this.baseUrl}/v1/identity/verification-status/${contractorId}`, {
          headers: { 'X-Service-Token': this.serviceToken },
          timeout: 5000,
        }),
      );
      return {
        gate: data.scheduleGate,
        sessionUrl: data.sessionUrl,
        attemptsUsed: data.attemptsUsed,
        verifiedAt: data.verifiedAt,
      };
    } catch (err: any) {
      // Never fail open (PS-35 §8) — a 4xx/5xx or network error blocks
      // schedule creation with 503, it does not fall through to VERIFIED.
      this.assertUnavailable('schedule gate', err);
    }
  }

  // GET /v1/identity/biometric-method-status/{contractorId}/{depositMethodId}
  async getMethodGateStatus(contractorId: string, depositMethodId: string): Promise<BiometricGateStatus> {
    if (!this.baseUrl) this.assertUnavailable('method gate');

    try {
      const { data } = await firstValueFrom(
        this.http.get<any>(
          `${this.baseUrl}/v1/identity/biometric-method-status/${contractorId}/${depositMethodId}`,
          { headers: { 'X-Service-Token': this.serviceToken }, timeout: 5000 },
        ),
      );
      return {
        gate: data.methodGate,
        sessionUrl: data.sessionUrl,
        attemptsUsed: data.attemptsUsed,
        verifiedAt: data.verifiedAt,
      };
    } catch (err: any) {
      this.assertUnavailable('method gate', err);
    }
  }
}
