
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository }              from '@nestjs/typeorm';
import { Repository }                    from 'typeorm';
import { BalanceSnapshot }               from '../entities/balance-snapshot.entity';
import { BalanceResponseDto }            from './dto/balance-response.dto';
import { CacheService, BalanceCacheEntry } from '../cache/cache.service';
import { CurrencyService }               from '../currency/currency.service';

@Injectable()
export class BalanceService {
  private readonly DISPLAY_LABEL       = 'After reserve & threshold deductions';
  private readonly DISPLAY_LABEL_STALE = 'After reserve & threshold deductions (rate may be delayed)';

  constructor(
    @InjectRepository(BalanceSnapshot)
    private readonly repo: Repository<BalanceSnapshot>,
    private readonly cache: CacheService,
    private readonly currency: CurrencyService,
  ) {}

  // ─── Endpoint: Create Balance ───────────────────────────────
  async createBalance(dto: any) {
    // Upsert by contractorId
    let snap = await this.repo.findOne({ where: { contractorId: dto.contractorId } });
    if (Array.isArray(dto)) {
      throw new Error('createBalance expects a single object, not an array');
    }
    if (!snap) {
      const created = this.repo.create(dto);
      if (Array.isArray(created)) {
        throw new Error('repo.create returned an array, expected a single entity');
      }
      snap = created;
    } else {
      Object.assign(snap, dto);
    }
    return this.repo.save(snap);
  }

  async getBalance(contractorId: string, localCurrency = 'USD', displayCurrency = 'USD'): Promise<BalanceResponseDto> {
    // Step 1: Try cache
    const cached = await this.cache.getBalance(contractorId);
    if (cached) return this.buildDto(cached, localCurrency, displayCurrency);

    // Step 2: Cache miss — read DB
    const snap = await this.repo.findOne({ where: { contractorId } });
    if (!snap) throw new NotFoundException('No balance record found for this contractor');

    // Step 3: Populate cache
    const entry = {
      availableBalance: snap.availableBalance,
      pendingHoldUsd:   snap.pendingHoldUsd,
      totalEarnedUsd:   snap.totalEarnedUsd,
      totalPaidOutUsd:  snap.totalPaidOutUsd,
      displayCurrency:  snap.displayCurrency,
      localCurrency:    snap.localCurrency,
      updatedAt:        snap.updatedAt.toISOString(),
    };
    await this.cache.setBalance(contractorId, entry);

    // Step 4: Build response
    return this.buildDto(entry as BalanceCacheEntry, localCurrency, displayCurrency);
  }

  private async buildDto(
    entry: BalanceCacheEntry | Omit<BalanceCacheEntry, 'cachedAt' | 'cacheVersion'>,
    localCurrency: string, displayCurrency: string,
  ): Promise<BalanceResponseDto> {
    const display = await this.currency.convertFromUsd(entry.availableBalance, displayCurrency);
    const local   = await this.currency.convertFromUsd(entry.availableBalance, localCurrency);

    const dto = new BalanceResponseDto();
    dto.availableBalance        = entry.availableBalance;
    dto.availableBalanceDisplay = display.amount;
    dto.displayCurrency         = display.currency;
    dto.availableBalanceLocal   = local.amount;
    dto.localCurrency           = local.currency;
    dto.reserveBalance          = '0.00';
    dto.pendingHoldUsd          = entry.pendingHoldUsd;
    dto.totalEarnedUsd          = entry.totalEarnedUsd;
    dto.totalPaidOutUsd         = entry.totalPaidOutUsd;
    dto.displayLabel            = display.stale ? this.DISPLAY_LABEL_STALE : this.DISPLAY_LABEL;
    // US-08: an explicit boolean the frontend can key off directly, rather than
    // string-matching displayLabel — currency.service.ts already computes this
    // per-conversion, it just wasn't surfaced on the DTO before.
    dto.stale                   = display.stale;
    dto.lastUpdatedAt           = entry.updatedAt;
    dto.cachedAt                = (entry as BalanceCacheEntry).cachedAt ?? new Date().toISOString();
    return dto;
  }

  async getBalanceRaw(contractorId: string): Promise<BalanceSnapshot | null> {
    return this.repo.findOne({ where: { contractorId } });
  }

}
