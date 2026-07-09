import amqp, { ChannelWrapper } from 'amqp-connection-manager';
import { ConfirmChannel, ConsumeMessage } from 'amqplib';
import { Payload } from 'payload';

const QUEUE = 'cms_events_queue';

interface TestimonialUpdatedFields {
  id: string;
  authorName: string;
  authorTitle?: string;
  authorCompany?: string;
  quote?: string;
  rating?: number;
  featured?: boolean;
  status?: string;
  sourceId: string;
}

function extractTestimonialUpdatedEvent(raw: unknown): TestimonialUpdatedFields | null {
  if (!raw || typeof raw !== 'object') return null;
  const outer = raw as { pattern?: string; data?: unknown };
  if (outer.pattern !== 'testimonial.updated') return null;
  const data = outer.data as TestimonialUpdatedFields;
  if (!data || !data.id) return null;
  return data;
}

export class TestimonialEventConsumer {
  private channelWrapper: ChannelWrapper | null = null;

  constructor(private readonly payload: Payload) {}

  async connect(url: string): Promise<void> {
    const connection = amqp.connect([url]);

    this.channelWrapper = connection.createChannel({
      json: true,
      setup: async (channel: ConfirmChannel) => {
        await channel.assertQueue(QUEUE, { durable: true });
        await channel.prefetch(1);
        await channel.consume(QUEUE, (msg) => this.handle(channel, msg));
      },
    });

    await this.channelWrapper.waitForConnect();
    this.payload.logger.info(`[TestimonialEventConsumer] subscribed to ${QUEUE}`);
  }

  private async handle(channel: ConfirmChannel, msg: ConsumeMessage | null): Promise<void> {
    if (!msg) return;
    let raw: unknown;
    try {
      raw = JSON.parse(msg.content.toString('utf-8'));
    } catch (err) {
      this.payload.logger.warn({ err }, '[TestimonialEventConsumer] non-JSON message — dropping');
      channel.ack(msg);
      return;
    }

    const event = extractTestimonialUpdatedEvent(raw);
    if (!event) {
      channel.ack(msg);
      return;
    }

    // Skip if the event originated from cms-service
    if (event.sourceId === 'cms-service') {
      channel.ack(msg);
      return;
    }

    try {
      await this.syncToPayload(event);
      channel.ack(msg);
    } catch (err) {
      this.payload.logger.error(
        { err, testimonialId: event.id },
        '[TestimonialEventConsumer] failed to sync testimonial.updated',
      );
      channel.nack(msg, false, true);
    }
  }

  private async syncToPayload(event: TestimonialUpdatedFields): Promise<void> {
    const existing = await this.payload.find({
      collection: 'testimonials',
      where: { listingsId: { equals: event.id } },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    });

    const data: Record<string, any> = {
      authorName: event.authorName,
      authorTitle: event.authorTitle,
      authorCompany: event.authorCompany,
      quote: event.quote,
      rating: event.rating,
      featured: event.featured,
      status: event.status,
    };

    if (existing.totalDocs > 0) {
      const docId = existing.docs[0].id;
      await this.payload.update({
        collection: 'testimonials',
        id: docId,
        data,
        overrideAccess: true,
        context: { skipSync: true },
      });
      this.payload.logger.info(`[TestimonialEventConsumer] updated testimonial (id=${docId})`);
    } else {
      await this.payload.create({
        collection: 'testimonials',
        data: {
          ...data,
          listingsId: event.id,
        },
        overrideAccess: true,
        context: { skipSync: true },
      });
      this.payload.logger.info(`[TestimonialEventConsumer] created new testimonial from service`);
    }
  }
}
