import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { IdentityVerificationService } from '../services/identity-verification.service';
import { InternalServiceGuard } from '../common/guards/internal-service.guard';
import { InternalStatusResponseDto } from '../dto/response/internal-status.response.dto';

@Controller('v1/internal/identity-verification')
@UseGuards(InternalServiceGuard)
export class IdentityVerificationInternalController {
  constructor(private readonly service: IdentityVerificationService) {}

  @Get('status/:userId')
  async getStatus(@Param('userId') userId: string): Promise<InternalStatusResponseDto> {
    const status = await this.service.getStatusForInternalCaller(userId);
    return {
      identityVerificationStatus: status.identityVerificationStatus,
      locationVerificationStatus: status.locationVerificationStatus,
    };
  }
}
