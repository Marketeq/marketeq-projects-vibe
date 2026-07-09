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
  jobTitles: { headline: string; rate: number }[];
  availability: string | null;
  location: string | null;
  country: string | null;
  timezone: string | null;
  rate: number | null;
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

interface ProjectSavedEvent {
  event: 'project.saved';
  id: string;
  payloadId: number | string;
  slug: string;
  title: string;
  status: 'draft' | 'published' | 'archived';
}

interface ProjectDeletedEvent {
  event: 'project.deleted';
  id: string;
  payloadId: number | string;
  slug: string;
}

// `admin.broadcast` per Notifications Service §02 (Notification Triggers).
// Carries the published platform-wide announcement for downstream
// consumers — notification-service fans out via Ably; future banner
// services can subscribe to the same routing key.
interface AnnouncementPublishedEvent {
  event: 'announcement.published';
  id: number | string;
  title: string;
  message: unknown;
  audience: 'all' | 'clients' | 'talent' | 'admins' | null;
  startDate: string | null;
  endDate: string | null;
  ctaLabel: string | null;
  ctaUrl: string | null;
  priority: number;
  status: 'draft' | 'published' | 'archived';
}

interface AnnouncementDeletedEvent {
  event: 'announcement.deleted';
  id: number | string;
}

// Globals — single-instance documents that the homepage feed embeds. The
// HomepageBanner global is rendered as the top-of-page promo strip on `/`,
// assembled into the api-gateway /homepage response. Without an event,
// banner edits stay invisible until the 300 s Redis cache TTL expires
// (Cache Strategy §6 documented limitation). This brings it down to
// sub-second by reusing the same api-gateway.homepage queue.
interface HomepageBannerSavedEvent {
  event: 'homepage-banner.saved';
  enabled: boolean;
  message: string | null;
  ctaLabel: string | null;
  ctaUrl: string | null;
  expiresAt: string | null;
  bannerType: 'info' | 'promo' | 'warning' | null;
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

        // Category sync queue
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

        // Homepage cache invalidation queue — also receives homepage-banner.*
        // events because the /homepage feed embeds the HomepageBanner global.
        const HP_QUEUE = 'api-gateway.homepage';
        const HP_DLQ = `${HP_QUEUE}.dlq`;
        await channel.assertQueue(HP_QUEUE, {
          durable: true,
          arguments: { 'x-dead-letter-exchange': EXCHANGE_DLX },
        });
        await channel.assertQueue(HP_DLQ, { durable: true });
        await channel.bindQueue(HP_QUEUE, EXCHANGE, 'homepage.*');
        await channel.bindQueue(HP_QUEUE, EXCHANGE, 'homepage-banner.*');
        await channel.bindQueue(HP_DLQ, EXCHANGE_DLX, '');

        // Projects cache-invalidation queue (consumed by api-gateway)
        const PR_QUEUE = 'api-gateway.projects';
        const PR_DLQ = `${PR_QUEUE}.dlq`;
        await channel.assertQueue(PR_QUEUE, {
          durable: true,
          arguments: {
            'x-dead-letter-exchange': EXCHANGE_DLX,
            'x-message-ttl': 30000,
          },
        });
        await channel.assertQueue(PR_DLQ, { durable: true });
        await channel.bindQueue(PR_QUEUE, EXCHANGE, 'project.*');
        await channel.bindQueue(PR_DLQ, EXCHANGE_DLX, '');

        // Announcements broadcast queue (consumed by notification-service
        // for Ably fan-out per CS-07 §lines 220-228 + Notifications Service
        // §02 admin.broadcast trigger). Consumer not yet wired — queue
        // accumulates published events until then.
        const ANN_QUEUE = 'cms.announcements.broadcast';
        const ANN_DLQ = `${ANN_QUEUE}.dlq`;
        await channel.assertQueue(ANN_QUEUE, {
          durable: true,
          arguments: {
            'x-dead-letter-exchange': EXCHANGE_DLX,
            'x-message-ttl': 30000,
          },
        });
        await channel.assertQueue(ANN_DLQ, { durable: true });
        await channel.bindQueue(ANN_QUEUE, EXCHANGE, 'announcement.*');
        await channel.bindQueue(ANN_DLQ, EXCHANGE_DLX, '');
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

  async publishProjectSaved(event: Omit<ProjectSavedEvent, 'event'>): Promise<void> {
    const payload: ProjectSavedEvent = { event: 'project.saved', ...event };
    await this.publishWithRetry('project.saved', payload);
  }

  async publishProjectDeleted(event: Omit<ProjectDeletedEvent, 'event'>): Promise<void> {
    const payload: ProjectDeletedEvent = { event: 'project.deleted', ...event };
    await this.publishWithRetry('project.deleted', payload);
  }

  async publishAnnouncementPublished(event: Omit<AnnouncementPublishedEvent, 'event'>): Promise<void> {
    const payload: AnnouncementPublishedEvent = { event: 'announcement.published', ...event };
    await this.publishWithRetry('announcement.published', payload);
  }

  async publishAnnouncementDeleted(event: Omit<AnnouncementDeletedEvent, 'event'>): Promise<void> {
    const payload: AnnouncementDeletedEvent = { event: 'announcement.deleted', ...event };
    await this.publishWithRetry('announcement.deleted', payload);
  }

  async publishHomepageBannerSaved(event: Omit<HomepageBannerSavedEvent, 'event'>): Promise<void> {
    const payload: HomepageBannerSavedEvent = { event: 'homepage-banner.saved', ...event };
    await this.publishWithRetry('homepage-banner.saved', payload);
  }

  /** Publish any event with a custom routing key. Used by collection hooks. */
  async publishWithRoutingKey(routingKey: string, payload: unknown): Promise<void> {
    return this.publishWithRetry(routingKey, payload);
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
