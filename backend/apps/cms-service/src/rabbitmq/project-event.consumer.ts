import amqp, { ChannelWrapper } from 'amqp-connection-manager';
import { ConfirmChannel, ConsumeMessage } from 'amqplib';
import { Payload } from 'payload';

const QUEUE = 'cms_events_queue';

interface ProjectUpdatedFields {
  id: string;
  title: string;
  slug: string;
  sourceId: string;
  [key: string]: any;
}

function extractProjectUpdatedEvent(raw: unknown): ProjectUpdatedFields | null {
  if (!raw || typeof raw !== 'object') return null;
  const outer = raw as { pattern?: string; data?: unknown };
  if (outer.pattern !== 'project.updated') return null;
  const data = outer.data as ProjectUpdatedFields;
  if (!data || !data.id || !data.slug) return null;
  return data;
}

export class ProjectEventConsumer {
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
    this.payload.logger.info(`[ProjectEventConsumer] subscribed to ${QUEUE}`);
  }

  private async handle(channel: ConfirmChannel, msg: ConsumeMessage | null): Promise<void> {
    if (!msg) return;
    let raw: unknown;
    try {
      raw = JSON.parse(msg.content.toString('utf-8'));
    } catch (err) {
      this.payload.logger.warn({ err }, '[ProjectEventConsumer] non-JSON message — dropping');
      channel.ack(msg);
      return;
    }

    const event = extractProjectUpdatedEvent(raw);
    if (!event) {
      channel.ack(msg);
      return;
    }

    // Skip if the event originated from cms-service (recursion guard)
    if (event.sourceId === 'cms-service') {
      channel.ack(msg);
      return;
    }

    try {
      await this.syncToPayload(event);
      channel.ack(msg);
    } catch (err) {
      this.payload.logger.error(
        { err, projectId: event.id },
        '[ProjectEventConsumer] failed to sync project.updated → projects',
      );
      channel.nack(msg, false, true);
    }
  }

  private async syncToPayload(event: ProjectUpdatedFields): Promise<void> {
    // 1. Find the project by sourceId or payloadId
    // Listings service projects have a payloadId if they came from CMS.
    // If created in Listings, they might not have one.
    // However, the event 'id' is the Listings ID.
    const existing = await this.payload.find({
      collection: 'projects',
      where: {
        or: [
          { listingsId: { equals: event.id } },
          { slug: { equals: event.slug } }
        ]
      },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    });

    const { mapServiceEventToProject } = await import('../mappers/serviceToProject.mapper');
    const data = mapServiceEventToProject(event);

    if (existing.totalDocs > 0) {
      const docId = existing.docs[0].id;
      await this.payload.update({
        collection: 'projects',
        id: docId,
        data,
        overrideAccess: true,
        // CRITICAL: pass context to skip sync hooks and prevent infinite loops
        context: { skipSync: true },
      });
      this.payload.logger.info(`[ProjectEventConsumer] updated project ${event.slug} (id=${docId})`);
    } else {
      // Auto-create project if it doesn't exist
      await this.payload.create({
        collection: 'projects',
        data: {
          ...data,
          listingsId: event.id, // Store listings ID for future sync
        },
        overrideAccess: true,
        context: { skipSync: true },
      });
      this.payload.logger.info(`[ProjectEventConsumer] created new project ${event.slug} from service`);
    }

  }
}
