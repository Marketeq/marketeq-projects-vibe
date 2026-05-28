import { Payload } from 'payload';
import amqp, { ChannelWrapper } from 'amqp-connection-manager';
import { ConfirmChannel } from 'amqplib';

interface CategoryUpdatedEvent {
  event: 'category.updated';
  sourceId?: string;
  id: string; // uuid
  name: string;
  slug: string;
  status: 'active' | 'inactive';
  parentId: string | null;
  seo_meta_title?: string;
  description?: string;
}

export class CategoryEventConsumer {
  private channelWrapper: ChannelWrapper | null = null;

  constructor(private readonly payload: Payload) {}

  async connect(url: string): Promise<void> {
    const connection = amqp.connect([url]);
    this.channelWrapper = connection.createChannel({
      setup: async (channel: ConfirmChannel) => {
        const QUEUE = 'category-service.category.sync';
        const EXCHANGE = 'cms.events';

        await channel.assertExchange(EXCHANGE, 'topic', { durable: true });
        await channel.assertQueue(QUEUE, { durable: true });
        await channel.bindQueue(QUEUE, EXCHANGE, 'category.updated');

        return channel.consume(QUEUE, (msg) => {
          if (msg) {
            this.handleEvent(JSON.parse(msg.content.toString()))
              .then(() => channel.ack(msg))
              .catch((err) => {
                this.payload.logger.error({ err }, 'Failed to process category event');
                channel.nack(msg, false, true);
              });
          }
        });
      },
    });

    await this.channelWrapper.waitForConnect();
    this.payload.logger.info('CategoryEventConsumer connected to RabbitMQ');
  }

  private async handleEvent(event: CategoryUpdatedEvent): Promise<void> {
    if (event.sourceId === 'cms-service') {
      this.payload.logger.debug('Skipping category event originating from CMS');
      return;
    }

    this.payload.logger.info(`Received category.updated for slug: ${event.slug}`);

    // Resolve parent ID if provided
    let parentId: string | number | null = null;
    if (event.parentId) {
      const parentDocs = await this.payload.find({
        collection: 'categories',
        where: { uuid: { equals: event.parentId } },
        limit: 1,
      });
      if (parentDocs.docs.length > 0) {
        parentId = parentDocs.docs[0].id;
      }
    }

    const existing = await this.payload.find({
      collection: 'categories',
      where: { uuid: { equals: event.id } },
      limit: 1,
    });

    const updateData: any = {
      name: event.name,
      slug: event.slug,
      status: event.status,
      description: event.description,
      parent: parentId,
    };

    if (existing.docs.length > 0) {
      await this.payload.update({
        collection: 'categories',
        id: existing.docs[0].id,
        data: updateData,
        overrideAccess: true,
        context: { skipSync: true },
      });
      this.payload.logger.info(`Updated category: ${event.slug}`);
    } else {
      await this.payload.create({
        collection: 'categories',
        data: {
          ...updateData,
          uuid: event.id,
        },
        overrideAccess: true,
        context: { skipSync: true },
      });
      this.payload.logger.info(`Created category: ${event.slug}`);
    }
  }
}
