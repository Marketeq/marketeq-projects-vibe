import { Controller } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { Public } from '../decorators/public.decorator';
import {
  OwnerTargetPayload,
  OwnerTargetValidationService,
} from './owner-target-validation.service';

/**
 * Internal gRPC API for favorites-service (and other services) to validate
 * user-owned targets: talent, team.
 */
@Controller()
@Public()
export class OwnerTargetGrpcController {
  constructor(
    private readonly ownerTargetValidation: OwnerTargetValidationService,
  ) {}

  private normalize(data: Record<string, unknown>): OwnerTargetPayload {
    const d = data as Record<string, string>;
    return {
      targetType: (d.targetType ?? d.target_type ?? '') as string,
      targetId: (d.targetId ?? d.target_id ?? '') as string,
    };
  }

  @GrpcMethod('OwnerTargetService', 'ValidateTarget')
  async validateTarget(data: Record<string, unknown>) {
    const res = await this.ownerTargetValidation.validateTarget(
      this.normalize(data),
    );
    return {
      exists: res.exists,
      displayName: res.displayName ?? '',
      status: res.status ?? '',
    };
  }

  @GrpcMethod('OwnerTargetService', 'GetTargetMetadata')
  async getTargetMetadata(data: Record<string, unknown>) {
    const m = await this.ownerTargetValidation.getTargetMetadata(
      this.normalize(data),
    );
    return { title: m.title, skills: m.skills };
  }
}
