import { Controller, Get, Header, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { TimeTrackerGate } from '../identity-gate/time-tracker-gate.guard';

@Controller('downloads')
@UseGuards(JwtAuthGuard)
export class DownloadsController {
  /**
   * G8: gate check for downloading the desktop Time Tracker. Runs the identity
   * gate (after authentication) and answers 200 only when it is open; a closed
   * gate is 403 VERIFICATION_REQUIRED and an unanswered one is 503
   * IDENTITY_VERIFICATION_UNAVAILABLE. It returns no installer URL: the
   * frontend continues to the existing public release URL on a 200.
   */
  @Get('time-tracker/check')
  @TimeTrackerGate()
  @Header('Cache-Control', 'no-store')
  checkTimeTrackerDownload() {
    return { allowed: true };
  }
}
