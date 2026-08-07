import { Injectable, Logger } from '@nestjs/common';
import * as Ably from 'ably';

/**
 * US-91–94: real-time balance/earnings push over Ably, scoped to
 * private:{contractorId}:earnings. Mirrors the messaging-service /
 * notification-service AblyService pattern (subscribe-only capability
 * token, Ably.Rest for server-side publish).
 */
@Injectable()
export class AblyService {
  private readonly logger = new Logger(AblyService.name);
  private readonly client: Ably.Rest | null;

  constructor() {
    const ablyKey = process.env.ABLY_API_KEY;
    const looksValid = !!ablyKey && /^[^:]+:[^:]+$/.test(ablyKey) && !ablyKey.startsWith('your_');

    if (!looksValid) {
      this.client = null;
      this.logger.warn(
        'ABLY_API_KEY is missing or a placeholder — real-time earnings updates disabled',
      );
      return;
    }

    try {
      this.client = new Ably.Rest({ key: ablyKey as string });
    } catch (err) {
      this.client = null;
      this.logger.warn(`Invalid ABLY_API_KEY — real-time earnings updates disabled: ${(err as Error).message}`);
    }
  }

  isEnabled(): boolean {
    return !!this.client;
  }

  async createTokenRequest(contractorId: string) {
    if (!this.client) return null;
    // US-94 permissions: token is scoped to this contractor's own channel
    // only — subscribe-only, no publish capability from the client side.
    const capability = { [`private:${contractorId}:earnings`]: ['subscribe'] };
    return this.client.auth.createTokenRequest({
      clientId: contractorId,
      capability: JSON.stringify(capability),
    });
  }

  async publish(contractorId: string, event: string, data: unknown): Promise<void> {
    if (!this.client) return;
    const channel = this.client.channels.get(`private:${contractorId}:earnings`);
    await channel.publish(event, data);
  }
}
