import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { InternalJwtGuard } from '../../guards/internal-jwt.guard';
import { RatesService } from '../services/rates.service';
import { GetRatesQueryDto } from '../dto/get-rates-query.dto';

@UseGuards(InternalJwtGuard)
@Controller('v1/rates')
export class RatesController {
  constructor(private readonly ratesService: RatesService) {}

  @Get()
  getRates(@Query() query: GetRatesQueryDto) {
    return this.ratesService.getRates(query);
  }

  @Get('price-guide')
  getPriceGuide(@Query() query: GetRatesQueryDto) {
    return this.ratesService.getPriceGuide(query);
  }
}
