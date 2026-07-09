import { Controller } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import {
  OwnerTargetListingsService,
  OwnerTargetPayload,
} from './owner-target-listings.service';

@Controller()
export class OwnerTargetGrpcController {
  constructor(private readonly svc: OwnerTargetListingsService) {}

  private normalize(data: Record<string, unknown>): OwnerTargetPayload {
    const d = data as Record<string, string>;
    return {
      targetType: (d.targetType ?? d.target_type ?? '') as string,
      targetId: (d.targetId ?? d.target_id ?? '') as string,
    };
  }

  @GrpcMethod('OwnerTargetService', 'ValidateTarget')
  async validateTarget(data: Record<string, unknown>) {
    const res = await this.svc.validateTarget(this.normalize(data));
    return {
      exists: res.exists,
      displayName: res.displayName ?? '',
      status: res.status ?? '',
    };
  }

  @GrpcMethod('OwnerTargetService', 'GetTargetMetadata')
  async getTargetMetadata(data: Record<string, unknown>) {
    const m = await this.svc.getTargetMetadata(this.normalize(data));
    return { title: m.title, skills: m.skills };
  }
}
