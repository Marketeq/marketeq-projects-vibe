import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IdentityVerificationProfile } from '../entities/identity-verification-profile.entity';
import { TravelClassification, DeclaredDuration } from '../entities/enums/identity-verification.enums';
import { ClassifyTravelDto, TravelStatusResponseDto } from '../dto/travel.dto';
import { LocationService } from './location.service';

@Injectable()
export class TravelService {
  constructor(
    @InjectRepository(IdentityVerificationProfile)
    private profileRepository: Repository<IdentityVerificationProfile>,
    private locationService: LocationService,
  ) {}

  async classifyTravel(userId: string, dto: ClassifyTravelDto): Promise<TravelStatusResponseDto> {
    const profile = await this.locationService.getOrCreateProfile(userId);

    profile.travelClassification = dto.classification;

    if (dto.classification === TravelClassification.TEMPORARILY_TRAVELING) {
      profile.declaredDuration = dto.declaredDuration || DeclaredDuration.NOT_SURE;
      profile.travelModeActive = true;
      profile.travelModeActivatedAt = new Date();

      const delayMs = 5 * 60 * 1000;
      const nextReminder = new Date(Date.now() + delayMs);
      profile.nextTravelReminderAt = nextReminder;
    } else if (dto.classification === TravelClassification.PERMANENTLY_RELOCATED) {
      profile.travelModeActive = false;
      profile.declaredDuration = null;
      profile.travelModeActivatedAt = null;
    }

    await this.profileRepository.save(profile);

    return this.mapToResponse(profile);
  }

  async getTravelStatus(userId: string): Promise<TravelStatusResponseDto> {
    const profile = await this.profileRepository.findOne({ where: { userId } });

    if (!profile) {
      throw new NotFoundException(`Profile not found for user ${userId}`);
    }

    return this.mapToResponse(profile);
  }

  async processTravelReminder(userId: string): Promise<boolean> {
    const profile = await this.profileRepository.findOne({ where: { userId } });

    if (!profile || !profile.travelModeActive) {
      return false;
    }

    const now = new Date();
    if (profile.nextTravelReminderAt && profile.nextTravelReminderAt <= now) {
      profile.lastTravelReminderSentAt = now;

      const nextTime = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      profile.nextTravelReminderAt = nextTime;

      await this.profileRepository.save(profile);
      return true;
    }

    return false;
  }

  async deactivateTravelMode(userId: string): Promise<TravelStatusResponseDto> {
    const profile = await this.profileRepository.findOne({ where: { userId } });

    if (!profile) {
      throw new NotFoundException(`Profile not found for user ${userId}`);
    }

    profile.travelModeActive = false;
    profile.travelClassification = null;
    profile.declaredDuration = null;
    profile.travelModeActivatedAt = null;
    profile.lastTravelReminderSentAt = null;
    profile.nextTravelReminderAt = null;

    await this.profileRepository.save(profile);

    return this.mapToResponse(profile);
  }

  private mapToResponse(profile: IdentityVerificationProfile): TravelStatusResponseDto {
    return {
      userId: profile.userId,
      travelClassification: profile.travelClassification,
      declaredDuration: profile.declaredDuration,
      travelModeActive: profile.travelModeActive,
      travelModeActivatedAt: profile.travelModeActivatedAt,
      lastTravelReminderSentAt: profile.lastTravelReminderSentAt,
      nextTravelReminderAt: profile.nextTravelReminderAt,
    };
  }
}
