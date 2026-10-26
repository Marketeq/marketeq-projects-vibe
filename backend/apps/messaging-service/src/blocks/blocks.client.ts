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

/**
 * An RMQ rejection is often not an Error: NestJS surfaces the serialized remote
 * payload, which has no `.message`, so `(err as Error)?.message ?? err` fell
 * through to the object itself and template-interpolated to "[object Object]".
 * Every one of these warnings named no cause, which is why the real one — that
 * RABBITMQ_URL is unset, so nothing consumes user_service_queue — stayed hidden
 * behind thousands of identical lines.
 */
function describeError(err: unknown): string {
  // `err.name` before String(err): an Error carrying an empty message would
  // otherwise serialize to a useless "{}", since its fields are non-enumerable.
  if (err instanceof Error) return err.message || err.name || String(err);
  if (typeof err === 'string') return err;
  try {
    // JSON.stringify returns undefined for undefined/function inputs, and
    // throws on circular ones — both fall back to String().
    // A broker connect failure serializes as { err, url }, and a hosted broker's
    // URL carries its password: drop the credentials before this reaches a log.
    return (JSON.stringify(err) ?? String(err)).replace(/(amqps?:\/\/)[^@\s"/]+@/gi, '$1');
  } catch {
    return String(err);
  }
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
        `user.blocks.get-pair-status RPC failed for (${userA}, ${userB}): ` +
          `${describeError(err)} — treating the pair as unblocked, so any block ` +
          'between these two users is NOT being enforced for this request.',
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
        `user.blocks.list-blocked RPC failed for ${userId}: ` +
          `${describeError(err)} — returning an empty block list, so this user's ` +
          'blocks are NOT being applied for this request.',
      );
      return [];
    }
  }
}
