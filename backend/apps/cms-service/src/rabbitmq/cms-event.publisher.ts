import amqp, { ChannelWrapper } from 'amqp-connection-manager';
import { ConfirmChannel } from 'amqplib';

const EXCHANGE = 'cms.events';
const EXCHANGE_DLX = 'cms.events.dlx';
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
  private channelWrapper: ChannelWrapper | null = null;
  private connected = false;

  static getInstance(): CmsEventPublisher {
    if (!CmsEventPublisher.instance) {
      CmsEventPublisher.instance = new CmsEventPublisher();
    }
    return CmsEventPublisher.instance;
  }

  async connect(url: string): Promise<void> {
    const connection = amqp.connect([url]);

    this.channelWrapper = connection.createChannel({
      json: true,
      setup: async (channel: ConfirmChannel) => {
        // Publisher only declares exchanges.
        // Consumer queues are owned and declared by the consuming services.
        await channel.assertExchange(EXCHANGE, 'topic', { durable: true });
        await channel.assertExchange(EXCHANGE_DLX, 'fanout', { durable: true });
      },
    });

    await this.channelWrapper.waitForConnect();
    this.connected = true;
  }

  isConnected(): boolean {
    return this.connected;
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
      console.error('[CmsEventPublisher] Not connected — skipping publish');
      return;
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
            `[CmsEventPublisher] Publish failed (attempt ${attempt + 1}), retrying in ${delay}ms`,
            err,
          );
          await new Promise((resolve) => setTimeout(resolve, delay));
        } else {
          console.error(
            `[CmsEventPublisher] Publish failed after ${RETRY_DELAYS.length + 1} attempts`,
            err,
          );
        }
      }
    }
  }
}
