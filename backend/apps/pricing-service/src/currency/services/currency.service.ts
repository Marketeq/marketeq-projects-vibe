import { Injectable } from '@nestjs/common';
import { FxCacheService } from './fx-cache.service';
import { ConvertCurrencyQueryDto } from '../dto/convert-currency.dto';
import { CurrencyResponseDto, AllRatesResponseDto } from '../dto/currency-response.dto';

@Injectable()
export class CurrencyService {
  constructor(private readonly fxCache: FxCacheService) {}

  async convert(dto: ConvertCurrencyQueryDto): Promise<CurrencyResponseDto> {
    const from = dto.from.toUpperCase();
    const to = dto.to.toUpperCase();

    // Same-currency shortcut — no FX lookup needed.
    if (from === to) {
      return {
        amount: dto.amount,
        converted: dto.amount,
        rate: 1,
        from,
        to,
        fetchedAt: new Date().toISOString(),
        isStale: false,
      };
    }

    const { rate, fetchedAt, isStale } = await this.fxCache.getRate(from, to);
    const converted = Math.round(dto.amount * rate * 100) / 100;

    return { amount: dto.amount, converted, rate, from, to, fetchedAt, isStale };
  }

  async getAllRates(): Promise<AllRatesResponseDto & { cache_hit?: boolean }> {
    const { rates, fetchedAt, isStale } = await this.fxCache.getAllRates('USD');
    return { base: 'USD', rates, fetchedAt, isStale };
  }
}
