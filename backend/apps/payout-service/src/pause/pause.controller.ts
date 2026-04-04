// apps/payout-service/src/pause/pause.controller.ts
// PS-16 §5: Pause status endpoint — polled by frontend every 30s while paused
import { Controller, Get, UseGuards, Request, HttpCode } from '@nestjs/common';
import { PauseStatusService } from './pause-status.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';

@Controller('v1/payouts')
@UseGuards(JwtAuthGuard)
export class PauseController {
  constructor(private readonly pauseSvc: PauseStatusService) {}

  // PS-16 §5: GET /v1/payouts/pause-status
  // Frontend polls every 30s while banner is active
  @Get('pause-status')
  @HttpCode(200)
  async getPauseStatus(@Request() req: any) {
    return this.pauseSvc.getPauseStatus(req.user.userId);
  }
}