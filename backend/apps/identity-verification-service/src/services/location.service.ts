import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IdentityVerificationProfile } from '../entities/identity-verification-profile.entity';
import { LocationVerificationStatus } from '../entities/enums/identity-verification.enums';
import { LocationStatusResponseDto, ConfirmHomeCountryDto } from '../dto/location.dto';

@Injectable()
export class LocationService {
  constructor(
    @InjectRepository(IdentityVerificationProfile)
    private profileRepository: Repository<IdentityVerificationProfile>,
  ) {}

  async getOrCreateProfile(userId: string): Promise<IdentityVerificationProfile> {
    let profile = await this.profileRepository.findOne({ where: { userId } });

    if (!profile) {
      profile = this.profileRepository.create({
        userId,
        locationVerificationStatus: LocationVerificationStatus.NOT_VERIFIED,
      });
      await this.profileRepository.save(profile);
    }

    return profile;
  }

  async confirmHomeCountry(
    userId: string,
    dto: ConfirmHomeCountryDto,
  ): Promise<LocationStatusResponseDto> {
    if (!dto.country || dto.country.length !== 2) {
      throw new BadRequestException('Country code must be 2 characters');
    }

    const profile = await this.getOrCreateProfile(userId);

    profile.verifiedHomeCountry = dto.country.toUpperCase();
    profile.verifiedHomeCountryConfirmedAt = new Date();
    profile.detectedCountry = dto.country.toUpperCase();
    profile.detectedRegionState = dto.region || null;
    profile.detectedCity = dto.city || null;
    profile.locationVerificationStatus = LocationVerificationStatus.VERIFIED;

    await this.profileRepository.save(profile);

    return this.mapToResponse(profile);
  }

  async updateDetectedLocation(
    userId: string,
    country: string,
    region?: string,
    city?: string,
  ): Promise<IdentityVerificationProfile> {
    const profile = await this.getOrCreateProfile(userId);

    const countryChanged = profile.detectedCountry !== country;

    profile.detectedCountry = country;
    profile.detectedRegionState = region || null;
    profile.detectedCity = city || null;

    if (countryChanged) {
      profile.locationVerificationStatus = LocationVerificationStatus.SUBMITTED_PENDING_REVIEW;
    }

    await this.profileRepository.save(profile);

    return profile;
  }

  async getLocationStatus(userId: string): Promise<LocationStatusResponseDto> {
    const profile = await this.profileRepository.findOne({ where: { userId } });

    if (!profile) {
      throw new NotFoundException(`Profile not found for user ${userId}`);
    }

    return this.mapToResponse(profile);
  }

  private mapToResponse(profile: IdentityVerificationProfile): LocationStatusResponseDto {
    return {
      userId: profile.userId,
      verifiedHomeCountry: profile.verifiedHomeCountry,
      verifiedHomeCountryConfirmedAt: profile.verifiedHomeCountryConfirmedAt,
      detectedCountry: profile.detectedCountry,
      detectedRegionState: profile.detectedRegionState,
      detectedCity: profile.detectedCity,
      locationVerificationStatus: profile.locationVerificationStatus,
    };
  }
}
