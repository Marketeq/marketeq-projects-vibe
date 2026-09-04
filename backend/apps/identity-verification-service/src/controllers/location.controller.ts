import { Controller, Post, Get, Body, Param, Logger } from '@nestjs/common';
import { LocationService } from '../services/location.service';
import { ConfirmHomeCountryDto, LocationStatusResponseDto } from '../dto/location.dto';

@Controller('identity-verification/location')
export class LocationController {
  private readonly logger = new Logger(LocationController.name);

  constructor(private locationService: LocationService) {}

  @Post('confirm-home-country/:userId')
  async confirmHomeCountry(
    @Param('userId') userId: string,
    @Body() dto: ConfirmHomeCountryDto,
  ): Promise<LocationStatusResponseDto> {
    this.logger.log(`Confirming home country for user ${userId}: ${dto.country}`);
    return this.locationService.confirmHomeCountry(userId, dto);
  }

  @Get('status/:userId')
  async getLocationStatus(@Param('userId') userId: string): Promise<LocationStatusResponseDto> {
    this.logger.log(`Getting location status for user ${userId}`);
    return this.locationService.getLocationStatus(userId);
  }

  @Post('update-detected/:userId')
  async updateDetectedLocation(
    @Param('userId') userId: string,
    @Body() body: { country: string; region?: string; city?: string },
  ) {
    this.logger.log(`Updating detected location for user ${userId}: ${body.country}`);
    return this.locationService.updateDetectedLocation(userId, body.country, body.region, body.city);
  }
}
