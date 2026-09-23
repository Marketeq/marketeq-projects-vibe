import { Controller, Get, Logger, Param, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { IdentityVerificationService } from '../services/identity-verification.service';
import { InternalServiceGuard } from '../common/guards/internal-service.guard';
import { InternalStatusResponseDto } from '../dto/response/internal-status.response.dto';

@Controller('v1/internal/identity-verification')
@UseGuards(InternalServiceGuard)
export class IdentityVerificationInternalController {
  private readonly logger = new Logger(IdentityVerificationInternalController.name);

  constructor(private readonly service: IdentityVerificationService) {}

  @Get('status/:userId')
  async getStatus(
    @Param('userId') userId: string,
    @Req() req: Request,
  ): Promise<InternalStatusResponseDto> {
    // TRVG2 §6.1: every internal read must be attributed and logged.
    // Caller identity is whatever InternalServiceGuard authorized this
    // request under (the bearer service token itself, since no per-caller
    // service identity claim exists yet) plus the source IP as a coarse
    // attribution signal.
    this.logger.log(
      `Internal status read: userId=${userId} caller=${req.ip ?? 'unknown'}`,
    );
    const status = await this.service.getStatusForInternalCaller(userId);
    return {
      identityVerificationStatus: status.identityVerificationStatus,
      locationVerificationStatus: status.locationVerificationStatus,
      isVerified: status.isVerified,
      gateOpen: status.gateOpen,
      inGrace: status.inGrace,
      attemptCount: status.attemptCount,
      failureReason: status.failureReason,
      createdAt: status.createdAt,
      updatedAt: status.updatedAt,
    };
  }
}
