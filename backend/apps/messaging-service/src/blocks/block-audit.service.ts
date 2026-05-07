import { Inject, Injectable, Logger } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';

export type BlockDeniedKind =
  | 'token-capability'
  | 'send-rejected'
  | 'send-shadow-dropped'
  | 'thread-create-rejected'
  | 'thread-create-shadow'
  | 'message-filtered';

interface BlockDeniedPayload {
  actorId: string;
  targetId: string;
  kind: BlockDeniedKind;
  threadId?: string;
  ts: string;
}

@Injectable()
export class BlockAuditService {
  private readonly logger = new Logger(BlockAuditService.name);

  constructor(@Inject('RABBITMQ_CLIENT') private readonly client: ClientProxy) {}

  recordDenied(params: Omit<BlockDeniedPayload, 'ts'>): void {
    const payload: BlockDeniedPayload = {
      ...params,
      ts: new Date().toISOString(),
    };
    this.logger.log(
      `block.denied actor=${payload.actorId} target=${payload.targetId} kind=${payload.kind}`,
    );
    try {
      this.client.emit('block.denied', payload);
    } catch (err) {
      this.logger.warn(
        `Failed to emit block.denied: ${(err as Error)?.message ?? err}`,
      );
    }
  }
}
