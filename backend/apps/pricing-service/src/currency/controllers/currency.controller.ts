import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { InternalJwtGuard } from '../../guards/internal-jwt.guard';
import { CurrencyService } from '../services/currency.service';
import { ConvertCurrencyQueryDto } from '../dto/convert-currency.dto';

@UseGuards(InternalJwtGuard)
@Controller('v1/currency')
export class CurrencyController {
  constructor(private readonly currencyService: CurrencyService) {}

  @Get('convert')
  convert(@Query() query: ConvertCurrencyQueryDto) {
    return this.currencyService.convert(query);
  }

  @Get('rates')
  getAllRates() {
    return this.currencyService.getAllRates();
  }
}
