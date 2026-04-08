import amqp, { AmqpConnectionManager, ChannelWrapper } from 'amqp-connection-manager';
import { ConfirmChannel } from 'amqplib';

const EXCHANGE = 'cms.events';
const EXCHANGE_DLX = 'cms.events.dlx';
const QUEUE = 'cms.category.sync';
const DLQ = `${QUEUE}.dlq`;
const RETRY_DELAYS = [1000, 5000, 30000];

interface CategorySavedEvent {
  event: 'category.saved';
  id: string;
  name: string;
  slug: string;
  status: 'active' | 'inactive';
  parent: string | null;
  listingTypes: string[];
  sortOrder?: number;
  algoliaFacetOrder?: number;
}

interface CategoryDeletedEvent {
  event: 'category.deleted';
  id: string;
  slug: string;
}

export class CmsEventPublisher {
  private static instance: CmsEventPublisher;
  private connection: AmqpConnectionManager | null = null;
  private channelWrapper: ChannelWrapper | null = null;

  static getInstance(): CmsEventPublisher {
    if (!CmsEventPublisher.instance) {
      CmsEventPublisher.instance = new CmsEventPublisher();
    }
    return CmsEventPublisher.instance;
  }

  async connect(url: string): Promise<void> {
    this.connection = amqp.connect([url]);

    this.connection.on('disconnect', (err) => {
      console.warn('[CmsEventPublisher] Disconnected from RabbitMQ', err?.err?.message);
    });
    this.connection.on('connect', () => {
      console.log('[CmsEventPublisher] Connected to RabbitMQ');
    });

    this.channelWrapper = this.connection.createChannel({
      json: true,
      setup: async (channel: ConfirmChannel) => {
        await channel.assertExchange(EXCHANGE, 'topic', { durable: true });
        await channel.assertExchange(EXCHANGE_DLX, 'fanout', { durable: true });

        await channel.assertQueue(QUEUE, {
          durable: true,
          arguments: {
            'x-dead-letter-exchange': EXCHANGE_DLX,
          },
        });
        await channel.assertQueue(DLQ, { durable: true });
        await channel.bindQueue(QUEUE, EXCHANGE, 'category.*');
        await channel.bindQueue(DLQ, EXCHANGE_DLX, '');
      },
    });

    await this.channelWrapper.waitForConnect();
  }

  isConnected(): boolean {
    return this.connection?.isConnected() ?? false;
  }

  async publishCategorySaved(event: Omit<CategorySavedEvent, 'event'>): Promise<void> {
    const payload: CategorySavedEvent = { event: 'category.saved', ...event };
    await this.publishWithRetry('category.saved', payload);
  }

  async publishCategoryDeleted(event: Omit<CategoryDeletedEvent, 'event'>): Promise<void> {
    const payload: CategoryDeletedEvent = { event: 'category.deleted', ...event };
    await this.publishWithRetry('category.deleted', payload);
  }

  private async publishWithRetry(routingKey: string, payload: unknown): Promise<void> {
    if (!this.channelWrapper) {
      throw new Error('[CmsEventPublisher] Not connected — cannot publish event');
    }

    for (let attempt = 0; attempt <= RETRY_DELAYS.length; attempt++) {
      try {
        await this.channelWrapper.publish(EXCHANGE, routingKey, payload, {
          persistent: true,
          contentType: 'application/json',
        });
        return;
      } catch (err) {
        if (attempt < RETRY_DELAYS.length) {
          const delay = RETRY_DELAYS[attempt];
          console.warn(
            `[CmsEventPublisher] Publish failed (attempt ${attempt + 1}/${RETRY_DELAYS.length + 1}), retrying in ${delay}ms`,
            err,
          );
          await new Promise((resolve) => setTimeout(resolve, delay));
        } else {
          console.error(
            `[CmsEventPublisher] Publish failed after ${RETRY_DELAYS.length + 1} attempts`,
            err,
          );
          throw err;
        }
      }
    }
  }

  async close(): Promise<void> {
    await this.channelWrapper?.close();
    await this.connection?.close();
    this.channelWrapper = null;
    this.connection = null;
  }
}
