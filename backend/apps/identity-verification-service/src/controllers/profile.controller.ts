import { Controller, Delete, Get, Param, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IdentityVerificationProfile } from '../entities/identity-verification-profile.entity';
import { NotFoundException } from '@nestjs/common';

@Controller('identity-verification/profile')
export class ProfileController {
  private readonly logger = new Logger(ProfileController.name);

  constructor(
    @InjectRepository(IdentityVerificationProfile)
    private profileRepository: Repository<IdentityVerificationProfile>,
  ) {}

  @Get(':userId')
  async getProfile(@Param('userId') userId: string) {
    this.logger.log(`Getting profile for user ${userId}`);

    const profile = await this.profileRepository.findOne({
      where: { userId },
      relations: ['documents', 'attempts'],
    });

    if (!profile) {
      throw new NotFoundException(`Profile not found for user ${userId}`);
    }

    return {
      userId: profile.userId,
      identityStatus: profile.identityVerificationStatus,
      locationStatus: profile.locationVerificationStatus,
      verifiedHomeCountry: profile.verifiedHomeCountry,
      travelModeActive: profile.travelModeActive,
      documentsCount: profile.documents?.length || 0,
      attemptsCount: profile.attempts?.length || 0,
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt,
    };
  }

  @Delete(':userId')
  async deleteProfile(@Param('userId') userId: string) {
    this.logger.log(`Deleting profile and all associated data for user ${userId}`);

    const profile = await this.profileRepository.findOne({ where: { userId } });

    if (!profile) {
      throw new NotFoundException(`Profile not found for user ${userId}`);
    }

    // CASCADE delete is handled by the database
    // documents and attempts will be automatically deleted
    await this.profileRepository.remove(profile);

    return {
      success: true,
      message: `Profile and all associated data deleted for user ${userId}`,
    };
  }
}
