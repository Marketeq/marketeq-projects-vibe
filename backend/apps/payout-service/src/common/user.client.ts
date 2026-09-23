// apps/payout-service/src/common/user.client.ts
// PS-15 §6.2/§6.3: releaseEDD() needs the contractor's email to send the
// re-confirmation magic link — the approving admin's JWT carries the
// ADMIN's email, not the contractor's, so there is no email in-request for
// that flow the way there is for a contractor-initiated withdrawal.
// user-service's GET /internal/users/:id (@Public(), no JWT — the same
// direct-HTTP service-to-service pattern earnings-service already uses per
// ES-06) returns it.
import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class UserClient {
  private readonly logger = new Logger(UserClient.name);
  private readonly baseUrl: string;

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {
    this.baseUrl = this.config.get('USER_SERVICE_URL') ?? 'http://localhost:3002';
  }

  async getContractorEmail(contractorId: string): Promise<string | null> {
    try {
      const { data } = await firstValueFrom(
        this.http.get<{ email?: string }>(`${this.baseUrl}/internal/users/${contractorId}`, { timeout: 5000 }),
      );
      return data?.email ?? null;
    } catch (err: any) {
      this.logger.warn(`Failed to look up contractor email for ${contractorId}: ${err.message}`);
      return null;
    }
  }
}
