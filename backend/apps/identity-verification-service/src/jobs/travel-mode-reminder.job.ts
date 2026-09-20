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

const DAY_MS = 24 * 60 * 60 * 1000;
const REMINDER_SKIP_DAYS = [3, 7];
const REMINDER_STOP_AFTER_DAYS = 7;

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
      await this.evaluateAndSendIfDue(profile, now);
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
    if (!profile.travelModeActivatedAt) return;
    const daysSinceActivation = Math.floor(
      (now.getTime() - profile.travelModeActivatedAt.getTime()) / DAY_MS,
    );

    if (daysSinceActivation > REMINDER_STOP_AFTER_DAYS) {
      profile.nextTravelReminderAt = null;
      await this.profileRepository.save(profile);
      return;
    }

    if (REMINDER_SKIP_DAYS.includes(daysSinceActivation)) {
      profile.nextTravelReminderAt = this.dayOffset(profile.travelModeActivatedAt, daysSinceActivation + 1);
      await this.profileRepository.save(profile);
      return;
    }

    await this.events.publish({
      eventType: IdentityVerificationEventType.TRAVEL_MODE_STILL_ACTIVE,
      profileId: profile.id,
      userId: profile.userId,
      occurredAt: now.toISOString(),
    });
    profile.lastTravelReminderSentAt = now;
    profile.nextTravelReminderAt = this.dayOffset(profile.travelModeActivatedAt, daysSinceActivation + 1);
    await this.profileRepository.save(profile);
  }

  private dayOffset(base: Date, days: number): Date {
    return new Date(base.getTime() + days * DAY_MS);
  }
}
