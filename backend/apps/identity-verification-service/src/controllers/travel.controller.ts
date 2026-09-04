import { Controller, Post, Get, Delete, Body, Param, Logger } from '@nestjs/common';
import { TravelService } from '../services/travel.service';
import { ClassifyTravelDto, TravelStatusResponseDto } from '../dto/travel.dto';

@Controller('identity-verification/travel')
export class TravelController {
  private readonly logger = new Logger(TravelController.name);

  constructor(private travelService: TravelService) {}

  @Post('classify/:userId')
  async classifyTravel(
    @Param('userId') userId: string,
    @Body() dto: ClassifyTravelDto,
  ): Promise<TravelStatusResponseDto> {
    this.logger.log(`Classifying travel for user ${userId}: ${dto.classification}`);
    return this.travelService.classifyTravel(userId, dto);
  }

  @Get('status/:userId')
  async getTravelStatus(@Param('userId') userId: string): Promise<TravelStatusResponseDto> {
    this.logger.log(`Getting travel status for user ${userId}`);
    return this.travelService.getTravelStatus(userId);
  }

  @Delete('deactivate/:userId')
  async deactivateTravelMode(@Param('userId') userId: string): Promise<TravelStatusResponseDto> {
    this.logger.log(`Deactivating travel mode for user ${userId}`);
    return this.travelService.deactivateTravelMode(userId);
  }

  @Post('process-reminder/:userId')
  async processReminder(@Param('userId') userId: string) {
    this.logger.log(`Processing travel reminder for user ${userId}`);
    const shouldSend = await this.travelService.processTravelReminder(userId);
    return { shouldSend };
  }
}
