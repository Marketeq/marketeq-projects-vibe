import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { LessThanOrEqual, Repository } from 'typeorm';
import { Inject } from '@nestjs/common';
import { IdentityVerificationProfile } from '../entities/identity-verification-profile.entity';
import {
  NotificationEventPublisher,
  NOTIFICATION_EVENT_PUBLISHER,
} from '../events/notification-event-publisher.interface';
import { IdentityVerificationEventType } from '../events/identity-verification-event.types';
import {
  DAY_MS,
  TRAVEL_REMINDER_DAYS,
  travelModeEndsAt,
} from '../common/travel-mode/travel-mode-duration';

@Injectable()
export class TravelModeReminderJob {
  private readonly logger = new Logger(TravelModeReminderJob.name);

  constructor(
    @InjectRepository(IdentityVerificationProfile)
    private readonly profileRepository: Repository<IdentityVerificationProfile>,
    @Inject(NOTIFICATION_EVENT_PUBLISHER)
    private readonly events: NotificationEventPublisher,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async runDailySweep(): Promise<void> {
    const now = new Date();
    const dueProfiles = await this.profileRepository.find({
      where: { travelModeActive: true, nextTravelReminderAt: LessThanOrEqual(now) },
    });
    this.logger.log(`Travel Mode reminder sweep: ${dueProfiles.length} profile(s) due.`);
    for (const profile of dueProfiles) {
      try {
        await this.evaluateAndSendIfDue(profile, now);
      } catch {
        // Deliberately no error detail here — could be a raw DB error,
        // and this log must never carry PII or internals. See docs/error-handling.
        this.logger.error(`Travel Mode reminder failed for profile ${profile.id}`);
      }
    }
  }

  async onFreshLogin(profile: IdentityVerificationProfile): Promise<void> {
    if (!profile.travelModeActive) return;
    await this.evaluateAndSendIfDue(profile, new Date());
  }

  async onDetectedCountryChanged(profile: IdentityVerificationProfile): Promise<void> {
    if (!profile.travelModeActive) return;
    profile.nextTravelReminderAt = new Date();
    await this.profileRepository.save(profile);
    await this.evaluateAndSendIfDue(profile, new Date());
  }

  private async evaluateAndSendIfDue(
    profile: IdentityVerificationProfile,
    now: Date,
  ): Promise<void> {
    // nextTravelReminderAt is the earliest reminder not yet processed; null
    // means nothing is left to send for this activation.
    const cursor = profile.nextTravelReminderAt;
    if (!cursor) return;

    const activatedAt = profile.travelModeActivatedAt;
    const endsAt =
      activatedAt && profile.declaredDuration
        ? travelModeEndsAt(activatedAt, profile.declaredDuration)
        : null;
    if (!activatedAt || !endsAt) {
      // Fixed reason code only: no profile id or other identifier is logged.
      this.logger.warn('Travel Mode reminder skipped: reason=invalid_travel_data');
      await this.advanceCursor(profile, cursor, null);
      return;
    }

    // At or after expiry there are no reminders at all.
    if (now.getTime() >= endsAt.getTime()) {
      await this.advanceCursor(profile, cursor, null);
      return;
    }

    // Day 3 and day 7 after activation; a reminder that would fall at or
    // after expiry (day 7 of the 6-day duration) does not exist.
    const remaining = TRAVEL_REMINDER_DAYS.map((day) => this.dayOffset(activatedAt, day)).filter(
      (due) => due.getTime() < endsAt.getTime() && due.getTime() >= cursor.getTime(),
    );
    const dueNow = remaining.filter((due) => due.getTime() <= now.getTime());
    const next = remaining.find((due) => due.getTime() > now.getTime()) ?? null;

    // Compare-and-set first, publish only for the run that won it, so
    // overlapping runs cannot publish twice. Only the cursor is written;
    // lastTravelReminderSentAt belongs to the dashboard claim endpoint.
    const advanced = await this.advanceCursor(profile, cursor, next);
    if (!advanced || dueNow.length === 0) return;

    // One event even when several reminders are due at once (e.g. after an outage).
    await this.events.publish({
      eventType: IdentityVerificationEventType.TRAVEL_MODE_STILL_ACTIVE,
      profileId: profile.id,
      userId: profile.userId,
      occurredAt: now.toISOString(),
    });
  }

  // Moves nextTravelReminderAt from the value this run read to `next`, only if
  // it still holds that value and Travel Mode is still active. Returns false
  // when another run, a new activation or a home-country confirmation changed
  // the profile first. A no-op move (same value) counts as won.
  private async advanceCursor(
    profile: IdentityVerificationProfile,
    observed: Date,
    next: Date | null,
  ): Promise<boolean> {
    if (next && next.getTime() === observed.getTime()) return true;
    const result = await this.profileRepository.update(
      { id: profile.id, travelModeActive: true, nextTravelReminderAt: observed },
      { nextTravelReminderAt: next },
    );
    if (result.affected !== 1) return false;
    profile.nextTravelReminderAt = next;
    return true;
  }

  private dayOffset(base: Date, days: number): Date {
    return new Date(base.getTime() + days * DAY_MS);
  }
}
