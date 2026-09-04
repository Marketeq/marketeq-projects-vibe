import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IdentityVerificationProfile } from '../entities/identity-verification-profile.entity';
import { TravelClassification } from '../entities/enums/identity-verification.enums';
import { EventPublisherService } from './event-publisher.service';

@Injectable()
export class TravelReminderSchedulerService {
  private readonly logger = new Logger(TravelReminderSchedulerService.name);
  private readonly SKIP_REMINDERS_AT_DAYS = [3, 7];
  private readonly REMINDER_INTERVAL_HOURS = 24;

  constructor(
    @InjectRepository(IdentityVerificationProfile)
    private profileRepository: Repository<IdentityVerificationProfile>,
    private eventPublisher: EventPublisherService,
  ) {}

  async processTravelReminders(): Promise<{ processed: number; sent: number }> {
    try {
      this.logger.log('Processing travel reminders...');

      const profiles = await this.profileRepository.find({
        where: {
          travelModeActive: true,
          travelClassification: TravelClassification.TEMPORARILY_TRAVELING,
        },
      });

      let sent = 0;

      for (const profile of profiles) {
        if (await this.shouldSendReminder(profile)) {
          await this.sendReminder(profile);
          sent++;
        }
      }

      this.logger.log(`Travel reminder processing complete: ${sent} reminders sent out of ${profiles.length} profiles`);

      return { processed: profiles.length, sent };
    } catch (error) {
      this.logger.error('Error processing travel reminders', error);
      return { processed: 0, sent: 0 };
    }
  }

  private async shouldSendReminder(profile: IdentityVerificationProfile): Promise<boolean> {
    const now = new Date();

    if (!profile.nextTravelReminderAt) {
      return false;
    }

    if (profile.nextTravelReminderAt > now) {
      return false;
    }

    if (profile.travelModeActivatedAt) {
      const daysSinceActivation = Math.floor(
        (now.getTime() - profile.travelModeActivatedAt.getTime()) / (1000 * 60 * 60 * 24),
      );

      if (this.SKIP_REMINDERS_AT_DAYS.includes(daysSinceActivation)) {
        this.logger.debug(
          `Skipping reminder for user ${profile.userId} (day ${daysSinceActivation} in skip list)`,
        );
        return false;
      }
    }

    return true;
  }

  private async sendReminder(profile: IdentityVerificationProfile): Promise<void> {
    try {
      const now = new Date();
      const nextReminderTime = new Date(now.getTime() + this.REMINDER_INTERVAL_HOURS * 60 * 60 * 1000);

      profile.lastTravelReminderSentAt = now;
      profile.nextTravelReminderAt = nextReminderTime;

      await this.profileRepository.save(profile);

      await this.eventPublisher.publishTravelModeActivated(
        profile.userId,
        profile.declaredDuration || 'unknown',
      );

      this.logger.log(`Travel reminder sent for user ${profile.userId}`);
    } catch (error) {
      this.logger.error(`Failed to send reminder for user ${profile.userId}`, error);
      throw error;
    }
  }

  async resetTravelReminderIfCountryChanged(
    profile: IdentityVerificationProfile,
    newCountry: string,
  ): Promise<void> {
    if (
      profile.travelModeActive &&
      profile.detectedCountry &&
      profile.detectedCountry !== newCountry
    ) {
      const now = new Date();
      profile.nextTravelReminderAt = now;

      await this.profileRepository.save(profile);

      this.logger.log(
        `Travel reminder reset for user ${profile.userId} (country changed to ${newCountry})`,
      );
    }
  }
}
