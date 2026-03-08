import { Controller, Get, Query, Param, Req } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EarningsCache } from '../entities/earnings-cache.entity';
import { BalanceSnapshot } from '../entities/balance-snapshot.entity';

@Controller('v1/earnings')
export class EarningsController {
  constructor(
    @InjectRepository(EarningsCache) private readonly earningsRepo: Repository<EarningsCache>,
    @InjectRepository(BalanceSnapshot) private readonly balanceRepo: Repository<BalanceSnapshot>,
  ) {}

  @Get('balance')
  async getBalance(@Req() req: any) {
    const contractorId = req.user?.id;
    const snapshot = await this.balanceRepo.findOne({
      where: { contractorId },
      order: { snapshotAt: 'DESC' },
    });
    return snapshot || { availableBalanceUsd: 0, pendingBalanceUsd: 0, withdrawnBalanceUsd: 0 };
  }

  @Get('summary')
  async getSummary(@Req() req: any) {
    const contractorId = req.user?.id;
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(now); weekStart.setDate(now.getDate() - now.getDay());
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const all = await this.earningsRepo.find({ where: { contractorId } });
    const sum = (items: EarningsCache[]) =>
      items.reduce((acc, e) => acc + Number(e.netAmountUsd), 0);

    return {
      today: sum(all.filter((e) => e.earnedAt >= todayStart)),
      thisWeek: sum(all.filter((e) => e.earnedAt >= weekStart)),
      thisMonth: sum(all.filter((e) => e.earnedAt >= monthStart)),
      allTime: sum(all),
    };
  }

  @Get()
  async getEarnings(
    @Req() req: any,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('status') status?: string,
    @Query('contractId') contractId?: string,
  ) {
    const contractorId = req.user?.id;
    const where: any = { contractorId };
    if (status) where.status = status;
    if (contractId) where.contractId = contractId;

    const [data, total] = await this.earningsRepo.findAndCount({
      where,
      order: { earnedAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { data, meta: { page, limit, total } };
  }

  @Get(':id')
  async getOne(@Param('id') id: string) {
    return this.earningsRepo.findOne({ where: { id } });
  }

  @Get('health')
  health() {
    return { status: 'ok', service: 'earnings-service' };
  }

  @MessagePattern('earnings.credit')
  async handleEarningsCredit(@Payload() data: {
    contractorId: string;
    contractId: string;
    contractLabel?: string;
    grossAmountUsd: number;
  }) {
    const platformFeeRate = 0.05;
    const netAmountUsd = data.grossAmountUsd * (1 - platformFeeRate);
    const entry = this.earningsRepo.create({
      ...data,
      platformFeeRate,
      netAmountUsd,
      status: 'available',
      earnedAt: new Date(),
    });
    return this.earningsRepo.save(entry);
  }
}
