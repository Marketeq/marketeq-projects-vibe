import { Inject, Injectable, Logger } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom, timeout } from 'rxjs';

interface PairStatus {
  aBlockedB: boolean;
  bBlockedA: boolean;
}

interface ListBlockedResponse {
  blockedIds: string[];
}

@Injectable()
export class BlocksClient {
  private readonly logger = new Logger(BlocksClient.name);
  private readonly rpcTimeoutMs = 2000;

  constructor(@Inject('RABBITMQ_CLIENT') private readonly client: ClientProxy) {}

  async getPairStatus(userA: string, userB: string): Promise<PairStatus> {
    if (!userA || !userB || userA === userB) {
      return { aBlockedB: false, bBlockedA: false };
    }
    try {
      const result = await firstValueFrom(
        this.client
          .send<PairStatus>('user.blocks.get-pair-status', { userA, userB })
          .pipe(timeout(this.rpcTimeoutMs)),
      );
      return result ?? { aBlockedB: false, bBlockedA: false };
    } catch (err) {
      this.logger.warn(
        `user.blocks.get-pair-status RPC failed for (${userA}, ${userB}): ${
          (err as Error)?.message ?? err
        }`,
      );
      return { aBlockedB: false, bBlockedA: false };
    }
  }

  async listBlockedIds(userId: string): Promise<string[]> {
    if (!userId) return [];
    try {
      const result = await firstValueFrom(
        this.client
          .send<ListBlockedResponse>('user.blocks.list-blocked', { userId })
          .pipe(timeout(this.rpcTimeoutMs)),
      );
      return result?.blockedIds ?? [];
    } catch (err) {
      this.logger.warn(
        `user.blocks.list-blocked RPC failed for ${userId}: ${
          (err as Error)?.message ?? err
        }`,
      );
      return [];
    }
  }
}
