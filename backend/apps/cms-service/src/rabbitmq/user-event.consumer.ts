import amqp, { ChannelWrapper } from 'amqp-connection-manager';
import type { ConfirmChannel, ConsumeMessage } from 'amqplib';
import { randomBytes } from 'crypto';
import type { Payload } from 'payload';

const QUEUE = 'cms_user_events_queue';

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
  jobTitles?: any[];
  skills?: any[];
  languages?: any[];
  certifications?: any[];
  education?: any[];
  workExperience?: any[];
  portfolio?: any[];
  userType?: string;
  status?: string;
  source: string;
}

export function extractProfileUpdatedEvent(
  raw: unknown,
): UserProfileUpdatedFields | null {
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
    } catch (err: any) {
      this.payload.logger.error(
        { err: err.message, stack: err.stack, userId: event.id, username: event.username },
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
      this.payload.logger.info(
        `[UserEventConsumer] updated talent profile ${event.username} (id=${docId})`,
      );
    } else {
      // No CMS profile exists yet — create one so old user-service data appears in the CMS.
      // Guard against duplicate username (profile may exist under a different sourceId).
      const byUsername = await this.payload.find({
        collection: 'talent-profiles',
        where: { username: { equals: event.username } },
        limit: 1,
        depth: 0,
        overrideAccess: true,
      });

      if (byUsername.totalDocs > 0) {
        // Username is taken by another CMS record — update that one and link sourceId.
        const existingDocId = byUsername.docs[0].id;
        await this.payload.update({
          collection: 'talent-profiles',
          id: existingDocId,
          data: { ...data, sourceId: event.id },
          overrideAccess: true,
          context: { skipSync: true },
        });
        this.payload.logger.info(
          `[UserEventConsumer] linked & updated existing talent profile "${event.username}" (id=${existingDocId}) with sourceId ${event.id}`,
        );
      } else {
        // Fully new profile — create it.
        const created = await this.payload.create({
          collection: 'talent-profiles',
          data: {
            ...data,
            sourceId: event.id,
            // jobTitles is required (minRows: 1) — provide a placeholder if missing
            jobTitles:
              Array.isArray(data.jobTitles) && data.jobTitles.length > 0
                ? data.jobTitles
                : [{ headline: 'Talent', rate: 0, saveAsDefault: true }],
          },
          overrideAccess: true,
          context: { skipSync: true },
        });
        this.payload.logger.info(
          `[UserEventConsumer] created new talent profile "${event.username}" (id=${(created as any).id}) from user-service data`,
        );
      }
    }

    // 2. Sync to 'users' collection (core admin/auth user)
    const existingUser = await this.payload.find({
      collection: 'users',
      where: {
        or: [{ sourceId: { equals: event.id } }, { email: { equals: event.email } }],
      },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    });

    const userData: Record<string, any> = {
      email: event.email,
      name:
        event.firstName && event.lastName
          ? `${event.firstName} ${event.lastName}`
          : event.firstName || event.lastName || event.username,
    };

    if (existingUser.totalDocs > 0) {
      const userId = existingUser.docs[0].id;
      await this.payload.update({
        collection: 'users',
        id: userId,
        data: userData,
        overrideAccess: true,
        context: { skipSync: true },
      });
      this.payload.logger.info(
        `[UserEventConsumer] updated user ${event.email} (id=${userId})`,
      );
    } else {
      // Create user if missing in CMS
      const created = await this.payload.create({
        collection: 'users',
        data: {
          ...userData,
          sourceId: event.id,
          userType: (['client', 'talent', 'admin'].includes(event.userType ?? '') ? event.userType : 'talent') as 'client' | 'talent' | 'admin',
          status: 'active',
          // Payload local-auth requires a password on create. These users
          // authenticate via JWT from user-service so this value is never used.
          password: randomBytes(32).toString('hex'),
        },
        overrideAccess: true,
        context: { skipSync: true },
      });
      this.payload.logger.info(
        `[UserEventConsumer] created new user ${event.email} (id=${(created as any).id}) from user-service data`,
      );
    }
  }
}
