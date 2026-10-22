// A ServerRMQ that never leaves a message unacknowledged. The service now consumes with manual
// acknowledgment, but only `notification.send` has retry logic (NotificationDeliveryService). Every
// other pattern keeps its previous at-most-once behaviour: acked once its handler ran, whether or
// not it threw, and acked when no handler exists (the plain transport would leave those
// unacknowledged forever and eventually stall the consumer's prefetch window).
import { Logger } from '@nestjs/common';
import { RmqContext, ServerRMQ } from '@nestjs/microservices';
import { SEND_PATTERN } from './delivery.constants';

export class AckingServerRMQ extends ServerRMQ {
  private readonly ackLogger = new Logger('NotificationRmq');

  constructor(options: any, private readonly onChannel?: (channel: any) => Promise<void>) {
    super(options);
  }

  async setupChannel(channel: any, callback: any) {
    try {
      await this.onChannel?.(channel);
    } catch (err) {
      this.ackLogger.error(`Retry/dead-letter queues could not be declared: ${err instanceof Error ? err.message : err}`);
    }
    return super.setupChannel(channel, callback);
  }

  async handleEvent(pattern: string, packet: any, context: RmqContext): Promise<any> {
    const owns = pattern === SEND_PATTERN; // its handler acknowledges for itself
    if (!this.getHandlerByPattern(pattern)) {
      this.ackLogger.error(`No handler for "${pattern}" - acknowledging so it does not block the queue`);
      context.getChannelRef().ack(context.getMessage());
      return;
    }
    try {
      await super.handleEvent(pattern, packet, context);
    } catch (err) {
      this.ackLogger.error(`Handler for "${pattern}" failed: ${err instanceof Error ? err.message : err}`);
      if (owns) return; // left unacknowledged on purpose: the broker redelivers it
    }
    if (!owns) context.getChannelRef().ack(context.getMessage());
  }
}
