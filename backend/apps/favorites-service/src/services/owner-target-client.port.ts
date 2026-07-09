import { FavoriteType } from '../entities/favorite.entity';

export interface OwnerTargetValidationRequest {
  targetType: FavoriteType;
  targetId: string;
}

export interface OwnerTargetValidationResponse {
  exists: boolean;
  displayName?: string;
  status?: string;
}

export interface OwnerTargetMetadataResponse {
  title: string;
  skills: string[];
}

export interface OwnerTargetClientPort {
  validateTarget(
    payload: OwnerTargetValidationRequest,
  ): Promise<OwnerTargetValidationResponse>;
  getTargetMetadata(
    payload: OwnerTargetValidationRequest,
  ): Promise<OwnerTargetMetadataResponse>;
}

export const LISTING_OWNER_TARGET_CLIENT = 'LISTING_OWNER_TARGET_CLIENT';
export const USER_OWNER_TARGET_CLIENT = 'USER_OWNER_TARGET_CLIENT';
