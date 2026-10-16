import { Inject, Injectable, Logger } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { InjectRepository } from '@nestjs/typeorm';
import { Cron } from '@nestjs/schedule';
import { Repository } from 'typeorm';
import { UserPreferences } from '../entities/user-preferences.entity';

type PreferenceFlag =
  | 'notifyManualTime'
  | 'notifyReassignment'
  | 'notifyWeeklyReport'
  | 'notifyScreenshotComments';

/**
 * The talent-facing notifications behind Settings → Notifications. Each one
 * is gated on the recipient's own toggle in time_tracking.user_preferences
 * before it is handed to notification-service, which then applies the
 * account-wide channel preferences on top.
 */
@Injectable()
export class TalentNotificationsService {
  private readonly logger = new Logger(TalentNotificationsService.name);

  constructor(
    @Inject('NOTIFICATIONS_CLIENT') private readonly client: ClientProxy,
    @InjectRepository(UserPreferences)
    private readonly prefsRepo: Repository<UserPreferences>,
  ) {}

  /** A user with no preferences row has every toggle at its default (on). */
  private async wants(userId: string, flag: PreferenceFlag): Promise<boolean> {
    const prefs = await this.prefsRepo.findOneBy({ userId });
    return prefs ? prefs[flag] !== false : true;
  }

  private send(recipientId: string, event: string, title: string, body: string): void {
    try {
      this.client.emit('notification.send', {
        recipientId,
        // "contracts" is the catalog alias for the Offers & Contracts category.
        category: 'contracts',
        event,
        title,
        body,
        link: '/time-tracking',
        origin: 'time-tracking-service',
      });
    } catch (err) {
      this.logger.error(`notification ${event} failed: ${err instanceof Error ? err.message : err}`);
    }
  }

  async manualTimeReviewed(
    userId: string,
    status: 'approved' | 'rejected',
    hours: number,
    comment: string | null,
  ): Promise<void> {
    if (!(await this.wants(userId, 'notifyManualTime'))) return;
    const approved = status === 'approved';
    this.send(
      userId,
      `time_tracking.manual_time_${status}`,
      approved ? 'Manual time approved' : 'Manual time rejected',
      approved
        ? `Your ${hours}h of manual time was approved.`
        : `Your ${hours}h of manual time was rejected.${comment ? ` Reason: ${comment}` : ''}`,
    );
  }

  /** Someone other than the talent moved their screenshots to another contract or task. */
  async screenshotsReassigned(userId: string, count: number): Promise<void> {
    if (!(await this.wants(userId, 'notifyReassignment'))) return;
    this.send(
      userId,
      'time_tracking.reassigned',
      'Your time was moved',
      count === 1
        ? 'One of your screenshots was moved to a different project or task.'
        : `${count} of your screenshots were moved to a different project or task.`,
    );
  }

  /** The client asked to see a screenshot this talent blurred; not gated on a toggle. */
  async screenshotAccessRequested(userId: string): Promise<void> {
    this.send(
      userId,
      'time_tracking.access_requested',
      'Your client asked to see a blurred screenshot',
      'Your client requested access to a screenshot you blurred. Review it on your Time Tracking page.',
    );
  }

  async screenshotCommented(userId: string, comment: string): Promise<void> {
    if (!(await this.wants(userId, 'notifyScreenshotComments'))) return;
    this.send(
      userId,
      'time_tracking.screenshot_comment',
      'New comment on your screenshot',
      comment.length > 140 ? `${comment.slice(0, 137)}…` : comment,
    );
  }

  /**
   * Monday 09:00 UTC: last week's tracked time (10 minutes per capture, one
   * capture per group of monitors) plus approved manual time, for everyone
   * who tracked anything and has the weekly report on.
   */
  @Cron('0 9 * * 1', { timeZone: 'UTC' })
  async sendWeeklyReports(): Promise<void> {
    const rows: Array<{ user_id: string; captures: string; manual_minutes: string | null }> =
      await this.prefsRepo.query(`
        WITH week AS (
          SELECT date_trunc('week', now() AT TIME ZONE 'UTC') - interval '7 days' AS from_ts,
                 date_trunc('week', now() AT TIME ZONE 'UTC') AS to_ts
        ),
        shots AS (
          SELECT s.user_id,
                 COUNT(DISTINCT COALESCE(s.group_key, s.id::text)) AS captures
          FROM time_tracking.screenshots s, week
          WHERE s.is_deleted = false
            AND COALESCE(s.captured_at, s.created_at) >= week.from_ts
            AND COALESCE(s.captured_at, s.created_at) < week.to_ts
          GROUP BY s.user_id
        ),
        manual AS (
          SELECT m.user_id,
                 SUM(EXTRACT(EPOCH FROM (m.end_time - m.start_time)) / 60) AS manual_minutes
          FROM time_tracking.manual_time m, week
          WHERE m.status = 'approved'
            AND m.start_time >= week.from_ts
            AND m.start_time < week.to_ts
          GROUP BY m.user_id
        )
        SELECT COALESCE(shots.user_id, manual.user_id) AS user_id,
               COALESCE(shots.captures, 0) AS captures,
               manual.manual_minutes
        FROM shots FULL OUTER JOIN manual ON manual.user_id = shots.user_id
      `);

    for (const row of rows) {
      if (!(await this.wants(row.user_id, 'notifyWeeklyReport'))) continue;
      const trackedMinutes = Number(row.captures) * 10;
      const manualMinutes = Math.round(Number(row.manual_minutes ?? 0));
      const total = trackedMinutes + manualMinutes;
      if (total === 0) continue;
      const fmt = (m: number) => `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, '0')}m`;
      this.send(
        row.user_id,
        'time_tracking.weekly_report',
        'Your weekly time summary',
        `Last week you logged ${fmt(total)}: ${fmt(trackedMinutes)} tracked and ${fmt(manualMinutes)} manual.`,
      );
    }
    this.logger.log(`weekly reports evaluated for ${rows.length} user(s)`);
  }
}
