import { Controller, Get, HttpCode, HttpStatus, Param, Query, UseGuards } from '@nestjs/common';
import { InvitationsService } from './invitations.service';
import { GatewayAuthGuard } from '../guards/gateway-auth.guard';
import { CompanyContextGuard } from '../guards/company-context.guard';
import { InvitationStatus } from '../entities/invitation.entity';

/**
 * Doc endpoint #2, GET /api/v1/companies/{company_id}/invitations. Kept
 * separate from InvitationsController (which owns /v1/invitations) because
 * it needs CompanyContextGuard on top of GatewayAuthGuard: the caller must
 * be a member of :companyId, not just authenticated.
 */
@Controller('v1/companies/:companyId/invitations')
@UseGuards(GatewayAuthGuard, CompanyContextGuard)
export class CompanyInvitationsController {
  constructor(private readonly svc: InvitationsService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  async list(
    @Param('companyId') companyId: string,
    @Query('status') status?: InvitationStatus,
  ) {
    // Doc names this "Get Pending Invitations"; default to PENDING when the
    // caller doesn't specify a status, but still allow other statuses via
    // the same query param the doc documents.
    const effectiveStatus = status ?? InvitationStatus.PENDING;
    const result = await this.svc.list({ companyId, status: effectiveStatus, limit: 100 } as any);

    return {
      company_id: companyId,
      pending_count: result.data.length,
      invitations: result.data,
    };
  }
}
