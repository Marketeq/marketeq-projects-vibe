import { Injectable } from '@nestjs/common';
import { DEAD_LETTER_QUEUE } from './delivery.constants';

export interface DeadLetterRecord {
  at: string;
  event: string | null;
  idempotencyKey: string | null;
  attempts: number;
  reason: string;
}

/** Counters and the current dead-letter depth, surfaced on the service's health endpoint. */
@Injectable()
export class NotificationDeliveryMonitor {
  private retried = 0;
  private deadLettered = 0;
  private last: DeadLetterRecord | null = null;
  private channel: any = null;

  recordRetry(): void {
    this.retried += 1;
  }

  recordDeadLetter(record: DeadLetterRecord): void {
    this.deadLettered += 1;
    this.last = record;
  }

  /** The live channel, used only to read the dead-letter queue's depth (the queue is asserted first). */
  attach(channel: any): void {
    this.channel = channel;
  }

  /** Messages waiting in the dead-letter queue, or null when it cannot be read right now. */
  async deadLetterDepth(): Promise<number | null> {
    if (!this.channel) return null;
    try {
      const q = await this.channel.checkQueue(DEAD_LETTER_QUEUE);
      return typeof q?.messageCount === 'number' ? q.messageCount : null;
    } catch {
      return null;
    }
  }

  async snapshot() {
    const depth = await this.deadLetterDepth();
    return {
      healthy: this.deadLettered === 0 && !depth,
      retriedSinceBoot: this.retried,
      deadLetteredSinceBoot: this.deadLettered,
      deadLetterQueue: DEAD_LETTER_QUEUE,
      deadLetterQueueDepth: depth,
      lastDeadLetter: this.last,
    };
  }
}
