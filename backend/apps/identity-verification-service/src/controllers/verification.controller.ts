import { Controller, Get, Post, Body, Param, Logger } from '@nestjs/common';
import { VerificationService } from '../services/verification.service';
import { VerificationStatusResponseDto, VerificationAttemptResponseDto } from '../dto/verification.dto';

@Controller('identity-verification/verification')
export class VerificationController {
  private readonly logger = new Logger(VerificationController.name);

  constructor(private verificationService: VerificationService) {}

  @Get('status/:userId')
  async getVerificationStatus(@Param('userId') userId: string): Promise<VerificationStatusResponseDto> {
    this.logger.log(`Getting verification status for user ${userId}`);
    return this.verificationService.getVerificationStatus(userId);
  }

  @Get('attempts/:userId')
  async getAttemptHistory(@Param('userId') userId: string): Promise<VerificationAttemptResponseDto[]> {
    this.logger.log(`Getting attempt history for user ${userId}`);
    return this.verificationService.getAttemptHistory(userId);
  }

  @Post('initiate-session')
  async initiateVerificationSession(@Body() body: { userId: string; documentType: string }) {
    this.logger.log(`Initiating verification session for user ${body.userId}`);
    return {
      userId: body.userId,
      documentType: body.documentType,
      status: 'initiated',
      message: 'Verification session can be initiated through Didit',
    };
  }
}
