// apps/payout-service/src/kyc/kyc.controller.ts
// PS-15 §5.2: Admin — waive a contractor's first-payout hold.
// KycGateService.waiveFirstPayoutHold() existed fully built with no route
// exposing it — same admin-guard pattern as PayoutController's release-edd.
import { Controller, Post, Param, Request, UseGuards, HttpCode, ParseUUIDPipe } from '@nestjs/common';
import { KycGateService } from './kyc-gate.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../guards/roles.guard';

@Controller('v1/admin/contractors')
export class KycController {
  constructor(private readonly kycGateService: KycGateService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Post(':id/waive-first-hold')
  @HttpCode(200)
  async waiveFirstHold(@Request() req: any, @Param('id', ParseUUIDPipe) contractorId: string) {
    await this.kycGateService.waiveFirstPayoutHold(contractorId, req.user.userId);
    return { waived: true };
  }
}
