import amqp, { ChannelWrapper } from 'amqp-connection-manager';
import type { ConfirmChannel, ConsumeMessage } from 'amqplib';
import type { Payload } from 'payload';

const QUEUE = 'cms_events_queue';

interface UserProfileUpdatedFields {
  id: string;
  email: string;
  username: string;
  firstName?: string;
  lastName?: string;
  bio?: string | Record<string, any>;
  location?: string;
  timezone?: string;
  availability?: string;
  rate?: number;
  source: string;
}

function extractProfileUpdatedEvent(raw: unknown): UserProfileUpdatedFields | null {
  if (!raw || typeof raw !== 'object') return null;
  const outer = raw as { pattern?: string; data?: unknown };
  if (outer.pattern !== 'user.profile.updated') return null;
  const data = outer.data as UserProfileUpdatedFields;
  if (!data || !data.id || !data.username) return null;
  return data;
}

export class UserEventConsumer {
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
    this.payload.logger.info(`[UserEventConsumer] subscribed to ${QUEUE}`);
  }

  private async handle(channel: ConfirmChannel, msg: ConsumeMessage | null): Promise<void> {
    if (!msg) return;
    let raw: unknown;
    try {
      raw = JSON.parse(msg.content.toString('utf-8'));
    } catch (err) {
      this.payload.logger.warn({ err }, '[UserEventConsumer] non-JSON message — dropping');
      channel.ack(msg);
      return;
    }

    const event = extractProfileUpdatedEvent(raw);
    if (!event) {
      channel.ack(msg);
      return;
    }

    // Skip if the event originated from cms-service (recursion guard)
    if (event.source === 'cms-service') {
      channel.ack(msg);
      return;
    }

    try {
      await this.syncToPayload(event);
      channel.ack(msg);
    } catch (err) {
      this.payload.logger.error(
        { err, userId: event.id },
        '[UserEventConsumer] failed to sync user.profile.updated → talent-profiles',
      );
      channel.nack(msg, false, true);
    }
  }

  private async syncToPayload(event: UserProfileUpdatedFields): Promise<void> {
    // 1. Find the talent profile by sourceId (user UUID)
    const existing = await this.payload.find({
      collection: 'talent-profiles',
      where: { sourceId: { equals: event.id } },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    });

    const data: Record<string, any> = {
      username: event.username,
      firstName: event.firstName || event.username,
      lastName: event.lastName || '',
      availability: event.availability,
      rate: event.rate,
    };

    // Handle overview/bio (Lexical or string)
    if (event.bio) {
      if (typeof event.bio === 'string') {
        // Wrap string in simple Lexical-like structure if needed, or just store as is if Payload allows
        // Actually Payload talent-profiles uses richText (Lexical).
        // For simplicity, we'll store it as a string if Payload allows, but usually Lexical expects a JSON.
        data.overview = {
          root: {
            children: [
              {
                children: [{ detail: 0, format: 0, mode: 'normal', style: '', text: event.bio, type: 'text', version: 1 }],
                direction: 'ltr',
                format: '',
                indent: 0,
                type: 'paragraph',
                version: 1,
              },
            ],
            direction: 'ltr',
            format: '',
            indent: 0,
            type: 'root',
            version: 1,
          },
        };
      } else {
        data.overview = event.bio;
      }
    }

    if (existing.totalDocs > 0) {
      const docId = existing.docs[0].id;
      await this.payload.update({
        collection: 'talent-profiles',
        id: docId,
        data,
        overrideAccess: true,
        // CRITICAL: pass context to skip sync hooks and prevent infinite loops
        context: { skipSync: true },
      });
      this.payload.logger.info(`[UserEventConsumer] updated talent profile ${event.username} (id=${docId})`);
    } else {
      // Auto-create profile if it doesn't exist?
      // For now, let's just log it. In a production system, we'd probably create it.
      this.payload.logger.warn(`[UserEventConsumer] profile not found for sourceId=${event.id}; skipping sync.`);
    }
  }
}
