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

interface TalentProfileSavedEvent {
  event: 'talent-profile.saved';
  id: string;
  sourceId: string | null;
  username: string;
  name: string;
  headline: string | null;
  availability: string | null;
  isAvailable: boolean;
  location: string | null;
  country: string | null;
  timezone: string | null;
  rateMin: number | null;
  rateMax: number | null;
  overview: unknown | null;
  skills: string[];
  industryExpertise: string[];
  languages: { language: string; fluency: string }[];
  certifications: { title: string; organization: string; dateAwarded: string | null }[];
  education: { institution: string; degree: string; graduationYear: number | null }[];
  workExperience: { role: string; company: string; startDate: string | null; endDate: string | null; description: string | null }[];
  portfolio: { title: string; url: string | null; thumbnailId: number | null; description: string | null }[];
  status: 'active' | 'inactive' | 'suspended';
}

interface TalentProfileDeletedEvent {
  event: 'talent-profile.deleted';
  id: string;
  username: string;
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

    connection.on('disconnect', () => { this.connected = false; });
    connection.on('connect', () => { this.connected = true; });

    this.channelWrapper = connection.createChannel({
      json: true,
      setup: async (channel: ConfirmChannel) => {
        // Declare exchanges
        await channel.assertExchange(EXCHANGE, 'topic', { durable: true });
        await channel.assertExchange(EXCHANGE_DLX, 'fanout', { durable: true });

        // Declare consumer queue and bind to exchange so messages are routed
        const QUEUE = 'cms.category.category';
        const DLQ = `${QUEUE}.dlq`;
        await channel.assertQueue(QUEUE, {
          durable: true,
          arguments: {
            'x-dead-letter-exchange': EXCHANGE_DLX,
            'x-message-ttl': 30000,
          },
        });
        await channel.assertQueue(DLQ, { durable: true });
        await channel.bindQueue(QUEUE, EXCHANGE, 'category.*');
        await channel.bindQueue(DLQ, EXCHANGE_DLX, '');

        // Talent-profile queues
        const TP_QUEUE = 'cms.talent-profile.sync';
        const TP_DLQ = `${TP_QUEUE}.dlq`;
        await channel.assertQueue(TP_QUEUE, {
          durable: true,
          arguments: {
            'x-dead-letter-exchange': EXCHANGE_DLX,
            'x-message-ttl': 30000,
          },
        });
        await channel.assertQueue(TP_DLQ, { durable: true });
        await channel.bindQueue(TP_QUEUE, EXCHANGE, 'talent-profile.*');
        await channel.bindQueue(TP_DLQ, EXCHANGE_DLX, '');
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

  async publishTalentProfileSaved(event: Omit<TalentProfileSavedEvent, 'event'>): Promise<void> {
    const payload: TalentProfileSavedEvent = { event: 'talent-profile.saved', ...event };
    await this.publishWithRetry('talent-profile.saved', payload);
  }

  async publishTalentProfileDeleted(event: Omit<TalentProfileDeletedEvent, 'event'>): Promise<void> {
    const payload: TalentProfileDeletedEvent = { event: 'talent-profile.deleted', ...event };
    await this.publishWithRetry('talent-profile.deleted', payload);
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
            `[CmsEventPublisher] Publish failed (attempt ${attempt + 1}), retrying in ${delay}ms`,
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
}
