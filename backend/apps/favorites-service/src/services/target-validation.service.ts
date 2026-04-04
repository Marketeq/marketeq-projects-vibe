import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  Optional,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FavoriteType } from '../entities/favorite.entity';
import {
  LISTING_OWNER_TARGET_CLIENT,
  OwnerTargetClientPort,
  USER_OWNER_TARGET_CLIENT,
} from './owner-target-client.port';
export type OwningService = 'listing-service' | 'user-service';

export interface TargetValidationResult {
  targetType: FavoriteType;
  targetId: string;
  ownerService: OwningService;
  exists: boolean;
  displayName?: string;
  status?: string;
}

@Injectable()
export class TargetValidationService {
  private readonly logger = new Logger(TargetValidationService.name);
  constructor(
    private readonly configService: ConfigService,
    @Optional()
    @Inject(LISTING_OWNER_TARGET_CLIENT)
    private readonly listingClient?: OwnerTargetClientPort,
    @Optional()
    @Inject(USER_OWNER_TARGET_CLIENT)
    private readonly userClient?: OwnerTargetClientPort,
  ) {}

  getOwnerService(type: FavoriteType): OwningService {
    switch (type) {
      case FavoriteType.PROJECT:
      case FavoriteType.SERVICE:
      case FavoriteType.JOB:
        return 'listing-service';
      case FavoriteType.TALENT:
      case FavoriteType.TEAM:
        return 'user-service';
      default:
        throw new BadRequestException(`Unsupported favorite type: ${type}`);
    }
  }

  async validateTarget(type: FavoriteType, targetId: string): Promise<TargetValidationResult> {
    if (!targetId || targetId.trim().length === 0) {
      throw new BadRequestException('targetId is required');
    }

    const ownerService = this.getOwnerService(type);
    const ownerClient =
      ownerService === 'listing-service' ? this.listingClient : this.userClient;
    this.logger.debug(
      `Validating ${type}:${targetId} against ${ownerService} via service contract`,
    );

    const response = await this.validateViaOwnerClient(
      ownerService,
      ownerClient,
      type,
      targetId,
    );

    const exists = response.exists;
    if (!exists) {
      throw new NotFoundException(
        `Target ${targetId} (${type}) was not found in ${ownerService}`,
      );
    }

    return {
      targetType: type,
      targetId,
      ownerService,
      exists,
      displayName: response.displayName,
      status: response.status,
    };
  }

  private async validateViaOwnerClient(
    ownerService: OwningService,
    ownerClient: OwnerTargetClientPort | undefined,
    type: FavoriteType,
    targetId: string,
  ) {
    const strictMode = this.configService.get<string>('TARGET_VALIDATION_MODE') === 'strict';
    if (!ownerClient) {
      if (strictMode) {
        throw new ServiceUnavailableException(
          `Owner service client not configured for ${ownerService}`,
        );
      }
      this.logger.warn(
        `Owner client missing for ${ownerService}; allowing in non-strict mode`,
      );
      return { exists: true };
    }

    try {
      return await ownerClient.validateTarget({
        targetType: type,
        targetId,
      });
    } catch (error) {
      if (strictMode) {
        throw new ServiceUnavailableException(
          `Owner validation request failed for ${ownerService}`,
        );
      }
      this.logger.warn(
        `Owner validation failed for ${ownerService}; allowing in non-strict mode`,
      );
      return { exists: true };
    }
  }
}
