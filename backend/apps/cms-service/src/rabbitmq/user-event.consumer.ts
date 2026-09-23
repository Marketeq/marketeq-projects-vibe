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
  headline?: string;
  avatarUrl?: string;
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

function sanitizeSkills(skills?: any[]): { name: string }[] | undefined {
  if (!Array.isArray(skills)) return undefined;
  const seen = new Set<string>();
  const result: { name: string }[] = [];
  for (const s of skills) {
    const name =
      typeof s === 'string' ? s.trim() : typeof s?.name === 'string' ? s.name.trim() : '';
    if (!name) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push({ name });
  }
  return result.length > 0 ? result : undefined;
}

// LinkedIn-imported dates are freeform strings ("Jan 2026", "Part"/"time",
// "Seasonal") — only pass through what actually parses as a real, non-future
// date, since the collection's own validators throw on anything else and
// would fail the whole sync.
function sanitizeDate(value: any): string | undefined {
  if (typeof value !== 'string' || !value.trim()) return undefined;
  const parsed = new Date(value.trim());
  if (Number.isNaN(parsed.getTime())) return undefined;
  if (parsed.getTime() > Date.now()) return undefined;
  return parsed.toISOString();
}

function sanitizeWorkExperience(items?: any[]): any[] | undefined {
  if (!Array.isArray(items)) return undefined;
  const result = items
    .filter(
      (w) =>
        typeof w?.role === 'string' &&
        w.role.trim() &&
        typeof w?.company === 'string' &&
        w.company.trim(),
    )
    .map((w) => {
      const startDate = sanitizeDate(w.startDate);
      let endDate = sanitizeDate(w.endDate);
      if (startDate && endDate && new Date(endDate) < new Date(startDate)) {
        endDate = undefined;
      }
      return {
        role: w.role.trim(),
        company: w.company.trim(),
        startDate,
        endDate,
        description:
          typeof w.description === 'string' && w.description.trim()
            ? w.description.trim()
            : undefined,
      };
    });
  return result.length > 0 ? result : undefined;
}

// Real usernames carry characters the collection's own regex rejects (e.g. a
// leading "@"). Strip anything outside [a-z0-9._-] rather than letting the
// collection's beforeValidate hook throw and nack the message forever.
function sanitizeUsername(username: string, fallbackId: string): string {
  const cleaned = username.trim().toLowerCase().replace(/[^a-z0-9._-]/g, '');
  return cleaned.length >= 3 ? cleaned : `talent-${fallbackId.slice(0, 8)}`;
}

const VALID_AVAILABILITY_VALUES = new Set(['10', '20', '30', '40']);

// user-service allows freeform/other availability values (e.g. "CUSTOM") that
// aren't in the CMS collection's fixed select options — passing one through
// throws a Postgres enum error and nacks forever.
function sanitizeAvailability(value: any): string | undefined {
  if (typeof value !== 'string') return undefined;
  return VALID_AVAILABILITY_VALUES.has(value) ? value : undefined;
}

function buildJobTitles(
  event: UserProfileUpdatedFields,
): { headline: string; rate: number }[] | undefined {
  if (Array.isArray(event.jobTitles) && event.jobTitles.length > 0) {
    const mapped = event.jobTitles
      .filter((jt: any) => typeof jt?.headline === 'string' && jt.headline.trim())
      .map((jt: any) => ({
        headline: jt.headline.trim(),
        rate: Number.isInteger(jt.rate) ? jt.rate : 0,
      }));
    if (mapped.length > 0) return mapped;
  }
  if (typeof event.headline === 'string' && event.headline.trim()) {
    return [
      {
        headline: event.headline.trim(),
        rate: Number.isInteger(event.rate) ? (event.rate as number) : 0,
      },
    ];
  }
  return undefined;
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

    const username = sanitizeUsername(event.username, event.id);

    const data: Record<string, any> = {
      username,
      firstName: event.firstName || event.username,
      // lastName is required and can't be an empty string — some real users
      // never entered one (e.g. OAuth signups that only capture a first name).
      lastName: event.lastName || event.username || 'Talent',
      availability: sanitizeAvailability(event.availability),
      location: typeof event.location === 'string' && event.location.trim() ? event.location.trim() : undefined,
      avatarUrl: typeof event.avatarUrl === 'string' && event.avatarUrl.trim() ? event.avatarUrl.trim() : undefined,
    };

    const jobTitles = buildJobTitles(event);
    if (jobTitles) data.jobTitles = jobTitles;

    const skills = sanitizeSkills(event.skills);
    if (skills) data.skills = skills;

    const workExperience = sanitizeWorkExperience(event.workExperience);
    if (workExperience) data.workExperience = workExperience;

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
        `[UserEventConsumer] updated talent profile ${username} (id=${docId})`,
      );
    } else {
      // No CMS profile exists yet — create one so old user-service data appears in the CMS.
      // Guard against duplicate username (profile may exist under a different sourceId).
      const byUsername = await this.payload.find({
        collection: 'talent-profiles',
        where: { username: { equals: username } },
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
          `[UserEventConsumer] linked & updated existing talent profile "${username}" (id=${existingDocId}) with sourceId ${event.id}`,
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
          `[UserEventConsumer] created new talent profile "${username}" (id=${(created as any).id}) from user-service data`,
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
